# Nigeria Life - v8 part 2: pets, activities, stats

## Pets (new)
- **Cat, dog and lion** (₦450k / ₦900k / ₦12M, shared pricing) and a **pet ball** (₦8k), in a new Pets shop tab. Max 3 pets and 2 balls per home (`PETS` in balance.ts).
- Pets are procedural models (one generator, `three/models/pets.tsx`; a new species is one row in `LOOKS` and one in `SPECIES`). Legs swing in diagonal pairs, tail wags, head bobs, lion has a mane and tail tuft.
- Behaviour is a pure state machine (`world/petBrain.ts`): idle, wander, hop, walk to the ball, play, bat the ball to a free spot, cooldown before the next game. It uses the avatar's own navigation grid, so pets use doors and cannot enter walls or solid furniture. Pets turn to face their path before walking, land exactly on path corners, slide along or abandon a walk instead of entering a blocked cell, and step out if furniture is dropped on them.
- Pets never block the player (they are not part of the grid) and never touch AFK. In Buy mode they are ordinary items you can move or sell; in Home mode the live pets are drawn. Tapping a pet makes a sound toast.
- Limits: no skeletal animation or imported models (none exist in the project), pets do not react to the avatar, and they have no stat effects yet (the info panel says so).

## Activities and stats (new central table)
- `src/data/activities.ts` is the one place for what an object lets you do: duration, cost, needs, stat changes, skill XP, payout, requirements. Items with several choices open an **action menu** (shows effects, cost, requirements and reward before starting, disables and explains what is missing); single-choice items (toilet, fridge, bed...) stay one tap.
- Desk: learn to code, practise coding (unchanged), work on a coding task (needs coding level 2, pays ₦3,500 only when finished), browse social media. Speaker: start a party, dance. Disco light: dance under the lights, needs a speaker ("No speaker for this dancefloor oh!"), re-checked when the character arrives.
- No second stat system: the existing stats and skills are used. Fitness = fitness skill, social skill = communication skill, creator skill = creativity.
- Cancelled activities pay nothing and give no XP; finished ones reward once. The existing activity bubbles and walking/animation flow are reused (the disco light got a bubble and a dance spot).
- Fixed a flaky existing test (careers) caused by the Lapo life's random money gift in the game loop (it failed about 1 run in 12 before and after this work).

## New checks
`npm run test:pets` (about 40 checks), `npm run test:activities`. `npm run test:all` runs everything.

## Still open
Catalogue expansion, map tilt/water/billboards, House Design tab and wall patterns, public interiors, chat, club, dealership, referrals, crime/jail. Hustles and the other items' activity menus (ring light, camera, laptop variants) come with the catalogue.

# Nigeria Life - v8 foundations pass

Scope of this pass: the dependency foundations of the master brief (walls, wall-mounted placement, placement camera, shared pricing, item
information, NEPA and backup power). The rest of the brief is NOT done, see "Not done" at the bottom of this section.

## Done
- **Interior walls**: partitions are now `INTERIOR_WALL_HEIGHT` = 1.4 (was 0.95), configurable in `src/data/balance.ts`. Outer walls, footprints, doors,
  windows and the camera-facing rules are untouched. Checked on all six homes (26 partitions) and in a real browser screenshot.
- **Wall-mounted items were buried in the wall** (root cause: the offset used the item depth only, ignoring the wall's thickness, so thin frames sat
  inside it). `getTransform` now offsets by half the wall thickness + a 0.02 gap. Fixes frames, shelves and the AC on both wall orientations (back and left).
- **Camera zoom on placement**: a successful placement eases the camera toward the item, holds 3.2 s, then eases back. Failed/cancelled placement never zooms,
  duplicate requests for the same item inside 700 ms are ignored, any drag/pinch/wheel or the new "Back to room view" button returns at once. Values in `PLACE_FOCUS`.
- **Shared pricing** (`game/pricing.ts`): one function, `priceOf(base)`, used by the shop cards, the placement bar, the charge and the sell refund. The future admin
  multiplier is clamped to 0.1..0.9 and maps to 0.1 = 20% of base, 0.5 = base (today's prices, the default), 0.9 = 180%. Whole naira, never negative or NaN.
- **Item information button** (eye) on every shop card, a sibling of the buy button so it can never buy or place. The panel is generated from the item
  definition: category, tier, price, decorative vs functional, activities with duration/cost/stat changes/XP, needs, passive benefits.
- **NEPA and backup power**: random outages (`POWER` in balance.ts, shorter gaps in homes without reliable public power), a toast and a small status chip,
  room lights dim to 22% (never black; each floor lamp adds a little). Three backups: **Ibeta Pass My Neighbor** (new, tap it during an outage), the existing
  **Generator** (now starts by itself), **Solar power system** (new, always lit). Solar wins over the others. No fuel or maintenance. All prices go through `priceOf`.

## Behaviour changes to know about
- A **Generator** already placed in an old save now starts automatically (before it was decorative with a small comfort bonus).
- The first-furniture task reward still pays out on the first purchase, so a first purchase can raise the balance.

## Checks
`npm run test:v8` (new: pricing, wall height, wall-mount offsets, camera focus, item info, outage schedule, the three backups, AFK regression),
`npm run test:all` (all older checks still pass), `npm run build`.

## Not done (still open from the brief)
Procedural catalogue expansion, central activity/needs system and new stats (fitness etc.), stat-changing activity menus on items, House Design tab and extra wall patterns,
pets, map tilt/water/billboards, ads provider abstraction, public interiors and NPC capacity, local/global chat, hustles in interiors, crime/jail, the club and receipts,
Polanco Motors and the phone car app, referrals and the onboarding task, admin-ready config for everything except pricing and power. None of these exist yet.
Everything that touches real money, shared state or other players needs a backend, which this project does not have.

# Nigeria Life - improvement pass

## Phone redesign and Send by username
- **Send money** is two boxes: the receiver's username and the amount. No contact list, no pre-filled names (Mom, Dad). Unknown usernames are refused.
- **iPhone-style phone** rebuilt after the reference design: carrier left, bold clock top-right, glass time and calendar widgets, 4-column glossy icons with labels, dock with an App Library button. **Android** rebuilt in a Samsung One UI style: big clock, rounded tiles, search pill, three-button navigation.
- **App Library** groups every app with search, so nothing is hidden and nothing scrolls sideways.
- **No more scrolling tab strips.** Every app has a fixed bottom bar of at most five items. Bank 9 sections to 5, Companies 6 to 5, Court 5 to 4; related sections share a page.
- Vector icons replace emoji on the home screen; flatter, calmer cards and headings; clearer app headers per phone.
- Fixes: the iOS clock and status icons were hidden or tiny; the iOS home pill was a 5px tap target; home icons stayed focusable under the App Library.
- New check: `test:phone`; browser test `test_phone_ui.py`.

## Jobs, Messages, Hustle, Investments, Companies, Court, Police, Ride, Grocery, Boutique, Games, Family, Tax
- **Income tax is on**: weekly progressive brackets on job, Hustle and company income (0% to ₦150k, 5% to ₦600k, 10% to ₦2M, 15% above). Unpaid tax is retried and payable. See `SYSTEMS.md` B.
- **Jobs**: 32 careers with ranks, skills and requirements; formal careers use apply, offer, accept; promotions are earned (shifts + Charisma + skill level).
- **Contacts and Messages**: Mom contact, find a player, Message Requests, Groups, pinning, delete chat, notification toggles; the "Only friends" privacy setting is enforced.
- **Hustle**: board, Find a Pro, post a job, direct hire, escrow (hold, release, separate refund), rating with a per-client cap.
- **Investments and land** across four cities (ownership survives city changes), **Companies** (4 slots, manager, staff, branches, upgrades, marketing, daily settlement, once-a-day payouts).
- **Court and Police**: filing, a deterministic case viewer, lawyers, reports that are dismissed or referred to one linked case.
- **Ride, Grocery, Games, Family, Forbes podium**, and a **full-screen Boutique** with occasions, bags and a shared wardrobe (the house wardrobe opens it).
- Net worth now includes land, market holdings and company funds. Chips are proper toggle buttons for screen readers.
- Bugs found by tests and fixed: Live Cases could be empty; the Messages list reset to Chats after leaving a group; chip groups had wrong ARIA roles.
- New checks: `test:careers`, `test:social`, `test:hustle`, `test:empire`, `test:legal`, `test:shop`; browser tests `test_social_ui.py`, `test_apps_a.py`, `test_apps_b.py`.

## Foundations, Banking and Settings (latest)
- **Ledger upgraded in place** (`economyStore`, save v2 with migration): direction, balance before/after, reference numbers, game time, related entity, idempotency keys, lifetime totals, 1,000-entry history. Old call sites unchanged. No data reset.
- **Scheduler** (`game/scheduler.ts`): one place for weekly events, once per game week, never repeated by reloads or screens.
- **Bank rebuilt** into 9 sections: Overview, Send (existing feature kept), Savings (0.5% weekly), Bonds, Credibility, Income Tax (no rule is active, so nothing is charged), Weekly Bills, Last Receipt, Money History.
- **One net worth** for Bank and Forbes (wallet + savings + bonds + homes + cars).
- **Settings**: light/dark/system theme for phone apps, battery saver, graphics Auto/On/Off wired into the graphics governor, change password (mock account), privacy policy draft. Unavailable options are shown disabled with the reason.
- New checks: `test:economy` (55), `test:settings`, `test:persist`, `test:all`; browser test `tests-browser/test_bank_ui.py`.
- Docs: new `docs/SYSTEMS.md`, rewritten `docs/FEATURE_AUDIT.md`.

## Fixed
- **Start a New Life froze** when started from the phone: the game screen waited forever on exit animations. It now unmounts immediately, and `restartLife()` clears build mode, drafts, sheets, toasts and running activities.
- **Build mode black screen**: after Cancel/Buy/Place the exiting placement bar re-read the store (draft = null) and threw, which unmounted the whole app. The bar now gets the draft as a prop; error boundaries wrap the app and the 3D scene.
- Build/Buy: separate exit X (always visible) and catalogue X; "Apartment Budget" removed; move pad (camera-relative) + 90 deg CW/CCW; tab remembered; no double charge.
- Preview camera easing is time-based (was per-frame) so slow devices still frame correctly.

## Added / changed
- Design tokens (blue accent, neutral ink surfaces), compact HUD (short money form, no wrap), collapsible left task panel, blue active dock/tabs.
- New low-poly character kit (`three/avatar/parts.ts`, `Avatar.tsx`): shaped torso/limbs/hands/head, hair (low cut, fade, afro, braids, locs, bun), shirt/tee/hoodie/jacket/kaftan/jersey, jeans/trousers/shorts/skirt/dress, shoes, accessories. Shared geometry + materials.
- Character creation, Boutique and New Life screens re-laid out so the character is never covered.
- Camera: full 360 deg orbit, pan clamped to the plot, fit-to-plot framing; back walls drop when the camera is behind them; veranda roof hides while building / viewed from above.
- Catalogue cut from 29 to 6 houses; old saves are mapped to the nearest tier (furniture returns to inventory). Lapo compound enlarged and squared.
- Loading screen (indeterminate, watchdog) for entering the game and changing homes.
- Automatic graphics tiers (PerfGovernor) with hysteresis/cooldowns + WebGL context-loss recovery.

## Customisation pass
- **Floors and walls**: 7 floors, 9 walls (paint, wallpaper, marble cladding). Try-on in Build mode (Floors / Walls tabs) is free and reversible; Buy & apply charges once via the shared economy store. Scope is stated in the UI: all interior floors / all interior walls of the home. Walls are interior-only overlay panels (outside faces, openings and furniture untouched). Each home remembers its own finishes; owned finishes re-apply free; persisted (`nigerialife.finishes`); cleared on a new life.
- **Independent fixtures**: toilet, shower, bathtub, jacuzzi, washbasin are separate items, any number of each. Also new: bedside table, coffee table, wall shelf, tower speaker, disco light.
- **Interactions**: the desk trains a Coding skill (XP on finish, level shown in the expanded stats); the speaker starts a party and the disco light only runs while it does.
- Dock now steps aside during floor/wall previews (a hook-order bug introduced and caught by tests while doing this is fixed).

## Map, billboards, banking, messaging
- **Lagos map**: 9 -> 24 landmarks across 12 categories (markets, arts, shopping, food, clubs/entertainment, parks, recreation, banks, tech), spread over mainland and islands, each with its own 3D model, description, activities and visit effects. Data-driven (`content/lagos/landmarks.ts`); `validate:content` now checks ids, bounds, spacing and billboard clearance. Mobile map: pin labels only on the selected pin, info card above the pins.
- **Billboards**: 8 fictional boards (`content/lagos/billboards.ts`), shared geometry/frame material and one small texture per distinct ad. `imageUrl`/`linkUrl`/`meta` are reserved fields; `setBillboardContent(id, ...)` swaps content at runtime. No ad service, marketplace or payments exist.
- **Banking** (`game/bank.ts` holds all rules): custom amount, presets (10k/15k/20k/50k/100k) that only fill the box, optional description, recipient picker, balance + 50 billion validation with inline errors, a review/confirm step, exactly-once charging with duplicate-submit protection, full transaction records (status, sender, recipient, note) and history. Recipients are scripted characters without balances, so nothing is credited on their side.
- **Messaging**: WhatsApp-style list (last message, time, unread badge) and chat (bubbles, timestamps, ticks, day separators), replies with quoted previews, emoji reactions (add/remove), and transaction cards that read the real banking record. Contact model supports `@username` player contacts (none exist yet: no multiplayer backend). Delayed NPC replies are discarded if the life was reset.
- Known limitation: message and bank timestamps use the real clock, while the phone's status bar shows the in-game clock.

## House tiers and parking bays
- Six homes now use five square-footprint tiers (`HOUSE_TIERS`): Lapo Baby (1 studio, 0 bays; Face-Me-I-Face-You and Self Contain), Starter Plus (bedroom + living, 1 bay; Room & Parlour), Middle-tier (2 beds + living, 2 bays; 3 Bedroom Flat), Premium (2 beds + living + kitchen/dining, 3 bays; 4 Bedroom Detached Duplex), Luxury (3 beds + living + kitchen/dining, 3 bays; Luxury 4 Bedroom Duplex). Names, prices and ids are unchanged.
- Open 2.8 x 5.5 m paved bays (no garage buildings), `fitModelToBay` for a future GLB car, fences/gardens/trees/yards removed, door-clearance rule for furniture, saved furniture that no longer fits goes to the inventory.

## House interiors, side carport and camera
- Six homes, five square footprints (measured from the generated zones): homes 1-2 = 12 x 12, home 3 = 14 x 14, home 4 = 16 x 16, home 5 = 18 x 18, home 6 = 20 x 20. Progression: 1 one room · 2 one room + WC · 3 living + kitchen (own walls and door) + WC · 4 living + 2 bedrooms + WC · 5 living, 2 bedrooms, kitchen, WC · 6 living, 3 bedrooms, kitchen/dining, 2 bathrooms. Plans in `world/layoutBuilders.ts` (`HOMES`).
- Cutaway: no walls on the camera-facing front and right sides (`wallPieces`); tall back and left walls stay; interior partitions stay low. Windows exist only on the tall back/left walls (fixed a bug that also drew them on the front wall and partitions); homes 1 and 2 have exactly one.
- Every home has one compact two-car carport attached to the right side, bays side by side facing the front. `Carport` (frame + glass) is built from the bay zones only; vehicles are separate (`Vehicles` in `PropertyEnvironment.tsx`, slots from `carSlots()`, `fitModelToBay` in `world/garage.ts`), so swapping in GLB cars never touches the carport. P sign shows "+N in storage" when you own more cars than bays.
- Camera: `stores/cameraStore.ts` is the single source (button steps + swipe offset); `CameraRig.tsx` follows it. Fixed 45 degree elevation, 45 degree default azimuth, distance fitted to house + carport. Swipe is horizontal only, clamped to +-90 degrees of the current button orientation; pinch/wheel zoom 0.7-1.3. `RotateButton` (top right, under the HUD) adds exactly 90 degrees per press, resets the swipe offset, rapid presses queue.
- Moving house: old furniture goes to storage and is remembered; a new home gets only a bed; moving back restores it.

## MVP-style camera and parking pad (supersedes the glass carport and far camera above)
- Camera copied from the MVP (`lagos-life-3d`): azimuth 0.62, polar 1.0, distance `(span * 1.15 + 3.2)` with a wider factor on portrait screens, target at 30% of wall height. Same for every home. Swipe limits and the 90 degree button are unchanged.
- Parking is a small low pad (tan border, green inset) beside the house with the placeholder cars on it and a P sign behind; no canopy, no paved plot. Ground is a soft grass island; the open front/right edges get a thin trim rim instead of walls.

## Final pass: floor plans, per-room floors, small parking pad, camera pan
- Homes 3-6 redrawn so rooms no longer sit in rows: bedrooms at offset corners, WC/kitchen tucked in, living areas wrap round as L-shapes (open-plan zones merge into one room). Home 1 stays one open room; home 2 keeps only its WC corner. Footprints unchanged. `validate:content` now prints room areas and fails on a strip-like room, a bedroom over 20% of the floor, or living over 75%.
- Floors: kitchens are always white ceramic, bathrooms/WCs pale diamond tile. The Floors picker has a room chip row: "Living & bedrooms" (home-wide, skips kitchen and bathrooms) or any single room. Stored per room in `finishStore` (`rooms`), resolved per zone by `floorIdForZone`.
- Parking: homes 1-3 have one bay, 4-6 two. The pad, cars and P sign only exist while the player owns a car (one pad bay per car, up to the bays); no car = no pad. Bays are 2.0 x 3.6 and the placeholder cars are drawn at 0.6 scale.
- Camera: a vertical swipe now slides the view up or down a little (clamped, `PAN_RANGE` in `cameraStore`); elevation is still fixed.

## Reference floor plan (homes 3-6)
- Homes 3-6 are one design scaled to their square footprint, copied from the reference screenshot: a rear room over a big pale room on the left; the right half split at different heights into a spacious back room, a small middle room and a front room (T-junctions, not rows). Brown wood bedrooms, beige right-hand room, white ceramic kitchen, pale diamond-tile bathrooms. Home 3: kitchen + WC + living; 4: 2 bedrooms + WC; 5: 2 bedrooms + kitchen + WC; 6: 3 bedrooms, kitchen, 2 bathrooms (one en suite).
- Homes 1 and 2: unchanged interiors and no parking at all. Home 3: one bay; homes 4-6: two bays (only drawn when a car is owned).

## Rectangular rooms, lighting, camera centring
- Homes 3-6 redrawn again: every room is a plain rectangle, rectangles tile the square exactly (all walls meet), one living room acts as the hub and most rooms have a door onto it, plus doors between neighbouring rooms. One WC per home, always on the front or right outer wall; no pockets or L-shaped living areas. The WC accepts furniture like any room (`furnishable`), and all homes have exactly one bathroom (home 6 dropped from two to one).
- Lighting: every room has its own warm ceiling point light (soft by day, bright at night; 5 lights max, the two smallest neighbours share one in a 6-room home), and floor lamps carry their own light. Quality tiers low and up keep them; only `minimal` drops them.
- Camera: framed and centred on the house only (fixed margin, wider on portrait phones). The parking pad is separate and may run off screen. Vertical swipe or the mouse wheel slides the view a little (ctrl + wheel zooms).

## Not done yet
GLB vehicle loader, investment upgrades, free-angle furniture rotation.

## Bug fixes: lighting, camera tilt, round ground
- **Interior lighting no longer fades.** Cause: `PerfGovernor` steps the graphics tier down on slower phones and the lowest tier (`minimal`) turned the room lights off, so the interior went flat a few seconds after loading. Lights are now on in every tier; tiers only lower resolution (and the last one drops shadow maps). Verified by forcing the lowest tier: brightness 137.5 -> 139.8 (was dull before).
- **Camera tilt.** The vertical drag no longer slides the view. It now tilts the camera around the house between `POLAR_MIN` 0.7 (more top-down) and `POLAR_MAX` 1.2 (lower), default unchanged at 1.0; finger down looks more from above. Rotation, zoom and the rotate button are unchanged. Tuning constants are documented in `docs/DEVELOPER.md` section 12.
- **Round ground.** The square grass strip in front of the house was the `entry` zone drawn as a rectangle. Open-air grass zones are no longer drawn; a `GroundDisc` (grass disc, lighter ring, thickness) sized from the plot replaces the old oversized island. Navigation zones are untouched.
- New test: `tests-browser/test_lighting_camera.py`.

## Houses, walking, animations, AFK, expanded Lagos map, ads
- **Green "Entrance" strip removed** from all six homes at the shared source (`layoutBuilders.ts`); doors, walls, parking and furniture untouched. Validator updated (it used that zone as its start room).
- **Walking:** `world/navigation.ts` (grid + A*, doors respected, furniture avoided), `actorStore` intent, rewritten `AvatarWalker`: tap floor to walk; tap furniture to walk there, face it, then start. Cost is charged on arrival. Sleeping no longer hovers (back meets the mattress). Poses/animations for eat, drink, cook, type, piano, read, wash, shower, dance, push-up, TV; blue cover while bathing; clean exit from seats/beds/tubs.
- **AFK:** new closed-list cosmetic system (`game/afk.ts`), 15 s, never touches needs or money.
- **Lagos map:** data-driven layout (13 districts, road graph with major/secondary/local + bridges), airport with animated flights, Apapa port, Eko Atlantic, Eko Hotel, government landmarks, 10 more billboards.
- **Selector and tabs:** Lagos / Abuja / Port Harcourt / Edo State (only Lagos playable), Ads / Government / Sea.
- **Ads:** billboard inventory and sheet, Sea Ads on the real water with picker, simulated checkout, Draft/Pending/Active/Rejected/Expired, 3-day timestamp expiry, browser-local persistence, dev moderation. See `docs/ADS_AND_MAP.md` for limits.
- Tests added: `scripts/navTest.ts`, `scripts/adsTest.ts`, `tests-browser/test_ads_flow.py`, `test_navigation.py`. Existing smoke test updated for walk-then-start.

## Billboard locations and gym mat
- Billboards now show where they are in words (airport, "Near Eko Hotel and Suites", named road) in the inventory, wizard, review and sheet. Board id `lagos.bb.oshodi` was renamed `lagos.bb.ikorodu-road` and two boards were nudged so their labels are accurate.
- New procedural **Gym mat** item (Fun, ₦45,000) with push-ups, new `exclusive` placement flag, and AFK push-ups now work. `test_interact.py` updated for walk-then-start.

## Map redesign, HUD, character effects, profile
- Map: city dropdown (Lagos here, others Coming soon), Names toggle, More dropdown (Billboards, Neighbours, Sea Plots, Government, Walk soon); top-down map, drag to pan, pinch/wheel to zoom, no rotation. Old category tabs removed. `tests-browser/test_ads_flow.py` updated.
- HUD: shared `ui/HudPill.tsx` on home and map (time, mood, online, sound, cash with + to bank).
- Avatar: thought bubbles for every object it uses, flies when hygiene is low.
- Stats bar now has a procedural portrait; tapping it opens a profile sheet (Profile with 3D preview and appearance editing, Needs, Goals, Skills, Career, People).
- New `docs/FEATURE_AUDIT.md`: first audit of the big economy/social brief and the proposed phase order. None of that brief is implemented yet.
