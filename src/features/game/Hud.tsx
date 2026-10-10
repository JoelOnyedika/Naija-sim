import { motion } from 'framer-motion';
import { Music, Music2, Plus, Users } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { moodOf, useStatsStore } from '@/stores/statsStore';
import { useUiStore } from '@/stores/uiStore';
import { AnimatedNumber } from '@/ui/AnimatedNumber';

/** Top bar: date/time, mood, online players, music, money (+ top-up shortcut to the Bank app). */
export function Hud() {
  const minutes = useClockStore((s) => s.minutes);
  const anchor = useClockStore((s) => s.anchor);
  const stats = useStatsStore((s) => s.stats);
  const money = useEconomyStore((s) => s.money);
  const online = useUiStore((s) => s.online);
  const music = useSettingsStore((s) => s.music);
  const t = clockParts(minutes, anchor);
  const mood = moodOf(stats);

  return (
    <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-safe" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2">
        <div className="glass-dark pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-1.5">
          <div className="leading-tight"><div className="text-[11px] font-medium text-white/60">{t.weekday}, {t.dateLabel}</div><div className="font-display text-base font-bold tabular-nums">{t.time}</div></div>
          <div className="h-7 w-px bg-white/15" />
          <div className="text-center leading-tight"><div className="text-lg">{mood.emoji}</div></div>
          <div className="text-xs font-semibold">{mood.label}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-dark pointer-events-auto flex items-center gap-1.5 rounded-2xl px-2.5 py-2 text-xs font-semibold"><Users size={14} className="text-emerald-300" />{(online / 1000).toFixed(0)}K</div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => { useSettingsStore.getState().toggleMusic(); sfx.click(); }} aria-label="Toggle music" className="glass-dark pointer-events-auto flex h-9 w-9 items-center justify-center rounded-2xl">
            {music ? <Music size={16} className="text-danfo" /> : <Music2 size={16} className="text-white/40" />}
          </motion.button>
        </div>
        <div className="glass-dark pointer-events-auto flex w-full items-center justify-between rounded-2xl py-1.5 pl-4 pr-1.5 sm:w-auto sm:min-w-[15rem]">
          <span className="font-display text-xl font-extrabold text-danfo"><AnimatedNumber value={money} /></span>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => { sfx.click(); usePhoneStore.getState().openPhone(); usePhoneStore.getState().openApp('bank'); sfx.phoneOpen(); }} aria-label="Open bank" className="ml-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-danfo to-danfo-deep text-night shadow-pop"><Plus size={20} strokeWidth={3} /></motion.button>
        </div>
      </div>
    </motion.div>
  );
}
