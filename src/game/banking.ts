import { formatNaira } from '@/core/format';
import { DAY_MINUTES, BILLS, INCOME_TAX, SAVINGS, WEEK_MINUTES, billAmount, bondReturn, getBond, taxOn, CREDIBILITY, type BillDef } from '@/data/economy';
import { getVehicle } from '@/data/vehicles';
import { useBankStore, type BillRecord } from '@/stores/bankStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { uid } from '@/core/format';
import { nowMinutes } from '@/core/gameTime';
import { getProperty } from '@/world/registry';
import { guarded } from './guard';
import { notify } from './notify';

/**
 * Banking rules. Every function validates first, then moves money exactly once through the shared ledger
 * (economyStore.post) and updates bank records in the same synchronous step. Scheduled functions take a game period and
 * use ledger idempotency keys, so running one twice for the same period changes nothing.
 */
export type ActionResult = { ok: true; txId?: string } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const eco = () => useEconomyStore.getState();
const bank = () => useBankStore.getState();
const whole = (n: number) => Number.isSafeInteger(n) && n > 0;
const DUP = fail('That was already submitted.');

// ── Savings
export function depositSavings(amount: number): ActionResult {
  if (!whole(amount)) return fail('Enter an amount.');
  if (amount < SAVINGS.minDeposit) return fail(`The minimum deposit is ${formatNaira(SAVINGS.minDeposit)}.`);
  if (amount > eco().money) return fail('That is more than your wallet balance.');
  return guarded(`deposit|${amount}`, () => {
    const r = eco().post({ direction: 'expense', amount, label: 'Savings deposit', kind: 'savings', meta: { internal: true, description: 'Wallet to savings', ref: { type: 'savings', id: 'main' } } });
    if (!r.ok) return fail('That is more than your wallet balance.');
    const balance = bank().savings.balance + amount;
    useBankStore.setState((s) => ({ savings: { balance, entries: [{ id: uid(), kind: 'deposit' as const, amount, balanceAfter: balance, at: nowMinutes(), txId: r.tx.id }, ...s.savings.entries].slice(0, 200) } }));
    return { ok: true, txId: r.tx.id } as ActionResult;
  }, DUP);
}

export function withdrawSavings(amount: number): ActionResult {
  if (!whole(amount)) return fail('Enter an amount.');
  if (amount > bank().savings.balance) return fail('That is more than your savings balance.');
  return guarded(`withdraw|${amount}`, () => {
    const r = eco().post({ direction: 'income', amount, label: 'Savings withdrawal', kind: 'savings', meta: { internal: true, description: 'Savings to wallet', ref: { type: 'savings', id: 'main' } } });
    if (!r.ok) return fail('Could not complete the withdrawal.');
    const balance = bank().savings.balance - amount;
    useBankStore.setState((s) => ({ savings: { balance, entries: [{ id: uid(), kind: 'withdraw' as const, amount, balanceAfter: balance, at: nowMinutes(), txId: r.tx.id }, ...s.savings.entries].slice(0, 200) } }));
    return { ok: true, txId: r.tx.id } as ActionResult;
  }, DUP);
}

/** What the next weekly run would pay on today's balance. */
export const projectedInterest = (balance = bank().savings.balance) => Math.floor((balance * SAVINGS.weeklyRateBps) / 10_000);

/** Weekly interest for game week `period`. Paid to the wallet (savings keeps only what the player deposits). Once per period. */
export function creditInterest(period: number) {
  const st = bank();
  if (period <= st.lastSavingsPeriod) return;
  const balance = st.savings.balance;
  useBankStore.setState((s) => ({ lastSavingsPeriod: period, savingsWeeks: s.savingsWeeks + (balance >= SAVINGS.consistencyMinBalance ? 1 : 0) }));
  const interest = projectedInterest(balance);
  if (interest <= 0) return;
  const r = eco().post({ direction: 'income', amount: interest, label: 'Savings interest', kind: 'interest', meta: { opKey: `interest:${period}`, description: `${SAVINGS.weeklyRateBps / 100}% on ${formatNaira(balance)}`, ref: { type: 'savings', id: 'main' } } });
  if (!r.ok) return;
  useBankStore.setState((s) => ({ savings: { ...s.savings, entries: [{ id: uid(), kind: 'interest' as const, amount: interest, balanceAfter: balance, at: nowMinutes(), txId: r.tx.id }, ...s.savings.entries].slice(0, 200) } }));
  notify({ title: 'Savings interest', body: `${formatNaira(interest)} was paid to your wallet.`, icon: '🏦', appId: 'bank' });
}

// ── Bonds
export function buyBond(defId: string, amount: number): ActionResult {
  const def = getBond(defId);
  if (!def) return fail('Choose a bond.');
  if (!whole(amount)) return fail('Enter an amount.');
  if (amount < def.min) return fail(`The minimum for this bond is ${formatNaira(def.min)}.`);
  if (amount > def.max) return fail(`The most you can put in this bond is ${formatNaira(def.max)}.`);
  if (amount > eco().money) return fail('That is more than your wallet balance.');
  return guarded(`bond|${defId}|${amount}`, () => {
    const id = uid();
    const r = eco().post({ direction: 'expense', amount, label: `Bought ${def.name}`, kind: 'bond', meta: { internal: true, description: 'Locked until maturity', ref: { type: 'bond', id } } });
    if (!r.ok) return fail('That is more than your wallet balance.');
    const now = nowMinutes();
    useBankStore.setState((s) => ({ bonds: [{ id, defId, name: def.name, principal: amount, expectedReturn: bondReturn(amount, def), boughtAt: now, maturesAt: now + def.termDays * DAY_MINUTES, status: 'active' as const }, ...s.bonds] }));
    return { ok: true, txId: r.tx.id } as ActionResult;
  }, DUP);
}

/** Pays out every bond whose maturity time has passed. A bond is flagged matured BEFORE it is paid, so it pays once. */
export function matureBonds(now = nowMinutes()) {
  const due = bank().bonds.filter((b) => b.status === 'active' && b.maturesAt <= now);
  for (const b of due) {
    useBankStore.setState((s) => ({ bonds: s.bonds.map((x) => (x.id === b.id ? { ...x, status: 'matured' as const, paidAt: now } : x)) }));
    eco().post({ direction: 'income', amount: b.principal, label: `${b.name} matured`, kind: 'bond', meta: { internal: true, opKey: `bond-principal:${b.id}`, description: 'Principal returned', ref: { type: 'bond', id: b.id } } });
    if (b.expectedReturn > 0) eco().post({ direction: 'income', amount: b.expectedReturn, label: `${b.name} return`, kind: 'bond', meta: { opKey: `bond-return:${b.id}`, description: 'Fixed return paid at maturity', ref: { type: 'bond', id: b.id } } });
    notify({ title: 'Bond matured', body: `${b.name}: ${formatNaira(b.principal + b.expectedReturn)} is in your wallet.`, icon: '💠', appId: 'bank' });
  }
}

// ── Bills
export interface Billable { def: BillDef; assetId: string; assetLabel: string; amount: number }
/** What the player is billed for right now: the home they live in and every car they own. */
export function billables(): Billable[] {
  const out: Billable[] = [];
  const home = (() => { const id = usePropertyStore.getState().activeId; return id ? getProperty(id) : undefined; })();
  const cars = useVehicleStore.getState().owned.map(getVehicle).filter((v): v is NonNullable<typeof v> => !!v);
  for (const def of BILLS) {
    if (def.appliesTo === 'home' && home) out.push({ def, assetId: home.id, assetLabel: home.name, amount: billAmount(def, home.price) });
    if (def.appliesTo === 'vehicle') for (const v of cars) out.push({ def, assetId: v.id, assetLabel: v.name, amount: billAmount(def, v.price) });
  }
  return out;
}

function payRecord(rec: BillRecord, onTime: boolean): boolean {
  const r = eco().post({ direction: 'expense', amount: rec.amount, label: `${rec.label}: ${rec.assetLabel}`, kind: 'bill', meta: { opKey: `bill:${rec.id}`, ref: { type: 'bill', id: rec.id }, description: 'Weekly bill' } });
  if (!r.ok) return false;
  useBankStore.setState((s) => ({ bills: s.bills.map((b) => (b.id === rec.id ? { ...b, status: 'paid' as const, paidAt: nowMinutes(), txId: r.tx.id, onTime: onTime && b.onTime } : b)) }));
  return true;
}

/** Weekly billing for game week `period`. Overdue bills are retried first; each (bill, asset, period) is charged at most once. */
export function chargeWeeklyBills(period: number) {
  let paid = 0, overdue = 0, total = 0;
  for (const rec of bank().bills.filter((b) => b.status === 'overdue')) if (payRecord(rec, false)) { paid += 1; total += rec.amount; }
  for (const b of billables()) {
    const id = `${b.def.id}:${b.assetId}:${period}`;
    if (bank().bills.some((x) => x.id === id)) continue;
    const rec: BillRecord = { id, defId: b.def.id, label: b.def.label, glyph: b.def.glyph, assetId: b.assetId, assetLabel: b.assetLabel, amount: b.amount, period, dueAt: period * WEEK_MINUTES, status: 'overdue', onTime: true };
    useBankStore.setState((s) => ({ bills: [rec, ...s.bills].slice(0, 300) }));
    if (payRecord(rec, true)) { paid += 1; total += rec.amount; } else overdue += 1;
  }
  if (paid + overdue === 0) return;
  notify({ title: overdue ? 'Bills overdue' : 'Weekly bills paid', body: overdue ? `${overdue} bill${overdue > 1 ? 's' : ''} could not be paid. Open Bank to pay when you have funds.` : `${formatNaira(total)} paid for this week.`, icon: overdue ? '⚠️' : '🧾', appId: 'bank' });
}

export function payBill(id: string): ActionResult {
  const rec = bank().bills.find((b) => b.id === id);
  if (!rec || rec.status !== 'overdue') return fail('That bill is not waiting for payment.');
  if (rec.amount > eco().money) return fail('You do not have enough to pay this bill yet.');
  return guarded(`bill|${id}`, () => (payRecord(rec, false) ? ({ ok: true } as ActionResult) : fail('You do not have enough to pay this bill yet.')), DUP);
}

// ── Income tax (off in the current economy: see INCOME_TAX)
/** Taxable income earned during game week `period` (the week that just ended when the run happens), from the ledger. */
export function taxableIncomeFor(period: number): number {
  const from = period * WEEK_MINUTES, to = from + WEEK_MINUTES;
  return eco().transactions.filter((t) => t.direction === 'income' && !t.internal && INCOME_TAX.taxableKinds.includes(t.kind) && t.gameMinutes !== undefined && t.gameMinutes >= from && t.gameMinutes < to).reduce((s, t) => s + t.amount, 0);
}

function settleTax(id: string): boolean {
  const rec = bank().taxes.find((t) => t.id === id);
  if (!rec || rec.status === 'paid' || rec.tax <= 0) return false;
  const r = eco().post({ direction: 'expense', amount: rec.tax, label: 'Income tax', kind: 'tax', meta: { opKey: `tax:${id}`, description: `On ${formatNaira(rec.taxable)} taxable income`, ref: { type: 'tax', id } } });
  if (!r.ok) return false;
  useBankStore.setState((s) => ({ taxes: s.taxes.map((t) => (t.id === id ? { ...t, status: 'paid' as const, paidAt: nowMinutes(), txId: r.tx.id } : t)) }));
  return true;
}

/** Weekly tax run for game week `period`: retry unpaid tax first, then assess last week's taxable income once. */
export function chargeIncomeTax(period: number) {
  if (!INCOME_TAX.enabled) return;
  for (const t of bank().taxes.filter((x) => x.status === 'unpaid')) settleTax(t.id);
  const id = `w${period}`;
  if (bank().taxes.some((t) => t.id === id)) return;
  const taxable = taxableIncomeFor(period - 1), tax = taxOn(taxable);
  useBankStore.setState((s) => ({ taxes: [{ id, period, taxable, tax, status: tax <= 0 ? 'paid' as const : 'unpaid' as const, paidAt: tax <= 0 ? nowMinutes() : undefined }, ...s.taxes].slice(0, 100) }));
  if (tax <= 0) return;
  const paid = settleTax(id);
  notify({ title: paid ? 'Income tax paid' : 'Income tax unpaid', body: `${formatNaira(tax)} on ${formatNaira(taxable)} taxable income.${paid ? '' : ' Open Bank to pay when you have funds.'}`, icon: '🏛️', appId: 'bank' });
}

export function payTax(id: string): ActionResult {
  const rec = bank().taxes.find((t) => t.id === id);
  if (!rec || rec.status !== 'unpaid') return fail('That tax bill is not waiting for payment.');
  if (rec.tax > eco().money) return fail('You do not have enough to pay this tax yet.');
  return guarded(`tax|${id}`, () => (settleTax(id) ? ({ ok: true } as ActionResult) : fail('Could not pay the tax.')), DUP);
}

// ── Credibility signals
/** Called after a successful transfer. Applies the farming limits: one per contact per game day, capped per contact. */
export function recordTransferSignal(contactId: string, amount: number) {
  if (amount < CREDIBILITY.transferThreshold) return;
  const day = Math.floor(nowMinutes() / DAY_MINUTES);
  const cur = bank().transferSignals[contactId] ?? { count: 0, lastDay: -1 };
  if (cur.lastDay === day || cur.count >= CREDIBILITY.maxTransfersPerContact) return;
  useBankStore.setState((s) => ({ transferSignals: { ...s.transferSignals, [contactId]: { count: cur.count + 1, lastDay: day } } }));
}
