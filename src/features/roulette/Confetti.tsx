import { motion } from 'framer-motion';
import { useMemo } from 'react';

/** Falling gold/green/white pieces for the Nepo reveal. */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.8, dur: 2.2 + Math.random() * 2, rot: Math.random() * 720 - 360,
    c: ['#FFC21A', '#FFE9A6', '#0B8F4D', '#FFFFFF', '#FF4D6D'][i % 5], w: 6 + Math.random() * 6,
  })), [count]);
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {pieces.map((p) => (
        <motion.i key={p.id} className="absolute top-0 block rounded-sm" style={{ left: `${p.x}%`, width: p.w, height: p.w * 1.6, background: p.c }}
          initial={{ y: -40, rotate: 0, opacity: 1 }} animate={{ y: '110vh', rotate: p.rot, opacity: [1, 1, 0.8] }} transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }} />
      ))}
    </div>
  );
}
