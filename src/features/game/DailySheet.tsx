import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { DAILY_REWARDS, QUEST_BONUS, type QuestDef } from '@/data/daily';
import { WEEKLY_BONUS } from '@/data/weekly';
import { canClaimDaily, claimBonus, claimDaily, claimQuest, claimWeekly, claimWeeklyBonus, dailyBadge, ensureToday, getQuest, getWeekly, questDone, rewardLabel, shieldAvailable, streakIfClaimed } from '@/game/daily';
import { useDailyStore, type QuestRun } from '@/stores/dailyStore';
import { toast } from '@/stores/uiStore';
import { Confetti } from '../roulette/Confetti';
import { ROAD, STAGES } from '@/data/agbero';
import { stageOf } from '@/game/agbero';
import { useAgberoStore } from '@/stores/agberoStore';
import { Sheet } from './VenueSheets';

/** Number of things waiting (claimable login reward, finished quests and goals, the chests). Reactive. */
export function useDailyBadge(): number {
  useDailyStore((s) => s.lastClaimDay); useDailyStore((s) => s.quests); useDailyStore((s) => s.bonusClaimed); useDailyStore((s) => s.weekly); useDailyStore((s) => s.weeklyBonusClaimed);
  return dailyBadge();
}

const TIER: Record<QuestDef['tier'], { bg: string; ring: string }> = {
  easy: { bg: 'linear-gradient(135deg,#0B8F4D,#07603A)', ring: '#34D399' },
  medium: { bg: 'linear-gradient(135deg,#FF8A3D,#B4491A)', ring: '#FDBA74' },
  social: { bg: 'linear-gradient(135deg,#2F6BFF,#1B3A9E)', ring: '#93C5FD' },
};

function QuestCard({ run, def, onClaim }: { run: QuestRun; def: QuestDef; onClaim: () => void }) {
  const done = questDone(run) || run.progress >= def.target, pct = Math.min(1, run.progress / def.target);
  const money = def.hit === 'earn';
  const shown = money ? `₦${run.progress.toLocaleString('en-NG')} / ₦${def.target.toLocaleString('en-NG')}` : `${run.progress} / ${def.target}`;
  const t = TIER[def.tier];
  return (
    <div className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 ${run.claimed ? 'border-white/5 bg-white/[0.03] opacity-60' : done ? 'border-emerald-400/50 bg-emerald-400/[0.08]' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" style={{ background: t.bg }}>{run.claimed ? <Check size={24} className="text-white" /> : def.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold leading-tight">{def.title}</div>
        <div className="truncate text-[11px] text-white/55">{def.hint}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40"><motion.div className="h-full rounded-full" style={{ background: done ? 'linear-gradient(90deg,#34D399,#A3E635)' : `linear-gradient(90deg,${t.ring},#FFC21A)` }} initial={false} animate={{ width: `${pct * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
          <span className="w-[4.6rem] text-right text-[10.5px] font-semibold tabular-nums text-white/65">{shown}</span>
        </div>
        <div className="mt-1 text-[11px] font-bold text-danfo">{rewardLabel(def.reward)}</div>
      </div>
      <motion.button whileTap={{ scale: 0.94 }} disabled={!done || run.claimed} onClick={onClaim} aria-label={`Claim ${def.title}`}
        className={`shrink-0 rounded-xl px-3.5 py-2.5 text-[12.5px] font-extrabold ${done && !run.claimed ? 'bg-gradient-to-b from-danfo to-danfo-deep text-night shadow-pop' : 'bg-white/10 text-white/40'}`}>{run.claimed ? 'Done' : done ? 'Claim' : <Lock size={14} />}</motion.button>
    </div>
  );
}

function Chest({ title, sub, label, claimed, ready, count, total, onClaim }: { title: string; sub: string; label: string; claimed: boolean; ready: boolean; count: number; total: number; onClaim: () => void }) {
  return (
    <motion.button whileTap={ready ? { scale: 0.98 } : undefined} disabled={!ready} onClick={onClaim} aria-label={`Claim the ${title.toLowerCase()}`}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left ${ready ? 'border-danfo/70 bg-gradient-to-r from-danfo/25 to-sunset/20 shadow-pop' : 'border-white/10 bg-white/[0.04]'} ${claimed ? 'opacity-55' : ''}`}>
      <motion.span animate={ready ? { rotate: [-6, 6, -6], scale: [1, 1.1, 1] } : {}} transition={{ duration: 1.4, repeat: Infinity }} className="text-[34px] leading-none">{claimed ? '📭' : '🎁'}</motion.span>
      <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">{title}</span><span className="block text-[11px] text-white/60">{sub}</span><span className="block text-[11px] font-bold text-danfo">{label}</span></span>
      <span className="text-[12px] font-extrabold tabular-nums text-danfo">{claimed ? 'Done' : ready ? 'Claim!' : `${count}/${total}`}</span>
    </motion.button>
  );
}

/** The Agbero story: which opponent you are on, how many wins until the next, and how it ended. */
function StoryCard() {
  const { wins, ending, encounters } = useAgberoStore();
  const stage = stageOf(wins), next = stage === 0 ? ROAD.stageWins[0] : stage === 1 ? ROAD.stageWins[1] : ROAD.finaleWins;
  const from = stage === 0 ? 0 : stage === 1 ? ROAD.stageWins[0] : ROAD.stageWins[1];
  const pct = ending ? 1 : Math.min(1, (wins - from) / (next - from));
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-3" aria-label="Street story">
      <div className="flex items-center gap-2"><span className="text-[26px]">🧢</span><div className="min-w-0 flex-1"><div className="text-[11px] font-extrabold uppercase tracking-wide text-hibiscus">Street story</div><div className="text-[15px] font-extrabold leading-tight">The Agbero</div></div><div className="text-right text-[11px] font-semibold text-white/55">{encounters} roadblock{encounters === 1 ? '' : 's'}</div></div>
      <div className="mt-2 flex items-center justify-between text-[12px]"><span className="font-bold">{ending === 'joined' ? 'Union member' : ending === 'reformed' ? 'The street is calm' : STAGES[stage]}</span><span className="tabular-nums text-white/55">{ending ? 'Story complete' : `${wins} / ${next} wins`}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg,#FF4D6D,#FFC21A)' }} /></div>
      <div className="mt-1.5 text-[11px] leading-snug text-white/50">{ending ? 'Nobody blocks your road any more.' : 'After a trip, somebody may stop you. Win fights or talk your way out to move up the street.'}</div>
    </div>
  );
}

/** The daily sheet: a streak hero, the 7-day calendar, today's quests, and a This week tab with the weekly goals. */
export function DailySheet() {
  const open = useDailyStore((s) => s.sheetOpen);
  const s = useDailyStore();
  const [tab, setTab] = useState<'today' | 'week'>('today');
  const [burst, setBurst] = useState(0);
  const close = () => useDailyStore.getState().set({ sheetOpen: false });
  if (open) ensureToday();
  const claimable = canClaimDaily();
  const next = streakIfClaimed();
  const shownIndex = claimable ? next.cycleIndex : s.cycleIndex;
  const streak = claimable ? s.streak : s.streak;
  const allClaimed = s.quests.length > 0 && s.quests.every((q) => q.claimed);
  const weekAll = s.weekly.length > 0 && s.weekly.every((q) => q.claimed);
  const doClaim = () => { const r = claimDaily(); if (!r.ok) { sfx.error(); toast(r.reason, 'bad'); } else setBurst((b) => b + 1); };
  return (
    <Sheet open={open} label="Daily rewards" onClose={close} solid>
      <AnimatePresence>{burst > 0 && <Confetti key={burst} count={46} />}</AnimatePresence>
      {/* hero */}
      <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-2xl px-4 pb-3 pt-4" style={{ background: 'radial-gradient(130% 150% at 0% 0%, #FFC21Acc 0%, #FF8A3D88 45%, transparent 100%)' }}>
        <div className="flex items-center gap-3 pr-10">
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/35 text-[32px] ring-1 ring-white/25">🔥</motion.div>
          <div className="min-w-0">
            <div className="font-display text-[24px] font-extrabold leading-none text-white drop-shadow">{streak > 0 ? `${streak}-day streak` : 'Start your streak'}</div>
            <div className="mt-1 text-[12px] font-medium text-white/85">{claimable ? (next.shielded ? 'Your shield will save the streak today.' : next.streak > 1 ? `Claim today to reach ${next.streak} days.` : 'Claim today to start it.') : 'Claimed today. Come back tomorrow.'}</div>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10.5px] font-bold text-white" aria-label={shieldAvailable() ? 'Streak shield ready' : 'Streak shield used this week'}>🛡️ {shieldAvailable() ? 'Shield ready: forgives 1 missed day' : 'Shield used this week'}</div>
          </div>
        </div>
      </div>
      {/* tabs */}
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-black/35 p-1">
        {(['today', 'week'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { sfx.click(); setTab(t); }} className={`rounded-lg py-2 text-[13px] font-extrabold ${tab === t ? 'bg-white/15 text-white shadow' : 'text-white/55'}`}>{t === 'today' ? 'Today' : 'This week'}{t === 'week' && s.weekly.some((q) => (getWeekly(q.id)?.target ?? 1e12) <= q.progress && !q.claimed) ? ' •' : ''}</button>
        ))}
      </div>
      {tab === 'today' ? (
        <>
          <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="Seven-day calendar">
            {DAILY_REWARDS.map((r, i) => {
              const done = claimable ? i < shownIndex : i <= s.cycleIndex && s.lastClaimDay !== null;
              const today = i === shownIndex && claimable, big = i === 6;
              return (
                <motion.div key={r.day} role="listitem" aria-label={`Day ${r.day}: ${r.label}${done ? ', claimed' : ''}`} animate={today ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity }}
                  className={`relative flex flex-col items-center rounded-xl border px-0.5 py-2 text-center ${today ? 'border-danfo bg-danfo/20 shadow-pop' : big ? 'border-danfo/40 bg-danfo/10' : 'border-white/10 bg-white/[0.05]'} ${done ? 'opacity-50' : ''}`}>
                  <div className="text-[9.5px] font-bold text-white/60">Day {r.day}</div>
                  <div className="my-1 flex h-7 items-center text-[22px] leading-none">{done ? <Check size={22} className="text-emerald-400" /> : r.icon}</div>
                  <div className="w-full truncate text-[9.5px] font-bold leading-tight">{r.short}</div>
                </motion.div>
              );
            })}
          </div>
          <motion.button whileTap={claimable ? { scale: 0.97 } : undefined} disabled={!claimable} onClick={doClaim} aria-label="Claim today's reward"
            className="relative mt-3 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-danfo to-danfo-deep py-3.5 text-[15px] font-extrabold text-night shadow-pop disabled:from-white/15 disabled:to-white/10 disabled:text-white/50 disabled:shadow-none">
            {claimable && <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(110deg,transparent 30%,rgba(255,255,255,0.55) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer 2.4s linear infinite' }} />}
            <span className="relative">{claimable ? `Claim ${DAILY_REWARDS[shownIndex].label}` : 'Claimed today ✓'}</span>
          </motion.button>
          <div className="mb-1.5 mt-5 flex items-end justify-between"><div className="text-[12px] font-extrabold uppercase tracking-wide text-white/70">Today's quests</div><div className="text-[11px] font-semibold text-white/45">{s.quests.filter((q) => q.claimed).length}/{s.quests.length} done</div></div>
          <div className="space-y-2">
            {s.quests.map((q) => { const d = getQuest(q.id); return d ? <QuestCard key={q.id} run={q} def={d} onClaim={() => { const r = claimQuest(q.id); if (!r.ok) toast(r.reason ?? '', 'bad'); }} /> : null; })}
            <Chest title="Daily chest" sub="Finish all three quests" label={QUEST_BONUS.label} claimed={s.bonusClaimed} ready={allClaimed && !s.bonusClaimed} count={s.quests.filter((q) => q.claimed).length} total={s.quests.length} onClaim={() => { const r = claimBonus(); if (r.ok) setBurst((b) => b + 1); else toast(r.reason ?? '', 'bad'); }} />
          </div>
        </>
      ) : (
        <>
          <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-white/70">Weekly goals <span className="font-semibold normal-case text-white/45">· new every Monday</span></div>
          <div className="space-y-2">
            {s.weekly.map((q) => { const d = getWeekly(q.id); return d ? <QuestCard key={q.id} run={q} def={d} onClaim={() => { const r = claimWeekly(q.id); if (!r.ok) toast(r.reason ?? '', 'bad'); }} /> : null; })}
            <Chest title="Weekly chest" sub="Finish all three goals" label={WEEKLY_BONUS.label} claimed={s.weeklyBonusClaimed} ready={weekAll && !s.weeklyBonusClaimed} count={s.weekly.filter((q) => q.claimed).length} total={s.weekly.length} onClaim={() => { const r = claimWeeklyBonus(); if (r.ok) setBurst((b) => b + 1); else toast(r.reason ?? '', 'bad'); }} />
          </div>
          <StoryCard />
        </>
      )}
      <div className="mt-3 text-center text-[10.5px] text-white/40">In-game naira only. Nothing here is real money.</div>
    </Sheet>
  );
}
