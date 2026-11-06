import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/audio/sfx';
import { getVehicle } from '@/data/vehicles';
import { freshDrive, gradeDrive, kmh, makeCourse, specFor, TRACK, type DriveResult, type DriveState, type Obstacle } from '@/game/testDrive';
import { preloadCar } from '@/three/models/CarModel';
import { useTestDriveStore } from '@/stores/testDriveStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * Polanco Motors test drive. A small arcade run on a Canvas 2D "pseudo-3D" road (no WebGL, so it opens instantly and costs little):
 * steer between three lanes, dodge a danfo, goats, drums and potholes, cross the line, then brake to a stop inside the yellow zone.
 * The maths is in game/testDrive.ts. Controls: on-screen buttons (touch) or arrow keys / WASD and space (PC).
 */
type Phase = 'intro' | 'count' | 'drive' | 'result';
const DriveScene = lazy(() => import('./TestDrive3D'));

export function TestDrive() {
  const id = useTestDriveStore((st) => st.vehicleId);
  return createPortal(<AnimatePresence>{id && <Run key={id} id={id} />}</AnimatePresence>, document.body);
}

function Run({ id }: { id: string }) {
  const v = getVehicle(id)!, spec = specFor(v);
  const [phase, setPhase] = useState<Phase>('intro'), [count, setCount] = useState(3), [result, setResult] = useState<DriveResult | null>(null), [round, setRound] = useState(1);
  const [hud, setHud] = useState({ kmh: 0, pct: 0, hits: 0, t: 0, brake: false });
  const [ready, setReady] = useState(false), phaseRef = useRef<Phase>('intro');
  const st = useRef<DriveState>(freshDrive()), course = useRef<Obstacle[]>(makeCourse(1)), inp = useRef({ left: false, right: false, gas: false, brake: false }), steerSm = useRef(0);
  phaseRef.current = phase;
  const close = useCallback(() => { useTestDriveStore.getState().close(); useUiStore.getState().setShowroomVehicle(id); }, [id]);
  const start = () => { st.current = freshDrive(); course.current = makeCourse(round); steerSm.current = 0; setResult(null); setCount(3); setPhase('count'); };
  useEffect(() => {
    if (phase !== 'count') return;
    const t = setInterval(() => setCount((n) => { if (n <= 1) { clearInterval(t); setPhase('drive'); return 0; } return n - 1; }), 750);
    return () => clearInterval(t);
  }, [phase]);
  // keyboard
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase(); let hit = true;
      if (k === 'arrowleft' || k === 'a') inp.current.left = on; else if (k === 'arrowright' || k === 'd') inp.current.right = on;
      else if (k === 'arrowup' || k === 'w') inp.current.gas = on; else if (k === 'arrowdown' || k === 's' || k === ' ') inp.current.brake = on; else hit = false;
      if (hit) e.preventDefault();
    };
    const dn = (e: KeyboardEvent) => set(e, true), up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);
  // the 3D scene runs the clock; this screen only reads the state for the numbers
  useEffect(() => {
    const t = setInterval(() => { const q = st.current; setHud({ kmh: kmh(q.v, spec), pct: Math.min(1, q.z / TRACK.finish), hits: q.hits, t: Math.round(q.t * 10) / 10, brake: phaseRef.current === 'drive' && q.z > TRACK.finish - 140 && q.z < TRACK.length }); }, 100);
    return () => clearInterval(t);
  }, [spec]);
  useEffect(() => { preloadCar(v.model); }, [v.model]);
  const onHit = useCallback(() => sfx.error(), []);
  const onDone = useCallback(() => { const r = gradeDrive(st.current, spec); setResult(r); setPhase('result'); (r.grade === 'C' ? sfx.error : sfx.reward)(); }, [spec]);
  const onReady = useCallback(() => setReady(true), []);
  const refs = useRef({ st, course, inp, steer: steerSm, phase: phaseRef, onHit, onDone, onReady });
  refs.current.onHit = onHit; refs.current.onDone = onDone; refs.current.onReady = onReady;
  const hold = (key: 'left' | 'right' | 'gas' | 'brake') => ({
    onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); inp.current[key] = true; },
    onPointerUp: () => { inp.current[key] = false; }, onPointerCancel: () => { inp.current[key] = false; }, onPointerLeave: () => { inp.current[key] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const btn = 'flex select-none items-center justify-center rounded-2xl border border-white/20 font-display font-extrabold text-white active:scale-95 touch-none';
  return (
    <motion.div className="fixed inset-0 z-[210] flex flex-col bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Test drive ${v.name}`}>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#C9617E]"><Suspense fallback={null}><DriveScene v={v} spec={spec} refs={refs.current} /></Suspense>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          <div className="rounded-2xl bg-black/55 px-3 py-1.5 backdrop-blur"><div className="font-display text-[28px] font-extrabold leading-none tabular-nums">{hud.kmh}<span className="ml-1 text-[12px] font-bold text-white/60">km/h</span></div><div className="mt-0.5 text-[11px] font-semibold text-white/60">{v.name}</div></div>
          <div className="rounded-2xl bg-black/55 px-3 py-1.5 text-right text-[12px] font-bold backdrop-blur"><div>💥 {hud.hits}</div><div className="tabular-nums text-white/70">{hud.t}s</div></div>
        </div>
        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+4.6rem)] h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${hud.pct * 100}%` }} /></div>
        {phase === 'drive' && hud.brake && <motion.div className="pointer-events-none absolute inset-x-0 top-[34%] text-center font-display text-[30px] font-extrabold text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>{st.current.z < TRACK.finish ? 'FINISH LINE! THEN BRAKE!' : 'BRAKE! STOP IN THE ZONE!'}</motion.div>}
        {phase === 'count' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[110px] font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]">{count || 'GO!'}</div>}
        <button onClick={close} className="absolute right-3 top-[calc(env(safe-area-inset-top,0px)+5.6rem)] rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur active:bg-black/60">Exit</button>
        {phase === 'intro' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-white/12 bg-[#0E131C] p-5 text-center">
              <div className="text-[34px]">🏁</div><div className="font-display text-[20px] font-extrabold">Test drive: {v.name}</div>
              <p className="mt-2 text-[13px] leading-snug text-white/75">Steer between the lanes and dodge the danfo, goats, drums and potholes. Cross the chequered line, then stop inside the yellow zone before the barrier.</p>
              <p className="mt-2 text-[12px] text-white/50">Touch: ◀ ▶ to steer, GAS and BRAKE. PC: arrows or WASD, space brakes.</p>
              <button onClick={start} disabled={!ready} className="mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-extrabold disabled:opacity-50">{ready ? 'Start engine' : 'Getting the car ready…'}</button>
              <button onClick={close} className="mt-2 h-10 w-full rounded-2xl bg-white/10 text-[13px] font-bold">Not now</button>
            </div>
          </div>
        )}
        {phase === 'result' && result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-4">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl border border-white/12 bg-[#0E131C] p-5 text-center">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-hibiscus">{result.stoppedInZone ? 'Test drive complete' : 'You hit the barrier'}</div>
              <div className="font-display text-[72px] font-extrabold leading-none" style={{ color: { S: '#FFC21A', A: '#34D399', B: '#60A5FA', C: '#F87171' }[result.grade] }}>{result.grade}</div>
              <p className="mt-1 text-[13px] italic text-white/80">{result.line}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-left text-[12px]">
                {[['Top speed', `${result.topKmh} km/h`], ['Time', `${result.seconds}s`], ['Crashes', String(result.hits)], ['Potholes', String(result.jolts)], ['Stopped', result.stoppedInZone ? `${result.brakeMetres} m past the line` : 'no']].map(([a, b]) => <div key={a} className="rounded-xl bg-white/[0.06] px-3 py-2"><div className="text-white/50">{a}</div><div className="font-bold">{b}</div></div>)}
              </div>
              <button onClick={() => { setRound((n) => n + 1); start(); }} className="mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-extrabold">Drive again</button>
              <button onClick={close} className="mt-2 h-10 w-full rounded-2xl bg-white/10 text-[13px] font-bold">Back to the showroom</button>
            </motion.div>
          </div>
        )}
      </div>
      <div className="pb-safe flex items-stretch justify-between gap-3 bg-[#0B0F16] px-4 pb-4 pt-3" style={{ touchAction: 'none' }}>
        <div className="flex gap-2"><div {...hold('left')} className={`${btn} h-[76px] w-[72px] bg-white/10 text-[30px]`} aria-label="Steer left">◀</div><div {...hold('right')} className={`${btn} h-[76px] w-[72px] bg-white/10 text-[30px]`} aria-label="Steer right">▶</div></div>
        <div className="flex gap-2"><div {...hold('brake')} className={`${btn} h-[76px] w-[80px] bg-rose-600/80 text-[15px]`} aria-label="Brake">BRAKE</div><div {...hold('gas')} className={`${btn} h-[76px] w-[80px] bg-emerald-600/85 text-[15px]`} aria-label="Gas">GAS</div></div>
      </div>
    </motion.div>
  );
}
