import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronsUp, Crosshair, LogOut, MapPin, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { WEAPONS } from '@/data/weapons';
import { interiorKindForLandmark } from '@/data/interiors';
import { getStreetEvent } from '@/data/streetEvents';
import { travelToVenue } from '@/game/interiors';
import { ignorePending, showEvent } from '@/game/streetEvents';
import { EventPrompt } from '@/features/game/EventPrompt';
import { useDailyStore } from '@/stores/dailyStore';
import { toast } from '@/stores/uiStore';
import { getLandmark } from '@/world/registry';
import { formatNaira } from '@/core/format';
import { arrestPlayer } from '@/game/crime';
import { useCharacterStore } from '@/stores/characterStore';
import { useWeaponStore } from '@/stores/weaponStore';
import { useFlowStore } from '@/stores/flowStore';
import { makeCombat } from './combat';
import { newClip, sentenceFor } from './shooting';
import { generateCity, nearestLandmark, spawnFor, EXTENT, type LandmarkSpot } from './worldGen';
import { useInteriorStore } from '@/stores/interiorStore';
import { WorldScene, type DriveState, type WorldInput, type WorldState } from './WorldScene';
import { getVehicle } from '@/data/vehicles';

/** Cities of the game. Only Lagos has a world today; the others are placeholders so the picker is ready for them. */
export const CITIES = [
  { id: 'lagos', name: 'Lagos', blurb: 'The city that never sleeps', ready: true },
  { id: 'abuja', name: 'Abuja', blurb: 'The capital. Wide roads, big offices', ready: false },
  { id: 'port-harcourt', name: 'Port Harcourt', blurb: 'The Garden City. Oil money and nightlife', ready: false },
  { id: 'benin', name: 'Benin City', blurb: 'Ancient walls, modern hustle', ready: false },
];

function Minimap({ city, state, input }: { city: ReturnType<typeof generateCity>; state: React.MutableRefObject<WorldState>; input: React.MutableRefObject<WorldInput> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, g = c.getContext('2d')!, S = c.width, k = S / (EXTENT * 2);
    const id = window.setInterval(() => {
      g.clearRect(0, 0, S, S); g.fillStyle = 'rgba(10,21,18,0.82)'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#5B6470'; for (const b of city.blockCentres) g.fillRect((b.x + EXTENT) * k - 16 * k, (b.z + EXTENT) * k - 16 * k, 32 * k, 32 * k);
      g.fillStyle = '#FFC21A'; for (const l of city.landmarks) { g.beginPath(); g.arc((l.x + EXTENT) * k, (l.z + EXTENT) * k, 2.4, 0, 7); g.fill(); }
      const p = state.current, px = (p.x + EXTENT) * k, pz = (p.z + EXTENT) * k;
      g.save(); g.translate(px, pz); g.rotate(-input.current.yaw); g.fillStyle = '#34D98A'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
    }, 120);
    return () => window.clearInterval(id);
  }, [city, state, input]);
  return <canvas ref={ref} width={112} height={112} className="rounded-2xl ring-2 ring-white/25" aria-label="Minimap" />;
}

/** The street view of a city: a third-person walk with a joystick (or WASD), drag to look, and pins for every landmark. */
export function OpenWorldScreen() {
  const go = useFlowStore((s) => s.go);
  const look = useCharacterStore((s) => s.appearance);
  const city = useMemo(() => generateCity(), []);
  // you come out where you were: the doorstep of the venue you were inside (Unilag, a mall...), otherwise the default spot
  const start = useMemo(() => spawnFor(city, useInteriorStore.getState().current?.landmarkId), [city]);
  const input = useRef<WorldInput>({ mx: 0, mz: 0, run: false, yaw: start.yaw, pitch: 0.28 });
  const state = useRef<WorldState>({ x: start.x, z: start.z, heading: start.heading });
  const combat = useRef(makeCombat());
  const drive = useRef<DriveState>({ carId: null, near: null, enterReq: false, exitReq: false, speed: 0, cars: {} });
  const [carUi, setCarUi] = useState({ near: null as string | null, driving: null as string | null, kmh: 0 });
  const weaponId = useWeaponStore((s) => s.equipped);
  const [hud, setHud] = useState({ drawn: false, loaded: 0, reserve: 0, stars: 0, msg: '', hit: false, reloading: false });
  const [near, setNear] = useState<LandmarkSpot | null>(null);
  const [atDoor, setAtDoor] = useState<string | null>(null);
  const pending = useDailyStore((s) => s.pending);
  const usedAt = useRef(new Map<string, number>());
  const [run, setRun] = useState(false);
  const [picker, setPicker] = useState(false);
  const [portrait, setPortrait] = useState(false), [dismissRotate, setDismissRotate] = useState(false);
  const stick = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const lookPtr = useRef<{ id: number; x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());

  // landscape is the intended view: ask for it (works in the installed app) and nudge in portrait
  useEffect(() => {
    try { void (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => undefined); } catch { /* not supported */ }
    const chk = () => setPortrait(window.innerHeight > window.innerWidth);
    chk(); window.addEventListener('resize', chk);
    return () => { window.removeEventListener('resize', chk); try { screen.orientation.unlock(); } catch { /* ignore */ } };
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => {
      const p = state.current, l = nearestLandmark(city, p.x, p.z); setNear((q) => (q?.id === l?.id ? q : l));
      const door = city.landmarks.find((x) => Math.hypot(x.doorX - p.x, x.doorZ - p.z) < 5.5); setAtDoor((q) => (q === (door?.id ?? null) ? q : door?.id ?? null));
      // street moments: walk up to someone and they stop you (each person once every two minutes; never while another card is open)
      const d = useDailyStore.getState(), now = Date.now();
      if (!d.pending) for (const m of city.moments) {
        if (Math.hypot(m.x - p.x, m.z - p.z) > 3.4 || now - (usedAt.current.get(m.id) ?? 0) < 120000) continue;
        const ev = getStreetEvent(m.eventId); if (!ev) continue; usedAt.current.set(m.id, now); showEvent(ev, now); break;
      }
      if (d.pending && now - d.pending.startedAt >= d.pending.seconds * 1000) ignorePending(now); // the world has no game loop to time a card out
    }, 250);
    return () => window.clearInterval(t);
  }, [city, state]);
  useEffect(() => { input.current.frozen = !!pending; if (pending) { input.current.mx = 0; input.current.mz = 0; } }, [pending]);
  const enter = (id: string) => { const r = travelToVenue(id); if (r.ok) { sfx.open(); go('game'); } else { sfx.error(); toast(r.reason, 'bad'); } };
  useEffect(() => { input.current.run = run; }, [run]);
  // the equipped weapon (set in the Brotherhood app / inventory) arrives with a full clip and two spares each time you step outside
  useEffect(() => { const c = combat.current; c.weapon = weaponId; c.drawn = false; c.clip = weaponId ? newClip(weaponId) : { loaded: 0, reserve: 0 }; }, [weaponId]);
  useEffect(() => {
    const t = window.setInterval(() => {
      const c = combat.current, now = performance.now();
      { const d = drive.current, kmh = Math.round(Math.abs(d.speed) * 3.6); setCarUi((p) => (p.near === d.near && p.driving === d.carId && p.kmh === kmh ? p : { near: d.near, driving: d.carId, kmh })); }
      setHud((p) => { const n = { drawn: c.drawn, loaded: c.clip.loaded, reserve: c.clip.reserve, stars: c.stars, msg: c.msg && now < c.msg.until ? c.msg.text : '', hit: now - c.hitMarkerAt < 180, reloading: now < c.reloadingUntil }; return JSON.stringify(n) === JSON.stringify(p) ? p : n; });
      if (c.arrested) { c.arrested = false; const mins = sentenceFor(c.sentence); c.drawn = false; arrestPlayer(mins, 'Shooting in public'); go('game'); }
    }, 100);
    return () => window.clearInterval(t);
  }, [go]);
  useEffect(() => { if (import.meta.env.DEV) { (window as unknown as { __naijaCombat?: unknown }).__naijaCombat = combat.current; (window as unknown as { __naijaWorld?: unknown }).__naijaWorld = { state: state.current, input: input.current, city }; } }, [city, state]); // dev only: lets browser tests reach the combat state
  const toggleDraw = () => { const c = combat.current; if (!c.weapon) return; c.drawn = !c.drawn; sfx.click(); };
  const reloadNow = () => { combat.current.reloadReq = true; };
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current.add(e.key.toLowerCase()); if (e.key === 'Shift') setRun(true); if (e.key === ' ') { combat.current.fireTap = true; combat.current.firing = true; e.preventDefault(); } if (e.key.toLowerCase() === 'r') combat.current.reloadReq = true; if (e.key.toLowerCase() === 'f') { const c = combat.current; if (c.weapon) c.drawn = !c.drawn; } };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.key.toLowerCase()); if (e.key === 'Shift') setRun(false); if (e.key === ' ') combat.current.firing = false; };
    const t = window.setInterval(() => {
      const k = keys.current; if (!k.size || stick.current) return;
      input.current.mz = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
      input.current.mx = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
      if (k.has('q') || k.has('arrowleft')) input.current.yaw += 0.04; if (k.has('e') || k.has('arrowright')) input.current.yaw -= 0.04;
    }, 16);
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.clearInterval(t); window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);
  useEffect(() => { const t = window.setInterval(() => { if (!keys.current.size && !stick.current) { input.current.mx = 0; input.current.mz = 0; } }, 50); return () => window.clearInterval(t); }, []);

  const R = 52;
  const stickMove = (e: React.PointerEvent) => {
    const s = stick.current; if (!s || s.id !== e.pointerId) return;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy); if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; }
    setKnob({ x: dx, y: dy }); input.current.mx = dx / R; input.current.mz = -dy / R;
  };

  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <WorldScene city={city} look={look} input={input} state={state} combat={combat} drive={drive} />

      {/* drag anywhere on the right to look around */}
      <div className="absolute inset-y-0 right-0 z-20 w-[62%] touch-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); lookPtr.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; }}
        onPointerMove={(e) => { const p = lookPtr.current; if (!p || p.id !== e.pointerId) return; input.current.yaw -= (e.clientX - p.x) * 0.0055; input.current.pitch = Math.max(0.05, Math.min(0.9, input.current.pitch + (e.clientY - p.y) * 0.004)); p.x = e.clientX; p.y = e.clientY; }}
        onPointerUp={() => { lookPtr.current = null; }} onPointerCancel={() => { lookPtr.current = null; }} />

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-safe">
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => { sfx.click(); go('game'); }} className="cta-ghost flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold"><ArrowLeft size={18} />Home</button>
          <button onClick={() => { sfx.click(); setPicker(true); }} className="cta-ghost flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold"><MapPin size={17} />Lagos</button>
        </div>
        <Minimap city={city} state={state} input={input} />
      </div>

      {/* wanted stars, ammo and messages */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex flex-col items-center gap-1.5 pt-safe">
        {hud.stars > 0 && <div className="flex gap-1 rounded-full bg-black/55 px-3 py-1 text-lg" aria-label={`Wanted level ${hud.stars}`}>{[1, 2, 3].map((n) => <span key={n} className={n <= hud.stars ? 'text-rose-400 drop-shadow' : 'text-white/25'}>★</span>)}<span className="ml-1 self-center text-[11px] font-bold uppercase tracking-wide text-rose-300">Wanted</span></div>}
        {hud.drawn && weaponId && !carUi.driving && <div className="rounded-full bg-black/55 px-3 py-1 text-[13px] font-bold">{WEAPONS[weaponId].glyph} {WEAPONS[weaponId].name} · <span className={hud.loaded === 0 ? 'text-rose-300' : ''}>{hud.loaded}</span><span className="text-white/60"> / {hud.reserve}</span>{hud.reloading && <span className="ml-1 text-danfo">reloading…</span>}</div>}
        {hud.msg && <div className="rounded-full bg-black/65 px-4 py-1.5 text-sm font-bold">{hud.msg}</div>}
      </div>
      {hud.drawn && <div className="pointer-events-none absolute left-1/2 top-[36%] z-30 -translate-x-1/2 -translate-y-1/2" aria-hidden><div className={`h-7 w-7 rounded-full border-2 ${hud.hit ? 'scale-125 border-rose-400' : 'border-white/80'} transition`} /><span className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${hud.hit ? 'bg-rose-400' : 'bg-white'}`} /></div>}

      {/* landmark card, with the door */}
      <AnimatePresence>
        {near && (
          <motion.div key={near.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
            <div className="glass-dark pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-2.5"><span className="text-3xl">{near.icon}</span>
              <span className="min-w-0"><span className="block font-display text-base font-extrabold">{near.name}</span><span className="block text-[13px] text-white/70">{atDoor === near.id ? (interiorKindForLandmark(near.id) ? (getLandmark(near.id)?.visit.cost ? `Entry ${formatNaira(getLandmark(near.id)!.visit.cost)}` : 'Open to everyone') : 'No inside yet') : near.tagline}</span></span>
              {atDoor === near.id && interiorKindForLandmark(near.id) && <button onClick={() => enter(near.id)} className="cta-naija ml-1 h-11 shrink-0 rounded-xl px-4 font-display text-sm font-extrabold">Enter</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {pending && <div className="absolute inset-x-0 bottom-0 z-40 max-h-[92%] overflow-y-auto"><EventPrompt placeLabel="📍 On the street" /></div>}

      {/* joystick */}
      <div className="absolute bottom-6 left-5 z-30 h-36 w-36 touch-none rounded-full bg-white/10 ring-2 ring-white/25 backdrop-blur-sm" aria-label="Move"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); stick.current = { id: e.pointerId, ox: r.left + r.width / 2, oy: r.top + r.height / 2 }; stickMove(e); }}
        onPointerMove={stickMove}
        onPointerUp={() => { stick.current = null; setKnob({ x: 0, y: 0 }); input.current.mx = 0; input.current.mz = 0; }} onPointerCancel={() => { stick.current = null; setKnob({ x: 0, y: 0 }); input.current.mx = 0; input.current.mz = 0; }}>
        <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 ring-2 ring-white/60" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      {weaponId && !carUi.driving && (<>
        {hud.drawn && <button aria-label="Fire" className="absolute bottom-[6.4rem] right-5 z-30 flex h-[4.5rem] w-[4.5rem] touch-none items-center justify-center rounded-full bg-rose-600 shadow-[0_8px_28px_rgba(225,29,72,0.55)] active:scale-95"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); combat.current.fireTap = true; combat.current.firing = true; }}
          onPointerUp={() => { combat.current.firing = false; }} onPointerCancel={() => { combat.current.firing = false; }}><Crosshair size={30} /></button>}
        <button aria-label={hud.drawn ? 'Put the weapon away' : 'Draw the weapon'} aria-pressed={hud.drawn} onClick={toggleDraw} className={`absolute bottom-8 right-[6.3rem] z-30 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${hud.drawn ? 'cta-naija' : 'cta-ghost'}`}>{WEAPONS[weaponId].glyph}</button>
        {hud.drawn && <button aria-label="Reload" onClick={reloadNow} className="cta-ghost absolute bottom-[6.2rem] right-[7.2rem] z-30 flex h-12 w-12 items-center justify-center rounded-full"><RotateCw size={20} /></button>}
      </>)}
      {carUi.near && !carUi.driving && (
        <button onClick={() => { drive.current.enterReq = true; }} className="cta-naija absolute bottom-6 left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-2 rounded-2xl px-5 font-display text-sm font-extrabold">🚗 Drive your {getVehicle(carUi.near)?.name ?? 'car'}</button>
      )}
      {carUi.driving && (
        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
          <div className="glass-dark rounded-2xl px-4 py-2 text-center"><span className="font-display text-2xl font-extrabold tabular-nums">{carUi.kmh}</span><span className="ml-1 text-xs font-bold opacity-70">km/h</span></div>
          <button onClick={() => { drive.current.exitReq = true; }} className="cta-ghost flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-bold"><LogOut size={18} />Get out</button>
        </div>
      )}
      <button onClick={() => { sfx.click(); setRun((v) => !v); }} aria-pressed={run} className={`absolute bottom-8 right-5 z-30 flex h-16 w-16 flex-col items-center justify-center rounded-full text-[11px] font-extrabold ${run ? 'cta-naija' : 'cta-ghost'}`}><ChevronsUp size={22} />Run</button>

      <AnimatePresence>
        {portrait && !dismissRotate && (
          <motion.div key="rotate" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-night/90 px-8 text-center backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Rotate your phone">
            <motion.div animate={{ rotate: [0, 0, -90, -90, 0] }} transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.15, 0.45, 0.8, 1], ease: 'easeInOut' }} className="flex h-24 w-14 items-center justify-center rounded-2xl border-4 border-white/90"><span className="h-1.5 w-6 rounded-full bg-white/70" /></motion.div>
            <div><h2 className="font-display text-2xl font-extrabold">Rotate your phone</h2><p className="mt-1 text-sm text-white/70">Turn it sideways to play. You get a much wider view of the street.</p></div>
            <button onClick={() => { sfx.click(); setDismissRotate(true); }} className="cta-ghost h-11 rounded-xl px-5 text-sm font-bold">Play anyway</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {picker && (
          <motion.div className="absolute inset-0 z-40 flex items-end justify-center bg-night/60 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPicker(false)}>
            <motion.div className="glass-dark w-full max-w-sm rounded-[1.75rem] p-4" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 font-display text-xl font-extrabold">Choose a city</h2>
              <div className="space-y-2">{CITIES.map((c) => (
                <button key={c.id} onClick={() => { if (c.ready) { sfx.click(); setPicker(false); } else sfx.error(); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${c.ready ? 'cta-naija' : 'bg-white/[0.07] text-white/60'}`}>
                  <span><span className="block font-display text-base font-extrabold">{c.name}</span><span className="block text-xs opacity-80">{c.blurb}</span></span>
                  <span className="text-xs font-bold">{c.ready ? 'You are here' : 'Coming soon'}</span>
                </button>))}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
