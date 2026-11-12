# UNILAG campus, the brotherhood story, and the gun (v37)

Where things live, how to extend them, and what the open world should reuse. The old plan file is gone: everything in it is built except what is listed under "Not built".

## Files
| What | Where |
|---|---|
| Story script, missions, tuning (`STORY`, `EXAM`), dialogue nodes | `src/data/story.ts` |
| Story rules (missions, recruiter, initiation, clocks) | `src/game/story.ts` |
| Exam Hall rules (pure, `rnd` injectable) and 28 questions | `src/game/exam.ts`, `src/data/examQuestions.ts` |
| Weapons data, rules, open-world intents (`draw`, `holster`, `fire`) | `src/data/weapons.ts`, `src/game/weapons.ts` |
| State | `src/stores/storyStore.ts`, `src/stores/weaponStore.ts` (both persisted; dialogue/exam/beating are not) |
| Campus props and 20+ campus activities | `src/data/venueKit3.ts` |
| Interiors `university` and `initiation` | `src/data/interiors.ts` |
| Map pin | `lagos.unilag` in `src/content/lagos/landmarks.ts` (Akoka, in the Yaba area) |
| Forest scene (fire, 12 robed members, Dayo, trees) | `src/three/property/Forest.tsx` |
| UI | `StoryDialogue.tsx`, `ExamGame.tsx`, `CampusCard.tsx`, `InventoryTab.tsx`, phone app `Brotherhood.tsx` |
| Tests | `npm run test:story` (also in `test:all`) |

## How it works
- A campus task is an ordinary activity whose finish fires `campus:<id>` (`game/tasks.ts` -> `onCampusEvent`). Missions count those events. The exam desk is the one special case (`exam: true` on the use, like `haggle`).
- Missions: Welcome, Fresher -> Find Your Feet -> Assignment Season, then the repeating Campus Life hub. Mission flags: `registered`, `has_friends`, `grade_set`, `good_grade`.
- Discovery (no mission gate): from the first visit, every 30 s on campus there is a weighted roll (`discoveryChance`): base 2%, more when broke, caught cheating, good grades or curious, less if rude to Dayo. Clue spots add to it: the black flyer (notice board), students with bracelets (hostel), the table behind you (cafeteria). Two clues, or "Ask Senior Dayo about the brotherhood" at the SUG office, start it at once. A pity timer (20 real minutes on campus) guarantees it, so any player can find it. Dayo's first scene has variants (seeking, broke, caught cheating).
- Recruiter state machine (`storyStore.recruit`): none -> met -> blending (three scenes, two tasks apart) -> offered -> invited -> member, or ended. The offer's lines change with `dayo_rude`, `caught_cheating`, `good_grade`.
- Refusing escalates: favour reminders, then harassment tier 1 (shouting, 3 refusals), tier 2 (blocking and rumours, costs social/charisma, 6), tier 3 (the final threat, 9). Every tier offers Join and **Report to the police**, which ends the story for good (Dayo never returns, not even by the pity timer; small social cost). "Call campus security" buys time. Standing firm is allowed forever.
- Initiation: 22:00 game time, at least 2 game hours after saying yes, open for 4 game hours. Arriving on campus in the window starts "Follow me". Miss it once: one more offer. Twice: the story ends quietly. In the forest you can try to leave before the oath (uses `oddsRun`). The beating is a stylised scene: screen shake, red pulse, tightening circle, health -30, energy -40, happiness -20. No gore.
- Member: random alias, rank 1, reputation 5, black bracelet (Inventory), the Brotherhood phone app (hidden until you are a member), Black robe in the Boutique (a black kaftan cut).
- Gun: bought only in the Brotherhood app (never in Shops), members only. It adds fight points (capped at 25) through `fighterNow()`, so Agbero roadblocks and loan collectors feel it. A carried gun shows as a holster on the hip (hidden under a jacket or hoodie) and a 🔫 in the venue strip. Heat rises with use. An arrest with a weapon doubles the sentence and takes the weapon (`policeSearch`).
- A new life resets story and weapons (`game/life.ts`).

## Open world: what carries over
`WeaponDef` already has `damage`, `range`, `noise`, `ammoPerClip`, `cooldownMs`. `weapons.draw/holster/fire` are pure rules returning events; nothing renders a shot yet. A server must own buying, shooting and dice (`game/authority.ts`). The dialogue nodes, flags and actions are data, so the open world can run the same scenes. The forest circle in `Forest.tsx` can be filled with real players.

## Not built (honest list)
- "Intelligence" is not a stat in this game. Study and lectures give skill XP (communication, business, teaching) instead.
- No shooting, no rifle (listed as "Later"), no gun-specific animation: only the holster and the stats.
- No separate `chant` avatar action: the robed members' raised hands are animated inside `Forest.tsx`.
- Robes are a black kaftan, not a new garment shape. The robed figures are simple cone/sphere models.
- The 3D Exam Hall is a sheet, not a walk-in scene. Campus has no custom decor beyond its props and palms.
- Police roadblock "searches" are only applied at arrest, not at Agbero or traffic stops.
