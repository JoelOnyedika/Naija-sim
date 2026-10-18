import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Companies. A company's money (`funds`) is SEPARATE from the player's wallet: revenue lands in funds, wages and branch costs come
 * out of funds, and funds reach the wallet only through a payout. Branches belong to a company (not the map), so changing city
 * never touches them. Owner-paid costs (setup, hiring, branches, upgrades, marketing) come from the wallet.
 */
export interface Employee { id: string; role: string; branchId: string; hiredAt: number }
export interface Branch { id: string; cityId: string; label: string; openedAt: number }
export interface Campaign { id: string; channelId: string; startedAt: number; endsAt: number }
export interface CompanyEvent { id: string; at: number; kind: 'created' | 'hire' | 'fire' | 'upgrade' | 'branch' | 'marketing' | 'revenue' | 'payout' | 'shortfall'; text: string; amount?: number }
export interface Company {
  id: string; name: string; logo: string; categoryId: string; description: string; hqCity: string;
  level: number; efficiency: number; manager: { hiredAt: number } | null;
  employees: Employee[]; branches: Branch[]; campaigns: Campaign[];
  funds: number; createdAt: number;
  lifetime: { revenue: number; payroll: number; opex: number; marketing: number; investment: number; payouts: number };
  /** The most recent settled day, for the dashboard. */
  lastDayResult: { day: number; revenue: number; payroll: number; opex: number } | null;
  lastDay: number; lastPayoutDay: number;
  activity: CompanyEvent[];
}
interface CompanyState { companies: Company[]; reset: () => void }
export const useCompanyStore = create<CompanyState>()(persist((set) => ({ companies: [], reset: () => set({ companies: [] }) }), { name: 'nigerialife.companies', version: 1 }));
