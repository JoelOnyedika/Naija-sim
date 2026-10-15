# Feature audit (Phase 0 of the "comprehensive upgrade" brief)

Honest status: this is a **first-pass audit from code size and store usage**, not a line-by-line review. Nothing in the big brief (sections 5 to 21) has been implemented yet except where marked. Next step is Phase 1 below.

## What exists today (phone apps, `src/features/phone/apps/`)

| App | Lines | Stores it touches | Status against the brief |
| --- | --- | --- | --- |
| Bank | 108 | economy, phone | Has balance and transactions. **Missing:** savings, bonds, credibility, income tax, weekly bills, receipts, filters, net-worth breakdown |
| Jobs | 22 | stats | Very small. **Missing:** career directory, ranks, skills links, shifts, schedule |
| Messages | 156 | economy, phone | Has chats. **Missing:** requests, groups, privacy rules, pinning, search, read filters |
| Contacts | 22 | phone | **Missing:** Mom as a defined NPC entity, find-a-player, add contact |
| Boutique | 89 | character, economy | Works with the wardrobe (`characterStore.ownedClothes`). **Missing:** full-screen layout, occasions, product images |
| Food | 30 | apps, economy | Simple ordering. **Missing:** cart, vendors, order records, ledger linkage |
| Hustle | 36 | apps, economy, stats | Simple. **Missing:** board, applications, contracts, direct hire |
| Invest | 31 | apps, economy | Simple. **Missing:** portfolio, land by city, income model |
| Companies | 21 | apps, economy | Simple. **Missing:** company model, managers, staff, branches, payouts |
| Staff | 21 | apps, economy | Simple. Needs to merge into the company model |
| Forbes | 28 | auth, economy, property, vehicle | Ranks by wealth. **Missing:** defined wealth metric, podium layout |
| Family | 26 | economy, stats | **Missing:** relationship status and settings link |
| Cars | 30 | economy, vehicle | Exists. Link to the planned Ride app |
| Betting, Houses, Shops, Info (settings) | 42, 43, 21, 93 | various | Info holds today's settings (needs the new groups, light theme, privacy) |
| Court, Police, Games, Ride, Grocery | none | none | **Do not exist.** (Food is the nearest to Grocery) |

Shared pieces that already exist and must be **reused, not duplicated**: `economyStore` (money plus a `transactions` log), `statsStore`, `skillStore` (one skill, `coding`), `taskStore`, `characterStore` (appearance, `ownedClothes`), `phoneStore` (apps, notifications, recents), `authStore` (local accounts), `settingsStore`, `clockStore` (game clock), `propertyStore`, `vehicleStore`, `mapStore` and the new ads/actor stores.

## Known gaps that block the brief
* Money is a plain number in `economyStore`. The brief wants integer minor units or a decimal abstraction and a richer ledger (direction, balance before/after, status, reference, related entity). **Phase 1 should upgrade the existing ledger in place** (migrating saved data), not add a second one.
* There is no scheduler for salary, interest, bills, bond maturity or payouts. `clockStore` has game time; a single idempotent "due events" runner keyed by period needs to be added on top of it.
* There are no real accounts, so messaging, groups, hustle, court and police can only be **local simulations** with NPC/sample players, and must say so in the UI.
* Skills: only `coding` exists; careers need more skills in the same store.

## Proposed order (dependencies first)
1. **Foundations:** ledger upgrade (money representation, categories, references, idempotent operations), scheduler, shared app UI kit (list, sheet, tabs, empty/loading states), settings groups, light theme.
2. **Banking:** overview with real net worth, savings and interest per period, bonds, bills, receipts, history filters, credibility, tax (only with rules defined in config).
3. **Jobs, Contacts, Messages (with Mom NPC, requests, groups), Hustle.**
4. **Ride, Grocery, Boutique full-screen,** all through the ledger and inventory.
5. **Investments, land across cities, companies/branches/managers/staff/marketing/payouts.**
6. **Court, Police, Family status.**
7. **Games lobby (Ludo tables, simulated), Forbes podium.**
8. Integration tests for every rule listed in section 25 of the brief, responsive pass, docs.

## Must stay placeholders
Real payments, multiplayer presence and tables, real legal or police data, EFCC/ICPC records unless created by game events, marriage, extra company slots (shown as a future feature).

## Done so far from the newer requests (see CHANGES.md)
Map redesign (city dropdown, Names, More menu), top-down drag/zoom map, shared HUD capsules, thought bubbles and flies, portrait stats bar with profile sheet. **Not done yet:** iPhone home-screen redesign (time, date, update banner), per-app visual identities.
