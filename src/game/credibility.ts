import { CREDIBILITY } from '@/data/economy';
import { useBankStore } from '@/stores/bankStore';

export interface CredibilityItem { id: string; label: string; points: number; max: number; detail: string }
export interface CredibilityResult { score: number; band: 'Building' | 'Fair' | 'Good' | 'Excellent'; items: CredibilityItem[] }

/** Pure read of banking state. Farming limits are applied when signals are recorded (see recordTransferSignal) and in the caps below. */
export function computeCredibility(): CredibilityResult {
  const C = CREDIBILITY, b = useBankStore.getState();
  const transfers = Object.values(b.transferSignals).reduce((s, x) => s + x.count, 0);
  const onTime = b.bills.filter((x) => x.status === 'paid' && x.onTime).length;
  const overdue = b.bills.filter((x) => x.status === 'overdue').length;
  const bonds = b.bonds.filter((x) => x.status === 'matured').length;
  const items: CredibilityItem[] = [
    { id: 'base', label: 'Account in good standing', points: C.base, max: C.base, detail: 'Everyone starts here.' },
    { id: 'transfers', label: 'Verified transfers', points: Math.min(C.maxTransferPoints, transfers * C.pointsPerTransfer), max: C.maxTransferPoints, detail: `${transfers} counted. A transfer counts at the threshold or above, once per contact per day, up to ${C.maxTransfersPerContact} per contact.` },
    { id: 'savings', label: 'Consistent saving', points: Math.min(C.maxSavingsPoints, b.savingsWeeks * C.pointsPerSavingsWeek), max: C.maxSavingsPoints, detail: `${b.savingsWeeks} game week${b.savingsWeeks === 1 ? '' : 's'} with a savings balance at the minimum or more.` },
    { id: 'bills', label: 'Bills paid on time', points: Math.min(C.maxBillPoints, onTime * C.pointsPerOnTimeBill), max: C.maxBillPoints, detail: `${onTime} bill${onTime === 1 ? '' : 's'} paid when due.` },
    { id: 'bonds', label: 'Bonds held to maturity', points: Math.min(C.maxBondPoints, bonds * C.pointsPerBond), max: C.maxBondPoints, detail: `${bonds} bond${bonds === 1 ? '' : 's'} matured.` },
  ];
  const penalty = overdue * C.penaltyPerOverdueBill;
  if (overdue) items.push({ id: 'overdue', label: 'Overdue bills', points: -penalty, max: 0, detail: `${overdue} unpaid bill${overdue === 1 ? '' : 's'}. Paying them removes the penalty.` });
  const score = Math.max(0, Math.min(100, items.reduce((s, i) => s + i.points, 0)));
  return { score, band: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Building', items };
}
