import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Stage } from '@/data/legal';

/** Court cases and police reports share this store; a referred report points at its court case (`caseId`) and back (`reportId`). */
export interface CourtEvent { at: number; stage: Stage; text: string }
export interface CourtCase {
  id: string; title: string; category: string;
  /** 'me', a player id, or 'state' for a case brought from a police report. */
  plaintiff: string; defendant: string; description: string; evidence?: string; lawyerId?: string;
  filedAt: number; status: 'live' | 'closed'; events: CourtEvent[]; verdict?: 'plaintiff' | 'defendant';
  /** Total I paid to file (filing fee + lawyer). */
  fee: number; sample?: boolean; reportId?: string;
}
export type ReportStatus = 'submitted' | 'review' | 'referred' | 'dismissed' | 'resolved';
export interface PoliceReport { id: string; reportedId: string; category: string; description: string; evidence?: string; filedAt: number; status: ReportStatus; updatedAt: number; caseId?: string }
interface LegalState { cases: CourtCase[]; reports: PoliceReport[]; seq: { case: number; report: number; sample?: number }; seeded: boolean; reset: () => void }
const fresh = () => ({ cases: [], reports: [], seq: { case: 0, report: 0 }, seeded: false });
export const useLegalStore = create<LegalState>()(persist((set) => ({ ...fresh(), reset: () => set(fresh()) }), { name: 'nigerialife.legal', version: 1 }));
