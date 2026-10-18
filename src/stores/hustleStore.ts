import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Hustle: flexible gigs between "players". Every other party is a SIMULATED player (data/players.ts). 'me' is the human.
 * A listing moves: open -> accepted -> in_progress -> completed, or to cancelled. Direct hires start as 'requested'.
 */
export type ListingStatus = 'open' | 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export interface Applicant { id: string; applicantId: string; rate: number; at: number; status: 'applied' | 'accepted' | 'declined' | 'withdrawn'; decideAt?: number }
export interface Listing {
  id: string; title: string; category: string; description: string; requirements: string; location: string;
  budget: number; clientId: string; status: ListingStatus; applicants: Applicant[];
  workerId?: string; agreedRate?: number; direct?: boolean;
  createdAt: number; deadline?: number; durationMinutes: number;
  /** When a hired simulated worker arrives and starts. Until then I (the client) can still cancel and get the escrow back. */
  startAt?: number;
  decideAt?: number; acceptedAt?: number; startedAt?: number; finishAt?: number; completedAt?: number; cancelledAt?: number; cancelReason?: string;
  /** Naira currently held in escrow for this job (only when I am the client and a worker is hired). */
  escrow: number;
  /** True for jobs the game generates so the board is never empty. */
  sample?: boolean;
}
interface HustleState { listings: Listing[]; seeded: boolean; reset: () => void }
export const useHustleStore = create<HustleState>()(persist((set) => ({ listings: [], seeded: false, reset: () => set({ listings: [], seeded: false }) }), { name: 'nigerialife.hustle', version: 1 }));
