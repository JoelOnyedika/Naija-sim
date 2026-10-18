import './mockStorage';

import { registerContent } from '../src/content';
import { WEEK_MINUTES, DAY_MINUTES, INCOME_TAX, BONDS } from '../src/data/economy';
import { advance } from '../src/game/loop';
import { startNewLife } from '../src/game/life';
import { buyBond, chargeIncomeTax, depositSavings, payBill, projectedInterest, recordTransferSignal, withdrawSavings, billables } from '../src/game/banking';
import { sendTransfer } from '../src/game/bank';
import { computeCredibility } from '../src/game/credibility';
import { clearGuard } from '../src/game/guard';
import { runDueEvents } from '../src/game/scheduler';
import { computeNetWorth } from '../src/game/wealth';
import { useBankStore } from '../src/stores/bankStore';
import { useClockStore } from '../src/stores/clockStore';
import { migrateEconomy, useEconomyStore, refOf } from '../src/stores/economyStore';
import { useSchedulerStore } from '../src/stores/schedulerStore';
import { usePropertyStore } from '../src/stores/propertyStore';
import { useVehicleStore } from '../src/stores/vehicleStore';

registerContent();
const DEFAULT_BRACKETS = [...INCOME_TAX.brackets];
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const eco = () => useEconomyStore.getState();
const bank = () => useBankStore.getState();
const txCount = (kind?: string) => eco().transactions.filter((t) => !kind || t.kind === kind).length;
const setClock = (m: number) => useClockStore.setState({ minutes: m });
const fresh = (money: number, type: 'lapo' | 'nepo' = 'lapo') => {
  startNewLife(type); clearGuard();
  eco().reset(money);
  runDueEvents(); // seeds the scheduler at the starting week
};

// ── Ledger
console.log('Ledger');
fresh(100_000);
let before = eco().money, n = txCount();
ok(!eco().debit(150_000, 'too much') && eco().money === before && txCount() === n, 'unaffordable purchase fails and deducts nothing');
ok(eco().debit(30_000, 'Test buy', 'purchase') && eco().money === 70_000 && txCount() === n + 1, 'successful purchase deducts exactly once');
const t0 = eco().transactions[0];
ok(t0.direction === 'expense' && t0.balanceBefore === 100_000 && t0.balanceAfter === 70_000 && t0.currency === 'NGN' && t0.status === 'completed', 'ledger entry records direction, balance before/after, currency, status');
ok(typeof t0.gameMinutes === 'number' && /^NL-\d{6}$/.test(t0.reference ?? ''), 'ledger entry records game time and a reference number');
const first = eco().post({ direction: 'income', amount: 1000, label: 'k', kind: 'income', meta: { opKey: 'same-key' } });
const second = eco().post({ direction: 'income', amount: 1000, label: 'k', kind: 'income', meta: { opKey: 'same-key' } });
ok(first.ok && !second.ok && !second.ok && (second as any).reason === 'duplicate' && eco().money === 71_000, 'a repeated idempotency key changes nothing');
for (const bad of [0, -5, NaN, Infinity, Number.MAX_SAFE_INTEGER * 2]) { const m = eco().money; eco().credit(bad, 'bad'); ok(eco().money === m, `credit(${bad}) is rejected`); }
ok(!eco().debit(NaN, 'nan') && !eco().debit(-1, 'neg'), 'debit of NaN or a negative amount is rejected');
ok(eco().debit(0, 'free') && eco().money === 71_000, 'a zero-price debit succeeds without a ledger entry');
const refs = new Set(eco().transactions.map(refOf));
ok(refs.size === eco().transactions.length, 'every transaction has a unique reference');

// the wallet always equals start + sum of recorded amounts
fresh(500_000);
for (let i = 0; i < 40; i++) { if (i % 3) eco().debit(1000 + i * 37, `d${i}`); else eco().credit(500 + i * 11, `c${i}`); }
ok(eco().money === 500_000 + eco().transactions.reduce((s, t) => s + t.amount, 0), 'wallet equals starting balance plus the sum of the ledger');
ok(eco().transactions.every((t, i, a) => i === a.length - 1 || a[i + 1].balanceAfter === t.balanceBefore), 'balance-after of each entry equals balance-before of the next');

// legacy saves
const migrated = migrateEconomy({ money: 900, transactions: [{ id: 'a', kind: 'salary', amount: 500, label: 'x', at: 1 }, { id: 'b', kind: 'purchase', amount: -200, label: 'y', at: 2 }] }, 1);
ok(migrated.money === 900 && migrated.transactions!.length === 2 && migrated.transactions![1].direction === 'expense' && migrated.lifetimeIncome === 500 && migrated.lifetimeExpense === 200, 'v1 saves migrate: money kept, directions and lifetime totals rebuilt');

// ── Savings
console.log('Savings');
fresh(2_000_000);
const nwBefore = computeNetWorth().total;
ok(depositSavings(1_000_000).ok && eco().money === 1_000_000 && bank().savings.balance === 1_000_000, 'deposit moves money from wallet to savings');
ok(computeNetWorth().total === nwBefore, 'net worth does not change when money moves into savings');
ok(!eco().debit(1_500_000, 'spend savings'), 'savings are not spendable wallet cash');
ok(!depositSavings(1_000_000).ok, 'an identical deposit tapped twice in a row is ignored');
clearGuard();
ok(!depositSavings(5_000_000).ok && !depositSavings(100).ok && !depositSavings(NaN).ok, 'deposit validates amount, minimum and balance');
ok(!withdrawSavings(2_000_000).ok && withdrawSavings(250_000).ok && eco().money === 1_250_000 && bank().savings.balance === 750_000, 'withdraw validates and moves money back');
ok(eco().lifetimeIncome === 0 && eco().lifetimeExpense === 0, 'savings movements are not counted as income or expense');
clearGuard();
const expected = projectedInterest();
const sumKind = (kind: string) => eco().transactions.filter((t) => t.kind === kind).reduce((s, t) => s + t.amount, 0);
setClock(WEEK_MINUTES + 600);
for (let i = 0; i < 6; i++) runDueEvents();
ok(expected === 3750 && txCount('interest') === 1 && sumKind('interest') === 3750, 'interest (0.5% of 750,000) is paid exactly once for a week, however often events run');
{
  // the same through the real game loop: stepping the simulation repeatedly cannot pay the week twice
  const k = txCount('interest'); for (let i = 0; i < 5; i++) advance(1);
  ok(txCount('interest') === k, 'stepping the game loop again in the same week pays no more interest');
}
setClock(WEEK_MINUTES * 2 + 5);
for (let i = 0; i < 4; i++) runDueEvents();
ok(txCount('interest') === 2 && bank().savingsWeeks === 2, 'the next week pays once more and counts a consistent saving week');
{
  fresh(1_000_000); depositSavings(500_000);
  setClock(WEEK_MINUTES * 40); runDueEvents();
  ok(txCount('interest') <= 4, 'a very long gap catches up at most a few weeks, not dozens');
}

// ── Bonds
console.log('Bonds');
fresh(10_000_000);
const def = BONDS.find((b) => b.id === 'nt-7d')!;
const nw1 = computeNetWorth().total;
ok(!buyBond('nt-7d', 1000).ok && !buyBond('nt-7d', 999_999_999).ok && !buyBond('nope', 100_000).ok, 'bond purchase enforces minimum, maximum, wallet balance and a real product');
ok(buyBond('nt-7d', 1_000_000).ok && eco().money === 9_000_000 && bank().bonds.length === 1, 'bond purchase takes the money out of the wallet once');
ok(computeNetWorth().total === nw1 && computeNetWorth().bonds === 1_000_000, 'bond principal counts in net worth once (wallet drops, bonds rise)');
const bond = bank().bonds[0];
ok(bond.expectedReturn === 30_000 && bond.maturesAt - bond.boughtAt === def.termDays * DAY_MINUTES, 'expected return and maturity come from the product rules');
const bondSum = () => eco().transactions.filter((t) => t.kind === 'bond').reduce((s, t) => s + t.amount, 0);
setClock(bond.maturesAt - 1); runDueEvents();
ok(bank().bonds[0].status === 'active' && txCount('bond') === 1 && computeNetWorth().bonds === 1_000_000, 'a bond does not pay before maturity');
setClock(bond.maturesAt + 1);
for (let i = 0; i < 5; i++) runDueEvents();
ok(bank().bonds[0].status === 'matured' && txCount('bond') === 3 && bondSum() === 30_000, 'a matured bond pays principal and return exactly once (purchase -1,000,000, principal +1,000,000, return +30,000)');
ok(computeNetWorth().bonds === 0, 'a matured bond leaves the net-worth bond total (its principal is back in the wallet)');
ok(eco().transactions.filter((t) => t.kind === 'bond' && !t.internal).reduce((s, t) => s + t.amount, 0) === 30_000, 'only the return (not the principal) is income');

// ── Bills
console.log('Bills');
fresh(5_000_000, 'nepo');
eco().reset(5_000_000);
const expectedBills = billables();
ok(expectedBills.length === 3, `a nepo life is billed for its home and 2 cars (${expectedBills.length})`);
const billTotal = expectedBills.reduce((s, b) => s + b.amount, 0);
setClock(WEEK_MINUTES + 100);
for (let i = 0; i < 5; i++) runDueEvents();
ok(txCount('bill') === 3 && eco().money === 5_000_000 - billTotal, 'each bill is charged once for the week, however often events run');
ok(bank().bills.every((b) => b.status === 'paid' && b.onTime), 'bills paid at the run are on time');
setClock(WEEK_MINUTES * 2 + 100); runDueEvents(); runDueEvents();
ok(txCount('bill') === 6, 'the next week charges once more');
// insufficient funds
fresh(0, 'nepo'); eco().reset(1_000); setClock(WEEK_MINUTES + 10); runDueEvents();
ok(eco().money >= 0 && bank().bills.some((b) => b.status === 'overdue'), 'with too little money bills become overdue and the balance never goes negative');
const overdueBefore = computeCredibility().score;
eco().credit(5_000_000, 'top up');
const od = bank().bills.find((b) => b.status === 'overdue')!;
const m0 = eco().money;
ok(payBill(od.id).ok && eco().money === m0 - od.amount && !payBill(od.id).ok, 'an overdue bill can be paid once');
setClock(WEEK_MINUTES * 2 + 10); runDueEvents();
ok(bank().bills.filter((b) => b.status === 'overdue').length === 0, 'remaining overdue bills are retried and paid at the next run');
ok(computeCredibility().score >= overdueBefore, 'clearing overdue bills removes the credibility penalty');

// ── Income tax
console.log('Income tax');
INCOME_TAX.enabled = false;
fresh(1_000_000); setClock(WEEK_MINUTES + 5); runDueEvents();
ok(txCount('tax') === 0 && bank().taxes.length === 0, 'with the tax rule switched off nothing is ever charged');
INCOME_TAX.enabled = true; INCOME_TAX.brackets = [{ upTo: 100_000, rateBps: 0 }, { upTo: null, rateBps: 1000 }];
fresh(1_000_000);
setClock(10); eco().credit(300_000, 'Shift pay', 'salary'); // week 0
setClock(WEEK_MINUTES + 5); runDueEvents(); runDueEvents();
ok(bank().taxes.length === 1 && bank().taxes[0].tax === 20_000 && txCount('tax') === 1, 'with a rule on, tax is computed from the ledger and charged once per week (10% over 100,000)');
chargeIncomeTax(1);
ok(txCount('tax') === 1, 'running the tax event again for the same week does nothing');
INCOME_TAX.enabled = true; INCOME_TAX.brackets = DEFAULT_BRACKETS;

// ── Credibility
console.log('Credibility');
fresh(5_000_000);
const base = computeCredibility().score;
setClock(50);
recordTransferSignal('mama', 600_000); recordTransferSignal('mama', 600_000); recordTransferSignal('mama', 100);
ok(bank().transferSignals.mama.count === 1, 'two qualifying transfers on the same day count once; a small one counts for nothing');
for (let d = 1; d <= 6; d++) { setClock(d * DAY_MINUTES + 50); recordTransferSignal('mama', 700_000); }
ok(bank().transferSignals.mama.count === 3, 'transfers to one contact stop counting after the per-contact cap');
const c = computeCredibility();
ok(c.score >= base && c.score <= 100 && c.items.every((i) => i.points <= i.max || i.max === 0), 'score stays between 0 and 100 and every item respects its cap');
fresh(100_000);
{
  const r = sendTransfer({ toId: 'mama', amount: 50_000 });
  ok(r.ok && eco().money === 50_000, 'the transfer flow still works through the upgraded ledger');
  const tx = eco().transactions[0];
  ok(tx.kind === 'transfer' && tx.recipient === 'Mama' && tx.status === 'completed', 'transfer records keep their sender, recipient and status');
}

// ── Net worth
console.log('Net worth');
fresh(1_000_000);
const nw = computeNetWorth();
const ownedHomes = usePropertyStore.getState().ownedIds.length;
ok(nw.total === nw.wallet + nw.savings + nw.bonds + nw.homes + nw.land + nw.markets + nw.companies + nw.vehicles && ownedHomes === 1, 'net worth is exactly the sum of its parts');
useVehicleStore.getState().add('corolla');
ok(computeNetWorth().vehicles === Math.floor(6_500_000 * 0.8), 'cars count at 80% of list price');

// ── Scheduler
console.log('Scheduler');
fresh(100_000);
useSchedulerStore.getState().reset();      // never seen
setClock(WEEK_MINUTES * 3 + 5);            // the clock is already 3 weeks in
const k = txCount();
runDueEvents();
ok(txCount() === k, 'the first time an event is seen it records the current week and charges nothing back');
ok(useSchedulerStore.getState().last['weekly-bills'] === 3, 'the last-run week is persisted per event');

console.log(fails ? `\n${fails} economy check(s) FAILED` : '\nAll economy checks passed');
process.exit(fails ? 1 : 0);
