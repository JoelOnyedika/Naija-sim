# Nigeria Life: systems reference

What the code **actually does today**. Sections for features that are not built yet say so. Status words are used strictly:
**Implemented** (works end to end in the local game), **Simulated** (works, but stands in for something that needs a server),
**UI-only** (screen without logic), **Not started**, **Needs backend**.

Covers every system in the game after the full upgrade (foundations, banking, careers, messaging, Hustle, land, companies, court, police, ride, grocery, boutique, games). See `FEATURE_AUDIT.md` for the status of every app.

## A. Feature inventory

| Feature | Status | Where | Main files |
| --- | --- | --- | --- |
| Shared ledger, scheduler | Implemented | everywhere | `stores/economyStore.ts`, `game/scheduler.ts` |
| Bank (overview, send, savings, bonds, credibility, tax, bills, receipt, history) | Implemented | Bank | `phone/apps/bank/*`, `game/banking.ts` |
| Income tax | Implemented (an in-game rule, see B) | Bank > Income Tax | `data/economy.ts`, `game/banking.ts` |
| Jobs: 32 careers, ranks, skills, apply/offer/accept, promotion | Implemented (shifts are **simulated**) | Jobs | `data/careers.ts`, `game/jobs.ts`, `stores/careerStore.ts` |
| Contacts: Mom (scripted), find a player, add/remove | Implemented (players are **simulated**) | Contacts | `data/players.ts`, `game/social.ts` |
| Messages: chats, groups, message requests, privacy, pins, notification toggles | Implemented (other people are **scripted**) | Messages | `phone/apps/messages/*`, `game/social.ts` |
| Hustle: board, Find a Pro, post a job, direct hire, escrow, rating | Implemented (other players **simulated**) | Hustle | `phone/apps/hustle/*`, `game/hustle.ts` |
| Investments: overview, city-aware land, markets, portfolio | Implemented (market prices are random) | Invest | `phone/apps/invest`, `game/land.ts`, `data/land.ts` |
| Companies: 4 slots, branches, manager, staff, upgrades, marketing, payouts | Implemented (one generic simulation, scaled per category) | Companies | `phone/apps/companies`, `game/companies.ts`, `data/companies.ts` |
| Court: file, live cases, my cases, lawyers, history, case viewer | Implemented (**simulated** proceedings, no money awards) | Court | `phone/apps/court`, `game/legal.ts`, `data/legal.ts` |
| Police: station by city, reports, my record | Implemented (**simulated**; no real data) | Police | `phone/apps/police`, `game/legal.ts` |
| Ride: 14 destinations, six travel methods, activities | Implemented as a **simulation** (character is not moved in 3D) | Ride | `data/ride.ts`, `game/ride.ts` |
| Grocery: shop, cart, checkout, orders, pantry | Implemented; delivery is a **record** (pantry), not in the 3D house | Grocery | `data/grocery.ts`, `game/grocery.ts` |
| Boutique: full-screen, 5 categories, 7 occasions, wardrobe | Implemented; bags are owned but **not drawn** on the character | Boutique, house Wardrobe | `phone/apps/Boutique.tsx`, `game/boutique.ts` |
| Forbes podium | Implemented (local leaderboard, fictional rivals) | Forbes | `phone/apps/Forbes.tsx` |
| Games lobby (Ludo tables) | Lobby only: tables are **simulated**, Ludo gameplay is **not built** | Games | `phone/apps/games`, `game/games.ts` |
| Family: status Single, scripted family | Implemented; **marriage not available** (data model only) | Family | `stores/familyStore.ts` |
| Settings: theme, battery saver, graphics, sound, message privacy, relationship visibility, password, privacy draft | Implemented (email visibility and account lock are disabled, see G) | Settings | `phone/apps/Settings.tsx` |
| Notifications | Reused existing system; each feature notifies from real state changes | Phone | `game/notify.ts` |

## B. Financial architecture

### Money
Whole naira in plain JS numbers (exact up to 9e15; the biggest allowed transfer is 5e10). Rates are **basis points** (1 bp = 0.01%)
applied with `Math.floor`, so no floating-point money exists. Formatting (`formatNaira`, `formatNairaCompact`) is display only.

### The ledger (`economyStore`)
One store holds `money` (the wallet) and `transactions`. The single entry point is `post()`; `credit()` and `debit()` are thin wrappers kept
so older call sites did not change.

`post({ direction, amount, label, kind, counterparty, meta })`
1. Rounds to whole naira; rejects non-finite, zero, negative → `invalid`.
2. If `meta.opKey` was already used → `duplicate`, nothing changes.
3. Expense larger than the wallet → `insufficient`, nothing changes (no negative balance, ever).
4. Updates the wallet, writes the entry, updates lifetime totals, stores the key, in one synchronous `set`.

Entry fields: `id`, `reference` (`NL-000123`, sequential), `kind`, signed `amount`, `direction`, `label`, `description`, `counterparty`,
`sender`/`recipient`, `status`, `internal`, `gameMinutes` (game clock), `at` (real time), `balanceBefore`, `balanceAfter`, `ref` (related entity),
`currency` (`NGN`). Old saves only have the first few; nothing is invented for them (the UI falls back to real time and hides balances).

* The newest 1,000 entries are kept. `lifetimeIncome` / `lifetimeExpense` are counters, so totals stay right after old entries are trimmed.
* **Internal** entries (wallet to savings, bond principal) are not income or expense.
* Invariant (tested): wallet = starting money + sum of all entry amounts; each entry's `balanceAfter` equals the next one's `balanceBefore`.
* Save version is 2. `migrateEconomy` upgrades v1 saves: money and history are kept, `direction` is added, lifetime totals are rebuilt **from the retained history only** (older activity is not recoverable).

### Duplicate protection (two layers)
* **Scheduled events:** ledger `opKey` (e.g. `interest:12`, `bill:electricity:lagos.x:12`, `bond-return:<id>`) plus the scheduler's last-period record.
* **Player taps:** `game/guard.ts` allows one submission at a time and ignores the same request repeated within 1.5 s. (`sendTransfer` keeps its own equivalent guard.)

### Savings
Deposit moves wallet → savings (internal). Withdraw moves back. Savings are never spendable (`debit` checks the wallet only).
Interest: once per game week, `floor(balance × 50 bps / 10000)` on the balance at that moment, **paid to the wallet** (not compounded into savings), recorded as `interest`.
Rate, minimum deposit and the "consistent week" minimum are in `SAVINGS`.

### Bonds
Three in-game products in `BONDS` (3, 7, 14 days; 1.2%, 3%, 7% total). Buying locks the money (internal). At maturity the bond is flagged
`matured` **first**, then principal (internal) and return (income) are posted with idempotency keys, so it pays once. No early redemption, no default risk,
and the UI says so. Bonds are not spendable and count in net worth at principal.

### Bills
`BILLS` define recurring charges: electricity for the home you live in, maintenance per car you own; amount = clamp(price × rate, min, max).
At each weekly run: overdue bills are retried first, then each (bill, asset, week) not yet recorded is charged once.
If the wallet is short the bill becomes **overdue** (no negative balance, no late fee); it can be paid any time (`payBill`) or is retried at the next run. Overdue bills cost Credibility.
The amounts are game rules chosen for balance, not real utility prices. There is no rent (rentals do not exist) and no jet (no jets exist).

### Income tax
An in-game rule (the "Revenue Service"), **not** Nigerian tax law. Every game week the previous week's *taxable income* is assessed once:
taxable = ledger income of kind `salary` or `business` (job pay, Hustle pay, company payouts). Interest, bond returns, asset sales, refunds and transfers are not taxed.
Progressive brackets per game week (`INCOME_TAX` in `data/economy.ts`): 0% to ₦150,000, 5% to ₦600,000, 10% to ₦2,000,000, 15% above; each rate applies only to its own slice
(e.g. ₦1,000,000 of income owes ₦62,500). The bill is charged once (key `tax:w<week>`). If the wallet is short it is recorded as **unpaid**, retried at the next weekly run, and can be paid any time from Bank > Income Tax.
Set `enabled: false` to switch the system off.

### Net worth (`game/wealth.ts`)
wallet + savings + active bond principal + homes at list price + land at its current value + market holdings at current prices + **company funds** + cars at 80% of list price.
Each naira appears in exactly one place (moving money into savings, a bond, land or a company payout moves it between lines). **Not counted:** furniture, finishes, a company's "value" (only its funds), pending bills. Used by Bank, Investments and Forbes.

### Credibility (`game/credibility.ts`, rules in `CREDIBILITY`)
Base 12, plus capped points for: verified transfers (≥ ₦500,000; once per contact per game day; at most 3 per contact), consistent saving weeks
(≥ ₦10,000 at the weekly run), bills paid on time, bonds held to maturity; minus 8 per overdue bill. Clamped 0 to 100. In-game only.
Anti-farming: the per-contact caps, and moving money in and out of savings earns nothing by itself.

### Example flows
* **Shift pay:** `credit(payout, label, 'salary')` → entry `+6,500`, `balanceAfter` updated, lifetime income + 6,500.
* **Save ₦1,000,000:** `post(expense, internal, kind 'savings')` → wallet −1,000,000, savings +1,000,000, net worth unchanged, income/expense unchanged.
* **Week ends:** interest `+5,000` (income, wallet), electricity `−1,500` (expense); both keyed by the week number.

## C. Company simulation (`game/companies.ts`, numbers in `data/companies.ts`)
* **Slots:** 4 per account. Two more are shown as "Coming later" and cannot be bought (no payment system exists).
* **Create:** name (3 to 30, unique among yours), emoji logo, business type (9, each with a startup cost), description, HQ city. The startup cost comes from the wallet. A new company has **no funds** and is **not operating**.
* **Manager:** required before revenue. Hiring costs a fee (wallet); the wage is paid daily from company funds. A second manager is refused. Only operating companies earn and pay wages.
* **Money:** company `funds` are separate from the wallet. Owner-paid costs (setup, hiring, branches, upgrades, marketing) come from the wallet. Revenue, wages and branch costs live inside funds.
* **Daily settlement** (once per game day, via the scheduler): revenue = (base + staff x per-staff + branches x branch revenue) x level x efficiency x marketing. Costs = manager wage + staff wages + branch costs. Funds += revenue - costs. All figures are the "food" example numbers scaled per category.
  By design each employee earns about twice what they cost and the manager costs less than base revenue, so a running company never loses money (a test covers every category, level, efficiency, staffing and marketing combination).
* **Payout:** the owner can take all funds once per game day (`payout:<company>:<day>`). It credits the wallet as taxable `business` income. Revenue earned, funds kept and money paid out are shown separately.
* **Levels and staff:** capacity 8 / 12 / 24 at levels 1 / 2 / 3. Level 2 needs a manager and 4 staff; level 3 needs 8 staff and a branch. Upgrade costs are a share of the startup cost. Efficiency: up to 3 levels, +10% revenue each.
* **Branches:** 0 / 1 / 3 at levels 1 / 2 / 3, in any catalogued city, opening fee plus daily cost, extra revenue. They belong to the company, so changing the map city never touches branches or staff.
* **Marketing:** flyers (+5%, 1 day), social media (+10%, 2 days), radio (+20%, 3 days), cost scaled per category. The bonus applies only while a campaign runs (a game rule, not a guarantee); total is capped at +35%; one of each channel at a time.
* **Not implemented:** unique mechanics per business type (all use the same formula), employee skills, company-to-company trade.

## D. Messaging and social systems (`game/social.ts`, `game/peers.ts`)
* **One message store** (`phoneStore.threads`) holds every chat: scripted characters, simulated players (`p:<username>`) and groups (`g:<id>`). `socialStore` holds contacts, approvals, requests, groups and notification toggles.
* **Who is "a player":** nobody. All players are scripted (`data/players.ts`) and the UI labels them "Simulated player". Mom (id `mama`, tagged `special: 'mom'`) is a scripted character, not an account.
* **Initiation rules** (`deliveryPolicy`): rejected before: blocked. A contact you added: straight into Chats. Privacy "Only friends": blocked, they cannot even send a request. Previously approved: Chats. Otherwise: a message request that waits in Requests until you accept (moves into Chats) or reject (they cannot request again).
* **Simulated activity:** every 2 game days a player you have not approved tries to contact you (max 2 requests waiting) so requests and privacy can be seen working. Your own first message to a player who does not accept strangers stays "pending" and they never reply.
* **Groups:** name 1 to 30, icon, 1 to 20 people (family, friends, neighbours, players; never businesses). Rapid taps and identical groups create one group. Leaving removes the group and its messages.
* **Pins:** up to 3 per chat. **Delete chat:** clears messages on this device only; the bank ledger and the other person are unaffected.
* **Notifications** respect three toggles (messages, requests, groups) and stay quiet while that chat is open.
* **Hustle** (`game/hustle.ts`): a gig marketplace. Listing states: open, accepted, in progress, completed (or cancelled); direct hires start as "requested". **I am the worker:** apply (rate 25% to 200% of the budget); a simulated client answers after 40 game minutes (accepts up to 110% of budget); you start the job (12 energy), it runs for its duration, then the client pays once. **I am the client:** posting is free; simulated providers who offer that category apply over time; hiring (or an accepted direct request) **holds the agreed amount in escrow** (an internal ledger entry). The hired player arrives after 15 game minutes; cancelling before that refunds the escrow as its own entry; once work starts it cannot be cancelled; on completion the escrow is released and paid out (a real expense) once. Rating: 10 points per completed job I did, at most 3 per client, capped at 100; no reviews exist.
* **Future multiplayer:** all of the above needs a server for real presence, real replies and escrow that cannot be tampered with in the browser.

## E. Legal and civic simulation (`game/legal.ts`, `data/legal.ts`)
* **Case model:** a case is a precomputed list of 8 timed events (Filed, Hearing scheduled, Case introduced, Opening statements, Evidence, Response, Judge update, Verdict). The viewer reveals the events whose time has come, so reopening a case never invents new text. Verdict: decided once from the case id plus the plaintiff's lawyer strength (base 50 out of 100). **No money is awarded**; a verdict is a record. Your costs are the filing fee (₦25,000) plus any lawyer.
* **Filing:** defendant must be a known username; category; complaint 20 to 500 characters; optional evidence note and lawyer (must be available and match the category). Review step, then one charge; a case reference like `CASE-0001`. At most 3 open filed cases; identical or double-tapped filings create one case.
* **Live cases:** three sample cases between simulated players are always running (topped up on every tick). Lawyers are fictional.
* **Police reports:** `REP-0001`; username, category, description 20 to 400, optional evidence; max 3 under review; 5 game minutes between reports. Status: Submitted, Under review (15 min), then **Dismissed** or **Referred** (45 min; only theft, fraud and harassment can be referred, 60% by a fixed hash of the report id). A referral creates exactly one linked court case ("The State v @x") and the report becomes **Resolved** when it closes. A report is never a finding of guilt.
* **My record:** shows only cases where you are the defendant (none exist today). EFCC/ICPC-style records: none exist and the app says so; it is not connected to any real agency.
* **Stations:** one fictional station per city (Lagos: Eko Police Division), chosen from the map's current city.

## E2. Land, investments, ride, grocery, boutique, games
* **Land** (`game/land.ts`): 24 plots over Lagos, Abuja, Port Harcourt and Edo, ids `<city>.plot-<n>`, owned in `landStore.owned` regardless of the selected city. Buying and selling are asset conversions (internal ledger entries). Each owned plot appreciates by its own weekly rate once per game week. Selling pays the current value minus a 5% registry fee, once. Rent and building are not implemented. Only Lagos is a playable map, so other cities' land lives in the portfolio.
* **Investments overview:** total value (land + markets + bonds + company funds) with a category bar, income today/week/lifetime (interest, bond returns, company payouts, from the latest 1,000 ledger entries), land gain (unrealised and sold), companies result, assets by city.
* **Ride** (`game/ride.ts`): simulated trips in the current map city only. Fare and time per method and distance class are game rules; walking is free; your own car needs a car you own (fuel is not simulated). A trip charges once, advances the clock and applies stat costs; activities (eat, work out, co-work, party) charge, take time and apply effects. No intercity travel, opening hours or player counts.
* **Grocery** (`game/grocery.ts`): 24 products (emoji art, no downloads), vendors, saved cart, delivery fee ₦700 below ₦10,000. Checkout validates, makes one payment equal to the order total, records the order, clears the cart. Orders go Preparing, On the way, Delivered on the game clock; delivery adds to the **pantry record** once. Groceries do not appear in the 3D house and cannot be cooked yet.
* **Boutique** (`game/boutique.ts`): opens full screen (rendered in a portal over the whole page; side-by-side on wide screens). One wardrobe (`characterStore.ownedClothes`) is shared with the in-house **Wardrobe** furniture, which opens the same shop in "Owned only" mode. Buying checks the balance, charges once, adds the item; owned items never charge again. Bags can be bought and kept but the character model cannot show them.
* **Games** (`game/games.ts`): tables are generated from city and game day; sitting down reserves a seat and checks you could afford the stake. **Stakes are never charged** because Ludo gameplay does not exist yet.

## F. Application design and navigation

### The phone (`features/phone/`)
* **Two skins, one set of apps.** Nepo lives get an iPhone-style phone, Lapo lives an Android phone in the Samsung One UI style (`usePhoneType`). `PhoneOverlay.tsx` is the frame and navigation; `HomeScreens.tsx` holds the status bar, `IosHome`, `AndroidHome` and `AppLibrary`.
* **Status bar** floats over everything so the clock is always visible. iOS (following the reference design): carrier on the left, Wi-Fi, battery and a bold 24-hour clock on the right, with the Dynamic Island in the middle. Android: bold clock on the left, signal, Wi-Fi and battery % on the right. Tapping it opens the notification shade.
* **Home** shows 12 favourite apps in a 4-column grid (icon plus label) and a dock of Messages, Bank, Jobs and the **App Library** button. iOS adds two glass widgets (time and place, calendar from the game clock); Android adds a large clock and a search pill that opens the library.
* **App Library** lists every app grouped (Money, Work, Social, Daily life, Law and order, More) with a search box. Nothing is hidden and there is no paging. Which apps are favourites, in the dock and in each group is `data/phoneLayout.ts` (a test checks every app is reachable).
* **Icons** are white vector glyphs on a gradient tile (`appIcons.tsx`): a glossy squircle on iOS, a rounder flat tile on Android. Add an icon for a new app in `ICONS`.
* **Inside an app** (`AppView`): iOS has a centred title with a back chevron; Android has a back arrow and a large left-aligned title. Content scrolls in the middle.
* **Navigation** (`Tabs` in `ui.tsx`): a fixed bar at the **bottom** of the app, drawn into a slot below the scroll area through a portal, with at most five icon-and-label items. If an app passes more than five, the first four show and "More" opens the rest. Related sections are merged onto one page instead: Bank is Home, Send, Grow (savings and bonds), Activity (history and receipt) and More (credibility, bills, tax); Companies puts upgrades and marketing on one Growth page; Court puts history under My cases.
* **Cards and titles** are flatter and quieter (`Card`, `Title`); the dark theme remaps them automatically (see Theme below).

### Sending money
Bank > Send has two boxes: the receiver's **username** and the **amount**. There is no contact list and no pre-filled names. The username is matched ignoring `@` and capital letters; an unknown username, yourself, a bad amount or more than your balance is refused with a message. One confirmation step, then one ledger debit, a record, and a chat card in your conversation with that player (rules in `game/bank.ts`).

* Apps are registered in `data/apps.ts` (id, label, colours), `features/phone/apps/index.tsx` (id to component), `features/phone/appIcons.tsx` (icon) and `data/phoneLayout.ts` (where it appears). `AppView` wraps each in a header and a scroll area with class `app-surface`.
* Open/close: `usePhoneStore.openApp(id)` / `closeApp()`. Notifications: `game/notify.ts` (`notify({ title, body, icon, appId })`).
* Multi-section apps follow the Bank pattern: a thin shell with `Tabs`, one file per section, rules in `game/*.ts`, state in a store.
* **Theme:** `settingsStore.theme` (`light` default, `dark`, `system`). `hooks/useAppearanceSync.ts` sets `data-theme` on `<html>`. Dark styling is a block of CSS in `index.css` that remaps the light utility classes **inside `.app-surface` only**. The 3D world, HUD and phone home screen are not themed (already dark). If you use a new light colour class in an app, add its dark mapping there.
* **Battery saver:** adds class `battery-saver` to `<html>` (stops decorative animation via CSS) and floors the graphics tier at 2 (Low).
* **Graphics:** `PerfGovernor` reads the setting every second. Auto = measured tiers (unchanged logic, clamped by the floor); On = best tier allowed by the floor; Off = tier 3 (smaller render size, no shadows; room lights stay on).
* **Persistence:** every store uses zustand `persist` under `nigerialife.*`. New stores: `nigerialife.bank`, `nigerialife.scheduler`. Settings merges old saves with new defaults.
* **Adding an app:** add the id to `AppId` and an entry to `APPS` (`data/apps.ts`), an icon in `appIcons.tsx`, a group in `CATEGORIES` (`data/phoneLayout.ts`), write the component, add one line to `APP_COMPONENTS`. Use `<Tabs>` for sections (five at most). Reuse `ui.tsx` pieces. Money goes through `economyStore.post`; time-based events go in `game/scheduler.ts`'s `PERIODIC_EVENTS`.
* **Adding a scheduled event:** write `run(period)` in a game module, make it safe to run twice for one period (use `opKey`), add it to `PERIODIC_EVENTS`. New-life reset: `startNewLife` resets the scheduler and bank stores.

### Time and the "offline" rule
Game time is `clockStore.minutes` (1 game minute per real second at the default). A **game week = 10,080 game minutes = 2 h 48 min of play**; the UI shows both
("in 2d 4h, about 1h 40m of play"). Game time only advances while the game screen is running, so **nothing accrues while the game is closed**.
After a long background pause the loop applies half the elapsed time (max 240 s), and the scheduler runs at most 4 missed periods. Tune `WEEK_MINUTES` in `data/economy.ts`.

## G. Status and limitations

| Item | State |
| --- | --- |
| Ledger, scheduler, banking, tax, careers, messaging, Hustle, land, companies, court, police, ride, grocery, boutique, forbes, family, settings | Implemented |
| Everything involving "other players" (contacts, chats, Hustle, court, police, Games, Forbes) | **Simulated** with scripted characters |
| Ludo gameplay | **Not built** (lobby only; stakes never charged) |
| Marriage | **Not available** (empty data model only) |
| Groceries in the 3D house, cooking | **Not implemented** (pantry record only) |
| Bags on the character model | **Not implemented** (owned, not drawn) |
| Email visibility, account lock | **Disabled** (no email on accounts; a lock needs a server) |
| Intercity travel, 3D plots, rent | **Not implemented** |
| Real payments, real banks, multiplayer, server saves | **Not available** |
| Graphics and battery saver | Implemented; verified in headless Chromium only, **not on a real phone** |

Known limitations: saves are per browser; the ledger keeps the latest 1,000 entries; passwords are plain text in a local mock account; chat times use real clock time (the rest of the game uses game time); a game week is 2 h 48 min of play; other cities are catalogued but not playable.

## H. Testing

```bash
npm run test:all          # typecheck, content validation, smoke, nav, ads, careers, social, hustle, empire, legal, shop, economy, settings, persistence
npm run test:economy      # ledger, savings, bonds, bills, tax, credibility, net worth, scheduler
npm run test:careers      # catalogue, shifts, applying, promotion rules, switching
npm run test:social       # contacts, requests, privacy, groups, pins, unread
npm run test:hustle       # applications, escrow, refunds, completion, rating limits
npm run test:empire       # tax brackets, land, companies (incl. never-lose-money sweep)
npm run test:legal        # filing, case model, verdicts, police reports and referrals
npm run test:shop         # grocery, ride, games lobby, boutique
npm run test:phone        # every app reachable from the library, home layout valid
npm run test:settings     # settings defaults/persistence, password rules
npm run test:persist      # a real v1 save upgrades to v2 without losing money or history
npm run build             # typecheck + production build
```
Browser (needs Playwright + Chromium and a dev server on :5173): `test_bank_ui.py`, `test_phone_ui.py nepo|lapo` (home screen, clock, library, bottom navigation, sending by username), `test_social_ui.py` (Jobs, Contacts, Messages, Hustle) and `test_apps_ui.py` (Companies, Invest, Grocery, Ride, Court, Police, Games, Forbes, Family, Tax, Boutique) drive the real UI. `test_bank_ui.py` walks every Bank tab in light and dark on a 390×844 viewport,
exercises deposit, search, receipt, theme, battery saver and graphics, and saves screenshots to `$SHOTS` (default `/tmp/shots`).
`tests-browser/run.sh` still has a hard-coded path from the original machine; start `npx vite --port 5173` yourself or edit it.

* **Test harness caveat:** zustand's persist reads `window.localStorage`, and Node has none, so `smoke`/`nav`/`ads`/`economy` run with persistence **off** (state in memory only). `settingsTest` and `persistTest` define `window` first so they exercise real saving.
* **Inspect state:** in the dev console or a browser test, `await import('/src/stores/economyStore.ts')` gives the live store (`useEconomyStore.getState().transactions`); same for `bankStore` and `schedulerStore` (`last` shows the last week each event ran).
* **Reproduce a week passing:** set `useClockStore.setState({ minutes: WEEK_MINUTES + 600 })` then call `runDueEvents()` (see `scripts/economyTest.ts`).


## H. v8 foundations: pricing, placement camera, NEPA power (`data/balance.ts`)
All tunables for these live in `src/data/balance.ts`.
* **Pricing** (`game/pricing.ts`): `priceOf(base, multiplier?)`. Multiplier range 0.1..0.9, neutral 0.5 (= base price). Status: **Implemented** locally. The admin setting does not exist; `setAffordability()` is the hook. In multiplayer the server must own the multiplier and compute the charge itself.
* **Wall height / wall mounting**: `INTERIOR_WALL_HEIGHT`, `WALL_MOUNT_GAP`; `world/placement.ts#getTransform`. **Implemented.**
* **Placement camera**: `cameraStore.focus` + `CameraRig`; `PLACE_FOCUS`. **Implemented.**
* **Item information**: `game/itemInfo.ts` (`describeItem`) + `ItemInfoSheet` in `BuyMode.tsx`. Only existing item data is shown; decorative items say so. **Implemented.**
* **NEPA** (`game/power.ts` pure rules, `stores/powerStore.ts` live state, `game/loop.ts#stepPower`, `three/property/Lighting.tsx`, `features/game/PowerBadge.tsx`). Outage state is not saved (a reload ends it). Backup items are read from the placed furniture of the active home. **Implemented as a local simulation.** Not authoritative: nothing here is safe to trust in multiplayer.

## I. Pets and activities
* **Pets**: `data/items.ts` (`pet`, `toy`), `world/petBrain.ts` (behaviour, pure), `three/models/pets.tsx` (models), `three/property/Pets.tsx` (scene layer). Home-wide limits in `PETS`. **Implemented**, no stat effects, no imported animation assets.
* **Activities**: `data/activities.ts` (`ACTIVITY_SETS`, `usesOf`, `blockedReason`), `game/interactions.ts` (`chooseActivity`, `startUse`), `features/game/ActionMenu.tsx`, `game/itemInfo.ts` (`describeUse`). **Implemented** for desk, speaker and disco light; other objects keep their single `use` and can be moved into the table one by one.
* Money costs and payouts are a local simulation. A multiplayer server must own rewards, costs and durations.

## J. Catalogue and map (v8 part 3)
* **Catalogue**: models `three/models/catalogue.tsx`, definitions `data/items.ts`, activities `data/activities.ts`, usable spots `world/navigation.ts#SPECS`, bubbles `world/bubbles.ts`. Adding an item = one model, one row in `items.ts`, one line in `registry.tsx` (the catalogue test checks all three agree).
* **Map**: `MAP` in `data/balance.ts` (tilt and billboard scale), water in `three/world/Water.tsx`.
