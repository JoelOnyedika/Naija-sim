# One Naija: missions, storylines and retention (proposal, nothing here is built yet)

## What the project is
One Naija is a mobile-first 3D Nigerian life sim (React + react-three-fiber + Zustand, procedural low-poly characters, PWA). You pick Lapo (street) or Nepo (rich family), live in a 3D apartment, move around a Lagos map of venues (university, market, church, club, bank, mall, airport, port, jail and more), and run an economy (jobs, loans, bills, tax, hustle app, courts, betting, cars). The Unilag Brotherhood story is the one guided storyline so far. Everything else is small tasks per venue.

## How every storyline should be built (so it fits the engine)
Reuse the pattern in `game/story.ts`: a list of STAGES, one objective per stage, cast spawned per stage, scenes run through `game/interact.ts`, choices stored as flags, no hidden dice. Each arc below is 5 to 8 stages. Every arc ends with a visible reward (an item, a contact, a permanent perk, a new venue activity), and a choice that changes later arcs.

## Arcs by venue
**University (Unilag), after the Brotherhood**
1. Cult war: a rival confraternity (Vikings) targets your set. Choose to fight, hide, or tip off the police. Leads to jail, rank gain or exile.
2. Exam leak: a lecturer sells question papers. Buy, report, or blackmail. Affects grade and NounQuiz-style exam rewards.
3. Campus election: run for SUG president. Collect votes by doing favours across campus; rivals sabotage you.

**Balogun / Tejuosho markets**
1. Market queen: a trader offers you a stall on credit. Run it for 7 days (stock, haggle, pay agbero levy). Grow into a shop chain.
2. Fake goods sting: you unknowingly sell fake phones; a customer returns with area boys. Pay, fight, or expose the supplier.
3. Fire at the market: timed rescue mission; save goods or people, with a reputation reward.

**Church (Cathedral)**
1. Harvest thanksgiving: fund the choir, win favour. 2. The prophet: a "miracle" pastor asks for a big seed. Investigate the scam or join it. 3. Wedding crasher: cater and protect a wedding; the groom's rival shows up.

**Club (Quilox)**
1. Bottle girl to promoter: promote nights, earn a cut. 2. VIP trouble: a politician's son starts a fight; handle it with the bouncers. 3. The plug: a dealer asks you to hold something. Refuse, accept (risk jail), or inform.

**Bank / loans**
1. Ajo (thrift) group: join a savings circle with simulated members; one will default; decide whether to cover them. 2. Loan shark ladder: borrow from an app lender, miss a payment, collectors visit your house. 3. Bank insider: a teller offers an inside job for a cut.

**Mall / Showroom (Polanco)**
1. Sneaker drop: queue overnight for a limited pair and flip it. 2. Car dealer scam: a used car has hidden faults; haggle, inspect, or walk. 3. Repo man: a debtor's car must be recovered at night.

**Airport / Port**
1. Japa: save for a visa, get an agent, avoid the fake agent. Ending: leave Nigeria (new life) or get scammed. 2. Smuggling job at the port (risk, guard, jail). 3. Lost luggage: find a bag with money; return it or keep it.

**Hotel (Eko) / Business tower / Tech hub**
1. Fintech startup: pitch, hire devs, survive a regulator audit. 2. Hostile takeover offer. 3. Hotel summit: host a politician and manage a scandal.

**Government / Jail / Court**
1. Licence queue with "settle" bribes. 2. Prison arc: protect yourself, earn commissary money, a warder offers early release. 3. Court case you can win with evidence collected across other arcs.

**Stadium / Beach / Park / Gallery / Cinema / Eatery**
Street football league (win a season), beach boat trip with a romance NPC, open mic that goes viral, art auction forgery, cinema date with mood meter, buka regular's discount and a "who pays" argument.

## Street events (extend the existing aso ebi, pure water and hoodlum pop-ups)
Police checkpoint (settle or argue), danfo conductor fight, fuel scarcity queue, NEPA blackout (sell generator fuel), flooding (carry people, earn rep), "send me money" scam text, wedding jollof invite, area boys' toll, lost phone found, charity drive, okada accident witness, election rally (free rice, vote buying), lottery agent, mad man prophecy that sometimes comes true.

## Keeping players in the game (retention)
- Daily: login streak chest, 3 daily tasks, a "hustle of the day" with a bonus.
- Weekly: a rotating city event (Detty December, Eid, election week) with limited items.
- Long goals: reputation per venue (staff greet you, discounts), a rank ladder (Lapo to Big Man/Big Madam), property empire, collections (cars, sneakers, art).
- Relationships: 6 recurring NPCs with their own mini-storylines that continue over days (landlord, mechanic, rival, love interest, mentor, informant).
- Consequences that persist: wanted level, debts, enemies who return later, a newspaper/phone feed reporting what you did.
- Social proof: shareable receipts and a simulated leaderboard until multiplayer exists.

## Open world plan (next phase)
A "Go outside" button on the home screen loads a third-person Lagos street world. Phase 1: one district with roads, buildings placed from the existing landmark list, walking and camera rotation, landscape mode, NPCs on paths, a few traffic cars. Phase 2: enter venues from their doors using the current interior system, and street events spawn in the world. Phase 3: other cities (Abuja, Port Harcourt, Benin City) as placeholder entries in the map data, each its own world later. Needs a performance budget (instancing, chunk streaming) because this runs on phones.
