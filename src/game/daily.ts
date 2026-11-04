import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { WEEKLY_BONUS, WEEKLY_PER_WEEK, WEEKLY_POOL } from '@/data/weekly';
import { DAILY_REWARDS, QUESTS_PER_DAY, QUEST_BONUS, QUEST_POOL, type QuestDef, type QuestReward } from '@/data/daily';
import { useDailyStore, type QuestRun } from '@/stores/dailyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useStatsStore } from '@/stores/statsStore';
import type { Effects } from '@/types/game';
import { toast } from '@/stores/uiStore';

/**
 * The daily loop: a 7-day login calendar with a streak, and three daily quests (one easy, one medium, one social).
 * Days are real calendar days in the player's time zone, so the streak is a real-life habit. Everything that decides a day or
 * a payout goes through `DailyAuthority`: offline this device is the authority; a server would implement the same interface so
 * a changed clock or edited save cannot farm rewards.
 */
export interface DailyAuthority { today(): string; yesterday(): string; twoDaysAgo(): string; /** Monday of this week. */ weekKey(): string }
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const localDailyAuthority: DailyAuthority = {
  today: () => ymd(new Date()),
  yesterday: () => { const d = new Date(); d.setDate(d.getDate() - 1); return ymd(d); },
  twoDaysAgo: () => { const d = new Date(); d.setDate(d.getDate() - 2); return ymd(d); },
  weekKey: () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); },
};
let authority: DailyAuthority = localDailyAuthority;
export const setDailyAuthority = (a: DailyAuthority) => { authority = a; };
export const dailyToday = () => authority.today();

const D = () => useDailyStore.getState();
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Small seeded generator so a day's quests are the same after a reload. */
const rng = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

export const getQuest = (id: string): QuestDef | undefined => QUEST_POOL.find((q) => q.id === id);

/** Pick today's quests: one of each tier, seeded by the date. Exported for tests. */
export function pickQuests(day: string): string[] {
  const r = rng(hash(day));
  const out: string[] = [];
  for (const tier of ['easy', 'medium', 'social'] as const) {
    const pool = QUEST_POOL.filter((q) => q.tier === tier);
    out.push(pool[Math.floor(r() * pool.length)].id);
  }
  return out.slice(0, QUESTS_PER_DAY);
}

/** Start a new day if the calendar day changed: fresh quests, bonus unclaimed. Safe to call as often as you like. */
export function ensureToday(): void {
  const week = authority.weekKey();
  if (D().weekKey !== week || !D().weekly.length) D().set({ weekKey: week, weekly: pickWeekly(week).map((id) => ({ id, progress: 0, claimed: false })), weeklyBonusClaimed: false });
  const day = authority.today();
  if (D().dayKey === day && D().quests.length) return;
  const quests: QuestRun[] = pickQuests(day).map((id) => ({ id, progress: 0, claimed: false }));
  D().set({ dayKey: day, quests, bonusClaimed: false });
}

/** Three distinct weekly goals, seeded by the Monday date. */
export function pickWeekly(week: string): string[] {
  const r = rng(hash(`w${week}`)); const pool = [...WEEKLY_POOL]; const out: string[] = [];
  while (out.length < WEEKLY_PER_WEEK) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  return out;
}
export const getWeekly = (id: string): QuestDef | undefined => WEEKLY_POOL.find((q) => q.id === id);

/** Can a missed day be forgiven? One free shield per week, only for exactly one missed day. */
export const shieldAvailable = (): boolean => D().shieldWeek !== authority.weekKey();

/** Is the login reward for today still unclaimed? */
export const canClaimDaily = (): boolean => D().lastClaimDay !== authority.today();

/** What the streak would be if you claimed now. A missed day breaks it. */
export function streakIfClaimed(): { streak: number; cycleIndex: number; shielded?: boolean } {
  const s = D();
  if (s.lastClaimDay === authority.yesterday()) return { streak: s.streak + 1, cycleIndex: (s.cycleIndex + 1) % DAILY_REWARDS.length };
  if (s.lastClaimDay === authority.twoDaysAgo() && s.streak > 0 && shieldAvailable()) return { streak: s.streak + 1, cycleIndex: (s.cycleIndex + 1) % DAILY_REWARDS.length, shielded: true };
  return { streak: 1, cycleIndex: 0 };
}

/** Pay a reward bundle. Money goes through the one economy store; stats through the stats store. */
function payout(label: string, r: QuestReward, extra?: Effects) {
  if (r.money) useEconomyStore.getState().credit(r.money, label, 'reward');
  useStatsStore.getState().apply({ charisma: r.charisma, social: r.social, ...extra });
}

export type ClaimResult = { ok: true; label: string; streak: number } | { ok: false; reason: string };

/** Claim today's login reward. Once per calendar day. */
export function claimDaily(): ClaimResult {
  ensureToday();
  if (!canClaimDaily()) return { ok: false, reason: 'You already claimed today. Come back tomorrow.' };
  const { streak, cycleIndex, shielded } = streakIfClaimed();
  const rw = DAILY_REWARDS[cycleIndex];
  // set the claim first so a double tap cannot pay twice
  D().set({ lastClaimDay: authority.today(), streak, cycleIndex, ...(shielded ? { shieldWeek: authority.weekKey() } : {}) });
  if (shielded) toast('Streak shield used: your streak survived a missed day.', 'good');
  payout(`Daily reward: day ${rw.day}`, { money: rw.money }, rw.effects);
  sfx.reward();
  toast(`Day ${rw.day} reward: ${rw.label}`, 'good');
  return { ok: true, label: rw.label, streak };
}

/**
 * Count something the player did. `key` is one of: `act`, `act:job`, `act:social`, `act:venue`, `earn` (amount in naira), `skill`,
 * `use:*` and `phone:*` task events, `visit` and `visit:<kind>`, `street` and `street:<tag>`.
 */
export function dailyHit(key: string, n = 1): void {
  ensureToday();
  const quests = D().quests.map((q) => {
    const def = getQuest(q.id);
    return def && def.hit === key && !q.claimed && q.progress < def.target ? { ...q, progress: Math.min(def.target, q.progress + n) } : q;
  });
  if (quests.some((q, i) => q !== D().quests[i])) D().set({ quests });
  const weekly = D().weekly.map((q) => {
    const def = getWeekly(q.id);
    return def && def.hit === key && !q.claimed && q.progress < def.target ? { ...q, progress: Math.min(def.target, q.progress + n) } : q;
  });
  if (weekly.some((q, i) => q !== D().weekly[i])) D().set({ weekly });
}

/** Claim a finished weekly goal. */
export function claimWeekly(id: string): { ok: boolean; reason?: string } {
  ensureToday();
  const q = D().weekly.find((x) => x.id === id), def = getWeekly(id);
  if (!q || !def) return { ok: false, reason: 'No such goal' };
  if (q.claimed) return { ok: false, reason: 'Already claimed' };
  if (q.progress < def.target) return { ok: false, reason: 'Not finished yet' };
  D().set({ weekly: D().weekly.map((x) => (x.id === id ? { ...x, claimed: true } : x)) });
  payout(`Weekly goal: ${def.title}`, def.reward);
  sfx.reward(); toast(`Weekly goal done: ${def.title}`, 'good');
  return { ok: true };
}

/** The weekly chest, once all three goals are claimed. */
export function claimWeeklyBonus(): { ok: boolean; reason?: string } {
  ensureToday();
  const s = D();
  if (s.weeklyBonusClaimed) return { ok: false, reason: 'Already claimed' };
  if (!s.weekly.length || !s.weekly.every((q) => q.claimed)) return { ok: false, reason: 'Claim all three goals first' };
  D().set({ weeklyBonusClaimed: true });
  payout('Weekly chest', WEEKLY_BONUS);
  sfx.reward(); toast(`Week conquered! ${WEEKLY_BONUS.label}`, 'good');
  return { ok: true };
}

export const questDone = (q: QuestRun): boolean => { const d = getQuest(q.id); return !!d && q.progress >= d.target; };

/** Claim a finished quest. */
export function claimQuest(id: string): { ok: boolean; reason?: string } {
  ensureToday();
  const q = D().quests.find((x) => x.id === id), def = getQuest(id);
  if (!q || !def) return { ok: false, reason: 'No such quest' };
  if (q.claimed) return { ok: false, reason: 'Already claimed' };
  if (!questDone(q)) return { ok: false, reason: 'Not finished yet' };
  D().set({ quests: D().quests.map((x) => (x.id === id ? { ...x, claimed: true } : x)) });
  payout(`Daily quest: ${def.title}`, def.reward);
  sfx.reward();
  toast(`Quest done: ${def.title}`, 'good');
  return { ok: true };
}

/** Claim the chest for finishing every quest today. */
export function claimBonus(): { ok: boolean; reason?: string } {
  ensureToday();
  const s = D();
  if (s.bonusClaimed) return { ok: false, reason: 'Already claimed' };
  if (!s.quests.length || !s.quests.every((q) => q.claimed)) return { ok: false, reason: 'Claim all three quests first' };
  D().set({ bonusClaimed: true });
  payout('Daily chest', QUEST_BONUS);
  sfx.reward();
  toast(`All done today! ${QUEST_BONUS.label}`, 'good');
  return { ok: true };
}

/** Number of things waiting for the player (drives the badge). */
export function dailyBadge(): number {
  const s = D();
  return (canClaimDaily() ? 1 : 0) + s.quests.filter((q) => questDone(q) && !q.claimed).length + s.weekly.filter((q) => (getWeekly(q.id)?.target ?? 1e12) <= q.progress && !q.claimed).length + (s.weekly.length && s.weekly.every((q) => q.claimed) && !s.weeklyBonusClaimed ? 1 : 0) + (s.quests.length && s.quests.every((q) => q.claimed) && !s.bonusClaimed ? 1 : 0);
}

export const rewardLabel = (r: QuestReward) => [r.money ? formatNaira(r.money) : '', r.charisma ? `+${r.charisma} Charisma` : '', r.social ? `+${r.social} Social` : ''].filter(Boolean).join(' · ');
