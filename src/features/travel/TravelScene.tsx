import { AnimatePresence, motion } from 'framer-motion';
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTravelStore } from '@/stores/travelStore';
import type { TripPlan } from './plan';

const Scene3D = lazy(() => import('./Scene3D'));

const SKY_TOP = { clear: '#9CCBEF', rain: '#58636E', dusk: '#E58A5C' } as const;
const skyTop = (w: TripPlan['weather']) => SKY_TOP[w];
const Sky = ({ plan }: { plan: TripPlan }) => <div className="absolute inset-0" style={{ background: skyTop(plan.weather) }} />;

/** If WebGL fails for any reason the trip still runs its course (caption, progress, arrival) over a plain sky instead of breaking. */
class Fallback extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn('[travel] 3D scene failed, showing a plain sky', e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * The trip, full screen: a 3 to 5 second bird's-eye 3D ride ending with the destination appearing and you
 * stepping out. Tap Skip to jump to the end. `onDone` runs once, when the scene finishes or is skipped.
 */
export function TravelScene({ plan, onDone, startArrived = false }: { plan: TripPlan; onDone: () => void; /** TEST-ONLY: start already at the destination (used by screenshots and tests). */ startArrived?: boolean }) {
  const [arrived, setArrived] = useState(startArrived), [line, setLine] = useState(0);
  const done = useRef(false);
  const total = plan.seconds, arriveAt = Math.max(2.2, total - 1.5);
  const finish = () => { if (done.current) return; done.current = true; useTravelStore.getState().record(`${plan.ride}:${plan.weather}:${plan.event}`); onDone(); };
  useEffect(() => {
    const t1 = setTimeout(() => setLine(1), (arriveAt * 1000) * 0.5), t2 = setTimeout(() => setArrived(true), arriveAt * 1000), t3 = setTimeout(finish, total * 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = useMemo(() => ({ duration: total }), [total]);
  return createPortal(
    <motion.div className="fixed inset-0 z-[200] flex flex-col bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Travelling to ${plan.destination.name}`}>
      <div className="relative flex min-h-0 flex-1 items-end overflow-hidden" style={{ background: skyTop(plan.weather) }}>
        <Fallback fallback={<Sky plan={plan} />}><Suspense fallback={<Sky plan={plan} />}><Scene3D plan={plan} arrived={arrived} /></Suspense></Fallback>
        <AnimatePresence mode="wait">
          <motion.div key={arrived ? 'arr' : line} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+1rem)] flex justify-center px-4">
            <div className="rounded-2xl bg-white px-4 py-2 text-center text-[15px] font-extrabold text-night shadow-glass">{arrived ? `You don reach ${plan.destination.name}!` : plan.lines[line] ?? plan.lines[0]}</div>
          </motion.div>
        </AnimatePresence>
        <button onClick={finish} className="absolute right-3 top-[calc(env(safe-area-inset-top,0px)+4.2rem)] rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur active:bg-black/60">Skip</button>
      </div>
      <div className="pb-safe bg-night px-5 pb-5 pt-3 text-center">
        <p className="font-display text-lg font-bold">{arrived ? 'Arriving…' : `Heading to ${plan.destination.name}…`}</p>
        <div className="mx-auto mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-sky-400" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ ...pct, ease: 'linear' }} /></div>
      </div>
    </motion.div>,
    document.body,
  );
}
