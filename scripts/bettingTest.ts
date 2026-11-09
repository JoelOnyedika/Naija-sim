import './mockStorage';
import { registerContent } from '../src/content';
import { BET, cashOutValue, combinedOdds, matchesFor, placeBet, settleBet } from '../src/game/betting';
import { startNewLife } from '../src/game/life';
import { enterInterior, leaveInterior } from '../src/game/interiors';
import { TRADE_RATE, tradeInValue, tradeInVehicle, tradeNet, vehiclePrice } from '../src/game/vehicles';
import { useEconomyStore } from '../src/stores/economyStore';
import { useVehicleStore } from '../src/stores/vehicleStore';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const E = () => useEconomyStore.getState();
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
registerContent();

console.log('Betting board');
const day = 12, ms = matchesFor(day);
ok(ms.length === BET.matchesPerDay && JSON.stringify(ms) === JSON.stringify(matchesFor(day)) && JSON.stringify(ms) !== JSON.stringify(matchesFor(day + 1)), 'six matches a day, the same for the same day, different tomorrow');
ok(ms.every((m) => m.home !== m.away && Math.abs(m.p.H + m.p.D + m.p.A - 1) < 1e-9), 'every match has two different teams and probabilities that add to 1');
let worst = 0, houseWins = true;
for (let d = 0; d < 400; d++) for (const m of matchesFor(d)) for (const k of ['H', 'D', 'A'] as const) { const ev = m.p[k] * m.odds[k]; worst = Math.max(worst, ev); if (ev >= 1) houseWins = false; if (m.odds[k] < 1.1) houseWins = false; }
ok(houseWins && worst < 1, `across 400 days every single bet loses on average (best expected return per naira staked: ${worst.toFixed(3)})`);
const acc = [{ matchId: ms[0].id, pick: 'H' as const }, { matchId: ms[1].id, pick: 'A' as const }, { matchId: ms[2].id, pick: 'D' as const }];
let evAcc = 1; acc.forEach((l) => { const m = ms.find((x) => x.id === l.matchId)!; evAcc *= m.p[l.pick] * m.odds[l.pick]; });
ok(evAcc < 1 && combinedOdds(ms, acc) > 3, 'an accumulator multiplies the odds and still loses on average');

console.log('Placing and settling');
startNewLife('lapo'); E().reset(100_000_000);
const m0 = E().money, r0 = placeBet(day, [acc[0]], 10_000, seq(0.11, 0.0, 0.5, 0.5, 0.5));
ok(r0.ok && m0 - E().money === 10_000, 'placing a slip takes exactly the stake');
const t = r0.ok ? r0.ticket : null!;
ok(t.results.length === 1 && t.potential === Math.round(10_000 * ms[0].odds.H), 'the potential win is stake times the odds');
const bad = [placeBet(day, [], 1000), placeBet(day, acc.concat(acc, acc), 1000), placeBet(day, [acc[0], acc[0]], 1000), placeBet(day, [{ matchId: 'nope', pick: 'H' }], 1000), placeBet(day, [acc[0]], 10), placeBet(day, [acc[0]], 1.5), placeBet(day, [acc[0]], Number.NaN), placeBet(day, [acc[0]], BET.maxStake + 1), placeBet(day, [{ matchId: ms[0].id, pick: 'X' as never }], 1000)];
ok(bad.every((b) => !b.ok) && E().money === m0 - 10_000, 'bad slips (no legs, too many, the same match twice, unknown match, bad stake, bad pick) are refused and charge nothing');
const before = E().money; E().reset(1_000);
ok(!placeBet(day, [acc[0]], 5_000).ok && E().money === 1_000, 'without the cash the slip is refused');
E().reset(before);
// a winning ticket: force the draw by choosing r so the outcome is the pick
const win = placeBet(day, [acc[0]], 20_000, seq(0.21, 0.0, 0.1, 0.1, 0.1)); // 0.0 draws home
ok(win.ok && win.ticket.results[0].won, 'a draw of 0.0 gives a home win');
const mb = E().money, s1 = win.ok ? settleBet(win.ticket) : null!;
ok(s1.kind === 'won' && E().money - mb === (win.ok ? win.ticket.potential : 0), 'a winning slip pays stake times odds');
const lose = placeBet(day, [acc[0]], 20_000, seq(0.31, 0.99, 0.5, 0.5, 0.5)); // 0.99 draws away
const mb2 = E().money, s2 = lose.ok ? settleBet(lose.ticket) : null!;
ok(lose.ok && !lose.ticket.results[0].won && s2.kind === 'lost' && s2.paid === 0 && E().money === mb2, 'a losing slip pays nothing');
ok(win.ok && win.ticket.results[0].score[0] > win.ticket.results[0].score[1], 'a home win has a home-winning scoreline');

console.log('Accumulators and cash out');
const two = [acc[0], acc[1]];
const tk = placeBet(day, two, 50_000, seq(0.41, 0.0, 0.5, 0.5, 0.5, 0.99, 0.5, 0.5, 0.5)); // leg 1 home (win), leg 2 away (win)
if (!tk.ok) throw new Error('slip failed');
const co1 = cashOutValue(tk.ticket, 1);
ok(co1 > 50_000 * 0.5 && co1 < tk.ticket.potential, 'after one correct leg the cash-out offer is below the full potential win');
ok(cashOutValue(tk.ticket, 0) === 0 && cashOutValue(tk.ticket, 2) === 0, 'no offer before the first leg or after the last');
const mc = E().money, sc = settleBet(tk.ticket, 1);
ok(sc.kind === 'cashed' && E().money - mc === co1, 'cashing out pays exactly the offer');
const tl = placeBet(day, two, 50_000, seq(0.51, 0.99, 0.5, 0.5, 0.5, 0.0, 0.5, 0.5, 0.5)); // leg 1 away => lost
ok(tl.ok && cashOutValue(tl.ticket, 1) === 0 && settleBet(tl.ticket, 1).paid === 0, 'once a leg has lost there is nothing to cash out');
const near = placeBet(day, two, 50_000, seq(0.61, 0.0, 0.5, 0.5, 0.5, 0.99, 0.5, 0.5, 0.5));
ok(near.ok && settleBet(near.ticket).nearMiss === (near.ok && near.ticket.results.filter((x) => !x.won).length === 1), 'a slip lost by exactly one leg is flagged as a near miss');

console.log('Long run');
E().reset(1_000_000_000); let staked = 0, back = 0; const r = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
for (let i = 0; i < 4000; i++) { const d = i % 50, bm = matchesFor(d), picks = [{ matchId: bm[i % 6].id, pick: (['H', 'D', 'A'] as const)[i % 3] }]; const x = placeBet(d, picks, 10_000, r); if (!x.ok) throw new Error(x.message); staked += 10_000; back += settleBet(x.ticket).paid; }
ok(back < staked, `4000 bets: staked ₦${staked.toLocaleString()}, returned ₦${back.toLocaleString()} (the house wins)`);

console.log('Polanco trade-in');
startNewLife('nepo'); E().reset(5_000_000_000);
const showroom = enterInterior('showroom') as unknown;
void showroom;
useVehicleStore.getState().reset(['dodge']); useVehicleStore.getState().add('dodge', vehiclePrice('dodge'));
const tv = tradeInValue('dodge');
ok(tv === Math.round(vehiclePrice('dodge') * TRADE_RATE) && tv > Math.round(vehiclePrice('dodge') * 0.7), 'a trade-in pays 78% of what you paid, more than the 70% a plain sale pays');
const net = tradeNet('audi', 'dodge'), cash = E().money;
const tr = tradeInVehicle('audi', 'dodge');
ok(tr.ok && cash - E().money === net && useVehicleStore.getState().owned.includes('audi') && !useVehicleStore.getState().owned.includes('dodge'), 'trading the Challenger for the Audi pays only the difference, the old car goes and the new one is yours');
const back2 = tradeInVehicle('dodge', 'audi'), after = E().money;
ok(back2.ok && cash - after > 0, 'trading back and forth never makes money (each swap loses 22% of the old car)');
ok(!tradeInVehicle('tesla', 'audi').ok, 'you cannot trade in a car you do not own');
useVehicleStore.getState().reset(['dodge']); useVehicleStore.getState().add('dodge', vehiclePrice('dodge'));
ok(!tradeInVehicle('dodge', 'dodge').ok, 'you cannot trade a car for itself');
useVehicleStore.getState().reset(['audi', 'tesla']); useVehicleStore.getState().add('audi', vehiclePrice('audi')); useVehicleStore.getState().add('tesla', vehiclePrice('tesla'));
ok(!tradeInVehicle('audi', 'tesla').ok, 'you cannot buy a car you already own');
useVehicleStore.getState().reset(['audi']); useVehicleStore.getState().add('audi', vehiclePrice('audi')); E().reset(1_000);
ok(!tradeInVehicle('tesla', 'audi').ok && useVehicleStore.getState().owned.includes('audi') && E().money === 1_000, 'without enough cash for the difference nothing changes');
leaveInterior();
ok(!tradeInVehicle('tesla', 'audi').ok, 'trade-ins only work inside the showroom');

if (fails) { console.log(`\n${fails} betting/trade-in check(s) FAILED`); process.exit(1); }
console.log('\nAll betting and trade-in checks passed');
