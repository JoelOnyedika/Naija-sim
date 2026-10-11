import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { LIFE_TYPES } from '@/data/lifeTypes';
import { restartLife } from '@/game/life';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useFlowStore } from '@/stores/flowStore';
import { useLifeStore } from '@/stores/lifeStore';
import { AvatarPreview } from '@/three/avatar/AvatarPreview';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';
import { getArea, getProperty } from '@/world/registry';

export function SummaryScreen() {
  const go = useFlowStore((s) => s.go);
  const username = useAuthStore((s) => s.session);
  const appearance = useCharacterStore((s) => s.appearance);
  const { lifeType, startedAt, startingPropertyId, lifeNumber } = useLifeStore();
  const money = useEconomyStore((s) => s.money);
  const [confirm, setConfirm] = useState(false);
  if (!lifeType) return null;
  const life = LIFE_TYPES[lifeType];
  const prop = startingPropertyId ? getProperty(startingPropertyId) : undefined;
  const area = prop ? getArea(prop.areaId) : undefined;
  const nepo = lifeType === 'nepo';
  const date = startedAt ? new Date(startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const stat = (label: string, value: React.ReactNode, wide = false) => (
    <div className={`rounded-lg bg-white/[0.05] px-2.5 py-1.5 ${wide ? 'col-span-2' : ''}`}><dt className="text-[10.5px] font-medium uppercase tracking-wide text-white/45">{label}</dt><dd className="truncate text-[13.5px] font-semibold leading-snug">{value}</dd></div>
  );

  return (
    <motion.div className="absolute inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-ink-700 to-ink md:flex-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className={`pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl md:left-1/4 ${nepo ? 'bg-danfo/20' : 'bg-accent/20'}`} />
      {/* The character gets everything the info card does not need, so it is never pushed out of frame. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative z-10 flex items-center justify-between px-3 pt-safe">
          <Logo />
          <span className={`rounded-md px-2.5 py-1 text-[13px] font-bold ${nepo ? 'bg-danfo text-night' : 'bg-white/15 text-white'}`}>{life.name}</span>
        </div>
        <div className="relative min-h-[14rem] flex-1"><AvatarPreview appearance={appearance} focus="full" /></div>
      </div>
      <motion.aside initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.1 }}
        className="panel-solid relative z-10 flex max-h-[52vh] flex-col rounded-t-xl border-x-0 border-b-0 p-3 pb-safe md:max-h-none md:w-[24rem] md:justify-center md:rounded-none md:border-y-0 md:border-r-0 md:p-6">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h1 className="truncate font-display text-xl font-extrabold leading-tight">{username}</h1>
          <span className="shrink-0 text-xs font-semibold text-white/50">Life #{lifeNumber}</span>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <dl className="grid grid-cols-2 gap-1.5">
            {stat('Money', <AnimatedNumber value={money} className="font-display font-bold text-danfo" />)}
            {stat('Started', date)}
            {stat('Home', `${prop?.name ?? ''}${area ? ` · ${area.name}` : ''}`, true)}
            {stat('Phone', life.phoneName, true)}
          </dl>
          <ul className="mt-2 flex flex-wrap gap-1">
            {life.conditions.map((c) => <li key={c} className="rounded-md bg-white/[0.06] px-2 py-1 text-[11.5px] text-white/75">{c}</li>)}
          </ul>
        </div>
        <div className="mt-2.5 flex gap-2">
          <Button variant="accent" size="lg" className="flex-1 !py-3" onClick={() => { sfx.reward(); go('game'); }}>Continue</Button>
          <Button variant="quiet" className="!px-4" onClick={() => setConfirm(true)}>New life</Button>
        </div>
      </motion.aside>
      <AnimatePresence>
        {confirm && (
          <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-dark w-full max-w-sm rounded-3xl p-6 text-center">
              <h3 className="font-display text-xl font-bold">Start a new life?</h3>
              <p className="mt-2 text-sm text-white/70">Your money, home and progress for this life will be gone. Your account and character stay. The roulette decides who you become.</p>
              <div className="mt-5 flex gap-3"><Button variant="glass" className="flex-1" onClick={() => setConfirm(false)}>Keep this life</Button><Button variant="danger" className="flex-1" onClick={() => { restartLife(); }}>Spin again</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
