# Venue gameplay ideas (brainstorm, nothing here is built unless marked)

Built in v28: the club (see CHANGES.md). Everything below is an idea. Several venues already have 1 to 4 small tasks each (`data/venueKit.ts`); these ideas are about giving each venue ONE signature mechanic, not more buttons.

## Pattern that worked for the club
A signature mechanic with a visible, shareable result: you spend or risk something, the room reacts (feed, banner, effects), and there is a record you can screenshot (the bill). Aim for the same shape elsewhere.

## By venue
- **Balogun market**: haggling. Each seller has a hidden fair price and a mood. Offer too low and the mood drops until they walk off; too high and they hail you; near the fair price they "agree small". Win streaks unlock "my customer" discounts. Optionally resell: buy low here, sell in a mall.
- **Church**: tithe and offering envelopes (choose the amount, the usher thanks you, "testimony" slot gives a small luck buff); a choir you can fund; harvest thanksgiving day event.
- **Gallery**: bid at a live art auction against simulated collectors (rising bids, "going once, twice"); owning a piece shows in your home and slowly rises or falls in value.
- **Stadium**: pick a team and stake on the match as it plays out in a few minutes, with a crowd chant meter; street match at the goal (exists) could feed a league table.
- **Club**: built (bottles, spraying, hype man, live feed, bill).
- **Showroom (Polanco)**: test drive exists; add trade-in of your old car, haggle on price, and "drive it off the lot" reveal (reveal exists).
- **Jail**: bribe the warder for a shorter sentence (risky), prison jobs, a commissary.
- **Viewing / betting centre**: build a slip (pick 3 to 5 games, odds multiply), watch results come in one by one, "so close" near misses, cash out early. Keep expected value negative (the venue test already enforces this for gambles).
- **Eatery / buka**: order for the whole table, spice level choice, "pay the bill" argument mini game (split or one person pays), a regular's discount card.
- **Bank**: loan with a repayment schedule, savings goals ("ajo" / thrift group with simulated members who may default), a queue you can skip for a fee.
- **Mall**: fitting-room outfit try-on that changes your avatar, a sale countdown with limited stock, a food court order.
- **Cinema**: pick a film and snacks, date mode: take an NPC and watch their mood.
- **Concert**: front row vs back (price tiers), spray the artist, merch stand, encore that depends on crowd energy.
- **Hotel (Eko)**: tip the waiter (exists), book a suite, room service, a conference summit (exists); add a "wedding hall" event to hire for a party.
- **Tech hub**: pitch to investors (a short choice-based pitch), hackathon (exists), hire a dev for your company.
- **Park**: open mic and yoga (exist); add football with strangers, jogging for health, a picnic.
- **Beach**: hire a boat, buy from sellers, a sunset event that boosts happiness.
- **Golf / recreation**: putting green (exists); add caddie tips, a tournament entry.
- **Government**: queue and paperwork (renew a licence), a "settle" mini game with an officer (risky, can raise the wanted level).
- **Business tower**: boardroom (exists); add hiring, a quarterly report, a hostile takeover offer.
- **Airport**: duty free (exists); add flight booking with a delay roll, lounge access, a lost luggage event.
- **Port**: customs desk (exists); add container auction, a risky smuggling job that interacts with the guard and jail systems.

## Cross-venue ideas
- A **spender leaderboard** per venue (simulated until multiplayer exists).
- **Venue reputation**: staff greet you by name after repeated big spending.
- **Receipts everywhere**: the club bill's picture export could be used for the showroom, the hotel and the airport.
