import './mockStorage';
import { registerContent } from '../src/content';
import { HAGGLE, acceptPrice, makeOffer, newHaggle, settleHaggle } from '../src/game/haggle';
import { startNewLife } from '../src/game/life';
import { useEconomyStore } from '../src/stores/economyStore';
import { useSkillStore } from '../src/stores/skillStore';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const fixed = (v: number) => () => v;
const E = () => useEconomyStore.getState();

registerContent();
console.log('Haggling');
const s0 = newHaggle(10_000, fixed(0.5));
ok(s0.fair === 6_000 && s0.price === 10_000 && s0.mood === HAGGLE.hearts && !s0.result, 'the seller has a hidden fair price (60% here), starts at his ask, and has full mood');
const ins = makeOffer(s0, 2_000);
ok(ins.mood === 1 && ins.price === 10_000 && !ins.result, 'an insulting offer costs two hearts and he does not move');
ok(makeOffer(ins, 2_000).result?.kind === 'walked', 'insult him twice and he packs his goods and walks');
const low = makeOffer(s0, 4_000);
ok(low.mood === 2 && low.price < 10_000 && low.price >= 6_480 && !low.result, 'a low offer costs a heart and he comes down, but never below 108% of fair');
const near = makeOffer(s0, 5_400);
ok(near.result?.kind === 'deal' && near.result.paid === 5_400 && near.result.grade === 'sharp' && near.result.saved === 4_600, 'an offer 90% of fair is "agree small": a deal at YOUR price, graded sharp');
const hail = makeOffer(s0, 8_000);
ok(hail.result?.kind === 'deal' && hail.result.paid === 8_000 && hail.result.grade === 'hailed', 'offering well above fair gets you hailed: a deal at your price, graded as overpaid');
const top = makeOffer(s0, 20_000);
ok(top.result?.kind === 'deal' && top.result.paid === 10_000, 'offering more than he asks never costs more than his price');
ok(acceptPrice(s0).result?.kind === 'deal' && (acceptPrice(s0).result as { paid: number }).paid === 10_000, 'paying his price is always possible');
let st = s0; for (let i = 0; i < 6 && !st.result; i++) st = makeOffer(st, 4_000);
ok(st.result?.kind === 'walked' || st.result?.kind === 'deal', 'a haggle always ends within the rounds');
ok(makeOffer(near, 100).result === near.result, 'a finished haggle cannot be reopened');
ok(Array.from({ length: 300 }, (_, i) => newHaggle(5_000 + i * 37, Math.random)).every((h) => h.fair >= 0.5 * h.ask - 50 && h.fair <= 0.7 * h.ask + 50), 'the hidden fair price is always 50 to 70 percent of the ask');

console.log('Settling');
startNewLife('lapo'); E().reset(100_000);
const xp0 = useSkillStore.getState().xp.communication ?? 0, m0 = E().money;
const set = settleHaggle(near, 'a pair of shoes', 'the shoe seller');
ok(set.ok && m0 - E().money === 5_400 && (useSkillStore.getState().xp.communication ?? 0) > xp0, 'paying takes exactly the agreed price and trains communication');
const m1 = E().money, wk = settleHaggle({ ...s0, result: { kind: 'walked' } }, 'x', 'y');
ok(wk.ok && E().money === m1, 'walking away costs no money');
E().reset(1_000);
const bad = settleHaggle(near, 'a pair of shoes', 'the shoe seller');
ok(!bad.ok && E().money === 1_000, 'without the cash nothing is charged and it says so');
ok(!settleHaggle(s0, 'x', 'y').ok, 'a haggle still in progress cannot be settled');

if (fails) { console.log(`\n${fails} haggle check(s) FAILED`); process.exit(1); }
console.log('\nAll haggle checks passed');
