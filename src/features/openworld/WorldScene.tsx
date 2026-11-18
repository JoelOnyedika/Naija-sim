import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Color, DynamicDrawUsage, MeshStandardMaterial, Object3D, type Group, type InstancedMesh, type Mesh } from 'three';
import { ACCESSORIES, BOTTOM_STYLES, CLOTH_COLORS, HAIR_COLORS, HAIR_STYLES, SHOE_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import { sfx } from '@/audio/sfx';
import { WEAPONS } from '@/data/weapons';
import { addHeat } from '@/game/weapons';
import { useWeaponStore } from '@/stores/weaponStore';
import { getStreetEvent } from '@/data/streetEvents';
import { Avatar, type Motion } from '@/three/avatar/Avatar';
import type { Appearance } from '@/types/game';
import { say, type Combat } from './combat';
import { assistAim, canFire, officersFor, reload, shoot, spend, stars, type V3 } from './shooting';
import { BLOCK, EXTENT, GRID, PITCH, blockCentre, resolveMove, type City } from './worldGen';

export interface WorldInput { mx: number; mz: number; run: boolean; yaw: number; pitch: number; frozen?: boolean }
export interface WorldState { x: number; z: number; heading: number }

const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)];
const mulberry = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Everything that never changes is drawn with a handful of instanced meshes: one draw call per kind, not per building. */
function Buildings({ city }: { city: City }) {
  const body = useRef<InstancedMesh>(null), roofs = useRef<InstancedMesh>(null), bands = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null), crowns = useRef<InstancedMesh>(null);
  const bandCount = useMemo(() => city.buildings.reduce((n, b) => n + Math.max(0, Math.floor(b.h / 4) - 1), 0), [city]);
  useEffect(() => {
    const o = new Object3D(), c = new Color();
    city.buildings.forEach((b, i) => {
      o.position.set(b.x, 0.3 + b.h / 2, b.z); o.scale.set(b.w, b.h, b.d); o.rotation.set(0, 0, 0); o.updateMatrix(); body.current!.setMatrixAt(i, o.matrix); body.current!.setColorAt(i, c.set(b.color));
      o.position.set(b.x, 0.3 + b.h + 0.25, b.z); o.scale.set(b.w + 0.6, 0.5, b.d + 0.6); o.updateMatrix(); roofs.current!.setMatrixAt(i, o.matrix); roofs.current!.setColorAt(i, c.set(b.roof));
    });
    let n = 0;
    for (const b of city.buildings) for (let f = 1; f < Math.floor(b.h / 4); f++) { o.position.set(b.x, 0.3 + f * 4 + 0.2, b.z); o.scale.set(b.w + 0.08, 0.9, b.d + 0.08); o.updateMatrix(); bands.current!.setMatrixAt(n++, o.matrix); }
    city.trees.forEach((t, i) => {
      o.position.set(t.x, 0.3 + 1 * t.s, t.z); o.scale.set(0.35 * t.s, 2 * t.s, 0.35 * t.s); o.updateMatrix(); trunks.current!.setMatrixAt(i, o.matrix);
      o.position.set(t.x, 0.3 + 3.2 * t.s, t.z); o.scale.set(2.2 * t.s, 2.4 * t.s, 2.2 * t.s); o.updateMatrix(); crowns.current!.setMatrixAt(i, o.matrix);
    });
    for (const m of [body, roofs, bands, trunks, crowns]) { m.current!.instanceMatrix.needsUpdate = true; if (m.current!.instanceColor) m.current!.instanceColor.needsUpdate = true; }
  }, [city]);
  return (<>
    <instancedMesh ref={body} args={[undefined, undefined, city.buildings.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={0.95} flatShading /></instancedMesh>
    <instancedMesh ref={roofs} args={[undefined, undefined, city.buildings.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={1} /></instancedMesh>
    <instancedMesh ref={bands} args={[undefined, undefined, Math.max(1, bandCount)]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#27333D" roughness={0.35} metalness={0.2} /></instancedMesh>
    <instancedMesh ref={trunks} args={[undefined, undefined, city.trees.length]} frustumCulled={false}><cylinderGeometry args={[0.5, 0.6, 1, 5]} /><meshStandardMaterial color="#6B4128" roughness={1} /></instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, city.trees.length]} frustumCulled={false}><icosahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color="#3E9B5A" roughness={1} flatShading /></instancedMesh>
  </>);
}

function Ground() {
  const slabs = useRef<InstancedMesh>(null), dashes = useRef<InstancedMesh>(null);
  const dashN = (GRID + 1) * 2 * Math.floor((EXTENT * 2) / 8);
  useEffect(() => {
    const o = new Object3D();
    let i = 0;
    for (let a = 0; a < GRID; a++) for (let b = 0; b < GRID; b++) { o.position.set(blockCentre(a), 0.15, blockCentre(b)); o.scale.set(BLOCK, 0.3, BLOCK); o.rotation.set(0, 0, 0); o.updateMatrix(); slabs.current!.setMatrixAt(i++, o.matrix); }
    slabs.current!.instanceMatrix.needsUpdate = true;
    let n = 0; const steps = Math.floor((EXTENT * 2) / 8);
    for (let r = 0; r <= GRID; r++) { const line = (r - GRID / 2) * PITCH; for (let s = 0; s < steps; s++) { const t = -EXTENT + 4 + s * 8; o.position.set(t, 0.04, line); o.scale.set(3.4, 0.02, 0.35); o.updateMatrix(); dashes.current!.setMatrixAt(n++, o.matrix); o.position.set(line, 0.04, t); o.scale.set(0.35, 0.02, 3.4); o.updateMatrix(); dashes.current!.setMatrixAt(n++, o.matrix); } }
    dashes.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (<>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}><planeGeometry args={[EXTENT * 6, EXTENT * 6]} /><meshStandardMaterial color="#5E8F55" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[EXTENT * 2 + 12, EXTENT * 2 + 12]} /><meshStandardMaterial color="#3A3F46" roughness={0.95} /></mesh>
    <instancedMesh ref={slabs} args={[undefined, undefined, GRID * GRID]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#CFC8B8" roughness={1} /></instancedMesh>
    <instancedMesh ref={dashes} args={[undefined, undefined, dashN * 1]} frustumCulled={false} instanceMatrix-usage={DynamicDrawUsage}><boxGeometry /><meshBasicMaterial color="#F2E6A8" /></instancedMesh>
  </>);
}

function LandmarkPins({ city }: { city: City }) {
  return (<>{city.landmarks.map((l) => (
    <Html key={l.id} position={[l.x, 12 + (city.buildings.find((b) => b.landmark === l.id)?.h ?? 10), l.z]} center distanceFactor={70} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-night/85 text-[34px] ring-4 ring-danfo">{l.icon}</span><span className="mt-1 whitespace-nowrap rounded-full bg-night/80 px-3 py-1 text-[22px] font-bold text-white">{l.name}</span></div>
    </Html>))}</>);
}

const pathAt = (t: number, half: number, centre: [number, number]): [number, number] => {
  const u = ((t % 1) + 1) % 1 * 4, side = Math.floor(u) % 4, f = u - Math.floor(u), k = (f * 2 - 1) * half;
  const [lx, lz] = side === 0 ? [k, -half] : side === 1 ? [half, k] : side === 2 ? [-k, half] : [-half, -k];
  return [centre[0] + lx, centre[1] + lz];
};

/** A cheap stand-in for a person who is too far away to see detail: three boxes in the right colours. */
function Impostor({ look, motion }: { look: Appearance; motion: MutableRefObject<Motion> }) {
  const mats = useMemo(() => ({ top: new MeshStandardMaterial({ color: look.topColor, roughness: 0.9 }), bottom: new MeshStandardMaterial({ color: look.bottomColor, roughness: 0.9 }), skin: new MeshStandardMaterial({ color: look.skin, roughness: 0.9 }), hair: new MeshStandardMaterial({ color: look.hairColor, roughness: 1 }) }), [look]);
  const g = useRef<Group>(null);
  useFrame(({ clock }) => { const o = g.current; if (o) o.position.y = motion.current.moving ? Math.abs(Math.sin(clock.elapsedTime * 7 * ((motion.current.speed ?? 1.7) > 3 ? 1.5 : 1))) * 0.05 : 0; });
  return (
    <group ref={g}>
      <mesh position={[0, 0.45, 0]} material={mats.bottom}><boxGeometry args={[0.3, 0.9, 0.22]} /></mesh>
      <mesh position={[0, 1.18, 0]} material={mats.top}><boxGeometry args={[0.44, 0.6, 0.25]} /></mesh>
      <mesh position={[0, 1.62, 0]} material={mats.skin}><boxGeometry args={[0.2, 0.24, 0.22]} /></mesh>
      <mesh position={[0, 1.76, -0.01]} material={mats.hair}><boxGeometry args={[0.22, 0.08, 0.24]} /></mesh>
    </group>
  );
}

/** The door of every venue: a dark door on the building's south face and a gold ring on the doorstep. */
function Doors({ city }: { city: City }) {
  const doors = useRef<InstancedMesh>(null), rings = useRef<InstancedMesh>(null);
  useEffect(() => {
    const o = new Object3D();
    city.landmarks.forEach((l, i) => { const b = city.buildings.find((x) => x.landmark === l.id)!;
      o.rotation.set(0, 0, 0); o.position.set(l.x, 0.3 + 1.7, b.z + b.d / 2 + 0.12); o.scale.set(2.6, 3.4, 0.3); o.updateMatrix(); doors.current!.setMatrixAt(i, o.matrix);
      o.rotation.set(-Math.PI / 2, 0, 0); o.position.set(l.doorX, 0.36, l.doorZ); o.scale.set(1, 1, 1); o.updateMatrix(); rings.current!.setMatrixAt(i, o.matrix); });
    doors.current!.instanceMatrix.needsUpdate = true; rings.current!.instanceMatrix.needsUpdate = true;
  }, [city]);
  return (<>
    <instancedMesh ref={doors} args={[undefined, undefined, city.landmarks.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#3B2A20" roughness={0.7} /></instancedMesh>
    <instancedMesh ref={rings} args={[undefined, undefined, city.landmarks.length]} frustumCulled={false}><torusGeometry args={[2.1, 0.16, 6, 24]} /><meshBasicMaterial color="#FFC21A" /></instancedMesh>
  </>);
}

/** People on the pavement with something to say: a gold ring, a pin with their icon, and they stop you when you walk up. */
function Moments({ city, look }: { city: City; look: Appearance }) {
  const people = useMemo(() => { const r = mulberry(9); return city.moments.map((m) => ({ ...m, look: randomLook(r, look), icon: getStreetEvent(m.eventId)?.icon ?? '❗' })); }, [city, look]);
  const idle = useRef<Motion>({ moving: false, lying: false, sitting: false, speed: 1 });
  return (<>{people.map((p) => (
    <group key={p.id} position={[p.x, 0.3, p.z]} rotation={[0, p.rot, 0]}>
      <Impostor look={p.look} motion={idle} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><torusGeometry args={[1.6, 0.1, 6, 20]} /><meshBasicMaterial color="#FFC21A" /></mesh>
      <Html position={[0, 2.5, 0]} center distanceFactor={26} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><span className="flex h-14 w-14 items-center justify-center rounded-full bg-night/85 text-[30px] ring-4 ring-danfo">{p.icon}</span></Html>
    </group>))}</>);
}

/** A person strolling round the pavement of one block. Full detail only when close; shots scare them (they run the other way); a hit person falls and gets up later. Hidden far away. */
function Pedestrian({ id, look, centre, seed, player, combat }: { id: string; look: Appearance; centre: [number, number]; seed: number; player: MutableRefObject<WorldState>; combat: MutableRefObject<Combat> }) {
  const g = useRef<Group>(null), motion = useRef<Motion>({ moving: true, lying: false, sitting: false, speed: 1.5 });
  const st = useRef({ t: seed * 37 % 1, dir: seed % 2 ? 1 : -1, fleeUntil: 0, scaredSeen: 0, downAt: 0, pace: 1.2 + (seed % 5) * 0.25 });
  const [near, setNear] = useState(false), nearRef = useRef(false);
  const half = BLOCK / 2 + 3.2, per = half * 8;
  useFrame((_, dt) => {
    const o = g.current; if (!o) return; const c = combat.current, s = st.current, now = performance.now();
    let me = c.crowd.get(id); if (!me) { me = { id, x: centre[0], z: centre[1], hp: 40, downed: false, hitAt: 0, scaredAt: 0 }; c.crowd.set(id, me); }
    const dist = Math.hypot(me.x - player.current.x, me.z - player.current.z), wantNear = dist < (nearRef.current ? 34 : 26);
    if (wantNear !== nearRef.current) { nearRef.current = wantNear; setNear(wantNear); }
    o.visible = dist < 150;
    if (!o.visible) { s.t = (s.t + (s.dir * s.pace * Math.min(dt, 0.1)) / per + 1) % 1; const [ax, az] = pathAt(s.t, half, centre); me.x = ax; me.z = az; return; } // far away: keep walking, cheaply
    if (me.downed) {
      if (!s.downAt) s.downAt = now;
      motion.current.moving = false; o.rotation.x = -Math.PI / 2; o.position.y = 0.55;
      if (now - s.downAt > 14000) { me.downed = false; me.hp = 40; s.downAt = 0; o.rotation.x = 0; o.position.y = 0.3; }
      return;
    }
    if (me.scaredAt > s.scaredSeen) { // a shot nearby, or a hit: run away from the player along the pavement
      s.scaredSeen = me.scaredAt; s.fleeUntil = now + 7000;
      const pp = player.current, d1 = pathAt(s.t + 0.01, half, centre), d2 = pathAt(s.t - 0.01, half, centre);
      s.dir = Math.hypot(d1[0] - pp.x, d1[1] - pp.z) > Math.hypot(d2[0] - pp.x, d2[1] - pp.z) ? 1 : -1;
    }
    const fleeing = now < s.fleeUntil, speed = fleeing ? 4.8 : s.pace; motion.current.moving = true; motion.current.speed = speed;
    s.t = (s.t + (s.dir * speed * Math.min(dt, 0.1)) / per + 1) % 1;
    const [ax, az] = pathAt(s.t, half, centre), [bx, bz] = pathAt(s.t + s.dir * 0.002, half, centre);
    me.x = ax; me.z = az; o.position.set(ax, 0.3, az); o.rotation.x = 0; o.rotation.y = Math.atan2(bx - ax, bz - az);
  });
  return <group ref={g}>{near ? <Avatar appearance={look} motion={motion} /> : <Impostor look={look} motion={motion} />}</group>;
}

const POLICE_LOOK = (base: Appearance): Appearance => ({ ...base, body: 'masc', beard: 'none', skin: '#7A4E32', hairStyle: 'lowcut', top: 'tee', topColor: '#1B2A4A', bottom: 'trousers', bottomColor: '#1B2A4A', shoes: 'boots', shoeColor: '#111111', accessory: 'cap', bag: 'none', gun: true, bro: undefined, mask: false, blind: false });
/** A police officer: appears at a distance when you are wanted, runs at you, and arrests you on contact. Loses you if you get far enough away. */
function Officer({ idx, look, combat, player, city }: { idx: number; look: Appearance; combat: MutableRefObject<Combat>; player: MutableRefObject<WorldState>; city: City }) {
  const g = useRef<Group>(null), motion = useRef<Motion>({ moving: true, lying: false, sitting: false, speed: 5.4 });
  const st = useRef({ active: false, x: 0, z: 0, far: 0 });
  useFrame((_, dtRaw) => {
    const o = g.current; if (!o) return; const c = combat.current, s = st.current, p = player.current, dt = Math.min(dtRaw, 0.1), now = performance.now();
    const want = officersFor(c.stars);
    if (idx >= want || c.arrested) { s.active = false; o.visible = false; return; }
    if (!s.active) { const a = Math.random() * Math.PI * 2, r = 45 + Math.random() * 20; [s.x, s.z] = resolveMove(city, p.x + Math.cos(a) * r, p.z + Math.sin(a) * r); s.active = true; s.far = 0; if (idx === 0) { sfx.siren(); say(c, 'Police are coming. Run!'); } }
    const dx = p.x - s.x, dz = p.z - s.z, dist = Math.hypot(dx, dz) || 1;
    const sp = 5.4 + idx * 0.2; [s.x, s.z] = resolveMove(city, s.x + (dx / dist) * sp * dt, s.z + (dz / dist) * sp * dt);
    o.visible = true; o.position.set(s.x, 0.3, s.z); o.rotation.y = Math.atan2(dx, dz); motion.current.moving = dist > 1.4;
    if (dist < 1.8) { c.arrested = true; c.sentence = c.stars; return; }
    s.far = dist > 110 ? s.far + dt : 0; // lost them
    if (s.far > 6 && idx === 0) { c.harmedUntil = Math.min(c.harmedUntil, now); useWeaponStore.getState().set({ heat: Math.min(useWeaponStore.getState().heat, 10) }); say(c, 'You lost the police.'); }
  });
  return <group ref={g} visible={false}><Avatar appearance={look} motion={motion} /></group>;
}

/** Heat cools down when you stop shooting; the star level follows heat and whether a civilian was hurt. */
function Law({ combat }: { combat: MutableRefObject<Combat> }) {
  useFrame((_, dt) => {
    const c = combat.current, now = performance.now(), ws = useWeaponStore.getState();
    if (now - c.lastCrime > 6000 && ws.heat > 0) ws.set({ heat: Math.max(0, ws.heat - 2.5 * Math.min(dt, 0.1)) });
    c.stars = stars(useWeaponStore.getState().heat, now < c.harmedUntil);
  });
  return null;
}

/** Bullet tracers, muzzle flash and impact puffs, from small pools of meshes. */
function Effects({ combat }: { combat: MutableRefObject<Combat> }) {
  const lines = useRef<(Object3D | null)[]>([]), puffs = useRef<(Object3D | null)[]>([]), flash = useRef<Mesh>(null);
  useFrame(() => {
    const c = combat.current, now = performance.now();
    c.tracers = c.tracers.filter((t) => now - t.born < 110).slice(-8); c.puffs = c.puffs.filter((t) => now - t.born < 320).slice(-6);
    for (let i = 0; i < 8; i++) { const m = lines.current[i]; if (!m) continue; const t = c.tracers[i]; if (!t) { m.visible = false; continue; }
      const len = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2]); m.visible = true; m.position.set((t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2, (t.a[2] + t.b[2]) / 2); m.lookAt(t.b[0], t.b[1], t.b[2]); m.scale.set(0.05, 0.05, len); }
    for (let i = 0; i < 6; i++) { const m = puffs.current[i]; if (!m) continue; const p = c.puffs[i]; if (!p) { m.visible = false; continue; } const k = (now - p.born) / 320; m.visible = true; m.position.set(...p.p); m.scale.setScalar(0.15 + k * (p.hit ? 0.9 : 0.6)); }
    const f = flash.current; if (f) { const on = now - c.muzzleAt < 70; f.visible = on; f.position.set(...c.muzzle); }
  });
  return (<>
    {Array.from({ length: 8 }, (_, i) => <mesh key={`l${i}`} ref={(m) => { lines.current[i] = m; }} visible={false}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#FFE9A8" /></mesh>)}
    {Array.from({ length: 6 }, (_, i) => <mesh key={`p${i}`} ref={(m) => { puffs.current[i] = m; }} visible={false}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#D8CFC0" transparent opacity={0.6} /></mesh>)}
    <mesh ref={flash} visible={false}><icosahedronGeometry args={[0.28, 0]} /><meshBasicMaterial color="#FFD27A" /></mesh>
  </>);
}

const CAR_COLOURS = ['#C23B3B', '#F4F1EA', '#2B4C7E', '#1B1F24', '#0B8F4D', '#E4572E', '#9DB8C7', '#6B4128'];
interface CarDef { axis: 'x' | 'z'; lane: number; dir: 1 | -1; t: number; speed: number; kind: 'car' | 'danfo' | 'bus'; colour: string }
/** All the moving traffic in four instanced meshes (bodies, cabins, wheels, stripes): hundreds of cars for a handful of draw calls. Cars keep to their own lane and direction, spaced out so the roads look busy but never pile up. */
function Traffic({ cars }: { cars: CarDef[] }) {
  const body = useRef<InstancedMesh>(null), cabin = useRef<InstancedMesh>(null), wheels = useRef<InstancedMesh>(null);
  const o = useMemo(() => new Object3D(), []), tmp = useMemo(() => new Color(), []);
  useEffect(() => { cars.forEach((c, i) => { body.current!.setColorAt(i, tmp.set(c.colour)); cabin.current!.setColorAt(i, tmp.set(c.kind === 'danfo' ? c.colour : '#8FA9B8')); }); body.current!.instanceColor!.needsUpdate = true; cabin.current!.instanceColor!.needsUpdate = true; }, [cars, tmp]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), span = EXTENT * 2 + 24; let w = 0;
    cars.forEach((c, i) => {
      c.t += c.speed * c.dir * dt; const p = ((c.t + EXTENT + 12) % span + span) % span - EXTENT - 12, side = c.dir * 2.7;
      const L = c.kind === 'bus' ? 7.2 : c.kind === 'danfo' ? 4.7 : 4.2, rotY = c.axis === 'x' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : c.dir > 0 ? 0 : Math.PI;
      const x = c.axis === 'x' ? p : c.lane - side, z = c.axis === 'x' ? c.lane + side : p;
      o.rotation.set(0, rotY, 0); o.position.set(x, 0.3 + 0.65, z); o.scale.set(1.9, 0.9, L); o.updateMatrix(); body.current!.setMatrixAt(i, o.matrix);
      const cl = c.kind === 'bus' ? L * 0.92 : c.kind === 'danfo' ? 3.4 : 2.2, ch = c.kind === 'bus' ? 1.1 : 0.7;
      o.position.set(x, 0.3 + 1.1 + ch / 2, z); o.scale.set(1.7, ch, cl); o.position.x += Math.sin(rotY) * (c.kind === 'car' ? -0.2 : 0.2) * 0; o.updateMatrix(); cabin.current!.setMatrixAt(i, o.matrix);
      const s = Math.sin(rotY), cs = Math.cos(rotY), wz = L * 0.31;
      for (const [lx, lz] of [[-0.95, wz], [0.95, wz], [-0.95, -wz], [0.95, -wz]]) { o.rotation.set(0, rotY, Math.PI / 2); o.position.set(x + lx * cs + lz * s, 0.62, z - lx * s + lz * cs); o.scale.set(0.68, 0.26, 0.68); o.updateMatrix(); wheels.current!.setMatrixAt(w++, o.matrix); }
    });
    for (const m of [body, cabin, wheels]) m.current!.instanceMatrix.needsUpdate = true;
  });
  return (<>
    <instancedMesh ref={body} args={[undefined, undefined, cars.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={0.5} flatShading /></instancedMesh>
    <instancedMesh ref={cabin} args={[undefined, undefined, cars.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={0.3} flatShading /></instancedMesh>
    <instancedMesh ref={wheels} args={[undefined, undefined, cars.length * 4]} frustumCulled={false}><cylinderGeometry args={[0.5, 0.5, 1, 8]} /><meshStandardMaterial color="#15171A" roughness={0.8} /></instancedMesh>
  </>);
}

/** Cars parked along the kerbs: placed once, never updated. */
function ParkedCars({ city }: { city: City }) {
  const body = useRef<InstancedMesh>(null), cabin = useRef<InstancedMesh>(null);
  const spots = useMemo(() => { const r = mulberry(31), out: { x: number; z: number; rot: number; c: string }[] = []; for (const b of city.blockCentres) { if (r() < 0.45) continue; const side = r() < 0.5 ? -1 : 1, along = (r() - 0.5) * 24; out.push(r() < 0.5 ? { x: b.x + along, z: b.z + side * (BLOCK / 2 + 2.1), rot: Math.PI / 2, c: pick(CAR_COLOURS, r) } : { x: b.x + side * (BLOCK / 2 + 2.1), z: b.z + along, rot: 0, c: pick(CAR_COLOURS, r) }); } return out; }, [city]);
  useEffect(() => { const o = new Object3D(), c = new Color(); spots.forEach((p, i) => { o.rotation.set(0, p.rot, 0); o.position.set(p.x, 0.95, p.z); o.scale.set(1.8, 0.9, 4.0); o.updateMatrix(); body.current!.setMatrixAt(i, o.matrix); body.current!.setColorAt(i, c.set(p.c)); o.position.set(p.x, 1.75, p.z); o.scale.set(1.6, 0.7, 2.1); o.updateMatrix(); cabin.current!.setMatrixAt(i, o.matrix); }); body.current!.instanceMatrix.needsUpdate = true; cabin.current!.instanceMatrix.needsUpdate = true; body.current!.instanceColor!.needsUpdate = true; }, [spots]);
  return (<>
    <instancedMesh ref={body} args={[undefined, undefined, spots.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={0.5} flatShading /></instancedMesh>
    <instancedMesh ref={cabin} args={[undefined, undefined, spots.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#8FA9B8" roughness={0.3} flatShading /></instancedMesh>
  </>);
}

function Player({ look, input, city, state, combat }: { look: Appearance; input: MutableRefObject<WorldInput>; city: City; state: MutableRefObject<WorldState>; combat: MutableRefObject<Combat> }) {
  const g = useRef<Group>(null), gun = useRef<Group>(null), motion = useRef<Motion>({ moving: false, lying: false, sitting: false, speed: 2.4 });
  const { camera } = useThree();
  const vel = useRef(0);
  useFrame((_, dtRaw) => {
    const o = g.current; if (!o) return; const dt = Math.min(dtRaw, 0.1), i = input.current, s = state.current, c = combat.current, now = performance.now();
    // ---- shooting: reload first, then the trigger
    if (c.reloadingUntil && now >= c.reloadingUntil && c.weapon) { c.clip = reload(c.weapon, c.clip); c.reloadingUntil = 0; say(c, 'Reloaded', 900); }
    if (c.reloadReq) { c.reloadReq = false; if (c.weapon && c.drawn && !c.reloadingUntil && c.clip.loaded < WEAPONS[c.weapon].ammoPerClip) { if (c.clip.reserve > 0) { c.reloadingUntil = now + 1300; sfx.reload(); } else say(c, 'No spare ammo'); } }
    if ((c.fireTap || c.firing) && c.drawn && c.weapon && !c.arrested && !c.reloadingUntil && now >= c.nextShot) {
      c.fireTap = false;
      if (!canFire(c.clip)) { sfx.dryFire(); c.nextShot = now + 350; say(c, c.clip.reserve > 0 ? 'Empty. Reload.' : 'Out of ammo', 1200); }
      else {
        const w = WEAPONS[c.weapon], dir: V3 = [-Math.sin(i.yaw), 0, -Math.cos(i.yaw)], origin: V3 = [s.x, 1.65, s.z], targets = [...c.crowd.values()];
        const aimed = assistAim(origin, dir, targets, w.range), out = shoot(c.weapon, origin, aimed, targets, city.buildings);
        const muzzle: V3 = [s.x + aimed[0] * 0.7, 1.55, s.z + aimed[2] * 0.7];
        c.clip = spend(c.clip); c.nextShot = now + w.cooldownMs; c.aimUntil = now + 700; c.shots++; c.muzzle = muzzle; c.muzzleAt = now;
        s.heading = Math.atan2(aimed[0], aimed[2]);
        c.tracers.push({ a: muzzle, b: out.ray.point, born: now }); if (out.ray.kind !== 'none') c.puffs.push({ p: out.ray.point, born: now, hit: out.hit });
        sfx.gunshot(); addHeat(w.heatPerUse); c.lastCrime = now;
        for (const p of targets) if (Math.hypot(p.x - s.x, p.z - s.z) < 32) p.scaredAt = now; // everyone nearby runs
        if (out.hit && out.ray.id) {
          const t = c.crowd.get(out.ray.id); c.hits++;
          if (t) { t.hp -= out.damage; t.hitAt = now; t.scaredAt = now; if (t.hp <= 0 && !t.downed) { t.downed = true; c.downs++; } }
          c.harmedUntil = now + 60000; c.hitMarkerAt = now; sfx.hitMarker(); if (out.ray.head) say(c, 'Headshot', 900);
        }
      }
    }
    c.fireTap = false;
    const aiming = now < c.aimUntil || (c.drawn && c.firing); motion.current.action = aiming ? 'point' : undefined;
    if (gun.current) gun.current.visible = c.drawn && !!c.weapon;
    // ---- walking
    const mag = Math.min(1, Math.hypot(i.mx, i.mz)), locked = now < c.aimUntil || c.arrested || !!i.frozen;
    const fx = -Math.sin(i.yaw), fz = -Math.cos(i.yaw), rx = Math.cos(i.yaw), rz = -Math.sin(i.yaw);
    const dx = fx * i.mz + rx * i.mx, dz = fz * i.mz + rz * i.mx;
    const top = i.run ? 11.5 : mag > 0.6 ? 7.6 : 3.3, want = mag > 0.08 && !locked ? top : 0; // push the stick part way to walk, all the way to run, press Run to sprint
    vel.current += (want - vel.current) * (1 - Math.exp(-dt * 10));
    if (want > 0) { const len = Math.hypot(dx, dz) || 1; const [nx, nz] = resolveMove(city, s.x + (dx / len) * vel.current * dt, s.z + (dz / len) * vel.current * dt); s.x = nx; s.z = nz; const target = Math.atan2(dx, dz); let d = target - s.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); s.heading += d * (1 - Math.exp(-dt * 12)); }
    motion.current.moving = vel.current > 0.3; motion.current.speed = Math.max(1.2, vel.current);
    o.position.set(s.x, 0.3, s.z); o.rotation.y = s.heading;
    // third-person camera: behind the player, orbiting with yaw and pitch, smoothed
    const dist = 6.2 + Math.min(2.2, vel.current * 0.2), cy = 1.5, ph = i.pitch;
    const tx = s.x + Math.sin(i.yaw) * Math.cos(ph) * dist, tz = s.z + Math.cos(i.yaw) * Math.cos(ph) * dist, ty = cy + 0.3 + Math.sin(ph) * dist;
    const k = 1 - Math.exp(-dt * 8);
    camera.position.x += (tx - camera.position.x) * k; camera.position.y += (ty - camera.position.y) * k; camera.position.z += (tz - camera.position.z) * k;
    camera.lookAt(s.x, cy + 0.2, s.z);
  });
  return (
    <group ref={g}>
      <Avatar appearance={look} motion={motion} />
      <group ref={gun} visible={false} position={[0.22, 1.22, 0.42]}>
        <mesh><boxGeometry args={[0.07, 0.15, 0.1]} /><meshStandardMaterial color="#1A1C20" roughness={0.5} metalness={0.5} /></mesh>
        <mesh position={[0, 0.07, 0.15]}><boxGeometry args={[0.065, 0.075, 0.34]} /><meshStandardMaterial color="#2B2E34" roughness={0.4} metalness={0.6} /></mesh>
      </group>
    </group>
  );
}

export function randomLook(r: () => number, base: Appearance): Appearance {
  const femme = r() < 0.45;
  return { ...base, body: femme ? 'femme' : 'masc', beard: !femme && r() < 0.2 ? 'stubble' : 'none', skin: pick(SKIN_TONES, r), hairStyle: pick(HAIR_STYLES, r).id, hairColor: pick(HAIR_COLORS.slice(0, 3), r),
    top: pick(TOP_STYLES.filter((t) => t.id !== 'vest'), r).id, topColor: pick(CLOTH_COLORS, r), bottom: pick(BOTTOM_STYLES.filter((b) => b.id !== 'dress' && (!femme ? b.id !== 'skirt' : true)), r).id, bottomColor: pick(['#1B1F24', '#2B4C7E', '#6B4128', '#FFFFFF'], r),
    shoes: pick(SHOE_STYLES, r).id, shoeColor: pick(['#FFFFFF', '#1B1F24', '#6B4128'], r), accessory: r() < 0.7 ? ACCESSORIES[0].id : pick(ACCESSORIES, r).id, bag: 'none', gun: false, bro: undefined };
}

export function WorldScene({ city, look, input, state, combat, npcCount = 150 }: { city: City; look: Appearance; input: MutableRefObject<WorldInput>; state: MutableRefObject<WorldState>; combat: MutableRefObject<Combat>; npcCount?: number }) {
  const cops = useMemo(() => POLICE_LOOK(look), [look]);
  // a crowd spread over every block, each person on a loop of their own pavement
  const npcs = useMemo(() => { const r = mulberry(77), free = city.blockCentres; return Array.from({ length: npcCount }, (_, i) => { const b = free[Math.floor(r() * free.length)]; return { id: i, look: randomLook(r, look), centre: [b.x, b.z] as [number, number] }; }); }, [city, look, npcCount]);
  // traffic: every road has a lane each way, with a few cars per lane spaced well apart; some danfos and buses
  const cars = useMemo(() => { const r = mulberry(5), out: CarDef[] = []; const span = EXTENT * 2 + 24;
    for (let road = 0; road <= GRID; road++) for (const axis of ['x', 'z'] as const) for (const dir of [1, -1] as const) {
      if (r() < 0.12) continue; const n = 2 + (r() < 0.5 ? 1 : 0), gap = span / n, base = r() * span;
      for (let k = 0; k < n; k++) { const q = r(); out.push({ axis, lane: (road - GRID / 2) * PITCH, dir, t: base + k * gap + (r() - 0.5) * gap * 0.4 - EXTENT, speed: 6 + r() * 6, kind: q < 0.28 ? 'danfo' : q < 0.36 ? 'bus' : 'car', colour: q < 0.28 ? '#FFC21A' : q < 0.36 ? '#F4F1EA' : pick(CAR_COLOURS, r) }); }
    } return out; }, []);
  return (
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ fov: 55, near: 0.5, far: 900, position: [city.spawn.x, 4, city.spawn.z + 7] }} style={{ touchAction: 'none' }}>
      <color attach="background" args={['#9CC9F0']} /><fog attach="fog" args={['#BFD9EE', 160, 520]} />
      <hemisphereLight args={['#FFFFFF', '#7E8C72', 1.15]} /><directionalLight position={[80, 120, 40]} intensity={1.9} color="#FFF1D6" />
      <Ground /><Buildings city={city} /><LandmarkPins city={city} />
      <Traffic cars={cars} /><ParkedCars city={city} /><Doors city={city} /><Moments city={city} look={look} />
      {npcs.map((n) => <Pedestrian key={n.id} id={`p${n.id}`} look={n.look} centre={n.centre} seed={n.id + 3} player={state} combat={combat} />)}
      {[0, 1, 2, 3].map((n) => <Officer key={n} idx={n} look={cops} combat={combat} player={state} city={city} />)}
      <Player look={look} input={input} city={city} state={state} combat={combat} /><Law combat={combat} /><Effects combat={combat} />
    </Canvas>
  );
}
