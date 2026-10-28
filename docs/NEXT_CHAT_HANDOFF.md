> **STATUS: ACTIVE.** When every item in section 5 is finished and verified, the next chat must **delete this file** (`docs/NEXT_CHAT_HANDOFF.md`) and remove any mention of it from `CHANGES.md`. If it cannot delete it, it must change this line to `STATUS: COMPLETED / OBSOLETE. Do not follow this file.`

# Nigeria Life: handoff to the next chat

You are continuing an existing project. Do not rebuild it. Read this whole file first, then `CHANGES.md` (newest work is at the top) and `docs/SYSTEMS.md`.

The owner (Joel) works from a phone and often dictates, so messages can be loose. Reply in plain language, show real results, and be honest about what is and is not finished. He has been told repeatedly that nothing will be claimed unless it was actually run.

## 0. Owner feedback (Oct 24, read this before anything else)

The owner was disappointed with v9. These are binding, in his words' spirit:

- Interiors must look **gorgeous**, like his reference screenshots (a city-street viewing centre: cutaway room, signage, people, plants, TV, bar, benches), not a grey box. They must sit **inside the city** (street, plaza, buildings, palms), never on a green ground disc and never in front of a flat skyline picture. The long-term plan is a top-down camera over a real 3D open-world map with a third-person player who can drive between locations, so every venue is a piece that will later sit in that map.
- **Every landmark needs an interior** (only 10 of 33 had one in v9) with **things to do** that change stats: e.g. viewing centre = argue football (free, +fun +social), fight the Agbero (risky, +fun -energy, charisma/justice), pickpocket for cash or jail.
- **Chat** (DONE in v9.2, `InteriorChat.tsx`: header with Local/Global, home and collapse; input; Spots here chips; activity cards; Players here row; seen in screenshots for the market and club; NOT built because they would be buttons that do nothing: camera, mic, share) was to be redesigned like his reference: compact bottom panel, header icon row (camera, expand, venue, mic, share, spots, map, home, collapse), "Say something to all N here...", "Spots here" chips (tap to walk there), "Players here" avatar row, and spot activity cards with Free/Risky tags, seconds and effect chips.
- **Map location sheet**: title, area, description, share link, what is offered (chips), who is here, player shops, and travel options with prices (Trek free, Keke, Danfo, Okada, Cab, own car) and a Go button; a loading screen for travel for now (driving animation later). **The map must be wider** with more billboards; nothing may look conjoined.
- **Venue street** (DONE in v9.1, `VenueSurround.tsx`): venues sit in a 3D street with buildings, palms, lamps, cars and a name sign. Still to do: much better detail INSIDE each venue room.
- **Task progress** is a small circle at the top left (ring, emoji, name, seconds, cancel), with a queue of next activities. Done in v9.1 (`ActivityChip.tsx`, `queueStore.ts`).
- **No UI may overlap another.** The venue header, activity circle and task badge now stack in one left rail (`useRailTop` / `useTasksTop` in `ActivityChip.tsx`). When you add anything to a corner, add it to that stack.

### Visual QA rules for every future chat (mandatory)

1. After any UI or 3D change, run the app (`npx vite --port 5173`), open it in headless Chromium at 390x844 (see `tests-browser/lib.py`, `boot` and `seed`), take a screenshot and LOOK at it with the image viewer. Do not report a screen as done from unit tests alone.
2. Check every screen state that can appear together: home, inside each venue, with an activity running, with a queue, with the task list open, with chat open, with the phone open, with a toast showing. Look for overlap, clipped text, things off the edge of a phone screen, empty boxes, and double headers.
3. Check both an empty state and a busy state (10 NPCs, long names, big numbers such as N569B).
4. Compare with the owner's reference screenshots (a viewing centre, the chat panel, the location sheet). If yours looks plainer, it is not finished.
5. Say plainly in the report what you saw and what you did not look at. Never claim a screen works because the code compiles.
6. The sandbox draws emoji as blanks in some screenshots; check emoji by reading the DOM text, not only the picture.

## 0b. Status after v9.3 (what changed since the owner's feedback)

DONE and seen in screenshots:
- **Every landmark opens an interior** (34 of 34): 22 venue templates in `data/interiors.ts` (7 old + viewing centre, eatery, bank, mall, cinema, live music, hotel, tech hub, park, beach, club house, government office, business tower, airport, port). Each landmark maps to a template in `LANDMARK_INTERIORS`; the sign in front shows the landmark's own name. `venuesTest` fails if a landmark has no interior.
- **Prop kit** (`data/venueKit.ts` = sizes, activities, walk-up specs; `three/models/kit.tsx` = the 3D models): 44 props with things to do. Add a prop by adding a row in `KIT` and a model in `MODELS`.
- **Surroundings** (`three/property/VenueSurround.tsx`): street, park, beach with sea, container port. Floor tint/shine per venue (`floorTint`, `floorRough`).
- **Risky activity**: `UseDef.risk` (win chance, win/lose effects). "Fight the Agbero" at the viewing centre uses it; tested both ways. A real server must decide the roll.
- **Map location sheet** (`features/map/LocationSheet.tsx`): description, what is there, who is here (NPCs offline), travel modes with prices (Trek free, Keke, Danfo, Okada, Cab, plus your own cars free), a travel loading scene, fare refund if entry fails. Fares are balance values for a server to own.
- **Wider map** (`content/lagos/spread.ts`, `SPREAD = 1.4`): land, roads, areas, landmarks and billboards are spread; building density is divided by SPREAD squared; the airport and port scenery is drawn inside a group scaled by SPREAD. 18 more billboards were added (some removed again where tests found them on landmarks).

STILL OPEN (do these next, in order):
1. **Interiors, next round** (v9.4 added `three/property/VenueDecor.tsx`: wainscot and trim, framed art, banners, neon and name signs, windows, shelves, clocks, string lights, rugs and coloured drifting lights per venue type; seen in screenshots for 12 venues, the park/beach/port/market/church/gallery/stadium/club/showroom recipes are thinner). v9.5 added full recipes for the market (hanging fabrics, bunting, produce and fabric stalls), church (stained glass, red aisle runner, sconces, light shafts, choir, candles, flowers) and showroom (neon brand sign, glowing podium rings with light columns, gloss floor, spec boards, reception, lounge, coffee bar, detailed stand-in cars in `models/VehicleDisplay.tsx`), plus lighter ones for gallery, stadium and club. v9.6 gave gallery (spotlit plinths and a sculpture), stadium (pitch lines, goals, sponsor boards), club (animated dance floor, sweeping beams), park (flower beds, pond), beach (towels, sandcastles, lifeguard tower) and port (lane markings, cones, bollards) full recipes; every venue now has a recipe in `VenueDecor.tsx`. Still to do: more props per room; per-venue music and sound; NPCs doing venue-specific things (eating, dancing, queuing). Compare with the owner's reference (viewing centre with a bar, TV, benches, sofas, plants, a pool table, a green wall).
2. The map's centre (Lagos Island / Victoria Island) still has many pins close together because those land slabs are small. Enlarge those slabs or move landmarks apart; keep them on land (`test:map` checks).
3. The map pins are a fixed pixel size, so they still crowd when zoomed out. Consider smaller pins or clustering at low zoom.
4. Start of the open-world step (third-person player, drivable car): not started. The venues are written as pieces that can later sit in that map.
5. Camera, mic and share buttons from the owner's chat reference are not built (they would do nothing yet).

## 0c. Owner's latest instructions (Oct 25) and what v9.7 did

- **Do NOT start the open-world / drivable map yet.** Everything else first.
- **Every venue must have its own tasks that raise charisma, social, skills and money, with a strong Nigerian flavour** (named vendors and people, Naija jobs and slang). Examples he gave: a tech venue with a hackathon and meeting the OneNaija CEO; a betting centre with fist-fighting the Agbero; a market with named vendors (Alhaji Dansiru: buy or negotiate), and a loading bay (load the trailer: lose energy, gain cash).
  DONE in v9.7 (`data/venueKit.ts`, models in `three/models/kit.tsx`): Mama Chioma's foodstuff, Alhaji Dansiru's fabrics (negotiate), Auntie Bisi's fruits, loading bay, pulpit and offering box (church), artist's talk (gallery), street match at the goal (stadium), dance battle (club), betting shop and Agbero fight (viewing centre), photo wall and food court (mall), red carpet (cinema), summit desk (hotel), hackathon sign-up and OneNaija CEO booth (tech hub), open mic and yoga (park), Auntie Ronke's roasted corn (several venues), putting green (club house), Commissioner's office (government), boardroom (business tower), duty free and taxi rank (airport), customs desk (port), sales rep Mr. Emeka (showroom). Gambles use `UseDef.risk` (`winChance`, `winMoney` paid through the reward authority, `winEffects`, `loseEffects`); `venuesTest` fails if a staked gamble has a positive expected value. v9.8 added: **vendors** standing behind their own stall or counter (67 across the venues, named Nigerian shopkeepers in `data/vendors.ts`, tappable, in your DMs, behind the prop or beside it when it hugs a wall); **name tags** over people near you (vendors yellow, `three/property/Npcs.tsx`); **venue sound** (`audio/ambience.ts`, started by `hooks/useAmbience.ts`): each venue type has its own live-synthesised atmosphere (crowd murmur, church pad and bell, beach waves and gulls, airport chime, port horn, stadium cheers, keyboard clicks, lounge chords...) and turns the background afrobeat loop up or down (`setMusicLevel` in `audio/music.ts`: full in clubs, off in church and cinema); the speaker button switches it all off. It is checked by loudness (`measureAmbience`), nobody has listened to it: have a person listen and tune the levels. Still open: recorded audio instead of synthesis, vendors reacting when you buy, more tasks per venue (each has 1 to 4 props with tasks).
- **Venue panel is always on screen, no "open chat" button** (`features/game/InteriorChat.tsx`): a docked card at the bottom with the latest message and a text box; tap the handle or the up arrow to unfold it (messages, "Spots here" chips with task cards, "The crowd" spot with Chat / Pick someone's pocket, "Players here"). Camera button saves or shares a picture of the 3D scene (`three/capture.ts`, `CaptureBridge`). The double-arrow button folds the bottom menu away behind a hamburger button (bottom right); tapping the hamburger brings it back. The stats widget and other bottom pieces sit above the panel via the CSS variables `--dock-gap` and `--panel-h`. If you add a bottom element, use them.
- **Person profile** (`features/game/NpcSheet.tsx`): avatar, name, role (Nigerian jobs by venue, in `data/npcs.ts`), a conversation starter, four quick conversations (Say hello, Gist, Crack a joke 60%, Hype their outfit) that send a REAL message into the phone's Messages with that person and get a reply a moment later (`game/talk.ts`, one-minute cooldown per line), a button to open the chat, and the pickpocket option marked Risky. Venue people are chat contacts via `resolvePeer` (`game/peers.ts`).
- Still open from this feedback: richer message screens in the phone (the thread header shows role and where you met), more reply variety, NPCs remembering you, relationships.

## 0d. v9.9 (final state of this session)

- **Vendors react** when you buy, work, haggle, win or lose at their prop: a speech bubble and a small nod (`game/vendorReact.ts`, `stores/vendorTalkStore.ts`, `VendorActor` in `three/property/Npcs.tsx`; lines in `data/vendors.ts`). Confirmed in the page (bubbles appear).
- **Many more tasks**: about 100 new props with 2 to 4 tasks each (`data/venueKit2.ts`, drawn by the shared booth factory `three/models/booths.tsx`), placed automatically along free wall space (`autoPlace` in `data/interiors.ts`; each venue grows 2 to 3.5 m to fit). About 420 distinct venue tasks now (market 33, mall 25, eatery 23, tech hub 23, park 22, viewing centre 22, hotel and concert 21, airport 21, others 12 to 20; club has 12 and the stadium 16, the thinnest). 100+ more vendors have names and lines. Tests: staked gambles must have a negative expected value; vendors must stand inside the room; every prop has a registered model.
- **UI fixes from the owner**: the big profile and stats block is gone inside venues, replaced by a small needs strip in the left stack under the activity circle (`features/game/StatsStrip.tsx`; tap it for the profile); the notification banner is now centred (the old transform was overridden by the animation library); one shared task card (`ui/TaskCard.tsx`) for both the action menu and the venue panel (centred icon, time, tags and text; titles clamp to two lines; chips never overflow); the action menu opens above the venue panel; the panel scrolls.
- **Animation ideas**: `docs/ANIMATION_IDEAS.md` (the owner will start on animation next): a tiny cinematic player, a pose library, particle presets, and about 60 scene ideas (Agbero dust-cloud fight, reckless Polanco test drive, danfo/keke/okada rides, pickpocket and arrest, hackathon, pepper soup challenge, haggling, power outage, and more) with Nigerian humour, how to build each procedurally, and effort estimates.
- **Performance** (measured with the dev hook `window.__r3f`, `three/property/CaptureBridge.tsx`): the extra props pushed the busiest venue to about 3,800 draw calls and 1.2M triangles. Fixes: thin and tiny box parts are plain boxes that do not cast shadows (`three/models/primitives.tsx`), fewer decorative meshes in the street and on stalls, and people far from the player are drawn as a 4-part simple figure while nearby ones keep the full avatar (`SimpleFigure` in `Npcs.tsx`). Now about 1,900 calls and 0.26M triangles in the market and 400 to 900 in most others. The market and tech hub are still the heaviest. **Test on a real mid-range phone**; if it stutters the next steps are instancing repeated props and merging static geometry.
- **Still open**: the open world is untouched (owner said not yet); the map's centre still has crowded pins; the club and stadium could take more tasks; audio is synthesised, not recorded; vendors only react at their own prop.

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
- Houses keep square footprints, no garages (out of scope), no windows on the two camera-facing exterior walls, Lapo Baby house exactly one customisable window on a non-camera-facing wall, luxury house square. Re-verified and now guarded by `npm run test:houses` (all 6 properties square, no garages, windows only on back/left walls, the Lapo Baby starting house has exactly 1 window); the test is part of `test:all`.
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
5. **Catalogue gaps from the brief** (laptops and computer accessories are DONE: `student_desk`, `standing_desk`, `workstation`, `printer_station`, models in `three/models/computers.tsx`, seen placed in a home and the workstation menu opened, but not zoomed in for a close look at the models; still open): bed and wardrobe variety, worktables/desk variants, a separate inverter item, more pet toys and gear, more lamps/lighting. Each new item needs: model in `three/models`, row in `data/items.ts`, entry in `three/models/registry.tsx`, activity (if functional) in `data/activities.ts`, usable spot in `world/navigation.ts` SPECS, bubble in `world/bubbles.ts`. `npm run test:catalogue` checks the model/registry agreement.
6. **Move more objects into the activity table** (TV, bed, shower/jacuzzi, dining, gym, piano etc.) where it makes sense, keeping the toilet one-tap and preserving old behaviours and task events.
7. **Needs and stats**: the brief lists hunger, health, hygiene, energy, bladder, fun, fitness, charisma, coding, social skill, creator skill. The existing stats/skills already cover these under other names (fitness = fitness skill, social skill = communication, creator = creativity). Do not add duplicates; check whether a visible "fun" or "health" gap really exists and decide with the owner if needed.
8. **Admin-ready configuration**: balance values live in `src/data/balance.ts`, `data/activities.ts`, `data/club.ts`, `data/finishes.ts`. Make sure every value the brief names (pricing multiplier, activity effects, hustle rewards, club prices, referral thresholds, NEPA frequency, backup power prices, crime rules, interior capacity) is reachable from one validated place. Do not build the dashboard.
9. ~~Re-verify the house rules~~ Done: `scripts/houseRulesTest.ts`.
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
