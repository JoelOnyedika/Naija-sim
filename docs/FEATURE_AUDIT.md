# Feature audit

Per-feature behaviour, rules and limits are in `SYSTEMS.md`. This file is the status table for every app and the list of what is still open. All numbers below were checked by the test suites named in `SYSTEMS.md` section H.

## Reused, not duplicated
`economyStore` (the only money and ledger), `phoneStore` (apps, notifications, every chat), `clockStore` (game time), `propertyStore`, `vehicleStore`, `inventoryStore`, `skillStore` (extended, not replaced), `statsStore` (Charisma stays a stat), `characterStore.ownedClothes` (the one wardrobe), `authStore` (mock accounts), `mapStore` (current city). New stores only hold new state: bank, scheduler, career, social, hustle, land, company, legal, family, games, ride, grocery.

## Status of every app

| App | Status | Notes |
| --- | --- | --- |
| Bank | Done | 9 sections, income tax on |
| Jobs | Done | 32 careers; shifts simulated |
| Contacts | Done | Mom is a scripted contact; players simulated |
| Messages | Done | requests, groups, privacy, pins, notification toggles |
| Hustle | Done | escrow tested; other players simulated |
| Invest | Done | land by city, markets (random prices), portfolio |
| Companies | Done | one generic simulation scaled per business type |
| Court | Done | simulated proceedings, no money awards |
| Police | Done | simulated; no real records |
| Ride | Done | simulated trips |
| Grocery | Done | orders are records; pantry list |
| Boutique | Done | full screen; bags not drawn on character |
| Forbes | Done | podium; local leaderboard |
| Family | Done (partial by design) | status Single; marriage not available |
| Games | Lobby only | Ludo gameplay not built |
| Settings | Done | email visibility and account lock disabled with reasons |
| Food, Cars (Motors), Betting, Houses, Shops, Staff, Guide, Help, Invite | Unchanged | original simple screens |

## Still open (honest list)
1. **Ludo gameplay** and anything that would make Games wagers real.
2. **Marriage** and a second character (only the empty data model exists).
3. **Groceries in the 3D house** and cooking; **bags drawn on the avatar**.
4. **Real multiplayer / accounts / server saves**: every "player" is scripted.
5. **Unique mechanics per company type**, land rent and building, intercity travel.
6. **Per-app visual identities** beyond colour and layout, an iPhone home-screen redesign.
7. **Real-device testing** of graphics settings and low-end Android performance.
8. Original `scripts/smoke.ts` line 189 ends in `|| true`, so that assertion can never fail.

## Must stay placeholders
Real payments (extra company slots are shown "Coming later"), real legal or police data, EFCC/ICPC records, account lock (needs a server), email visibility (accounts have no email).
