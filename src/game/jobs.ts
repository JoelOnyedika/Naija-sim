import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { nowMinutes } from '@/core/gameTime';
import { getCareer, type CareerDef, type RankDef } from '@/data/careers';
import { useCareerStore, type CareerProgress } from '@/stores/careerStore';
import { levelOf, skillName, useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';
import { notify } from './notify';

/**
 * Careers and shifts. A career has ranks; the player holds one job at a time. Shifts are SIMULATED: a timed activity that
 * pays on completion (nothing in the 3D world is played out). Promotion is never automatic: it needs enough shifts at the
 * current rank, enough Charisma and the right skill level, and the player asks for it.
 */
export type Result = { ok: true } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });

export const progressOf = (careerId: string): CareerProgress => useCareerStore.getState().progress[careerId] ?? { rank: 0, shiftsInRank: 0, totalShifts: 0 };
export const currentJob = (): { career: CareerDef; rank: RankDef; rankIndex: number; progress: CareerProgress } | null => {
  const e = useCareerStore.getState().employed; const career = e && getCareer(e.careerId);
  if (!e || !career) return null;
  const p = progressOf(e.careerId);
  return { career, rank: career.ranks[p.rank], rankIndex: p.rank, progress: p };
};

export interface Requirement { label: string; met: boolean; have: string; need: string }
/** What holding `rank` of a career asks for, against what the player has now. */
export function requirementsFor(career: CareerDef, rank: number): Requirement[] {
  const r = career.ranks[rank];
  const charisma = Math.floor(useStatsStore.getState().stats.charisma);
  const level = levelOf(useSkillStore.getState().xp[career.skill] ?? 0);
  const out: Requirement[] = [];
  if (r.minCharisma > 0) out.push({ label: 'Charisma', met: charisma >= r.minCharisma, have: String(charisma), need: String(r.minCharisma) });
  if (r.minSkillLevel > 1) out.push({ label: `${skillName(career.skill)} level`, met: level >= r.minSkillLevel, have: String(level), need: String(r.minSkillLevel) });
  return out;
}
const unmet = (reqs: Requirement[]) => reqs.filter((r) => !r.met).map((r) => `${r.label} ${r.need} (you have ${r.have})`).join(', ');

function hire(careerId: string) {
  const career = getCareer(careerId)!;
  const st = useCareerStore.getState(), p = progressOf(careerId);
  const now = nowMinutes();
  useCareerStore.setState({
    employed: { careerId, since: now }, progress: { ...st.progress, [careerId]: p },
    offers: Object.fromEntries(Object.entries(st.offers).filter(([k]) => k !== careerId)),
    history: [{ careerId, kind: 'hired' as const, rank: p.rank, at: now }, ...st.history].slice(0, 60),
  });
  notify({ title: 'You are hired', body: `${career.ranks[p.rank].title} at ${career.employer}`, icon: career.glyph, appId: 'jobs' });
}

/** Applying to a formal career. A simulated employer answers at once: an offer if the requirements are met, a refusal that says why if not. */
export function applyForJob(careerId: string): Result {
  const career = getCareer(careerId);
  if (!career) return no('That career does not exist.');
  if (useCareerStore.getState().employed?.careerId === careerId) return no('You already work here.');
  if (career.openHire) return no('This is open work: just start a shift.');
  if (useCareerStore.getState().offers[careerId]) return no('You already have an offer. Accept it.');
  const rank = progressOf(careerId).rank, reasons = unmet(requirementsFor(career, rank));
  if (reasons) return no(`Not yet: needs ${reasons}.`);
  useCareerStore.setState((s) => ({ offers: { ...s.offers, [careerId]: { rank, at: nowMinutes() } } }));
  notify({ title: 'Job offer', body: `${career.employer} offers you ${career.ranks[rank].title} at ${formatNaira(career.ranks[rank].salary)} per shift.`, icon: career.glyph, appId: 'jobs' });
  return { ok: true };
}

/** Accepting an offer. Taking a new job ends the current one (progress there is kept). Not allowed in the middle of a shift. */
export function acceptOffer(careerId: string): Result {
  if (!useCareerStore.getState().offers[careerId]) return no('There is no offer to accept.');
  if (useStatsStore.getState().activity?.kind === 'job') return no('Finish your shift first.');
  const cur = useCareerStore.getState().employed;
  if (cur && cur.careerId !== careerId) quitJob();
  hire(careerId);
  return { ok: true };
}

export function quitJob(): Result {
  const e = useCareerStore.getState().employed;
  if (!e) return no('You do not have a job.');
  if (useStatsStore.getState().activity?.kind === 'job') return no('Finish your shift first.');
  useCareerStore.setState((s) => ({ employed: null, history: [{ careerId: e.careerId, kind: 'quit' as const, rank: progressOf(e.careerId).rank, at: nowMinutes() }, ...s.history].slice(0, 60) }));
  return { ok: true };
}

export function jobBlocked(careerId: string): string | null {
  const career = getCareer(careerId); const { stats, activity } = useStatsStore.getState();
  if (!career) return 'Job not found';
  const emp = useCareerStore.getState().employed;
  if (emp && emp.careerId !== careerId) return 'You work somewhere else';
  if (!emp) {
    if (!career.openHire) return 'Apply first';
    const why = unmet(requirementsFor(career, progressOf(careerId).rank));
    if (why) return `Needs ${why}`;
  }
  const rank = career.ranks[progressOf(careerId).rank];
  if (activity) return 'Finish what you are doing first';
  if (stats.energy < rank.energyCost) return 'Too tired';
  if (stats.hunger < 10) return 'Too hungry';
  return null;
}

export function startShift(careerId: string): boolean {
  const reason = jobBlocked(careerId);
  const career = getCareer(careerId);
  if (reason || !career) { sfx.error(); toast(reason ?? 'Job not found', 'bad'); return false; }
  if (!useCareerStore.getState().employed) hire(careerId); // open work: starting a shift is taking the job
  const rank = career.ranks[progressOf(careerId).rank];
  sfx.click();
  return useStatsStore.getState().start({
    label: rank.title, seconds: rank.seconds, pose: 'stand', kind: 'job', careerId, payout: rank.salary, event: 'job:shift',
    effects: { energy: -rank.energyCost, hunger: -rank.hungerCost, charisma: career.charismaGain, hygiene: -4, thirst: -6 },
  });
}

/** Called by the game loop when a career shift finishes (pay is credited there). Counts the shift and grows the career's skill. */
export function completeCareerShift(careerId: string) {
  const career = getCareer(careerId); const st = useCareerStore.getState();
  if (!career || st.employed?.careerId !== careerId) return;
  const p = progressOf(careerId);
  useCareerStore.setState({ progress: { ...st.progress, [careerId]: { ...p, shiftsInRank: p.shiftsInRank + 1, totalShifts: p.totalShifts + 1 } } });
  const { before, after } = useSkillStore.getState().add(career.skill, career.skillXpPerShift);
  if (after > before) toast(`${skillName(career.skill)} level ${after}!`, 'good');
  const promo = promotionStatus(careerId);
  if (promo.eligible && useCareerStore.getState().notified[careerId] !== promo.nextRank) {
    useCareerStore.setState((s) => ({ notified: { ...s.notified, [careerId]: promo.nextRank! } }));
    notify({ title: 'Promotion available', body: `You can be promoted to ${career.ranks[promo.nextRank!].title}. Open Jobs.`, icon: '⭐', appId: 'jobs' });
  }
}

export interface PromotionStatus { nextRank: number | null; eligible: boolean; shifts: Requirement | null; others: Requirement[] }
export function promotionStatus(careerId: string): PromotionStatus {
  const career = getCareer(careerId); const p = progressOf(careerId);
  if (!career || p.rank >= career.ranks.length - 1) return { nextRank: null, eligible: false, shifts: null, others: [] };
  const need = career.ranks[p.rank].shiftsToNext;
  const shifts: Requirement = { label: 'Shifts at this rank', met: p.shiftsInRank >= need, have: String(p.shiftsInRank), need: String(need) };
  const others = requirementsFor(career, p.rank + 1);
  return { nextRank: p.rank + 1, eligible: shifts.met && others.every((r) => r.met), shifts, others };
}

export function requestPromotion(careerId: string): Result {
  const st = useCareerStore.getState(); const career = getCareer(careerId);
  if (!career || st.employed?.careerId !== careerId) return no('You can only be promoted in your current job.');
  if (useStatsStore.getState().activity?.kind === 'job') return no('Finish your shift first.');
  const s = promotionStatus(careerId);
  if (s.nextRank === null) return no('You are already at the top rank.');
  if (!s.eligible) return no(`Not yet: ${[s.shifts!, ...s.others].filter((r) => !r.met).map((r) => `${r.label} ${r.need} (you have ${r.have})`).join(', ')}.`);
  const p = progressOf(careerId), now = nowMinutes();
  useCareerStore.setState({
    progress: { ...st.progress, [careerId]: { ...p, rank: s.nextRank, shiftsInRank: 0 } },
    history: [{ careerId, kind: 'promoted' as const, rank: s.nextRank, at: now }, ...st.history].slice(0, 60),
  });
  const r = career.ranks[s.nextRank];
  notify({ title: 'Promoted!', body: `${r.title}: ${formatNaira(r.salary)} per shift.`, icon: '🎉', appId: 'jobs' });
  return { ok: true };
}
