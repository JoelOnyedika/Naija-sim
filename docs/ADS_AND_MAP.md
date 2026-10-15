# Expanded map, advertising, walking and AFK: implementation notes

This document describes what is **actually implemented** (and what is not). Paths are relative to the repo root.

## 0. Status at a glance

| Area | Status |
| --- | --- |
| Larger, connected Lagos map (districts, road network, airport, port) | Implemented, data-driven (`src/content/lagos/map/layout.ts`) |
| City selector (Lagos playable; Abuja, Port Harcourt, Edo State "Soon") | Implemented |
| Category tabs: Ads, Government, Sea | Implemented. Government only lists existing civic landmarks |
| Physical billboards (18 slots, clickable, lamps, bottom sheet, inventory) | Implemented |
| Sea Ads (floating on the water, slot picker, green/red, 3-day expiry) | Implemented, **browser-local persistence only** |
| Mock checkout, Pending/Active/Rejected/Expired model | Implemented. **No real payment, no real moderation backend** |
| Moderation UI | Dev-only panel; the store actions are what a future admin UI would call |
| Houses: green "Entrance" strip removed | Implemented |
| Billboard location labels ("Murtala Muhammed International Airport", "Near Eko Hotel and Suites") | Implemented, derived from map data |
| Gym mat (procedural model, Buy catalogue, push-ups, AFK) | Implemented |
| Click-to-walk with pathfinding, arrive-then-act, poses, animations, cleanup | Implemented |
| AFK cosmetics (closed list, 15 s) | Implemented (there was no AFK system in the repo before) |

## 1. Map architecture

* **State definition** (`src/content/lagos/index.ts`) now carries `mapData.layout` (a `MapLayout`, types in `src/types/world.ts`) and `ads` (an `AdsConfig`, `src/types/ads.ts`).
* **`MapLayout`** = land `slabs` (rectangles; everything else is water), road `nodes` + `edges`, and the `sea` extent. `LandSlab.kind` is the district type (`dense`, `market`, `estate`, `business`, `civic`, `airport`, `industrial`, `resort`); it picks building palettes and sizes (`scene/districts.tsx`). `density: 0` leaves a slab empty (airport, port) for hand-built scenery.
* **Roads**: `RoadEdge.cls` is `major | secondary | local`. `bridge: true` edges are drawn as bridges with pillars (`cable: true` adds a pylon, `buses` adds moving danfos). Local streets are generated inside slabs that set `streets: <pitch>`. Rendering is in `scene/roads.tsx` (one instanced mesh per class, instanced centre dashes, junction discs). Buildings keep off roads, streets and landmarks (`world/mapGeometry.ts: nearAnyRoad`).
* **Geography** (see the header of `layout.ts`): mainland west and north-west (Agege/Ifako, Mushin, Surulere, Yaba, Ikeja/Alausa); **Murtala Muhammed Airport** north of Ikeja; Lagos Island in the middle with the Balogun-area market district; Ikoyi and Banana Island east; Victoria Island south with the **Eko Hotel** landmark and **Eko Atlantic** reclaimed to its south; Lekki, Lekki Phase 1 and Ajah running east; **Apapa port and industrial belt** south-west across the harbour. Positions are stylised (about 1 unit = 1 km), not surveyed; the *relationships* are real.
* **Airport** (`scene/airport.tsx`): two runways with markings, a taxiway, connectors, an apron, parked aircraft, the terminal and control tower (`lagos.mmia` landmark), and two looping animated flights (one takes off, one lands). Animation is a single `useFrame` per aircraft.
* **Port** (`scene/port.tsx`): quay, three gantry cranes, instanced container stacks (about 250 boxes in one draw call), warehouse depots.
* **Government landmarks** (`landmarks.ts`, models in `scene/landmarks3.tsx`): Lagos State Secretariat (Alausa), Tafawa Balewa Square, Lagos State House (Marina), Federal Secretariat (Ikoyi). Category `government`.
* **Performance**: land, buildings, roads, dashes, containers are instanced; no per-building meshes. The map has no shadow map. Not profiled on a real phone (see Limitations).
* **Camera**: map orbit limits widened (`maxDistance` 130, fog and far plane scaled) in `three/world/WorldView.tsx`. `WorldView` also accepts `{ type: 'point', x, z }` as a focus target (used for billboards and sea ads).

### Adding or changing a district, road or landmark
Edit `src/content/lagos/map/layout.ts` (slabs, nodes, edges) or `landmarks.ts` / `billboards.ts`, then run `npm run validate:content` and `npm run test:ads`. The tests check: roads connected, no dangling nodes, road ends on land, bridges cross water, landmarks on land and near a road, billboards beside (not on) a road, no landmark overlap.

### Adding a new city
1. Create `src/content/<city>/` like `lagos` (areas, properties, landmarks, `mapData.layout`, optional `ads`, a scene component) and register it in `src/content/index.ts` and `src/content/scenes.ts`.
2. Its chip in the selector becomes available **automatically**: `src/content/cities.ts` is only the catalogue; a city is playable if and only if a state with the same id is registered. Abuja, Port Harcourt and Edo State exist only in the catalogue, are rendered disabled with a "Soon" tag, and tapping them does nothing (checked in `tests-browser/test_ads_flow.py`).

## 2. Map selector and categories

* `src/features/map/CityAndCategoryBar.tsx`: `CitySelector` (chips, horizontally scrollable on small screens, `aria-disabled` for unavailable cities) and `CategoryTabs` (Ads | Government | Sea).
* `src/stores/adsUiStore.ts` holds the category, the open sheet, the wizard, the placement picker and the camera focus. It resets when the map closes or the city changes.
* `src/features/map/CategorySheet.tsx` is the collapsible bottom panel for the selected category; panels are in `features/map/ads/Panels.tsx`. Sheets sit above the bottom dock and can be dismissed.

## 3. Advertising model

Types: `src/types/ads.ts`. Config: `src/content/lagos/ads.ts` (**every price, duration, size, upload limit and rule text lives here**). Logic: `src/game/ads/` (`slots.ts`, `validate.ts`, `image.ts`). State: `src/stores/adsStore.ts`.

### Status model
`draft` -> (simulated checkout) `pending` -> (approve) `active` -> (3 days) `expired`; `pending` -> (reject) `rejected`.
* **Only `active` ads are rendered** in the world. Pending, rejected, draft and expired never are (`liveAds`, and the 3D components read only that).
* **Pending ads reserve their position** (shown red, "Reserved") so two people cannot both pay for the same slot; rejected and expired ads release it.

### Billboard locations in the UI
Every billboard slot has a plain-language `location` (and the named `road` beside it), computed by `billboardLocation` in `src/game/ads/slots.ts` from the state's own data, so new boards and new cities get labels for free. Order of rules: inside the airport slab -> the airport's name ("Murtala Muhammed International Airport"); else "Near <closest landmark on the same stretch of land within 3.8 units>" (e.g. "Near Eko Hotel and Suites"); else "In <nearest named area within 5 units>"; else "On <road name>"; else "In <district>". It is shown with a pin in the Ads inventory list, in the wizard's placement list, on the review step and in the billboard sheet (with the road underneath). Change `NEAR_LANDMARK` to make "near" stricter or looser. `scripts/adsTest.ts` checks that every board has a label and that the airport and Eko Hotel boards say so.

### Slots
* **Billboards**: `billboardSlots(state)` derives one slot per `BillboardDefinition`: id, name, position, format (`wide` 3:1 / `standard` 2:1), tier, price (`base price x tier multiplier`), duration (`billboardDurationDays`, 7). Selecting a slot in the UI selects that exact world object (the 3D board looks up live ads by the same id).
* **Sea Ads**: `seaSlots(state)` lays a grid (`seaSlot.pitchX/pitchZ`) over `layout.sea` and keeps cells whose ad rectangle (plus a margin) does **not** intersect any land slab and is not under a bridge. Each slot is 4.6 x 2.3 map units (2:1), has an id like `sea-21-10`, a centre `(x, z)` on the water plane and a price tier by distance to land (`coastal` / `harbour` / `open`, prices in config). Today that is about 470 slots. Slots never overlap each other (tested). Because ad rectangles are fixed grid cells, two ads cannot overlap and a position outside the water cannot be chosen: `slotProblem` rejects anything that is not in the generated list, and `saveDraft` / `submit` re-check it.
* **Occupancy** is computed from submissions: `slotAvailability(subs, kind, slotId, now)` -> `available | reserved | occupied`. The picker UI and the 3D markers both use it.

### Placement picker (Sea)
`features/map/ads/SeaPicker.tsx`: an SVG minimap drawn from the same land slabs, roads and slot objects as the 3D world (zoom buttons, drag to pan, tier filter, "Suggest one"). While it is open the 3D scene (`three/world/SeaAds.tsx`) shows matching markers on the water: **green round discs = available, red squares = taken or reserved, gold = your pick** (tap a green disc in 3D to choose it too). Red/green are never the only cue: shapes differ, the minimap shows a tick or a cross when zoomed in, and the legend and text say "Available" / "Taken or reserved".

### Floating rendering
`SeaAds.tsx` renders each live ad as a white raft (a thin box with four orange buoys) just above the water (`RAFT_Y = water + 0.1`), with the artwork on a plane on top using `polygonOffset` (no z-fighting). The image is fitted into the slot **keeping its aspect ratio**, never stretched. A small bob (about 1.8 cm) is applied per raft in one `useFrame` each. Textures are created per live ad and disposed when it goes. Tapping a raft opens its detail sheet. Rafts are scenery only: nothing in the map scene uses them for movement.

### Submission flow
`AdWizard.tsx`: **Details** (image upload, name, description, optional URL, live preview) -> **Placement** (Sea picker or billboard list) -> **Review and simulated checkout** (naira price, big "SIMULATED PAYMENT. No real money is charged" banner, rules shown, checkbox required) -> **Pending** confirmation. Nothing is visible in the world afterwards until it is approved.
* Validation (`game/ads/validate.ts`, pure, unit-tested): name 2-60 chars, description 10-300, URL optional and **http(s) only** (`javascript:` etc. are rejected, and links render with `rel="noopener noreferrer nofollow"`), images PNG/JPEG/WebP only, at most 2 MB, at least 400 px wide, at most 6000 px, aspect between 1:1 and 4:1 (2:1 recommended; other valid ratios are kept as they are).
* `game/ads/image.ts` decodes the upload, validates real pixel size, **re-encodes it to WebP/JPEG at most 800 px wide** (this also strips metadata and any non-image payload) and returns a small data URL.
* Prices use `formatNaira`. Drafts, pending, rejected and expired states have badges with icon + text.
* **Rules and refund policy**: `Rules.tsx`, text in `LAGOS_ADS.rules` / `refundPolicy`. The rules prohibit sexual content and advertising for competing games. **Nothing is detected or filtered automatically**; the UI says every submission is reviewed by a person. The refund text is explicitly a **draft** that must be decided before real payments exist.

### Expiry (3 days) and persistence
* On approval the store writes `activatedAt = now` and `expiresAt = now + durationMs` (3 days for Sea Ads, from config). `durationMs` is copied onto the submission so later config edits do not change running ads.
* **Expiry is computed from timestamps, never from a timer**: `effectiveStatus(sub, now)` reports `expired` when `now >= expiresAt`, even before anything has updated the stored record. `sweep()` then persists the change; it runs on every load (`onRehydrateStorage`) and every 30 s, and the approve/reject actions bump a `tick` so subscribers re-render. An expired ad leaves the 3D world (the render list is `liveAds`) and its position is available again.
* Persistence: `zustand/persist` -> `localStorage['nigerialife.ads']`. Refreshing keeps ads and timestamps (verified in `scripts/adsTest.ts` and the browser test). If the browser refuses the write (quota/blocked) the store sets `storageError` and the wizard shows it.

### Moderation
`features/map/ads/Moderation.tsx`: shown in dev builds, or in production if `localStorage['nl.moderator'] = '1'`. Lists pending ads with Approve / Reject (+ reason) and "Expire now" for live ones (for testing). It calls `adsStore.approve/reject`, the same actions a real admin interface would call. **It is not secure** (anyone can set the flag). Rejecting never charges or refunds anything because nothing was charged.

## 4. What is frontend-only, what persists, what needs a backend

| Thing | Where it lives today | Production requirement |
| --- | --- | --- |
| Slot inventory and occupancy | Computed from this browser's own submissions | A server-side table with a **unique constraint on (kind, slot) for active/pending** so two players cannot both win a slot; every player sees the same inventory |
| Submissions, images, timestamps | `localStorage` in this browser only | Database + object storage for images (and server-side re-validation of type, size, dimensions, re-encoding) |
| Payment | **Simulated.** `paymentStatus: 'simulated'`, no provider, no money, nothing debited from in-game cash either | A payment provider, server-side verification (webhooks), idempotency, receipts, refund handling |
| Moderation | Dev-only panel calling local store actions | Authenticated admin role and audit log; content review; abuse reporting |
| Expiry | Timestamp-based, correct after reloads, but a user can edit their own storage | Server-authoritative `expiresAt`; a scheduled job or query-time check |
| Prohibited-content rules | Text only, human review assumed | A real review queue; optional automated screening if wanted |
| Refund / no-refund rules | **Draft text, not decided** | Legal review before any real payment |
| Cross-player visibility | **Not available.** Another player will not see your ad | The above backend |

Client-side validation is a convenience, never authorisation.

## 5. Houses: the unwanted entrance strip

**What it was.** Every home's layout was built with an extra zone `entry` ("Entrance", kind `compound`, floor `grass`, `ENTRY_DEPTH` = 1.4) appended in `src/world/layoutBuilders.ts` (`finalize`): a green rectangle along the open front of the house, connected to the main room. It was a *shared* piece of generation, not variant code, so it affected all six homes. **It is removed at that level**: the zone, its connection and the `ENTRY_DEPTH` constant are gone, and the plot no longer extends past the house front by that depth. Nothing replaces it: the house footprint, walls, doors, windows, parking bay and furniture are untouched, and the ground is the round disc (`GroundDisc`).
* `ZoneFloor` also refuses to draw any open-air grass zone as a rectangle.
* `scripts/validateContent.ts` used `entry` as the start of its "every room reachable" check; it now starts from the first indoor room.
* The rectangle you called an entrance box was identified from your description and screenshots as this strip. If you meant a different object (for example the dark door in an inner wall, or the parking pad), tell me which; the doors were deliberately left alone.

## 6. Navigation, interactions and animations

Files: `src/world/navigation.ts` (pure), `src/stores/actorStore.ts` (intent), `src/three/property/AvatarWalker.tsx` (executes it), `src/game/interactions.ts` (rules), `src/three/avatar/Avatar.tsx` (poses).

* **Pathfinding.** `buildNavGrid` rasterises the house into 0.25 m cells. Blocked: outer back/left walls, every wall piece (tall or low partition) **except the 1 m door gaps**, and every colliding floor item (rugs do not collide), all inflated by the avatar radius (0.2). The front and right of the house are open ground because the cutaway has no walls there. A* (8 directions, no corner cutting) plus a line-of-sight pass gives a smooth path. If the avatar is standing inside furniture it first steps to the nearest free cell.
* **Click to walk.** In Home mode an invisible floor plane (`GroundClick` in `PropertyScene.tsx`) turns a tap into `walkTo(x, z)`; furniture stops the event first. Tapping the floor during an activity stops it cleanly and walks.
* **Furniture.** `interactWith(item)` only does cheap checks (busy, no food, not tired, cannot afford) and orders the avatar to `use` the item. `AvatarWalker` finds the **interaction spot** (`interactionSpot`), walks the path to an approach point in front of (or beside) the object, glides onto seat/bed/tub if needed, turns to face it, and **only then** calls `startUse`, which runs the original use logic (cost is charged and the activity starts at that moment, not at the tap). Unreachable objects use a logged straight-line fallback (the controlled clipping last resort); with the six shipped layouts all 12 usable item types are reachable (`scripts/navTest.ts`).
* **Spot table** (`SPECS` in `navigation.ts`, one row per usable furniture id): pose (stand/sit/sleep), action animation, mode (`front`, `on`, `inside`, `watch`, `work`), and the height of the surface the avatar rests on (`top`). Sofas and chairs: sit on the seat facing the front. Sleeping: lie along the bed with the head to the headboard, body shifted so it is centred, group height = `top - 0.585` so the back meets the mattress (this fixes the hovering). TV: sit on the nearest sofa/chair within 4.5 m facing the TV, else stand 1.4 m in front. Desk / gaming: sit on a chair within 2.2 m facing the desk, else stand. Cooker, fridge, dispenser, bookshelf, piano, speaker (dance within 1 m), washbasin: stand in front, facing it. Shower and bathtub/jacuzzi: stand/sit **inside**.
* **Animations** (`Avatar.tsx`, `ActionKind`): eat, drink, cook, type, piano, read, wash, shower, dance, push-up, tv; arms/forearms are smoothed toward per-action targets; lying, sitting and push-up rotate/lower the body. Hands never animate mid-stride or while lying.
* **Bathing.** A light-blue translucent cylinder (the "blue cover") is shown only while a bathing activity runs; no clothing is hidden, so there is nothing to restore. No activity sounds were added (the existing synthesised `sfx` has no matching cue and I did not invent one).
* **Cleanup.** An activity ends -> the avatar steps off furniture to the nearest free cell, the pose/cover/lock clear, and it can move. `startUse` is idempotent (ignored while an activity runs). `resetTransientUi` (new life) also resets the actor store. Needs, rewards and progression are unchanged: the activities and their effects are the same as before.
* **Dev probe.** In dev builds `window.__avatar` exposes position, stage and pose for browser tests (`tests-browser/test_navigation.py`).

### Gym mat (`gym_rug`)
A procedural item (`GymMat` in `src/three/models/extras.tsx`: foam body, darker border, stripes, toe-end lip, logo block; no external assets). In the Buy catalogue under **Fun**, 0.9 x 1.9 m, ₦45,000. Tapping it walks the avatar onto the mat (it does not block walking) and runs the push-up animation (10 s, small energy/hunger/thirst cost, small happiness gain, task event `use:workout`). The body is centred along the mat and rests on its surface (`top: 0.045` in `SPECS`). The new `exclusive` flag on `FurnitureDef` makes placement refuse to put the mat on solid furniture or solid furniture on the mat, without making it block walking (rugs do not set it, so they still go under furniture). The idle push-ups in AFK use the same spot.

## 7. AFK rules (`src/game/afk.ts`, executed in `AvatarWalker`)

There was **no AFK system** in the repository (searched for idle/AFK code), so this implements the stated baseline rather than changing one.
* After `AFK_DELAY_S` = 15 s without player input (pointer, key, wheel or touch anywhere) the avatar may start **one** cosmetic behaviour, chosen by `pickAfk` from the closed list `AFK_ALLOWED = ['tv', 'eat', 'pushups', 'relax']`: watch TV (if a TV exists), cosmetic eating at the fridge (no food consumed), push-ups (only if the player has placed a **Gym mat**, id `gym_rug`), or relax.
* Toilet, shower, sleep, piano, dance, vomiting and everything else are not in the list, so they cannot be returned (tested over 2000 picks with every furniture type present).
* Cosmetic means visual only: the behaviour lives in `actorStore.cosmetic`, never in `statsStore.activity`; the AFK code does not call `stats.start/apply`, `economyStore`, tasks or inventory. The browser test checks money and transactions are unchanged.
* It only starts when idle in Home mode with the phone closed and no food picker open, and any input cancels it immediately (the avatar then steps out of any furniture). It runs for 12-20 s, then the next AFK window is another 15 s.

## 8. Testing

| Command | What it covers |
| --- | --- |
| `npm run typecheck` / `npx tsc --noEmit` | Types |
| `npm run validate:content` | Content rules incl. landmark spacing, billboard clearance, houses |
| `npm run smoke` | Simulation and stores |
| `npm run test:nav` | Every home furnished: all usable items reachable, paths on free cells, room-to-room paths never cross walls, AFK closed list |
| `npm run test:ads` | Map connectivity and placement, Sea slot generation and no-overlap, validation, status model, 3-day expiry, persistence across reload, rejection/expiry release slots, billboards separate from sea, naira, city catalogue |
| `tests-browser/test_ads_flow.py` | Real browser: selector and tabs, upload errors, picker, simulated checkout, Pending is not live, approval, reload keeps the clock, expiry |
| `tests-browser/test_navigation.py` | Real browser: walking (no teleport), arrive-then-start, sleeping pose, exit cleanup, TV, shower/tub cover, floor-tap interrupt, AFK |
| `tests-browser/test_lighting_camera.py` | Lights survive every graphics tier, tilt limits |

Browser tests run with software rendering (about 1.5 fps) so they poll with long timeouts.

### Troubleshooting
* *Ad does not appear after approval*: only `active` ads render; check `localStorage['nigerialife.ads']`, the slot id, and that `expiresAt` is in the future.
* *"Storage is full"*: images are stored as data URLs (about 30-120 KB each); clear `nigerialife.ads` to reset.
* *Avatar will not go to an object*: it logs `[nav] no route to ...` and falls back to a straight glide; check that furniture is not walling off a door (`npm run test:nav` shows reachability).
* *Moderation panel missing in a production build*: set `localStorage['nl.moderator'] = '1'`.

## 9. New and changed files

New: `src/world/navigation.ts`, `src/world/mapGeometry.ts`, `src/stores/actorStore.ts`, `src/stores/adsStore.ts`, `src/stores/adsUiStore.ts`, `src/game/afk.ts`, `src/game/ads/{slots,validate,image}.ts`, `src/types/ads.ts`, `src/content/cities.ts`, `src/content/lagos/ads.ts`, `src/content/lagos/map/layout.ts`, `src/content/lagos/scene/{roads,districts,airport,port,landmarks3}.tsx`, `src/three/world/SeaAds.tsx`, `src/features/map/{CityAndCategoryBar,CategorySheet}.tsx`, `src/features/map/ads/*`, `scripts/{navTest,adsTest,lagosIds}.ts`, `tests-browser/test_{ads_flow,navigation,lighting_camera}.py`.
Changed: `LagosWorld.tsx` (rewritten to be layout-driven), `Billboards.tsx` (clickable, lamps, live ad image), `WorldView.tsx`, `MapOverlay.tsx`, `AvatarWalker.tsx` (rewritten), `Avatar.tsx` (actions), `interactions.ts`, `layoutBuilders.ts`, `PropertyEnvironment.tsx`, `PropertyScene.tsx`, `cameraStore.ts`, `CameraRig.tsx`, `qualityStore.ts`, `types/world.ts`, `landmarks.ts`, `billboards.ts`, content index, validators and smoke test.

## 10. Known limitations and not done

* Not tested on a real phone: map frame rate with the larger city, touch feel of the picker, and bottom-sheet fit on very small screens are unverified. Only headless software rendering was used.
* Billboard artwork for purchased ads has no per-board text overlay, and sea ads show no floating name label.
* No activity sound effects were added.
* 
* Billboard rental duration (7 days) was my choice: the brief only specified 3 days for Sea Ads. It is `billboardDurationDays` in config.
* Prices are placeholders. The government category lists landmarks only.
* No automated tests for the 3D visuals themselves (screenshots were reviewed by eye).
* A tap on a wall in Home mode still counts as a floor tap (the click passes through to the floor plane); the path simply goes to the nearest free point.
