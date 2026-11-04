import './mockStorage';
import { registerContent } from '../src/content';
import { FINALE, OPPONENTS, ROAD } from '../src/data/agbero';
import { addRoadWin, chooseRoad, demandFor, fighterNow, finishRoadblock, finaleReady, maybeRoadblock, oddsFight, oddsRun, oddsTalk, resolveFinale, stageOf, type Fighter } from '../src/game/agbero';
import { startNewLife } from '../src/game/life';
import { useAgberoStore } from '../src/stores/agberoStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useSkillStore } from '../src/stores/skillStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useTravelStore } from '../src/stores/travelStore';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const A = () => useAgberoStore.getState(), E = () => useEconomyStore.getState(), S = () => useStatsStore.getState();
const strong: Fighter = { health: 100, energy: 100, charisma: 80, fitness: 6, communication: 6 };
const mid: Fighter = { health: 60, energy: 60, charisma: 30, fitness: 2, communication: 2 };
const weak: Fighter = { health: 20, energy: 15, charisma: 5, fitness: 0, communication: 0 };

console.log('Odds follow your stats');
for (const [n, fn] of [['run', oddsRun], ['fight', oddsFight], ['talk', oddsTalk]] as const) {
  ok(fn(strong, 0) > fn(weak, 0), `${n}: a strong, charming player has better odds than a weak one`);
  ok(fn(mid, 2) < fn(mid, 1) && fn(mid, 1) < fn(mid, 0), `${n}: a tougher opponent lowers the odds`);
  const all = [strong, weak].flatMap((f) => [0, 1, 2].map((p) => fn(f, p)));
  ok(all.every((o) => o >= 0.05 && o <= 0.9), `${n}: odds always stay between 5% and 90%, never certain`);
}
ok(oddsRun({ ...weak, energy: 100 }, 0) > oddsRun(weak, 0), 'more energy makes running easier');
ok(oddsFight({ ...weak, health: 100 }, 0) > oddsFight(weak, 0), 'more health makes fighting easier');
ok(oddsTalk({ ...weak, charisma: 90 }, 0) > oddsTalk(weak, 0), 'more charisma makes talking easier');
ok(oddsFight({ ...weak, fitness: 5 }, 0) > oddsFight(weak, 0) && oddsRun({ ...weak, fitness: 5 }, 0) > oddsRun(weak, 0), 'fitness helps both fighting and running');
ok(oddsTalk({ ...weak, communication: 5 }, 0) > oddsTalk(weak, 0), 'the communication skill helps talking');

console.log('Demand and story stages');
ok(demandFor('ticket_boy', 0) === 500 && demandFor('ticket_boy', 1e9) === 1000, 'the ticket boy asks ₦500 to ₦1,000');
ok(demandFor('boss', 1e9) === 6000 && demandFor('boss', 10) === 3000, 'the boss asks ₦3,000 to ₦6,000');
ok(demandFor('kazeem', 150_000) % 100 === 0, 'demands are rounded to ₦100');
ok(stageOf(0) === 0 && stageOf(ROAD.stageWins[0]) === 1 && stageOf(ROAD.stageWins[1]) === 2, 'wins move the story from the ticket boy to Kazeem to the boss');
ok(OPPONENTS.length === 3 && OPPONENTS[0].power < OPPONENTS[1].power && OPPONENTS[1].power < OPPONENTS[2].power, 'three opponents, each tougher');

console.log('When roadblocks happen');
startNewLife('lapo'); A().reset(); useTravelStore.setState({ trips: 1 });
let went = 0; const go = () => { went++; };
ok(!maybeRoadblock(go, () => 0) && A().active === null, 'never on your first trip');
useTravelStore.setState({ trips: 2 });
ok(!maybeRoadblock(go, () => 0.99) && A().active === null, 'a high roll means a clear road');
ok(maybeRoadblock(go, () => 0) && A().active !== null && went === 0, 'a low roll starts a roadblock and holds the trip');
ok(A().active!.opponentId === 'ticket_boy' && A().active!.demand >= 500, 'the first opponent is the ticket boy');
finishRoadblock(); ok(went === 1 && A().active === null, 'finishing it lets the trip carry on exactly once');
useTravelStore.setState({ trips: 3 }); ok(!maybeRoadblock(go, () => 0), 'never two trips in a row');
useTravelStore.setState({ trips: 4 }); ok(maybeRoadblock(go, () => 0), 'but again after a clear trip'); finishRoadblock();

console.log('Pay');
const resetRoad = (trips: number, opp = 0) => { A().set({ active: null, result: null, lastTrip: 0 }); useTravelStore.setState({ trips }); A().set({ wins: [0, ROAD.stageWins[0], ROAD.stageWins[1]][opp] }); maybeRoadblock(() => {}, () => 0); };
E().reset(100_000); resetRoad(10); const d1 = A().active!.demand;
const r1 = chooseRoad('pay')!;
ok(r1.success && E().money === 100_000 - d1 && r1.money === -d1, 'paying always works and takes exactly what he asked');
ok(chooseRoad('run') === null, 'you cannot pick twice');
finishRoadblock(); E().reset(0); resetRoad(12);
ok(chooseRoad('pay')!.money === 0 && E().money === 0, 'with an empty wallet he takes nothing');
finishRoadblock();

console.log('Run, fight, talk');
for (const [choice, win] of [['run', true], ['run', false], ['fight', true], ['fight', false], ['talk', true], ['talk', false]] as const) {
  E().reset(50_000); S().reset(); resetRoad(20 + Math.floor(Math.random() * 5)); const d = A().active!.demand, wins0 = A().wins, m0 = E().money, hp0 = S().stats.health;
  const r = chooseRoad(choice, () => (win ? 0 : 0.999))!;
  ok(r.success === win, `${choice}: the dice decide (${win ? 'won' : 'lost'})`);
  if (choice === 'run') ok(win ? E().money === m0 : E().money === m0 - Math.round(d * 1.5) && S().stats.health < hp0, `run ${win ? 'wins: no money lost' : 'loses: pays 1.5x and gets hurt'}`);
  if (choice === 'fight') ok(win ? E().money === m0 + d && A().wins === wins0 + 1 : E().money === m0 - d * 2 && S().stats.health === hp0 - 15, `fight ${win ? 'wins: takes his money and a story win' : 'loses: pays double and loses 15 health'}`);
  if (choice === 'talk') ok(win ? E().money === m0 && A().wins === wins0 + 1 : E().money === m0 - d && A().wins === wins0, `talk ${win ? 'wins: free and a story win' : 'loses: pays and no win'}`);
  ok(E().money >= 0, `${choice}: money never goes negative`);
  finishRoadblock();
}
E().reset(300); resetRoad(40); chooseRoad('fight', () => 0.999); ok(E().money === 0, 'a lost fight never takes more than you carry'); finishRoadblock();
useSkillStore.getState().reset(); E().reset(5000); resetRoad(50); chooseRoad('talk', () => 0); ok(useSkillStore.getState().xp.communication === 6, 'a won talk trains communication'); finishRoadblock();

console.log('The story and its ending');
A().reset(); E().reset(100_000); useTravelStore.setState({ trips: 100 });
for (let i = 0; i < ROAD.finaleWins; i++) addRoadWin();
ok(finaleReady() && stageOf(A().wins) === 2, `${ROAD.finaleWins} wins unlock the finale`);
maybeRoadblock(() => {}, () => 0.99);
ok(A().active?.finale === true && A().active?.opponentId === 'boss', 'the finale happens even on a high roll, with the boss');
ok(chooseRoad('fight') === null, 'no dice in the finale');
const before = E().money, ch0 = S().stats.charisma; resolveFinale('join');
ok(E().money === before + FINALE.join.money && S().stats.charisma === Math.max(0, ch0 - 3) && A().ending === 'joined', 'joining pays ₦5,000 and costs 3 charisma');
finishRoadblock(); useTravelStore.setState({ trips: 105 });
const m2 = E().money; ok(!maybeRoadblock(() => {}, () => 0) && E().money === m2 + FINALE.join.duesPerTrip, 'after joining: no roadblocks and ₦1,500 dues each trip');
A().reset(); for (let i = 0; i < ROAD.finaleWins; i++) addRoadWin(); useTravelStore.setState({ trips: 200 }); maybeRoadblock(() => {}, () => 0.9);
const m3 = E().money; resolveFinale('report');
ok(E().money === m3 + FINALE.report.money && A().ending === 'reformed', 'reporting him pays ₦10,000 and ends the story');
finishRoadblock(); useTravelStore.setState({ trips: 210 }); ok(!maybeRoadblock(() => {}, () => 0) && E().money === m3 + FINALE.report.money, 'after reporting: no more roadblocks, no dues');
startNewLife('lapo'); ok(A().wins === 0 && A().ending === null, 'a new life starts the story again');
ok(fighterNow().fitness >= 0 && fighterNow().communication >= 0, 'skill levels convert to bonuses of 0 or more');
console.log(fails ? `\n${fails} FAILED` : '\nAll Agbero checks passed');
process.exit(fails ? 1 : 0);
