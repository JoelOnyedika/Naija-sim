# The Naija Life loop: daily rewards, street moments and side quests

Read this before adding anything that makes the game feel alive minute to minute. It is the design document, the status board and the how-to for the "things happen to you" layer.

## 1. Why this exists

By v19 the game had a lot of systems (3D homes, a phone with 20+ apps, 34 venues with ~420 tasks, jobs, bank, NEPA power, pets, a crime/jail loop) but nothing that **pulls the player back tomorrow** and nothing that **interrupts them with Nigeria**. The player did what they chose, when they chose. This layer fixes that with three loops:

| Loop | Time scale | What it gives the player | Status |
| --- | --- | --- | --- |
| Street moments | seconds to minutes | A person stops you; you pick a reply; stats and naira change | **Built (v20)** |
| Daily loop | one real day | Login calendar with a streak, 3 daily quests, a chest for finishing them | **Built (v20)** |
| Weekly | a week | 3 weekly goals and a bigger chest, plus a free streak shield | **Built (v21)** |
| Seasonal | weeks to months | Rent and bills, the Nigerian calendar (Detty December, Eid, Independence Day) | Designed below, not built |

Reference: Lagos Life (the game that inspired this one) reportedly has daily streaks, missions, leaderboards, weekly rent and landmark-based islands (public articles from Oct 2026). We do not copy its content or art. The loop is the point: a reason to open the game each day, and a reason to stay in it each minute.

## 2. What is built (v20)

Files: `data/daily.ts`, `data/streetEvents.ts` (content, pure data), `stores/dailyStore.ts`, `game/daily.ts`, `game/streetEvents.ts` (logic), `features/game/DailySheet.tsx`, `EventPrompt.tsx`, `useDailyPopup.ts` (UI), `scripts/dailyTest.ts` (`npm run test:daily`, 156 checks, part of `test:all`).

### 2.1 Daily login calendar
- 7 days: ₦2,000 / jollof pack / ₦4,000 / +3 Charisma / ₦6,000 / energy boost / **Owambe jackpot** (₦15,000, +5 Charisma, +10 Social). After day 7 it wraps to day 1 and the streak number keeps counting.
- Claim once per **real calendar day** (device local time). Miss a day and the streak restarts at day 1.
- Starting a new life does **not** reset the calendar, so it cannot be used to re-claim.
- The sheet opens by itself once per session when a reward is waiting. It is also behind the 🎁 **Daily rewards** row at the top of the task list (red number = things waiting).

### 2.2 Daily quests
- Three per day, one **easy** (home), one **medium** (hustle), one **social** (go somewhere). Picked from a seeded pool of 19, so a reload shows the same three. 4+ quests per tier so days vary.
- Quests watch **counters**, not screens. `dailyHit(key, n)` is called by the game loop and `fireTask`: `act`, `act:job`, `act:social`, `act:venue`, `earn` (naira), `skill`, `visit`, `visit:<venueKind>`, every task event (`use:bathe`, `use:study`, `use:workout`, `phone:food`) and street counters (`street`, `street:<tag>`). `scripts/dailyTest.ts` fails if a quest watches a counter nothing produces.
- Finish all three, claim the **daily chest** (₦3,000, +3 Charisma).

### 2.2b Weekly goals and the streak shield (v21)
- Three goals per week (Monday to Sunday) from a pool of 10 in `data/weekly.ts`, fed by the same counters as the daily quests, with a **weekly chest** (₦15,000, +5 Charisma, +5 Social). They live under the **This week** tab of the daily sheet.
- **Streak shield**: one free per calendar week. If you miss exactly ONE day it forgives it and the streak continues. Two missed days in a row, or a second miss in the same week, still break it.

### 2.3 Street moments (45 so far)
A moment appears about every 100 to 220 real seconds (first one a minute after the game starts) **only when the screen is free**: home mode, no activity running, no phone, sheet, map, loading screen, NPC sheet, or jail. You get ~25 seconds. Close the card or let it run out and you ignored them (sometimes a small cost). Pacing is `EVENT_PACING` in `data/streetEvents.ts`.

| Where | Moments |
| --- | --- |
| Market | Mama Agbo (buy / haggle ₦300 / no thanks), Alhaji Dansiru's Ankara (buy / haggle), excess change (return or keep), "Thief!" |
| Any public place | pure-water girl, suya man (evenings only), Agbero "ticket" (pay / argue / run), a lost phone, free jollof tasting, officer wants "something" (mall, port, airport, bank) |
| Church | thanksgiving offering |
| Gallery | "What do you think of this piece?" |
| Viewing centre, stadium | Messi or Ronaldo argument, the betting agent |
| Club | VIP table (₦20,000) |
| Park, hotel, stadium, club | spray the bride at an owambe |
| Tech hub | hackathon about to start |
| Beach | coconut seller, horse ride |
| v21 additions | 19 more for the quiet venues: ultras megaphone, ticket scalper, DJ shout-out, dance battle, airport taxi haggle, lost tourist, port crane work, fisherman's grill, bank queue and POS agent, hotel networking and spa, cinema combo and spoiler, government clerk's "missing file", intern mentoring, Mama Put extra meat, five-a-side, young artist |
| Home | Mama calls, egusi from the neighbour (afternoon and evening), landlord's light-bill knock, "You won ₦5M" scam text, data finished, Chioma's owambe invite |

Rules baked into the tests: every choice has a result text; at least two choices; at least one free choice; any gamble with a stake must have a **negative** expected value; a haggle you could not afford if you won is blocked; a loss never takes more naira than you hold; paid choices are blocked (nothing taken, moment stays open) when you cannot afford them.

## 3. How to add content

**A street moment.** Add an object to `STREET_EVENTS` in `data/streetEvents.ts`:
```ts
{ id: 'my_event', icon: '🍌', who: 'Plantain seller', title: 'Dodo!', text: '"Fried plantain, hot hot!"',
  where: ['market', 'park'],          // 'home' | 'venue' | list of venue kinds
  hours: [16, 22],                    // optional, game-clock window
  weight: 8, cooldownMin: 6, seconds: 20,
  choices: [ { id: 'buy', label: 'Buy (₦300)', cost: 300, effects: { hunger: 12 }, text: '...', tag: 'dodo' }, ... ],
  ignore: { text: '...', effects: { happiness: -1 } } }
```
`tag` bumps the daily counter `street:<tag>`. `risk` makes a dice roll (`winMoney`/`loseMoney` are signed naira). Run `npm run test:daily`.

**A daily quest.** Add a row to `QUEST_POOL` in `data/daily.ts` with a `hit` counter and a tier. If it needs a counter nothing produces yet, call `dailyHit('your:key')` where the thing happens.

**Do not** add a second reward, money or stat path. Money goes through `economyStore.credit/debit`, stats through `statsStore.apply`, skills through `skillStore.add`.

## 4. Backend hand-off (what a server must own later)
- `DailyAuthority` in `game/daily.ts` (`setDailyAuthority`): the calendar day. A server decides "today" and whether a claim is allowed, so a changed device clock cannot farm rewards.
- Quest progress, claims and the chest: `dailyStore` quest list and `claimQuest`/`claimBonus`.
- Street-moment dice and payouts: `answerEvent` in `game/streetEvents.ts` rolls `Math.random` locally. A server must roll and pay (same hand-off as `game/authority.ts`).
- Local only for now. In-game naira only; nothing here implies real money.

## 5. Idea catalogue (not built yet, in rough priority order)

### 5.1 More street moments (the pool should reach ~80)
- **Road and neighbourhood** (needs the open world, see section 6): danfo conductor ("Oshodi! Oshodi!") and a missed stop, okada rider offering a "short cut", go-slow gist with a hawker window-to-window (gala and cold Pepsi), flooded street (wade, carry someone, wait), fuel-queue argument, keke vs danfo road rage, a wedding procession blocking the road, NURTW "levy" at the bus park.
- **Home**: NEPA bill and the prepaid meter running low (ties to `game/power.ts`), a neighbour borrows your generator, a rat in the kitchen, the landlord raising rent, a power-bank vendor knock, a church member visiting, the gateman wants "Christmas".
- **Work and money**: boss asks for overtime, a colleague asks for a loan ("small money, I go pay on Friday"), POS agent with no change, a "business opportunity" (investment pyramid, negative EV), a recruiter's WhatsApp, a client who will not pay.
- **Social**: a friend wants you to be groomsman, a mutual friend's GoFundMe, a cousin who needs school fees, the aunty who comments on your weight, a blind date, a trending challenge you can join.
- **Food**: buka on the corner (rice and stew queue), a pepper-soup challenge, a suya-spot dispute over the "extra", a mama put who sells on credit.
- **City**: a trending viral video (+social if you join), a protest passes, an area-boy football match, a power-line spark, a motorcade (get out of the road!).
- Each new moment should map to a stat or skill the player actually needs, and some should chain (see 5.3).

### 5.2 Weekly and recurring obligations
- **Weekly goals** (7 days): a longer version of dailies (earn ₦50,000, visit 5 different venues, finish 10 shifts) with a bigger chest. Counters already exist.
- **Rent / light bill / data** every 7 game days or 7 real days: a bill appears in the bank app; paying on time keeps the landlord happy, late means the landlord event escalates. (Today the game is "buying and owning only", so rent applies only if we add rental housing. Start with **NEPA bill and data** which need no new housing system.)
- **Streak shield**: one free "I was busy" pass per week so a missed day does not wipe a long streak. Earned, never sold.
- **Monthly milestone** on streak 7, 14, 30 with a titled reward (e.g. "Consistent Lagosian").

### 5.3 Side-quest chains (multi-step stories)
- **The Agbero chain**: pay the ticket, argue, then meet the Area Boss, eventually become the park's "official" (earn a small daily income, lose charisma) or reform the Agbero (justice).
- **Mama Agbo's lost customer**: three visits, a recurring friend, a discount, a recipe.
- **From POS agent to bank owner**: ties to the existing Companies app.
- **Hackathon season**: three techhub moments build into a team, a prototype, a pitch to the OneNaija CEO.
- **Owambe circuit**: invites escalate from naming ceremony to wedding, with aso-ebi, spraying, MC duties, and a reputation score.
- Implementation idea: add `chain?: { id: string; step: number }` and `requires?: { chain: string; step: number }` to `StreetEvent` and store progress in `dailyStore` (or a new `questChainStore`).

### 5.4 Nigerian calendar (seasonal, date-driven)
Use the player's real date. Ideas: **Detty December** (Lagos filled with events, club prices up, Owambe invites doubled, Christmas hampers), **Eid and Ramadan** (iftar invitations, ram purchases), **Independence Day** (Oct 1 parade, green-white-green outfit reward), **Democracy Day** (June 12 holiday: no shift pay but double events), **Easter**, **Valentine's day** (relationship moments), **Harmattan** (dry, dusty, cold mornings, hair and skin items), **rainy season** (flooding events, power cuts more likely), **JAMB/WAEC season** (students, cybercafe queues), **Ember months** (spending and bills go up). Needs a small `data/calendar.ts` with date windows and a `weight` multiplier for events.

### 5.4b Time-of-day life
The game clock exists (`clockStore`). Add morning go-slow, afternoon heat (thirst falls faster), evening suya and buka, night NEPA outages and club hours. Moments already read `hours`; extend the same to quests ("night owl: visit a club after 10pm").

### 5.5 Mini-games hanging off moments
Ludo and Whot tables at the viewing centre, Ayo (mancala), street football penalties, a "catch the thief" run, a danfo-conductor shouting mini-game, a haggling mini-game (a slider instead of a coin flip), pepper-soup eating challenge, dance battle rhythm tap. Keep each under 60 seconds and fair (no gambles with positive expected value).

### 5.6 Retention extras
- **Titles and achievements** ("Agbo Regular", "Survived Oshodi", "Owambe Veteran") shown on the profile and the Forbes list.
- **Collections**: street foods tried, venues visited, friends made. A passport-style page in Settings or the profile.
- **Comeback reward**: after 3+ days away, a "Welcome back, stranger" mini chest (never guilt-trip copy).
- **Notifications** (phone, in-game): "Mama called twice", "Daily reward waiting".
- **Leaderboards** (needs a server): weekly earners, longest streaks.

### 5.7 Things we will not build
No real-money rewards, no paid streak restores, no loot boxes, no gambles with a positive expected value, no fake multiplayer. (Project rules, repeated here.)

## 6. Open world note
The brief says the open world is deferred. Street moments are keyed by **place** (`where`), so when a third-person map exists, add place kinds such as `road`, `bridge`, `bus-park` and zone triggers (enter a radius, call `showEvent`). The event card, the counters and the tests do not need to change. The "somebody holds you on the road" feeling is the same card, triggered by walking into a zone instead of a timer.

## 7. Build order from here
1. ~~Weekly goals and the streak shield~~ (done in v21).
2. NEPA bill and data bills as recurring obligations (reuse bank bills and `power.ts`).
3. ~~20 more moments for the quiet venues~~ (done in v21: stadium, club, airport, port, bank, hotel, cinema, government, business, eatery, park, gallery). Next: a second pass for concert, recreation and showroom, and more road moments once the open world exists.
4. Chains (5.3), starting with the Agbero chain.
5. Calendar events (5.4).
6. Mini-games (5.5).
7. Titles and the profile page.
