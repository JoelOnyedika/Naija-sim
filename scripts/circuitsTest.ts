import './mockStorage';
import { CHAINS, levelFor } from '../src/data/circuits';
import { STREET_EVENTS } from '../src/data/streetEvents';
import { answerEvent, eligibleEvents, showEvent } from '../src/game/streetEvents';
import { chainLevel, chainEnding } from '../src/game/circuits';
import { useCircuitStore } from '../src/stores/circuitStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useDailyStore } from '../src/stores/dailyStore';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const C = () => useCircuitStore.getState(), E = () => useEconomyStore.getState();
const ev = (id: string) => STREET_EVENTS.find((e) => e.id === id)!;
const play = (id: string, choice: string) => { useDailyStore.getState().set({ pending: null, lastSeen: {} }); showEvent(ev(id)); return answerEvent(choice); };

console.log('Levels');
ok([0, 2, 3, 6, 7, 11, 12, 99].map((n) => levelFor('mama', n)).join() === '0,0,1,1,2,2,3,3', 'Mama Agbo levels switch at 3, 7 and 12 purchases');
ok([0, 1, 2, 4, 5, 7, 8].map((n) => levelFor('owambe', n)).join() === '0,0,1,1,2,2,3', 'the owambe circuit levels switch at 2, 5 and 8 parties');
ok(Object.values(CHAINS).every((c) => c.levels.length === 4), 'every story names four levels');

console.log('Mama Agbo');
C().reset(); E().reset(1_000_000); useStatsStore.getState().reset();
const gated = (id: string) => ev(id).chain!;
ok(gated('agbo_mama').max === 0 && gated('mama_regular').min === 1 && gated('mama_special').min === 2 && gated('mama_recipe').min === 3, 'each stage has its own moments');
ok(!eligibleEvents().some((e) => e.id === 'mama_regular'), 'the regular-customer moment waits for level 1');
for (let i = 0; i < 3; i++) play('agbo_mama', 'buy');
ok(C().steps.mama === 3 && chainLevel('mama') === 1, 'three purchases make you a customer');
for (let i = 0; i < 4; i++) play('mama_regular', 'buy');
ok(chainLevel('mama') === 2, 'seven purchases make you a regular');
const m0 = E().money; play('mama_special', 'gist'); ok(E().money === m0 && C().steps.mama === 8, 'gossiping is free and still counts');
for (let i = 0; i < 4; i++) play('mama_special', 'special');
ok(chainLevel('mama') === 3 && chainEnding('mama') === null, 'twelve steps make you family and open the ending');
const hp = useStatsStore.getState().stats.health;
play('mama_recipe', 'recipe');
ok(chainEnding('mama') === 'recipe' && E().money <= m0 - 15000, 'learning the recipe costs ₦15,000 and ends the story');
useStatsStore.getState().apply({ health: -40 }); const hp1 = useStatsStore.getState().stats.health; void hp;
play('agbo_mama', 'buy'); ok(useStatsStore.getState().stats.health - hp1 >= 17, 'with the recipe every agbo gives +5 health on top of the usual +12');
ok(!eligibleEvents().some((e) => e.id === 'mama_recipe'), 'the ending offer does not come back');
void hp1;

console.log('The owambe circuit');
C().reset(); E().reset(1_000_000);
play('owambe_asoebi', 'gift'); ok(C().steps.owambe === 0, 'a gift envelope is not a party');
play('owambe_asoebi', 'attend'); play('owambe_asoebi', 'attend');
ok(chainLevel('owambe') === 1, 'two parties make you an aso-ebi regular');
for (let i = 0; i < 3; i++) play('owambe_big', 'attend');
ok(chainLevel('owambe') === 2, 'five parties make you life of the party');
for (let i = 0; i < 3; i++) play('owambe_big', 'attend');
ok(chainLevel('owambe') === 3, 'eight parties make you a celebrity');
const m1 = E().money; play('owambe_mic', 'mc');
ok(chainEnding('owambe') === 'mc' && E().money === m1 + 15000, 'being the MC pays ₦15,000 and ends the story');
ok(!eligibleEvents().some((e) => e.id === 'owambe_mic'), 'the mic offer does not come back');
C().reset(); ok(C().steps.mama === 0 && C().ending.owambe === null, 'a new life starts both stories again');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll circuit checks passed');
