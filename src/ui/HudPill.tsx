import { motion } from 'framer-motion';
import { Moon, Plus, Sun, Volume2, VolumeX } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { formatNairaCompact } from '@/core/format';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { moodOf, useStatsStore } from '@/stores/statsStore';
import { useUiStore } from '@/stores/uiStore';
import { AnimatedNumber } from './AnimatedNumber';

/** Day (6:00 to 18:59) or night, from the game clock. Shared by the HUD pill and the phone. */
export const isDaytime = (hour: number) => hour >= 6 && hour < 19;

/**
 * The shared top HUD: a "time and people" capsule (sun or moon, clock, mood, how many are online, sound) and a cash capsule
 * with a quick-top-up button that opens the bank. Used on the home screen and on the map so they always match.
 */
export function HudPill() {
  const minutes = useClockStore((s) => s.minutes), anchor = useClockStore((s) => s.anchor);
  const stats = useStatsStore((s) => s.stats);
  const money = useEconomyStore((s) => s.money);
  const online = useUiStore((s) => s.online);
  const music = useSettingsStore((s) => s.music);
  const t = clockParts(minutes, anchor), mood = moodOf(stats), day = isDaytime(t.hour);
  return (
    <div className="mx-auto flex max-w-2xl items-stretch gap-2">
      <div className="hud-capsule pointer-events-auto flex min-w-0 flex-1 items-center gap-2.5 rounded-[1.4rem] py-1.5 pl-2 pr-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${day ? 'bg-amber-300/20 text-amber-300' : 'bg-indigo-300/20 text-indigo-200'}`} aria-label={day ? 'Daytime' : 'Night'}>{day ? <Sun size={18} /> : <Moon size={18} />}</span>
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5 whitespace-nowrap font-display text-[15px] font-extrabold tabular-nums">{t.time}<span className="text-base" title={mood.label}>{mood.emoji}</span></div>
          <div className="flex items-center gap-1 whitespace-nowrap text-[10.5px] font-semibold text-white/60"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{(online / 1000).toFixed(0)}K online</div>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { useSettingsStore.getState().toggleMusic(); sfx.click(); }} aria-label={music ? 'Mute music' : 'Play music'} className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          {music ? <Volume2 size={16} className="text-accent-glow" /> : <VolumeX size={16} className="text-white/40" />}
        </motion.button>
      </div>
      <div className="hud-capsule hud-cash pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-[1.4rem] py-1.5 pl-3.5 pr-1.5">
        <AnimatedNumber value={money} format={formatNairaCompact} className="font-display text-[16px] font-extrabold text-danfo" />
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => { sfx.click(); usePhoneStore.getState().openPhone(); usePhoneStore.getState().openApp('bank'); sfx.phoneOpen(); }} aria-label="Open bank" className="flex h-9 w-9 items-center justify-center rounded-[1.1rem] bg-gradient-to-b from-danfo to-amber-500 text-night shadow-[0_4px_14px_rgba(255,194,26,0.45)]"><Plus size={18} strokeWidth={3} /></motion.button>
      </div>
    </div>
  );
}
