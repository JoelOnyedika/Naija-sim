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
import { SocialLinks } from '@/ui/SocialLinks';
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

  return (
    <motion.div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-night-700 to-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className={`pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl ${nepo ? 'bg-danfo/30' : 'bg-naija/30'}`} />
      <div className="relative mx-auto flex min-h-full max-w-md flex-col px-5 pb-8 pt-safe">
        <Logo />
        <div className="h-56 -mb-4"><AvatarPreview appearance={appearance} zoom={1.15} /></div>
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 0.1 }} className="glass-dark rounded-[2rem] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/55">Life #{lifeNumber}</p>
              <h1 className="font-display text-3xl font-extrabold leading-tight">{username}</h1>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${nepo ? 'bg-danfo text-night' : 'bg-white/15 text-white'}`}>{life.name}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-3"><dt className="text-white/55">Date started</dt><dd className="font-semibold">{date}</dd></div>
            <div className="rounded-2xl bg-white/5 p-3"><dt className="text-white/55">Current money</dt><dd className="font-display text-lg font-bold text-danfo"><AnimatedNumber value={money} /></dd></div>
            <div className="col-span-2 rounded-2xl bg-white/5 p-3"><dt className="text-white/55">Starting home</dt><dd className="font-semibold">{prop?.name}{area ? ` · ${area.name}` : ''}</dd></div>
            <div className="col-span-2 rounded-2xl bg-white/5 p-3"><dt className="text-white/55">Phone</dt><dd className="font-semibold">{life.phoneName}</dd></div>
          </dl>
          <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-white/45">Starting condition</p>
          <ul className="space-y-1 text-sm text-white/80">{life.conditions.map((c) => <li key={c} className="flex gap-2"><span className="text-naija-mint">✓</span>{c}</li>)}</ul>
        </motion.div>
        <div className="mt-5 space-y-3">
          <Button size="lg" className="w-full" onClick={() => { sfx.reward(); go('game'); }}>Continue</Button>
          <Button variant="glass" className="w-full" onClick={() => setConfirm(true)}>Start New Life</Button>
        </div>
        <SocialLinks className="mt-6 justify-center" />
      </div>
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
