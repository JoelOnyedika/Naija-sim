import { AnimatePresence, motion } from 'framer-motion';
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { getVehicle } from '@/data/vehicles';
import { deviceScore } from '../travel/plan';
import { toast, useUiStore } from '@/stores/uiStore';
import { SHOTS, tierOf } from './RevealScene';

const RevealScene = lazy(() => import('./RevealScene'));
const DURATION = 12.6;
const CAPTIONS = ['Oga! New car!', 'Headlights wey go blind your enemies', 'Rims on rims on rims', 'Stance: perfect', 'Wetin you dey carry for back?!', 'Congratulations, Oga!'];
const PARTY: Record<string, string> = { standard: 'The neighbours are cheering', rich: 'Champagne is flowing', luxury: 'Champagne, models, the whole street is out' };
class Guard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn('[carReveal] 3D scene failed, showing a plain backdrop', e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
const Backdrop = () => <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 60%, #6B2F6E, #150B2E)' }} />;

/**
 * The purchase celebration. Mounted once; plays when `ui.carReveal` is set to a car id (the dealership sets it after a successful buy).
 * Skip jumps to the end. If WebGL is unavailable it shows a plain backdrop with the captions and still finishes.
 */
export function CarReveal() {
  const id = useUiStore((s) => s.carReveal), car = id ? getVehicle(id) : undefined;
  return createPortal(<AnimatePresence>{car && <Film key={car.id} id={car.id} />}</AnimatePresence>, document.body);
}

function Film({ id }: { id: string }) {
  const car = getVehicle(id)!, tier = tierOf(car.price), [shot, setShot] = useState(0), done = useRef(false), light = deviceScore() < 0.6;
  const finish = () => { if (done.current) return; done.current = true; useUiStore.getState().setCarReveal(null); toast(`The ${car.name} is yours. Check your garage.`, 'good'); };
  useEffect(() => { sfx.purchase(); if (typeof (globalThis as { __revealT?: number }).__revealT === 'number') return; /* TEST-ONLY: frozen time never auto-finishes */ const t = setTimeout(finish, DURATION * 1000 + 300); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div className="fixed inset-0 z-[210] flex flex-col bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`You bought the ${car.name}`}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Guard fallback={<Backdrop />}><Suspense fallback={<Backdrop />}><RevealScene car={car} duration={DURATION} light={light} onShot={setShot} /></Suspense></Guard>
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+1rem)] text-center">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="font-display text-[13px] font-extrabold uppercase tracking-[0.3em] text-white/80">New car unlocked</motion.div>
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 220, damping: 16 }} className="mt-1 font-display text-3xl font-extrabold text-white drop-shadow-lg">{car.name}</motion.div>
          <div className="text-[15px] font-bold text-danfo">{formatNaira(car.price)}</div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={shot} initial={{ opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-5">
            <div className="rounded-2xl bg-white px-4 py-2 text-center text-[16px] font-extrabold text-night shadow-glass">{shot >= SHOTS - 1 ? `${CAPTIONS[SHOTS - 1]} ${PARTY[tier]}.` : CAPTIONS[shot]}</div>
          </motion.div>
        </AnimatePresence>
        <button onClick={finish} className="absolute right-3 top-[calc(env(safe-area-inset-top,0px)+1rem)] rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur active:bg-black/60">Skip</button>
      </div>
    </motion.div>
  );
}
