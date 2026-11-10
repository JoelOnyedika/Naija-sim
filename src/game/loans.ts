import { sfx } from '@/audio/sfx';
import { formatNaira, uid } from '@/core/format';
import { LENDERS, LENDER_IDS, LOAN_RULES, type LenderId } from '@/data/loans';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useLoanStore, type Loan } from '@/stores/loanStore';
import { toast } from '@/stores/uiStore';

/**
 * Loans. Pure rules first, then the three actions (borrow, repay) and the clock check. Nothing here is a real bank: it is a game, and a
 * server must own the clock, the limits and the money in a multiplayer version (same boundary as the rest of the economy).
 *  limit   = startLimit x growth^(loans repaid on time), rounded to ₦1,000, never above maxLimit. Repaying late gives no growth.
 *  owed    = amount + interest + late fees - what you have paid.
 *  late fee= lateFeePerDay of the amount borrowed for every started day after the due date, up to lateCap of it.
 */
const L = () => useLoanStore.getState();
const now = () => useClockStore.getState().minutes;
const round1k = (n: number) => Math.round(n / 1000) * 1000;

export const limitFor = (lender: LenderId): number => {
  const d = LENDERS[lender], r = L().record[lender];
  return Math.min(d.maxLimit, Math.max(d.startLimit, round1k(d.startLimit * Math.pow(d.growth, r.onTime))));
};
export const activeLoan = (lender: LenderId): Loan | undefined => L().loans.find((l) => l.lender === lender && l.status === 'active');
export const overdueMinutes = (l: Loan, minutes = now()): number => (l.status === 'active' ? Math.max(0, minutes - l.dueAt) : 0);
export const lateFee = (l: Loan, minutes = now()): number => {
  const late = overdueMinutes(l, minutes); if (late <= 0) return 0;
  const d = LENDERS[l.lender], days = Math.ceil(late / LOAN_RULES.dayMinutes);
  return Math.round(Math.min(d.lateCap, days * d.lateFeePerDay) * l.principal);
};
export const owedOn = (l: Loan, minutes = now()): number => (l.status === 'repaid' ? 0 : Math.max(0, l.total + lateFee(l, minutes) - l.paid));
export const totalOwed = (minutes = now()): number => L().loans.reduce((a, l) => a + owedOn(l, minutes), 0);
export const isOverdue = (l: Loan, minutes = now()): boolean => l.status === 'active' && minutes > l.dueAt;
export const anyOverdue = (minutes = now()): boolean => L().loans.some((l) => isOverdue(l, minutes));
/** The loans a lender would chase you for: overdue for long enough. */
export const huntedLoans = (minutes = now()): Loan[] => L().loans.filter((l) => l.status === 'active' && overdueMinutes(l, minutes) >= LOAN_RULES.huntAfterMinutes);
export const quote = (lender: LenderId, amount: number) => { const d = LENDERS[lender], interest = Math.round(amount * d.interest); return { amount, interest, total: amount + interest }; };

export function whyNotBorrow(lender: LenderId, amount: number): string | null {
  const d = LENDERS[lender];
  if (!Number.isFinite(amount) || !Number.isSafeInteger(amount) || amount < LOAN_RULES.minLoan) return `The smallest loan is ${formatNaira(LOAN_RULES.minLoan)}.`;
  if (anyOverdue()) return 'You have an overdue loan. Clear it before you borrow again.';
  if (activeLoan(lender)) return `Pay your current ${d.name} loan first.`;
  const lim = limitFor(lender);
  if (amount > lim) return `Your ${d.name} limit is ${formatNaira(lim)}.`;
  return null;
}

export function borrow(lender: LenderId, amount: number): { ok: true; loan: Loan } | { ok: false; error: string } {
  const err = whyNotBorrow(lender, amount); if (err) return { ok: false, error: err };
  const d = LENDERS[lender], q = quote(lender, amount), t = now();
  const loan: Loan = { id: uid(), lender, principal: amount, interest: q.interest, total: q.total, takenAt: t, dueAt: t + d.termDays * LOAN_RULES.dayMinutes, paid: 0, status: 'active' };
  L().set({ loans: [loan, ...L().loans] });
  useEconomyStore.getState().credit(amount, `${d.name} loan`, 'income', d.name);
  sfx.coin();
  return { ok: true, loan };
}

/** Pay part or all of a loan (never more than is owed or than the wallet holds). Returns what was paid. */
export function repay(loanId: string, amount?: number): { ok: true; paid: number; cleared: boolean } | { ok: false; error: string } {
  const loan = L().loans.find((l) => l.id === loanId); if (!loan || loan.status !== 'active') return { ok: false, error: 'That loan is already cleared.' };
  const owed = owedOn(loan), want = Math.min(owed, Math.round(amount ?? owed)), wallet = useEconomyStore.getState().money, pay = Math.min(want, wallet);
  if (pay <= 0) return { ok: false, error: wallet <= 0 ? 'Your wallet is empty.' : 'Enter an amount.' };
  const d = LENDERS[loan.lender];
  if (!useEconomyStore.getState().debit(pay, `${d.name} repayment`, 'purchase', d.name)) return { ok: false, error: 'That is more than your balance.' };
  const cleared = pay >= owed, t = now(), onTime = t <= loan.dueAt;
  L().set({
    loans: L().loans.map((l) => (l.id === loanId ? { ...l, paid: l.paid + pay, ...(cleared ? { status: 'repaid' as const, repaidAt: t, onTime } : {}) } : l)),
    ...(cleared ? { record: { ...L().record, [loan.lender]: { onTime: L().record[loan.lender].onTime + (onTime ? 1 : 0), late: L().record[loan.lender].late + (onTime ? 0 : 1) } } } : {}),
  });
  if (cleared) { sfx.reward(); toast(onTime ? `${d.name}: loan cleared. Your limit is now ${formatNaira(limitFor(loan.lender))}.` : `${d.name}: cleared, but late. No limit increase.`, onTime ? 'good' : 'info'); }
  else sfx.coin();
  return { ok: true, paid: pay, cleared };
}

/** Taken by force (collectors): reduces what is owed, oldest overdue loan first. Returns how much was applied. */
export function seize(amount: number): number {
  let left = Math.max(0, Math.min(Math.round(amount), useEconomyStore.getState().money)), took = 0;
  for (const l of [...huntedLoans()].sort((a, b) => a.dueAt - b.dueAt)) {
    if (left <= 0) break;
    const r = repay(l.id, left); if (!r.ok) continue; took += r.paid; left -= r.paid;
  }
  return took;
}

/** Called every game tick: tells you once when a loan is due soon or has gone overdue. */
const told = new Set<string>();
export function stepLoans(): void {
  const t = now();
  for (const l of L().loans) {
    if (l.status !== 'active') continue;
    const d = LENDERS[l.lender];
    if (t > l.dueAt && !told.has(`${l.id}:late`)) { told.add(`${l.id}:late`); toast(`${d.name}: your loan is overdue. Late fees are running.`, 'bad'); }
    else if (t <= l.dueAt && l.dueAt - t < LOAN_RULES.dayMinutes / 4 && !told.has(`${l.id}:soon`)) { told.add(`${l.id}:soon`); toast(`${d.name}: your loan is due soon (${formatNaira(owedOn(l))}).`, 'info'); }
  }
}
export const resetLoanNotices = () => told.clear();
export const lenderOf = (l: Loan) => LENDERS[l.lender];
export { LENDER_IDS };
