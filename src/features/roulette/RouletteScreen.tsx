import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { startNewLife, rollLifeType } from '@/game/life';
import { LIFE_TYPES } from '@/data/lifeTypes';
import { CONFIG } from '@/data/config';
import { useFlowStore } from '@/stores/flowStore';
import { useLifeStore } from '@/stores/lifeStore';
import type { LifeTypeId } from '@/types/game';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';
import { Confetti } from './Confetti';

const CARD_W = 132, GAP = 12, STEP = CARD_W + GAP, TOTAL = 64, TARGET = 54;

const LAPO_FLAVOUR = ['🚌 Danfo daily', '🍜 Indomie season', '🔌 NEPA took light', '🎒 Hustler start', '🧺 Mama\'s provisions', '🛺 Keke commute'];
const NEPO_FLAVOUR = ['👑 Papa get long legs', '✈️ Business class', '🏝️ Banana Island kid'];

interface Slot { type: LifeTypeId; flavour: string }

/** Build the reel: mostly Lapo, a few Nepo, with the winning card at TARGET (and a near-miss beside it). */
function buildReel(result: LifeTypeId): Slot[] {
  const reel: Slot[] = Array.from({ length: TOTAL }, (_, i) => {
    const nepo = Math.random() < CONFIG.nepoChance * 1.8;
    return nepo ? { type: 'nepo', flavour: NEPO_FLAVOUR[i % NEPO_FLAVOUR.length] } : { type: 'lapo', flavour: LAPO_FLAVOUR[i % LAPO_FLAVOUR.length] };
  });
  reel[TARGET] = { type: result, flavour: result === 'nepo' ? NEPO_FLAVOUR[0] : LAPO_FLAVOUR[0] };
  // tension: a golden card sits just past the marker when you lose
  reel[TARGET + 1] = result === 'lapo' ? { type: 'nepo', flavour: NEPO_FLAVOUR[1] } : { type: 'lapo', flavour: LAPO_FLAVOUR[1] };
  reel[TARGET - 1] = result === 'lapo' ? { type: 'lapo', flavour: LAPO_FLAVOUR[2] } : { type: 'nepo', flavour: NEPO_FLAVOUR[2] };
  return reel;
}

function Card({ slot, glow }: { slot: Slot; glow?: boolean }) {
  const nepo = slot.type === 'nepo';
  return (
    <div className={`flex h-40 shrink-0 flex-col items-center justify-center rounded-3xl p-3 text-center ring-2 transition ${nepo ? 'bg-gradient-to-b from-[#FFE9A6] via-danfo to-danfo-deep text-night ring-white/70' : 'bg-gradient-to-b from-night-600 to-night-700 text-white ring-white/10'} ${glow ? 'scale-105' : ''}`} style={{ width: CARD_W }}>
      <span className="text-4xl">{slot.flavour.split(' ')[0]}</span>
      <span className="mt-2 font-display text-sm font-extrabold leading-tight">{nepo ? 'Nepo Baby' : 'Lapo Baby'}</span>
      <span className={`mt-1 text-[11px] leading-tight ${nepo ? 'text-night/70' : 'text-white/55'}`}>{slot.flavour.split(' ').slice(1).join(' ')}</span>
    </div>
  );
}

export function RouletteScreen() {
  const go = useFlowStore((s) => s.go);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'reveal'>('idle');
  const [result, setResult] = useState<LifeTypeId>('lapo');
  const [reel, setReel] = useState<Slot[]>(() => buildReel('lapo'));
  const wrap = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const lastTick = useRef(-1);

  const idleReel = useMemo(() => reel, [reel]);

  // idle drift so the reel feels alive
  useEffect(() => {
    if (phase !== 'idle') return;
    const c = animate(x, [-0, -STEP * 6], { duration: 14, ease: 'linear', repeat: Infinity, repeatType: 'reverse' });
    return () => c.stop();
  }, [phase, x]);

  const spin = () => {
    if (phase !== 'idle') return;
    const r = rollLifeType();
    useLifeStore.getState().setPending(r);
    setResult(r);
    setReel(buildReel(r));
    sfx.spinStart();
    setPhase('spinning');
    const width = wrap.current?.clientWidth ?? 360;
    const target = -(TARGET * STEP + CARD_W / 2 - width / 2);
    x.set(0);
    lastTick.current = -1;
    animate(x, target, {
      duration: 7, ease: [0.08, 0.72, 0.12, 1],
      onUpdate: (v) => {
        const i = Math.floor((-v + width / 2) / STEP);
        if (i !== lastTick.current) { lastTick.current = i; sfx.tick(0.8 + Math.min(1, i / TARGET) * 0.5); }
      },
      onComplete: () => { setPhase('reveal'); r === 'nepo' ? sfx.win() : sfx.lose(); },
    });
  };

  const life = LIFE_TYPES[result];
  const nepo = result === 'nepo';

  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 40% at 50% 28%, rgba(255,194,26,0.22), transparent 70%), radial-gradient(50% 50% at 50% 100%, rgba(11,143,77,0.35), transparent 70%)' }} />
      <motion.div className="relative z-10 flex h-full flex-col items-center px-4 pt-safe" animate={phase === 'reveal' && nepo ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.5 }}>
        <div className="self-start"><Logo /></div>
        <h1 className="mt-6 text-center font-display text-4xl font-extrabold leading-tight">Life <span className="text-danfo">Roulette</span></h1>
        <p className="mt-2 max-w-xs text-center text-sm text-white/70">Where you start is not your choice. Where you end up is. Spin to find out what life gave you.</p>

        <div className="relative mt-10 w-full max-w-xl">
          <div className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 text-3xl text-danfo drop-shadow">▼</div>
          <div className="pointer-events-none absolute -bottom-6 left-1/2 z-20 -translate-x-1/2 rotate-180 text-3xl text-danfo drop-shadow">▼</div>
          <div ref={wrap} className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-black/30 py-5 shadow-glass">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-night to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-night to-transparent" />
            <motion.div className="flex" style={{ x, gap: GAP, paddingLeft: GAP }}>
              {idleReel.map((s, i) => <Card key={i} slot={s} />)}
            </motion.div>
            <div className="pointer-events-none absolute inset-y-3 left-1/2 w-[148px] -translate-x-1/2 rounded-3xl ring-2 ring-danfo/70" />
          </div>
        </div>

        <div className="mt-10 w-full max-w-xs">
          <Button size="lg" className="w-full" disabled={phase !== 'idle'} onClick={spin}>{phase === 'idle' ? 'Spin' : phase === 'spinning' ? 'Spinning…' : 'Done'}</Button>
          <p className="mt-3 text-center text-xs text-white/45">Nepo Baby odds: about {Math.round(CONFIG.nepoChance * 100)}%. Most people start Lapo.</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {nepo && <Confetti />}
            {!nepo && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(127,160,170,0.25),transparent_60%)]" />}
            <motion.div initial={{ scale: 0.6, rotate: -4, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              className={`relative w-full max-w-sm rounded-[2rem] p-7 text-center shadow-glass ring-2 ${nepo ? 'bg-gradient-to-b from-[#FFF3C4] via-danfo to-danfo-deep text-night ring-white/80' : 'glass-dark ring-white/15'}`}>
              <div className="text-6xl">{nepo ? '👑' : '🚌'}</div>
              <p className={`mt-3 text-sm font-semibold ${nepo ? 'text-night/70' : 'text-white/60'}`}>{nepo ? `Rare result. Roughly 1 in ${Math.round(1 / CONFIG.nepoChance)}.` : 'Common result. Most of Nigeria starts here.'}</p>
              <h2 className="mt-1 font-display text-4xl font-extrabold">{life.name}</h2>
              <p className={`mt-2 text-lg font-semibold ${nepo ? 'text-night/80' : 'text-danfo'}`}>{nepo ? 'Omo, you hit the jackpot. Papa get long legs.' : 'Omo, we go hustle. Naija no dey carry last.'}</p>
              <ul className={`mt-4 space-y-1 text-sm ${nepo ? 'text-night/75' : 'text-white/70'}`}>{life.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
              <Button size="lg" variant={nepo ? 'dark' : 'primary'} className="mt-6 w-full" onClick={() => { startNewLife(result); sfx.reward(); go('summary'); }}>Enter your life</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
