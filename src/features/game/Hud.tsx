import { motion } from 'framer-motion';
import { Music, Music2, Plus, Users } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { formatNairaCompact } from '@/core/format';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { moodOf, useStatsStore } from '@/stores/statsStore';
import { useUiStore } from '@/stores/uiStore';
import { AnimatedNumber } from '@/ui/AnimatedNumber';

/** Compact single-row top bar: clock + mood, cash (short form for big values, never wraps), players, music. */
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
    <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-safe" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
      <div className="mx-auto flex max-w-2xl items-stretch gap-1.5">
        <div className="panel pointer-events-auto flex min-w-0 items-center gap-2 rounded-lg px-2 py-1" title={mood.label}>
          <span className="text-lg leading-none" aria-label={mood.label}>{mood.emoji}</span>
          <div className="min-w-0 whitespace-nowrap leading-tight">
            <div className="text-[10px] font-medium text-white/55">{t.weekday.slice(0, 3)} {t.dateLabel}</div>
            <div className="font-display text-[13px] font-bold tabular-nums">{t.time}</div>
          </div>
        </div>
        <div className="panel pointer-events-auto ml-auto flex min-w-0 items-center gap-1 whitespace-nowrap rounded-lg py-1 pl-2.5 pr-1">
          <AnimatedNumber value={money} format={formatNairaCompact} className="font-display text-[15px] font-extrabold text-danfo" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { sfx.click(); usePhoneStore.getState().openPhone(); usePhoneStore.getState().openApp('bank'); sfx.phoneOpen(); }} aria-label="Open bank" className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white"><Plus size={16} strokeWidth={3} /></motion.button>
        </div>
        <div className="panel pointer-events-auto flex items-center gap-1 rounded-lg px-2 text-[11px] font-semibold tabular-nums"><Users size={13} className="text-accent-glow" />{(online / 1000).toFixed(0)}K</div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { useSettingsStore.getState().toggleMusic(); sfx.click(); }} aria-label="Toggle music" className="panel pointer-events-auto flex w-9 items-center justify-center rounded-lg">
          {music ? <Music size={15} className="text-accent-glow" /> : <Music2 size={15} className="text-white/40" />}
        </motion.button>
      </div>
    </motion.div>
  );
}
