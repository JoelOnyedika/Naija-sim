# Nigeria Life - improvement pass

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

## Not done yet
GLB vehicle loader, investment upgrades, free-angle furniture rotation.
