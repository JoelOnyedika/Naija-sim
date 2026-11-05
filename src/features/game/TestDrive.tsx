import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/audio/sfx';
import { getVehicle } from '@/data/vehicles';
import { freshDrive, gradeDrive, kmh, makeCourse, specFor, stepDrive, trackTop, TRACK, type DriveResult, type DriveState, type Obstacle } from '@/game/testDrive';
import { useTestDriveStore } from '@/stores/testDriveStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * Polanco Motors test drive. A small arcade run on a Canvas 2D "pseudo-3D" road (no WebGL, so it opens instantly and costs little):
 * steer between three lanes, dodge a danfo, goats, drums and potholes, cross the line, then brake to a stop inside the yellow zone.
 * The maths is in game/testDrive.ts. Controls: on-screen buttons (touch) or arrow keys / WASD and space (PC).
 */
type Phase = 'intro' | 'count' | 'drive' | 'result';
const SEG = 10, VIEW = 280;

function draw(c: CanvasRenderingContext2D, w: number, h: number, s: DriveState, course: Obstacle[], top: number, color: string, steer: number, now: number) {
  const hor = h * 0.36, base = h * 0.8, camD = 9, ppm = w / 10.5, camX = s.x * 0.55, rush = Math.min(1, s.v / top);
  const shake = rush * 1.6, ox = (Math.sin(now * 0.05) * shake), oy = (Math.cos(now * 0.07) * shake);
  c.save(); c.translate(ox, oy);
  const p = (d: number) => camD / (camD + d), Y = (d: number) => hor + (base - hor) * p(d), X = (xw: number, d: number) => w / 2 + (xw - camX) * ppm * p(d);
  const sky = c.createLinearGradient(0, 0, 0, hor); sky.addColorStop(0, '#4F8FD6'); sky.addColorStop(1, '#F6D9A8'); c.fillStyle = sky; c.fillRect(-10, -10, w + 20, hor + 12);
  c.fillStyle = '#6FA05A'; c.fillRect(-10, hor, w + 20, h - hor + 10);
  // far skyline
  for (let i = 0; i < 14; i++) { const bh = 24 + ((i * 37) % 46), bx = (i / 14) * w - ((s.z * 0.3) % 40); c.fillStyle = i % 2 ? '#9FB3C8' : '#B6C4D2'; c.fillRect(bx, hor - bh, w / 14 - 3, bh); }
  // road bands from far to near
  const first = Math.floor(s.z / SEG) * SEG;
  for (let k = Math.ceil(VIEW / SEG); k >= 0; k--) {
    const z0 = first + k * SEG, d0 = z0 - s.z, d1 = d0 + SEG; if (d1 <= -0.5) continue;
    const a = Math.max(d0, -0.4), band = Math.floor(z0 / SEG) % 2, y0 = Y(a), y1 = Y(d1), zone = z0 >= TRACK.finish && z0 < TRACK.zoneEnd;
    const quad = (x0: number, x1: number, color2: string) => { c.fillStyle = color2; c.beginPath(); c.moveTo(X(x0, a), y0); c.lineTo(X(x1, a), y0); c.lineTo(X(x1, d1), y1); c.lineTo(X(x0, d1), y1); c.closePath(); c.fill(); };
    quad(-30, 30, band ? '#6FA05A' : '#679852');
    quad(-4.9, -4.5, band ? '#E4572E' : '#F4F1EA'); quad(4.5, 4.9, band ? '#E4572E' : '#F4F1EA');
    quad(-4.5, 4.5, zone ? (band ? '#F5C518' : '#E3A800') : band ? '#4B4F57' : '#454952');
    if (!zone && band) { quad(-1.6, -1.4, '#E6E2D4'); quad(1.4, 1.6, '#E6E2D4'); }
    if (z0 === Math.floor(TRACK.finish / SEG) * SEG) for (let q = 0; q < 9; q++) quad(-4.5 + q, -3.5 + q, q % 2 ? '#111' : '#fff');
  }
  // roadside palms and buildings
  const items: { d: number; draw: () => void }[] = [];
  for (let z = Math.ceil(s.z / 24) * 24; z < s.z + VIEW; z += 24) for (const side of [-1, 1]) {
    const d = z - s.z, pp = p(d), x = X(side * 8.2, d), y = Y(d), seed = Math.floor(z / 24) * 2 + (side > 0 ? 1 : 0);
    if (seed % 3 === 0) items.push({ d, draw: () => { c.font = `${Math.max(6, 7 * ppm * pp)}px serif`; c.textAlign = 'center'; c.fillText('🌴', x, y); } });
    else items.push({ d, draw: () => { const bw = 8 * ppm * pp, bh = (10 + (seed % 5) * 4) * ppm * pp * 0.6; c.fillStyle = ['#D9CBA8', '#CFD8DC', '#E6D3B8', '#B9C7D6'][seed % 4]; c.fillRect(x + side * 3 * ppm * pp - bw / 2, y - bh, bw, bh); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + side * 3 * ppm * pp - bw / 2, y - bh * 0.5, bw, 2); } });
  }
  for (const o of course) { const d = o.z - s.z; if (d < -3 || d > VIEW) continue; items.push({ d, draw: () => drawObstacle(c, o, X(o.x, d), Y(d), ppm * p(d)) }); }
  // the end barrier
  { const d = TRACK.length - s.z; if (d > -2 && d < VIEW) items.push({ d, draw: () => { const x0 = X(-4.5, d), x1 = X(4.5, d), y = Y(d), bh = 2.2 * ppm * p(d); for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#fff' : '#D62828'; c.fillRect(x0 + ((x1 - x0) / 9) * i, y - bh, (x1 - x0) / 9, bh); } } }); }
  items.sort((a, b) => b.d - a.d).forEach((i) => i.draw());
  // speed streaks
  if (rush > 0.35) { c.strokeStyle = `rgba(255,255,255,${0.25 * rush})`; c.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = (i * 0.618) % 1, side = i % 2 ? 1 : -1, yy = hor + 30 + ((a * 300 + s.z * 9) % (h - hor - 40)), xx = w / 2 + side * (w * (0.18 + a * 0.5)); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + side * 22 * rush, yy + 40 * rush); c.stroke(); } }
  // the car, seen from behind
  const cx = w / 2 + (s.x - camX) * ppm, cy = base + 28, cw = 2 * ppm, ch = 0.95 * ppm;
  if (!(s.inv > 0 && Math.floor(now / 90) % 2)) {
    c.save(); c.translate(cx, cy); c.rotate(steer * 0.06);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, 4, cw * 0.62, ch * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = '#111'; c.fillRect(-cw * 0.52, -ch * 0.42, cw * 0.14, ch * 0.5); c.fillRect(cw * 0.38, -ch * 0.42, cw * 0.14, ch * 0.5);
    c.fillStyle = color; c.beginPath(); c.roundRect(-cw / 2, -ch * 0.78, cw, ch * 0.62, ch * 0.16); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-cw / 2 + 4, -ch * 0.76, cw - 8, 3);
    c.fillStyle = color; c.beginPath(); c.moveTo(-cw * 0.36, -ch * 0.78); c.lineTo(-cw * 0.26, -ch * 1.18); c.lineTo(cw * 0.26, -ch * 1.18); c.lineTo(cw * 0.36, -ch * 0.78); c.closePath(); c.fill();
    c.fillStyle = '#10181F'; c.beginPath(); c.moveTo(-cw * 0.3, -ch * 0.82); c.lineTo(-cw * 0.22, -ch * 1.12); c.lineTo(cw * 0.22, -ch * 1.12); c.lineTo(cw * 0.3, -ch * 0.82); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(-cw * 0.44, -ch * 0.92, cw * 0.88, ch * 0.09);
    const lamp = s.braking ? '#FF2A2A' : '#9B1C1C'; c.fillStyle = lamp; c.fillRect(-cw * 0.46, -ch * 0.62, cw * 0.26, ch * 0.16); c.fillRect(cw * 0.2, -ch * 0.62, cw * 0.26, ch * 0.16);
    if (s.braking) { c.fillStyle = 'rgba(255,40,40,0.35)'; c.beginPath(); c.arc(-cw * 0.33, -ch * 0.54, ch * 0.45, 0, 7); c.arc(cw * 0.33, -ch * 0.54, ch * 0.45, 0, 7); c.fill(); }
    c.fillStyle = '#0B0B0B'; c.fillRect(-cw * 0.5, -ch * 0.18, cw, ch * 0.06);
    c.restore();
  }
  c.restore();
}

function drawObstacle(c: CanvasRenderingContext2D, o: Obstacle, x: number, y: number, k: number) {
  const wpx = o.w * k;
  if (o.kind === 'pothole') { c.fillStyle = '#1F2125'; c.beginPath(); c.ellipse(x, y, wpx * 0.6, wpx * 0.16, 0, 0, 7); c.fill(); return; }
  if (o.kind === 'danfo') { const hh = wpx * 0.95; c.fillStyle = '#E5A400'; c.fillRect(x - wpx / 2, y - hh, wpx, hh); c.fillStyle = '#111'; c.fillRect(x - wpx / 2, y - hh * 0.5, wpx, hh * 0.1); c.fillStyle = '#1B2430'; c.fillRect(x - wpx * 0.44, y - hh * 0.88, wpx * 0.88, hh * 0.28); c.fillStyle = '#B91C1C'; c.fillRect(x - wpx * 0.42, y - hh * 0.2, wpx * 0.18, hh * 0.1); c.fillRect(x + wpx * 0.24, y - hh * 0.2, wpx * 0.18, hh * 0.1); return; }
  c.font = `${Math.max(8, wpx * 1.4)}px serif`; c.textAlign = 'center'; c.fillText(o.kind === 'goat' ? '🐐' : o.kind === 'drum' ? '🛢️' : '🚧', x, y);
}

export function TestDrive() {
  const id = useTestDriveStore((st) => st.vehicleId);
  return createPortal(<AnimatePresence>{id && <Run key={id} id={id} />}</AnimatePresence>, document.body);
}

function Run({ id }: { id: string }) {
  const v = getVehicle(id)!, spec = specFor(v), top = trackTop(spec);
  const [phase, setPhase] = useState<Phase>('intro'), [count, setCount] = useState(3), [result, setResult] = useState<DriveResult | null>(null), [round, setRound] = useState(1);
  const [hud, setHud] = useState({ kmh: 0, pct: 0, hits: 0, t: 0, brake: false });
  const canvas = useRef<HTMLCanvasElement>(null), box = useRef<HTMLDivElement>(null), phaseRef = useRef<Phase>('intro');
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
  // the loop
  useEffect(() => {
    const cv = canvas.current, bx = box.current; if (!cv || !bx) return;
    const ctx = cv.getContext('2d')!; let raf = 0, last = performance.now(), hudAt = 0, W = 0, H = 0, wasHits = 0;
    const size = () => { const r = bx.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(bx);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = st.current;
      if (phaseRef.current === 'drive') {
        const target = (inp.current.right ? 1 : 0) - (inp.current.left ? 1 : 0); steerSm.current += (target - steerSm.current) * Math.min(1, dt * 12);
        let left = dt; while (left > 0) { const h = Math.min(1 / 60, left); stepDrive(s, { steer: steerSm.current, gas: inp.current.gas ? 1 : 0, brake: inp.current.brake ? 1 : 0 }, h, spec, course.current); left -= h; }
        if (s.hits > wasHits) { wasHits = s.hits; sfx.error(); }
        if (s.phase === 'done') { const r = gradeDrive(s, spec); setResult(r); setPhase('result'); (r.grade === 'C' ? sfx.error : sfx.reward)(); }
      }
      draw(ctx, W, H, s, course.current, top, v.color, steerSm.current, now);
      if (now - hudAt > 100) { hudAt = now; setHud({ kmh: kmh(s.v, spec), pct: Math.min(1, s.z / TRACK.finish), hits: s.hits, t: Math.round(s.t * 10) / 10, brake: phaseRef.current === 'drive' && s.z > TRACK.finish - 140 && s.z < TRACK.length }); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const hold = (key: 'left' | 'right' | 'gas' | 'brake') => ({
    onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); inp.current[key] = true; },
    onPointerUp: () => { inp.current[key] = false; }, onPointerCancel: () => { inp.current[key] = false; }, onPointerLeave: () => { inp.current[key] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const btn = 'flex select-none items-center justify-center rounded-2xl border border-white/20 font-display font-extrabold text-white active:scale-95 touch-none';
  return (
    <motion.div className="fixed inset-0 z-[210] flex flex-col bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Test drive ${v.name}`}>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden"><canvas ref={canvas} className="absolute inset-0 h-full w-full" />
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
              <button onClick={start} className="mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-extrabold">Start engine</button>
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
