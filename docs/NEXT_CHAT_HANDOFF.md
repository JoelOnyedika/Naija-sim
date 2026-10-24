> **STATUS: ACTIVE.** When every item in section 5 is finished and verified, the next chat must **delete this file** (`docs/NEXT_CHAT_HANDOFF.md`) and remove any mention of it from `CHANGES.md`. If it cannot delete it, it must change this line to `STATUS: COMPLETED / OBSOLETE. Do not follow this file.`

# Nigeria Life: handoff to the next chat

You are continuing an existing project. Do not rebuild it. Read this whole file first, then `CHANGES.md` (newest work is at the top) and `docs/SYSTEMS.md`.

The owner (Joel) works from a phone and often dictates, so messages can be loose. Reply in plain language, show real results, and be honest about what is and is not finished. He has been told repeatedly that nothing will be claimed unless it was actually run.

## 1. What this is

A mobile-first 3D Nigerian life simulator in the browser. React + TypeScript + Three.js (react-three-fiber), zustand stores, vite. No backend exists. Everything that touches money, other players, chat, jail timers or rewards is a **local simulation with a hand-off point** for a future server (section 6).

Commands (run from the project root):
- `npm ci` then `npm run test:all` (typecheck, content validation, all test scripts) and `npx vite build`.
- A single test: `npx tsx scripts/<name>Test.ts` (new ones: `v8Test`, `petTest`, `petStatsTest`, `activitiesTest`, `catalogueTest`, `mapTest`, `uiGuardTest`, `wallPatternTest`, `adsProvidersTest`, `referralsTest`, `venuesTest`).
- Dev server: `npx vite --port 5173 --host 127.0.0.1`. Browser tests use Python Playwright (see `tests-browser/`).

State at handoff: `npm run test:all` passes (all 25 groups) and `npx vite build` succeeds. The new venue UI screens have NOT been checked in a browser (section 4).

## 2. The rules from the owner's original brief (still binding)

- Preserve working features and architecture. Extend existing systems; never create parallel inventory, camera, needs, activity, pricing or furniture systems. Do not delete working features. No broad unrelated refactors.
- Honesty: no fake success messages, no buttons that do nothing, no claiming something works unless it was run. Report incomplete work plainly. Never claim multiplayer, real ads, real payments or browser verification that did not happen.
- Never put secrets or API keys in the client. Do not simulate secure multiplayer or payments in the frontend.
- AFK stays exactly four cosmetic behaviours: eat, watch TV, push-ups (only if a gym rug exists), relaxed idle. AFK must never trigger toilet, showers, sleeping, piano, dancing or anything else, and must not change needs or money. `scripts/v8Test.ts` and others check this; keep them green.
- Houses keep square footprints, no garages (out of scope), no windows on the two camera-facing exterior walls, Lapo Baby house exactly one customisable window on a non-camera-facing wall, luxury house square. **I never re-verified these during this work**; check them (section 5, item 9).
- In-game naira only. Never imply real-money payouts.
- Prices go through `priceOf()` in `src/game/pricing.ts` (global multiplier 0.1 to 0.9, default 0.5 = unchanged prices).
- Performance: reuse geometry and materials, no per-object lights, no heavy particles.

## 3. What is done (all tested; file pointers)

- **Interior walls** taller (`INTERIOR_WALL_HEIGHT` 1.4 in `src/data/balance.ts`). **Wall-mounted items** no longer buried (`getTransform` in `src/world/placement.ts`). **Camera zoom on placement** (`PLACE_FOCUS`, `cameraStore.focus`, `CameraRig`).
- **Shared pricing** `src/game/pricing.ts`. **Item info (eye) panel** `src/game/itemInfo.ts` + `ItemInfoSheet` in `BuyMode.tsx`; the close bug is fixed (guarded by `scripts/uiGuardTest.ts`).
- **NEPA outages + backup power** (Ibeta tap, auto generator, solar): `src/game/power.ts`, `stores/powerStore.ts`, `three/property/Lighting.tsx`, `PowerBadge`.
- **Pets** (cat, dog, lion, ball) with behaviour `world/petBrain.ts`, models `three/models/pets.tsx`, layer `three/property/Pets.tsx`, **pet stats** (bond, hunger, mood) `stores/petStore.ts`, `game/petCare.ts`.
- **Central activity table** `src/data/activities.ts` + swipeable **action menu** `features/game/ActionMenu.tsx`. Desk, speaker, disco light, ring light, camera, DJ deck, pets and the venue objects use it. Single-activity objects stay one tap.
- **Catalogue**: 64 furniture items total (35 original + 29 new), models in `three/models/catalogue.tsx` and `three/models/venue.tsx`. Venue items (`venue: true`, ids `v_*`) are hidden from the shop.
- **House Design tab** after Storage; 53 wall finishes, 22 seamless procedural patterns (`three/textures.ts`, `data/finishes.ts`).
- **Map**: tilt 43 degrees (`MAP.polar`), blue water, billboards 2.6x (`MAP.billboardScale`).
- **Ads provider layer** `src/game/ads/providers.ts` + `docs/ADS_PROVIDERS.md`. The Google provider is deliberately inert (AdMob is mobile-SDK only; AdSense policy forbids altering delivery, so it cannot fill a 3D billboard texture).
- **Referrals**: `game/referrals.ts`, `stores/referralStore.ts`, `features/phone/apps/Invite.tsx`, onboarding task `invite` (tap in task panel opens the phone on Invite). Rules: friend spends 15,000, inviter earns 1,000 (`REFERRAL` in balance.ts). Selling an item back now records a `refund` so it cannot fake spend.
- **Venues (built this last stretch; logic unit-tested in `scripts/venuesTest.ts`)**:
  - Framework: `data/interiors.ts` (7 templates: market, church, gallery, stadium, club, showroom, jail; bound to landmarks via `LANDMARK_INTERIORS`), `world/interiors/build.ts` (layouts + venue items), `game/interiors.ts` (`enterInterior`, `leaveInterior`, `travelToVenue`), `game/instances.ts` (capacity 10, `SimulatedServer`, `npcCountFor`), `stores/interiorStore.ts`, `features/game/InteriorShell.tsx` (Leave bar, chat button, jail countdown), `game/active.ts` (the active "home" becomes the venue while inside).
  - NPCs: `data/npcs.ts`, `three/property/Npcs.tsx` (same walking grid as the player; spacing; NPC count = capacity minus real players).
  - Chat: `game/chat.ts` (validation, channels `local:<kind>:<copy>` and `global`, transport stub), `stores/chatStore.ts`, `game/chatter.ts` (NPC lines, local only), `features/game/InteriorChat.tsx`.
  - Hustles: venue entries in `data/activities.ts` (market stall pays 5,000 once on completion, church, gallery, stadium, kiosk, club); amounts come from `game/authority.ts`, never from the client.
  - Crime/jail: `game/crime.ts` (50% base, minus 2% per wanted point, min 15%; sentence 10 min + 5 per point, max 2 hours), `stores/jailStore.ts` (start/end timestamps, keeps running offline), jail venue, restrictions (no leaving, no other venues, no map/buy while jailed). Config `CRIME` in balance.ts.
  - Club: `data/club.ts` (options, thresholds, cooldown), `game/club.ts` (`buyClub`: records receipt/announcement only after the money is really taken), `stores/clubStore.ts`, `features/game/VenueSheets.tsx` (club menu, receipt, banner), `game/receiptImage.ts` (local PNG).
  - Showroom (Polanco Motors): `data/showroom.ts` (one podium per vehicle; `VEHICLE_MODELS` is empty so every car is a labelled placeholder), `three/models/VehicleDisplay.tsx` (GLB loader with fallback), `three/property/Showroom.tsx`, `game/vehicles.ts` (`buyVehicle` only works inside the showroom), phone `Cars.tsx` now asks to visit Polanco Motors instead of buying.

## 4. Known problems and unverified things (be honest about these)

- **Browser-verified (headless Chromium, 390x844, real taps unless noted):** market, church, gallery, stadium, club and showroom all render and are fully in frame (camera now widens for venues, `CameraRig.tsx`). Chat sheet opens by tapping the header button, sends a message, NPC name tap opens a menu with "View profile". Club menu (opened through `uiStore.setClubMenu`, not by tapping the bar in 3D), picking an option, paying, receipt sheet, big-spender banner all work and money drops correctly. Showroom vehicle sheet (opened through `uiStore.setShowroomVehicle`, not by tapping a podium) shows price, placeholder warning, and the "Omo, your money no reach." toast when broke. Receipt "Transaction" row overlap fixed.
- **Also verified now:** NPC profile sheet (opens from the chat menu, shows the pickpocket odds), pickpocket success toast (+₦5,000) and arrest (needs the player within 2.4 of the NPC; I moved `livePlayer` in the test), the jail screen (barred cell, "Police cell, Time left" pill, no Leave button), and the market stall's swipeable action menu ("Sell wares" +₦5,000). Club now has a dark glossy floor and three sweeping coloured lights (`ClubLights` in `three/property/Npcs.tsx`, floor override in `PropertyEnvironment.tsx`).
- **Still NOT viewed:** tapping the bar/podium/stall objects in 3D with a real tap, church hustles, release from jail when the timer ends, a successful car purchase, the club entered through the Quilox landmark (to confirm the branded name shows).
- The speech bubble seen beside the player in venues is the cosmetic AFK "relaxed idle" emoji (allowed behaviour), not a bug.
- Club visuals look weak: floor pale, no coloured party lighting or moving lights, the venue header says "Club" rather than a branded name. The brief wants a premium, energetic, Quilox-inspired nightclub with coordinated lighting and dance animations; that polish is not done.
- NPCs sometimes stand close to the player; they never sit or dance.
- Visiting a venue still charges the old landmark entry fee (`landmark.visit.cost`).
- The `jail` venue has no way to be visited by choice; it only happens through arrest (correct) but it has had no visual review.
- The venue test checks reachability numerically; furniture may still look cramped.
- A flaky older test (careers) was fixed by pinning `Math.random`; if other tests flake, check the Lapo random money gift in `src/game/loop.ts`.
- Earlier I wrongly said the catalogue had 74 items; it is 64. Re-count before quoting numbers.

## 5. Remaining work (do these, in this order)

1. **Finish browser verification** of the items listed under "Still NOT viewed" in section 4 (tap 3D objects, hustles, pickpocket, jail, NPC profile, successful car purchase) and fix what is broken. Use the Playwright tips in section 7.
2. **Club polish (floor and coloured lights done, rest open)**: confirm the branded name (landmark is "Quilox"; keep original assets, nothing copied), DJ booth animation, dancing NPCs or a dance animation for the player, big-spender banner and receipt looking good on a phone. Check `DiscoLight` behaviour inside the club (it reacts to `party`; consider an always-on club mode).
3. **Showroom polish**: nicer room, branding, podium lighting; keep the GLB loader. When the owner supplies `.glb` files, put them in `public/models/` and list them in `VEHICLE_MODELS` in `data/showroom.ts`. Do not present placeholders as real assets.
4. **Venue content depth**: more activities and decorations per venue (church services feel, gallery wall art, stadium crowd, market clutter), NPCs sitting where it makes sense, no door blocking. Keep AFK untouched.
5. **Catalogue gaps from the brief**: laptops and computer accessories, bed and wardrobe variety, worktables/desk variants, a separate inverter item, more pet toys and gear, more lamps/lighting. Each new item needs: model in `three/models`, row in `data/items.ts`, entry in `three/models/registry.tsx`, activity (if functional) in `data/activities.ts`, usable spot in `world/navigation.ts` SPECS, bubble in `world/bubbles.ts`. `npm run test:catalogue` checks the model/registry agreement.
6. **Move more objects into the activity table** (TV, bed, shower/jacuzzi, dining, gym, piano etc.) where it makes sense, keeping the toilet one-tap and preserving old behaviours and task events.
7. **Needs and stats**: the brief lists hunger, health, hygiene, energy, bladder, fun, fitness, charisma, coding, social skill, creator skill. The existing stats/skills already cover these under other names (fitness = fitness skill, social skill = communication, creator = creativity). Do not add duplicates; check whether a visible "fun" or "health" gap really exists and decide with the owner if needed.
8. **Admin-ready configuration**: balance values live in `src/data/balance.ts`, `data/activities.ts`, `data/club.ts`, `data/finishes.ts`. Make sure every value the brief names (pricing multiplier, activity effects, hustle rewards, club prices, referral thresholds, NEPA frequency, backup power prices, crime rules, interior capacity) is reachable from one validated place. Do not build the dashboard.
9. **Re-verify the house rules** (section 2): square footprints, no garages, no windows on the two camera-facing walls, exactly one window on the Lapo Baby house on a non-camera-facing wall, luxury house square. Fix only if broken, and add a test.
10. **Documentation**: write the venues/crime/club/showroom section in `CHANGES.md` and `docs/SYSTEMS.md` (they currently stop at pets/referrals/ads), including the backend hand-off list below.
11. Final: `npm run test:all`, `npx vite build`, rebuild the zip, give the owner a plain honest report (done / partial / not done / how to run), then **delete this file**.

## 6. Backend hand-off points (what a server must own later)

None of these is secure today; each is a clearly named boundary with a local stand-in:
- Chat delivery, membership, moderation: `ChatTransport` in `game/chat.ts` (`setTransport`).
- Instance assignment and the 10-person cap: `SimulatedServer` / `getDirectory` in `game/instances.ts`.
- Activity rewards: `RewardAuthority` in `game/authority.ts` (`setAuthority`). The client only says which activity finished.
- Crime dice, sentences and the clock: `CrimeAuthority` in `game/crime.ts` (`setCrimeAuthority`); jail timestamps in `stores/jailStore.ts` must live server-side.
- Club purchases/receipts/announcements: `game/club.ts` (one function to replace).
- Referral codes, counts, qualification and payouts: `stores/referralStore.ts` (`applyServerReward`, `applyServerSummary`, `outbox` of claims).
- Ad delivery: `AdProvider` in `game/ads/providers.ts` (read `docs/ADS_PROVIDERS.md` first).
- Pricing multiplier ownership: `setAffordability` in `game/pricing.ts`.

## 7. Practical lessons (save yourself time)

- **Never create a file with `cat > path` without checking it does not already exist** (`ls`/`grep` first). Earlier in this work two existing files (`three/models/venue.tsx`, `game/authority.ts`) were overwritten by mistake and had to be rebuilt. Compare with the original project if unsure (the owner's original upload was `nigeria-life-v7.zip`).
- Do not trust remembered state; re-read files before editing, and run `npx tsc --noEmit` after each change.
- Tests use `scripts/mockStorage.ts` and often pin `Math.random`. New stores must be reset in `startNewLife` (`src/game/life.ts`).
- Browser testing: the loading overlay can cover the page for a minute on software rendering. Wait until `document.elementFromPoint` at the bottom nav returns the Home button before clicking. Use real mouse clicks (a dispatched click skips the "is anything covering it?" problem and hides bugs like the info panel that could not be closed). The dev server may stop between commands; restart it in the same command. Bobbing map pins fail Playwright's "stable" check, so use `dispatch_event('click')` for those only.
- Overlays placed inside the `pointer-events-none` game layers need `pointer-events-auto` (that was the info-panel close bug). `scripts/uiGuardTest.ts` guards two of them; add new sheets to it.
- Keep all copy Nigerian-flavoured and friendly where the brief asks for it (for example "NEPA take light").
