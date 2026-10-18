/**
 * The simulated legal system. Everything here is a GAME: no real court, police force, lawyer or person is represented,
 * lawyers and stations are fictional, and every other party is a simulated player (data/players.ts).
 */
export const CASE_CATEGORIES = ['Contract dispute', 'Unpaid debt', 'Property dispute', 'Defamation', 'Noise and nuisance', 'Fraud'] as const;
export const REPORT_CATEGORIES = ['Theft', 'Fraud', 'Harassment', 'Noise and nuisance', 'Other'] as const;
/** Categories a police report can be referred to court for. Others are dismissed. */
export const REFERABLE = ['Theft', 'Fraud', 'Harassment'];

export const COURT = {
  filingFee: 25_000, maxOpenFiled: 3,
  /** Minutes (game clock) from filing to each stage of a case, in order. */
  schedule: [['Filed', 0], ['Hearing scheduled', 10], ['Case introduced', 20], ['Opening statements', 30], ['Evidence', 45], ['Response', 60], ['Judge update', 70], ['Verdict', 80]] as [string, number][],
  /** Base chance (out of 100) that the plaintiff wins; a lawyer adds their strength. */
  baseWinPct: 50,
  maxLiveSamples: 3,
};
export type Stage = (typeof COURT.schedule)[number][0];

export interface LawyerDef { id: string; name: string; icon: string; specialty: string[]; fee: number; strength: number; experience: string; available: boolean }
export const LAWYERS: LawyerDef[] = [
  { id: 'l1', name: 'Barr. Ngozi Eze', icon: '👩🏾‍⚖️', specialty: ['Contract dispute', 'Unpaid debt'], fee: 60_000, strength: 15, experience: '12 years (simulated)', available: true },
  { id: 'l2', name: 'Barr. Tunde Bakare', icon: '👨🏾‍⚖️', specialty: ['Property dispute'], fee: 85_000, strength: 20, experience: '18 years (simulated)', available: true },
  { id: 'l3', name: 'Barr. Amina Yusuf', icon: '👩🏽‍⚖️', specialty: ['Fraud', 'Contract dispute'], fee: 110_000, strength: 25, experience: '20 years (simulated)', available: true },
  { id: 'l4', name: 'Barr. Emeka Obi', icon: '🧑🏾‍⚖️', specialty: ['Defamation', 'Noise and nuisance'], fee: 40_000, strength: 10, experience: '6 years (simulated)', available: true },
  { id: 'l5', name: 'Barr. Funke Adeyemi', icon: '👩🏾‍💼', specialty: ['Unpaid debt', 'Property dispute'], fee: 50_000, strength: 12, experience: '9 years (simulated)', available: true },
  { id: 'l6', name: 'Barr. Ibrahim Danjuma', icon: '👨🏿‍⚖️', specialty: ['Fraud'], fee: 140_000, strength: 30, experience: '25 years (simulated)', available: false },
];
export const getLawyer = (id: string) => LAWYERS.find((l) => l.id === id);

export const POLICE = { reportCooldownMinutes: 5, maxOpenReports: 3, reviewAfter: 15, decideAfter: 45, referPct: 60 };
export interface StationDef { name: string; area: string }
/** One fictional station per city. The Police app shows the one for the city you are in. */
export const STATIONS: Record<string, StationDef> = {
  lagos: { name: 'Eko Police Division', area: 'Lagos Island' },
  abuja: { name: 'Capital Central Division', area: 'Garki, Abuja' },
  'port-harcourt': { name: 'Garden City Police Division', area: 'Port Harcourt' },
  edo: { name: 'Benin Metro Police Division', area: 'Benin City' },
};
export const stationFor = (cityId: string): StationDef => STATIONS[cityId] ?? { name: 'Area Police Division', area: 'Nigeria' };
