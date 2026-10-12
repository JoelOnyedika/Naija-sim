# Nigeria Life: Developer Guide

This guide explains how the project is organised and how to extend it. For adding a new Nigerian state see [ADDING_A_STATE.md](ADDING_A_STATE.md).

## 1. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (LAN-visible so you can test on a phone). |
| `npm run build` | `tsc --noEmit` then production build. |
| `npm run typecheck` | Types only. |
| `npm run validate:content` | Integrity check for every registered state: ids, zone overlaps, fixtures, doors, windows, parking vs listing, starting furniture fits every starting home. **Run it after editing any content.** |
| `npm run smoke` | Headless logic test (no browser): starts Lapo and Nepo lives, sleeps, works a shift, buys and places furniture, sells, receives food, buys homes, checks cars/garages. |

## 2. Core principles

1. **The 3D home is always underneath.** Phone, Buy catalog, tasks, map cards are overlays. `features/game/GameScreen.tsx` mounts `PropertyScene` once; the rest is stacked on top.
2. **Content is data, systems are generic.** States, areas, properties, layouts, landmarks, furniture, jobs, foods, vehicles, tasks are plain objects. Systems read them through the registry. No system may contain `if (state === 'lagos')`.
3. **One store per concern.** Stores never import UI. Cross-store orchestration lives in `src/game/*`.
4. **Everything is replaceable.** Auth (mock), audio (synth), 3D models (procedural), online count (mock) all sit behind small seams.

## 3. Folder map

```
src/
  main.tsx              installs content packs + 3D scenes, then renders <App/>
  App.tsx               flow router (phase state machine)
  types/                game.ts (stats, avatar, PlacedItem) · world.ts (State/Area/Property/Layout)
  world/                GENERIC world logic (no content)
    registry.ts         registerState(), getState/getArea/getProperty/getLayout/getLandmark
    layoutGeometry.ts   walls, doors, window placement, car slots, areas
    placement.ts        snapping, validation, transforms, auto-placement
    layoutBuilders.ts   helpers that build layouts (compound housing, residences)
    labels.ts           listing text (rooms/bathrooms/parking), category + positioning labels
  content/              CONTENT PACKS (data + state-specific 3D)
    index.ts            registerContent()  → list of states
    scenes.ts           registerScenes()   → 3D world per state
    lagos/              areas.ts · properties.ts · landmarks.ts · index.ts · scene/
  data/                 global (non-state) content: items, foods, vehicles, jobs, tasks, apps, life types, clothing, copy, config
  stores/               Zustand stores (see §6)
  game/                 orchestration: life start, housing, buy mode, interactions, jobs, tasks, game loop, notifications
  three/                R3F code: models/, avatar/, property/ (scene), world/ (map), textures.ts
  features/             screens: landing, auth, character, roulette, summary, game (HUD/dock/buy/tasks/stats), phone (+apps), map, houses
  ui/                   shared UI (Button, AnimatedNumber, Toasts, Logo, SocialLinks)
  audio/                sfx.ts (WebAudio synth), music.ts (generative loop)
scripts/                validateContent.ts, smoke.ts
docs/                   this guide
```

## 4. App flow

`stores/flowStore.ts` holds the phase: `landing → login | signup → character → roulette → summary → game`. `App.tsx` renders the matching screen and repairs impossible states (e.g. a saved `game` phase with no life) in a `useEffect`.

- Sign up → `character`. Log in → `nextPhase()` (character if not created, roulette if no life, otherwise game).
- Roulette decides the result **before** the animation (`game/life.ts: rollLifeType`, odds in `data/config.ts: nepoChance`). The reel is built so the winning card lands under the marker, with a near-miss card beside it when you lose. The life is only created (`startNewLife`) when the player taps "Enter your life".
- "Start New Life" (`restartLife`) clears the life stores but keeps the account and character.

## 5. World architecture (State → Area → Property → Layout)

```
StateDefinition
 ├─ areas[]        AreaDefinition     (id, stateId, name, positioning, mapData, propertyIds)
 ├─ properties[]   PropertyDefinition (id, stateId, areaId, layoutId, price, bedrooms, ...)
 ├─ layouts[]      PropertyLayout     (zones, doors, windows, fixtures, decor, palette)
 ├─ mapData        landmarks[] (+ bounds, center)
 ├─ visualData     sceneId + sky colours
 └─ startingProperties { lapo: [...ids], nepo: [...ids] }
```

All IDs are strings; ids are prefixed with the state id (`lagos.yaba`, `lagos.3-bedroom-flat-yaba`) so they stay unique across states. Properties reference area and state **by id**. `registerState()` indexes everything; everything else calls `getProperty(id)`, `getLayout(id)`, `propertiesOfState(stateId)`.

**Systems that must stay state-agnostic** (and are): houses/marketplace (`features/phone/apps/Houses.tsx`, `features/houses/*`), property ownership and the active home (`stores/propertyStore.ts`, `game/active.ts`, `game/housing.ts`), the map (`features/map/MapOverlay.tsx`, `three/world/WorldView.tsx`), location cards, search/filtering, 3D property loading (`three/property/*`), saves. `mapStore.stateId` is `null` until the player picks a state; `useStateId()` falls back to the first registered state.

Where Lagos shows up on purpose: `content/lagos/**`, plus the two registration lines in `content/index.ts` and `content/scenes.ts`.

### Property listing model

`PropertyDefinition` has `unit: 'rooms' | 'bedrooms'` (starter housing counts "rooms", the rest count bedrooms), `garageBays`, `parkingSpaces`, `cta: 'move_in' | 'buy'`, `luxuryLevel` 1 to 10. `world/labels.ts: listingLines()` produces the three listing lines ("1 Room", "1 Bathroom", "No Garage" / "Parking Available" / "2-Car Garage"). **Prices are configuration**: change them in the content file only.

There is no renting. "Move in" and "Buy" both result in ownership (`game/housing.ts: acquireProperty`). Furniture moves with the player when they change active home; fixtures stay.

## 6. Property layouts (procedural 3D)

A `PropertyLayout` describes a building and plot as rectangles on the ground. Coordinates are metres: **x = east, z = south**. The camera looks from +x/+z toward −x/−z, so the **back wall is the minimum-z wall** and the **left wall is the minimum-x wall**.

- **Zones** (`Zone`): a room or outdoor area. `indoor` zones get walls; `furnishable` zones accept furniture. Kinds: bedroom, living, parlour, kitchen, bathroom, corridor, balcony, terrace, garage, parking, compound, garden, waterfront, neighbour, security. Floor kinds: cement, tile, wood, marble, terrazzo, paving, grass, concrete, dirt, water.
- **Walls are derived** (`world/layoutGeometry.ts: wallPieces`). Every zone edge is split into pieces by what is on each side:
  - indoor on the far side only (back/left of a room) → **tall wall** (windows go here);
  - indoor on the near side only (front/right) → low **curb** (0.45 m) so the camera can see in;
  - indoor on both sides → **partition** (0.95 m, cut-away) so every room is visible.
- **Doors** come from `connections: [{a, b}]`. A doorway is cut at the midpoint of the shared edge (needs ≥ 1.1 m of shared wall). The validator warns if a connection produces no door.
- **Windows** (`WindowSpec`): `wall: 'back'|'left'`, `along` (x for back, z for left), `width/height/sill`, `style`: louvre, burglar, sash, glass, panoramic.
- **Fixtures** are furniture built into the property (toilet, shower, cooker, cabinet). They are real `PlacedItem`s (`fixed: true`) so they collide and can be used, but they are never saved or moved.
- **Decor** (`DecorKind`): trees, palms, drums, clothesline, gate, pillars, awning, hedge, planter, stairs, rail, generator house, jetty, boat, lamppost (`three/property/Decor.tsx`). The tier builder uses none of them: homes stay compact.
- **Plot**: ground kind + `fence` kind. The tier builder sets `fence: 'none'` and a 0.6 m margin around the house and bays, so the camera frames the real bounds.
- **Open-plan connections** (`Connection.open`): no wall between the two zones; they count as one room (`mainRoomCount`). Tier 1 uses this to wrap the studio around its bathroom corner.
- **Doorway clearance** (`doorClearances`): `validatePlacement` rejects floor furniture standing in a doorway.

### House tiers and parking bays

`world/layoutBuilders.ts` has one builder, `house({ id, tier, ... })`, and `HOUSE_TIERS`, the single source of truth for rooms, bathrooms and parking. `content/lagos/properties.ts` reads the listing numbers from it, the builder reads the layout from it, and `npm run validate:content` checks they agree.

| Tier | Name | Main rooms | Parking bays | Side |
| --- | --- | --- | --- | --- |
| 1 | Lapo Baby | 1 studio | 0 | 5.4 m (Self Contain: 6.0 m) |
| 2 | Starter Plus | bedroom + living | 1 | 7.0 m |
| 3 | Middle-tier | 2 bedrooms + living | 2 | 8.4 m |
| 4 | Premium | 2 bedrooms + living + kitchen/dining | 3 | 10.2 m |
| 5 | Luxury | 3 bedrooms + living + kitchen/dining | 3 | 12.0 m |

Every house is a square tiled exactly by rectangular zones, plus a 1.4 m entrance forecourt along the front. Bays are open, paved, 2.8 x 5.5 m (`BAY_WIDTH`/`BAY_LENGTH` in `world/garage.ts`), in one row below the forecourt, centred on the house. There are no garage walls, doors, roofs, fences or gardens.

### Placing a GLB car in a bay (not loaded yet)

`carSlots(layout)` returns one `CarSlot` per bay: `x, z` = bay centre on the ground (y = 0), `rotation` = yaw of the car's nose (0 = +z, towards the camera), `width`, `length`. To place a model:

```ts
const box = new Box3().setFromObject(gltf.scene);               // model's own bounds, any origin
const pose = fitModelToBay(slot, { min: box.min.toArray(), max: box.max.toArray() }, { nose: '+z', unitScale: 1 });
// <primitive object={gltf.scene} position={pose.position} rotation={[0, pose.rotationY, 0]} scale={pose.scale} />
```

`fitModelToBay` centres the bounding box on the bay, drops the lowest point to y = 0, rotates so the nose faces the slot direction, and only ever scales down (to stay 0.15 m inside the lines). `unitScale` converts the asset's units to metres. The primitive cars in `three/models/vehicles.tsx` (origin at the bottom centre, nose +z) keep drawing owned cars until a GLB replaces them.

You can also write a `PropertyLayout` object by hand for a landmark property.

> Duplexes are single-level plans (a stair-hall decor stands in for the upper floor). Multi-storey interiors are on the roadmap.

## 7. Placement system (`world/placement.ts`)

- `resolvePlacement(def, layout, rawX, rawZ, rotation)`: snaps (5 cm) and clamps a pointer position into the nearest legal zone (floor items) or onto the nearest wall (wall items: back/left tall walls).
- `validatePlacement(...)`: item must lie fully inside one compatible zone (`place: 'indoor' | 'outdoor' | 'any'`), not collide with fixtures/other floor items (`collides: false` for rugs), wall items must avoid windows, doors and each other.
- Ghost colour: `three/property/EditLayer.tsx` tints the model via `TintContext` (green valid, red invalid).
- Buy-mode actions live in `game/buy.ts` (`beginPlace`, `beginMove`, `moveDraft`, `rotateDraft`, `confirmDraft`, `storeItem`, `sellItem`). The transient ghost is in `stores/editorStore.ts`. Placed furniture is saved per property in `propertyStore.furniture[propertyId]`.
- `findFreeSpot` and `housing.autoPlace` auto-arrange items (starting furniture, furniture carried to a new home).

## 8. Stores and saves

| Store | Holds | Persisted key |
|---|---|---|
| `authStore` | mock accounts + session | `nigerialife.auth` |
| `flowStore` | current phase | `nigerialife.flow` |
| `characterStore` | avatar appearance, owned clothes | `nigerialife.character` |
| `lifeStore` | life type, start date, starting money/home | `nigerialife.life` |
| `economyStore` | money + transactions | `nigerialife.economy` |
| `statsStore` | 9 needs + current activity (activity not saved) | `nigerialife.stats` |
| `inventoryStore` | `{ itemId: qty }` for furniture and food | `nigerialife.inventory` |
| `propertyStore` | owned ids, active home, furniture per property | `nigerialife.property` |
| `vehicleStore` | owned vehicle ids | `nigerialife.vehicles` |
| `phoneStore` | open/app/recents, notifications, chat threads | `nigerialife.phone` (partial) |
| `appsStore` | food orders, investments, gigs, staff, companies | `nigerialife.apps` |
| `taskStore` | active/done tasks | `nigerialife.tasks` |
| `clockStore` | in-game minutes | `nigerialife.clock` |
| `mapStore` | selected state/area/landmark, visit counts | `nigerialife.map` (partial) |
| `settingsStore` | sfx / music | `nigerialife.settings` |
| `uiStore`, `editorStore` | transient UI | not persisted |

Persistence uses Zustand's `persist` middleware, one key per store, `version: 1`. To change a store's shape bump its `version` and add a `migrate` function. Because stores reference content by id, a save from before a content change still loads (unknown ids are skipped).

To reset everything for a clean test: clear all `nigerialife.*` keys in localStorage.

## 9. Simulation

`game/loop.ts: advance(dt)` is the single entry point for time-based rules, driven by `useGameLoop` (1 s interval, wall-clock delta, capped when the tab was asleep).

- **Needs** (`statsStore.tick`): hunger, thirst, toilet (bladder), happiness, energy, hygiene decay per minute (`data/config.ts: decayPerMin`); slower while sleeping. Health drops if basics bottom out. Social decays; Charisma only grows.
- **Activities** (`statsStore.activity`): anything timed (sleep, cook, shower, shift, visit a landmark) is an `Activity` with `seconds`, total `effects` spread over the duration, optional `payout` and `event`. The avatar walks to `targetUid` and plays a pose (`three/property/AvatarWalker.tsx`).
- **Furniture interactions**: `FurnitureDef.use` (`data/items.ts`). Tapping furniture outside Buy mode calls `game/interactions.ts: interactWith`. Beds scale duration by `sleepRate` plus comfort from fans/ACs. The fridge opens the food picker.
- **Tasks and events**: systems call `fireTask('visit:art')` etc. `data/tasks.ts` lists tasks and the event each one waits for. Three are active at a time.
- **Notifications** (`game/notify.ts`): pushes to the phone and, if the phone is closed, drops an in-world banner.
- **Clock and lighting**: `clockStore` drives the date/time in the HUD and `three/property/Lighting.tsx` (sun, dusk, warm interior lights at night).

## 10. Phone

`features/phone/PhoneOverlay.tsx` pulls down from the top with a spring, over the live scene. The shell is chosen from `LIFE_TYPES[lifeType].phone`: **iOS-style** (dynamic island, squircle icons, home indicator, 5G) for Nepo, **Android-style** (punch-hole camera, round icons, 3-button nav, 4G) for Lapo. Status bar, notification shade, app open/close animation (grows from the tapped icon), recents switcher.

### Add an app

1. Add an entry to `data/apps.ts` (`id`, `label`, `glyph`, gradient). Add the id to the `AppId` union.
2. Create `features/phone/apps/MyApp.tsx` exporting a component. Use the light-theme blocks in `features/phone/ui.tsx` (`Card`, `Row`, `Btn`, `Chip`, `Title`).
3. Register it in `features/phone/apps/index.tsx` (`APP_COMPONENTS`). TypeScript will fail until all `AppId`s are covered.

Apps talk to stores/`game/*` directly (e.g. `useEconomyStore.debit`, `fireTask`). Apps with real depth: Jobs, Messages, Contacts, Bank, Food, Boutique, Forbes, Houses, Cars, Invest, Hustle. Light mock apps: Betting, Family, Staff, Companies, Shops, Police, Motors Corp, Invite, Guide, Help, Settings.

## 11. The map

`features/map/MapOverlay.tsx` renders `three/world/WorldView.tsx` for the current state. `WorldView` looks up the state's scene in `three/world/sceneRegistry.ts`, then overlays **markers generated from data** (`mapData.landmarks`, `areas[].mapData`). Clicking a marker opens a card: landmarks get a mock "Visit" (cost, effects, task event), areas show the property count/price range and "Browse homes" (opens the Houses app filtered to that area).

A state scene is a React component `({ state }) => JSX`. Lagos's is `content/lagos/scene/LagosWorld.tsx` with landmark models in `landmarks.tsx`, keyed by `LandmarkDefinition.modelId`. Unknown model ids fall back to a plain block, so a new state works before its art exists.

## 12. 3D assets and performance

- All furniture is procedural: rounded boxes, cylinders and spheres with materials, shadows and canvas-generated textures (`three/textures.ts`). No image or model files.
- **Model registry**: `FurnitureDef.model` → `three/models/registry.tsx`. To use a real model, replace the entry with a component that calls drei's `useGLTF()`. Convention: origin at the floor centre (wall items: the centre of the item), front facing +Z, metres. Keep GLBs small and compressed.
- Vehicles: `three/models/vehicles.tsx` (`Vehicle` takes `body` + `color`). The same props make a GLB swap easy.
- Avatar: `three/avatar/Avatar.tsx` (hair/top/bottom styles from `Appearance`). Add a slot by extending `Appearance`, `data/clothing.ts`, the character screen tab, and the Avatar component.
- Performance: building blocks on the map are one `InstancedMesh`; textures are cached and cloned only to set repeat; the property canvas runs `frameloop: 'demand'` while the map is open; shadow map 1024; DPR capped at 1.75. Water is a tiny shader.
- Dispose: R3F disposes geometries/materials on unmount. Cached canvas textures are intentionally long-lived.

## 13. Audio

`audio/sfx.ts` synthesises every sound (click, pop, open/close, notify, purchase, error, tick, reward, phone open/close, spin, win, lose, coin) with WebAudio; `audio/music.ts` plays a small generative loop. Browsers require a user gesture before audio, so music starts after the first tap (`hooks/useMusicSync.ts`). Both respect `settingsStore`. To use real files, keep the same function names and play an `HTMLAudioElement`/`AudioBuffer` inside.

## 14. Authoring recipes

**Furniture**: add an object to `FURNITURE` in `data/items.ts` (footprint, placement rules, optional `use`), and a model component in `three/models/` registered in `registry.tsx`. Run `npm run validate:content`.

**Food / job / vehicle / task / contact**: add to `data/foods.ts`, `jobs.ts`, `vehicles.ts`, `tasks.ts`, `contacts.ts`. Tasks need a system that fires their event string.

**Life type tuning**: `data/lifeTypes.ts` (starting money, furniture, vehicles, phone) and `data/config.ts` (`nepoChance`).

**Property**: add an entry in the state's `properties.ts` (see ADDING_A_STATE.md). Pick a builder or write a layout.

**Landmark**: add to the state's `landmarks.ts`; optional model in the scene's `landmarks.tsx`.

## 15. Moving to a backend later

Replace these seams, nothing else needs to change:

- `stores/authStore.ts` (signup/login/google/logout) → real auth.
- `persist` storage in each store → API sync (the shapes are already versioned JSON).
- `uiStore.online`, `data/featured.ts`, Forbes NPCs, gig board → live data.
- `economyStore` → server-authoritative transactions.

## 16. Known limitations (honest list)

- Not tested on real devices/browsers in this build environment: tune pointer feel, DPR and shadow quality on a mid-range phone.
- Duplex/mansion interiors are single-level plans.
- Wall-mounted items only attach to the back/left tall walls.
- Mock systems: betting, family bonds (screen-local), staff effects, company income, police, investments.
- Bundle is ~1.3 MB (three.js). Split with dynamic `import()` for the map scene if load time matters.
