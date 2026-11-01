import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, CanvasTexture, Color, MathUtils, Object3D, RepeatWrapping, SRGBColorSpace, Vector3, type BufferGeometry, type Group, type InstancedMesh, type PerspectiveCamera, type Texture } from 'three';
import { Avatar, type Motion } from '@/three/avatar/Avatar';
import { Vehicle } from '@/three/models/vehicles';
import { PlayerCar } from '@/three/models/CarModel';
import type { VehicleBody } from '@/data/vehicles';
import type { Building, TripPlan } from './plan';

/**
 * A trip as a short film: a few quick cuts between different cameras (third-person chase, a dolly along the pavement, a low hero shot
 * of you coming at the camera, a high three-quarter view, and a point-of-view from inside a keke, a danfo or your own car's bonnet),
 * then an arrival shot that follows the passenger to the door. The camera set is picked per trip, so no two trips cut the same way.
 * The street is dense: four lanes of traffic (two going your way, two oncoming), crowds on the pavements, umbrellas in rain, brake
 * lights in a go-slow. The destination is part of the street from the start (it comes up the road toward you as the ride slows to
 * a stop beside it); nothing grows out of the ground.
 * Deliberately cheap: no real shadows (blob shadows), instanced people, a few dozen procedural cars, a 3 to 5 second life.
 *
 * Axes: the ride faces -z (up the screen). +x is the right-hand pavement where the destination appears. Our lanes are at
 * x = 1.1 and 3.3 (the ride sits in the kerb lane, 3.3); oncoming lanes are at x = -1.1 and -3.3.
 */
const LOOP = 60; // length of one street strip along z; two copies leapfrog so the street never ends
const RANGE = [-26, 24] as const; // traffic and people wrap inside this z range (a little beyond what the camera sees)
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const SKY = { clear: { bg: '#9CCBEF', fog: '#D6E6F2', sun: '#FFF1D6', amb: 0.95 }, rain: { bg: '#58636E', fog: '#7C8893', sun: '#B8C4CF', amb: 0.75 }, dusk: { bg: '#E58A5C', fog: '#F0B085', sun: '#FFB070', amb: 0.8 } } as const;
const SKINS = ['#F1C9A5', '#B77B4E', '#8A5A3C', '#6B4128', '#4A2C1B'], TOPS = ['#E4572E', '#2B8C5B', '#8A63D2', '#FFC21A', '#2B4C7E', '#F4F1EA', '#C23B3B', '#19C3A6'];
const BRELLA = ['#E4572E', '#FFC21A', '#2B8C5B', '#8A63D2', '#2B4C7E', '#C23B3B', '#19C3A6'];
/** Distance from a building's middle to its door-side face, so the passenger stops at the door and the building sits just off the kerb. */
const FRONT: Record<Building, number> = { tower: 2.1, bank: 2.1, market: 1.7, church: 2, mosque: 2, stadium: 4.6, club: 1.7, gate: 0.6, shop: 1.6 };
const DOOR_X = 9.3, DEST_Z = -1;

type V3 = [number, number, number];
function Box({ size, pos, color, rot, emissive, rough = 0.85 }: { size: V3; pos: V3; color: string; rot?: V3; emissive?: string; rough?: number }) {
  return <mesh position={pos} rotation={rot}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 1.2 : 0} /></mesh>;
}
function Cyl({ r, h, pos, color, rot, seg = 12 }: { r: number; h: number; pos: V3; color: string; rot?: V3; seg?: number }) {
  return <mesh position={pos} rotation={rot}><cylinderGeometry args={[r, r, h, seg]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}

// ------------------------------------------------------------------ shared canvas textures
let windows: Texture | null = null;
/** One small canvas of windows, shared by every building so the sides do not look like blank cardboard. */
function windowTexture(): Texture {
  if (windows) return windows;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  g.fillStyle = '#F2EEE6'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = '#5B7894'; g.fillRect(8 + x * 32, 8 + y * 32, 16, 20); g.fillStyle = '#B9D3E6'; g.fillRect(8 + x * 32, 8 + y * 32, 16, 7); }
  windows = new CanvasTexture(c); windows.wrapS = windows.wrapT = RepeatWrapping; windows.colorSpace = SRGBColorSpace; return windows;
}
let paving: Texture | null = null;
/** Paving slabs for the pavements: faint tile lines and speckles. */
function pavingTexture(): Texture {
  if (paving) return paving;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#BDB7AC'; g.fillRect(0, 0, 128, 128);
  const r = rng(9); for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#00000012' : '#FFFFFF14'; g.fillRect(r() * 128, r() * 128, 6 + r() * 14, 4 + r() * 10); }
  g.fillStyle = '#8A847A'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128); g.fillRect(0, 62, 128, 2); g.fillRect(62, 0, 2, 128);
  paving = new CanvasTexture(c); paving.wrapS = paving.wrapT = RepeatWrapping; paving.colorSpace = SRGBColorSpace; paving.anisotropy = 4; return paving;
}

// ------------------------------------------------------------------ the street (one strip along z, drawn twice)
/** A building seen from above: windowed walls, a plain roof on top, and a few roof extras (tank, AC box). */
function Block({ w, h, d, color, roof, seed }: { w: number; h: number; d: number; color: string; roof: string; seed: number }) {
  const map = useMemo(() => { const t = windowTexture().clone(); t.repeat.set(Math.max(1, Math.round(d / 2)), Math.max(1, Math.round(h / 2))); t.needsUpdate = true; return t; }, [d, h]);
  const extras = useMemo(() => { const r = rng(seed); return [r(), r(), r()]; }, [seed]);
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        {[0, 1, 2, 3, 4, 5].map((i) => <meshStandardMaterial key={i} attach={`material-${i}`} color={i === 2 ? roof : color} map={i === 2 || i === 3 ? null : map} roughness={0.9} />)}
      </mesh>
      {extras[0] > 0.4 && <Cyl r={0.5} h={0.9} pos={[w * (extras[1] - 0.5) * 0.5, h + 0.45, d * (extras[2] - 0.5) * 0.5]} color="#6E7F8C" seg={10} />}
      {extras[1] > 0.5 && <Box size={[0.9, 0.5, 0.7]} pos={[-w * 0.25, h + 0.25, d * 0.2]} color="#C9CED1" />}
    </group>
  );
}
function Strip({ weather, rowRefs }: { weather: TripPlan['weather']; rowRefs: { current: Group[] } }) {
  const items = useMemo(() => {
    const r = rng(21), out: { x: number; z: number; w: number; d: number; h: number; c: string; roof: string; row1: boolean }[] = [];
    const walls = ['#E9DCC2', '#D6C7A3', '#CFD8DC', '#F1E4C8', '#C9B896', '#B9C7D6'], roofs = ['#8E5B4A', '#6F7B86', '#A67C52', '#5E6F8A', '#7D8A6E', '#9A9084'];
    for (const side of [1, -1]) for (const row of [0, 1]) {
      let z = r() * 3; const edge = 8.2 + row * 6.4;
      while (z < LOOP) { const l = 3.6 + r() * 2.6, d = 4 + r() * 1.6, h = row ? 5 + r() * 12 : 3 + r() * 5; out.push({ x: side * (edge + d / 2), z: z + l / 2, w: l, d, h, c: walls[Math.floor(r() * walls.length)], roof: roofs[Math.floor(r() * roofs.length)], row1: side === 1 && row === 0 }); z += l + 0.5 + r() * 0.8; }
    }
    return out;
  }, []);
  const bits = useMemo(() => {
    const r = rng(77);
    return {
      poles: Array.from({ length: 5 }, (_, i) => i * 12 + 4), trees: Array.from({ length: 6 }, (_, i) => ({ z: i * 10 + 2 + r() * 3, s: 0.9 + r() * 0.5, side: i % 2 ? 1 : -1 })),
      stalls: Array.from({ length: 5 }, (_, i) => ({ z: i * 12 + 9 + r() * 2, c: BRELLA[Math.floor(r() * BRELLA.length)] })),
    };
  }, []);
  return (
    <group>
      {items.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} ref={b.row1 ? (n) => { if (n && !rowRefs.current.includes(n)) rowRefs.current.push(n); } : undefined}>
          {/* the building's own shape is w (along z) by d (along x): swap so the long side faces the road */}
          <Block w={b.d} h={b.h} d={b.w} color={b.c} roof={b.roof} seed={i * 13 + 5} />
        </group>
      ))}
      {bits.poles.map((z) => [4.9, -4.9].map((x) => <group key={`${x}${z}`} position={[x, 0, z]}><Cyl r={0.08} h={5.2} pos={[0, 2.6, 0]} color="#4B4540" /><Box size={[0.9, 0.1, 0.12]} pos={[x > 0 ? -0.4 : 0.4, 5.2, 0]} color="#4B4540" /><Box size={[0.3, 0.08, 0.2]} pos={[x > 0 ? -0.85 : 0.85, 5.15, 0]} color="#FFF3B0" emissive={weather === 'dusk' ? '#FFD98A' : undefined} /></group>))}
      {bits.trees.map((t, i) => <group key={i} position={[t.side * 6.1, 0, t.z]} scale={t.s}><Cyl r={0.18} h={1.8} pos={[0, 0.9, 0]} color="#6B4A2B" /><mesh position={[0, 2.5, 0]}><sphereGeometry args={[1.25, 9, 7]} /><meshStandardMaterial color={i % 2 ? '#3FA66B' : '#2F8A55'} roughness={0.9} /></mesh></group>)}
      {bits.stalls.map((s, i) => <group key={i} position={[-6.1, 0, s.z]}><Cyl r={0.05} h={2} pos={[0, 1, 0]} color="#4B4540" /><mesh position={[0, 2.1, 0]}><cylinderGeometry args={[1.1, 1.1, 0.1, 10]} /><meshStandardMaterial color={s.c} /></mesh><Box size={[1.3, 0.8, 0.8]} pos={[0, 0.4, 0.3]} color="#7C5A2A" /></group>)}
      {Array.from({ length: 12 }).map((_, i) => [-2.2, 2.2].map((x) => <Box key={`${i}${x}`} size={[0.14, 0.02, 2.2]} pos={[x, 0.025, i * 5 + 1]} color="#E6E2D4" />))}
      <Box size={[0.12, 0.02, LOOP]} pos={[-0.12, 0.03, LOOP / 2]} color="#E8B923" /><Box size={[0.12, 0.02, LOOP]} pos={[0.12, 0.03, LOOP / 2]} color="#E8B923" />
      {[-4.55, 4.55].map((x) => <Box key={x} size={[0.12, 0.02, LOOP]} pos={[x, 0.03, LOOP / 2]} color="#E6E2D4" />)}
      {Array.from({ length: 10 }).map((_, i) => <Box key={i} size={[0.55, 0.02, 2.6]} pos={[-4 + i * 0.9, 0.03, 34]} color="#EFEBDD" />)}
    </group>
  );
}

// ------------------------------------------------------------------ people (instanced: a few hundred cost almost nothing)
function Crowd({ count, rain, speed, lanes }: { count: number; rain: boolean; speed: { current: number }; lanes: number[] }) {
  const body = useRef<InstancedMesh>(null), head = useRef<InstancedMesh>(null), brella = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const people = useMemo(() => {
    const r = rng(404);
    return Array.from({ length: count }, (_, i) => ({ x: lanes[Math.floor(r() * lanes.length)] + (r() - 0.5) * 0.5, z: RANGE[0] + r() * (RANGE[1] - RANGE[0]), dir: r() < 0.5 ? 1 : -1, sp: 1 + r() * 0.9, ph: r() * 6, skin: SKINS[Math.floor(r() * 5)], top: TOPS[Math.floor(r() * TOPS.length)], umb: BRELLA[i % BRELLA.length], hasUmb: rain && r() < 0.75 }));
  }, [count, rain, lanes]);
  useEffect(() => {
    const c = new Color();
    people.forEach((p, i) => { body.current?.setColorAt(i, c.set(p.top)); head.current?.setColorAt(i, c.set(p.skin)); brella.current?.setColorAt(i, c.set(p.umb)); });
    for (const m of [body.current, head.current, brella.current]) if (m?.instanceColor) m.instanceColor.needsUpdate = true;
  }, [people]);
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25), t = clock.elapsedTime;
    people.forEach((p, i) => {
      p.z += (speed.current + p.dir * p.sp) * dt; if (p.z > RANGE[1]) p.z -= RANGE[1] - RANGE[0]; if (p.z < RANGE[0]) p.z += RANGE[1] - RANGE[0];
      const bob = Math.abs(Math.sin(t * 8 + p.ph)) * 0.08, yaw = p.dir > 0 ? 0 : Math.PI;
      dummy.rotation.set(0, yaw, 0); dummy.scale.set(1, 1, 1);
      dummy.position.set(p.x, 0.95 + bob, p.z); dummy.updateMatrix(); body.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, 1.72 + bob, p.z); dummy.updateMatrix(); head.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.hasUmb ? 2.3 + (i % 5) * 0.05 : -50, p.z) /* slightly different heights so overlapping umbrellas do not flicker */; dummy.updateMatrix(); brella.current?.setMatrixAt(i, dummy.matrix);
    });
    for (const m of [body.current, head.current, brella.current]) if (m) m.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry args={[0.58, 1.0, 0.34]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, count]} frustumCulled={false}><sphereGeometry args={[0.19, 8, 6]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
      <instancedMesh ref={brella} args={[undefined, undefined, count]} frustumCulled={false}><cylinderGeometry args={[0.8, 0.8, 0.06, 10]} /><meshStandardMaterial roughness={0.7} /></instancedMesh>
    </>
  );
}

function Danfo() {
  // Yellow minibus with the black stripe, a row of side windows split by pillars, a windscreen, a conductor's door and a roof load.
  return (
    <group>
      <Box size={[5.2, 1.9, 2]} pos={[0, 1.4, 0]} color="#FFC21A" />
      <Box size={[5.24, 0.28, 2.04]} pos={[0, 1.15, 0]} color="#15181B" />
      {[-1.9, -0.7, 0.5, 1.7].map((x) => <Box key={x} size={[0.95, 0.65, 2.06]} pos={[x, 1.95, 0]} color="#9FD0E8" />)}
      <Box size={[0.08, 0.7, 2.06]} pos={[2.62, 1.9, 0]} color="#9FD0E8" />
      <Box size={[0.9, 1.5, 0.06]} pos={[-1.2, 1.1, 1.03]} color="#E0A810" />
      <Box size={[1.5, 0.45, 1.6]} pos={[-0.5, 2.6, 0]} color="#7C5A2A" /><Box size={[0.9, 0.4, 1.2]} pos={[0.9, 2.55, 0]} color="#2B8C5B" />
      <Box size={[0.1, 0.3, 1.6]} pos={[2.62, 1.0, 0]} color="#15181B" />
      {[-1.7, 1.7].map((x) => [-1, 1].map((z) => <Cyl key={`${x}${z}`} r={0.45} h={0.32} pos={[x, 0.45, z * 0.95]} rot={[Math.PI / 2, 0, 0]} color="#15181B" />))}
      <Box size={[0.1, 0.3, 0.3]} pos={[2.62, 0.9, 0.7]} color="#FFF3B0" emissive="#FFF3B0" /><Box size={[0.1, 0.3, 0.3]} pos={[2.62, 0.9, -0.7]} color="#FFF3B0" emissive="#FFF3B0" />
      <Box size={[0.1, 0.25, 0.3]} pos={[-2.62, 0.9, 0.7]} color="#C21F2E" emissive="#FF2B3F" /><Box size={[0.1, 0.25, 0.3]} pos={[-2.62, 0.9, -0.7]} color="#C21F2E" emissive="#FF2B3F" />
    </group>
  );
}
function Okada({ rider, passenger, pot }: { rider: string; passenger: string; pot: boolean }) {
  return (
    <group>
      {[-0.7, 0.7].map((x) => <Cyl key={x} r={0.36} h={0.12} pos={[x, 0.36, 0]} rot={[Math.PI / 2, 0, 0]} color="#15181B" />)}
      <Box size={[1.5, 0.12, 0.12]} pos={[0, 0.65, 0]} color="#15181B" rot={[0, 0, 0.3]} />
      <Box size={[0.9, 0.18, 0.4]} pos={[-0.2, 0.95, 0]} color="#C21F2E" />
      <Box size={[0.08, 0.5, 0.5]} pos={[0.7, 1.0, 0]} color="#15181B" />
      {([[-0.35, '#8A63D2', '#B77B4E'], [0.2, rider, passenger]] as [number, string, string][]).map(([x, c, skin], i) => (
        <group key={i} position={[x, 1.05, 0]}>
          <Box size={[0.34, 0.6, 0.4]} pos={[0, 0.35, 0]} color={c} rot={[0, 0, -0.25]} />
          <mesh position={[0.1, 0.85, 0]}><sphereGeometry args={[0.17, 8, 6]} /><meshStandardMaterial color={skin} /></mesh>
          {pot && <mesh position={[0.1, 1.0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 10]} /><meshStandardMaterial color="#B0B6BA" metalness={0.6} /></mesh>}
        </group>
      ))}
    </group>
  );
}
// ------------------------------------------------------------------ traffic
interface CarD { x: number; z: number; dir: 1 | -1; f: number; follow: boolean; u: number; kind: VehicleBody | 'danfo' | 'okada'; color: string }
const CAR_COLORS = ['#C23B3B', '#F4F1EA', '#2B4C7E', '#1B1F24', '#2B8C5B', '#C9CED1', '#8A63D2', '#E4572E', '#7C8791'];
/** Shared bodies for traffic: the same Vehicle models as your own car, plus danfos and okadas. */
function TrafficBody({ car, plan }: { car: CarD; plan: TripPlan }) {
  const lights = plan.weather === 'dusk' || plan.weather === 'rain';
  switch (car.kind) {
    case 'danfo': return <group rotation={[0, Math.PI / 2, 0]}><Danfo /></group>;
    case 'okada': return <group rotation={[0, Math.PI / 2, 0]} scale={1.15}><Okada rider="#8A5A3C" passenger="#4A2C1B" pot={false} /></group>;
    default: return (
      <group scale={car.kind === 'keke' ? 1.1 : 0.95}>
        <Vehicle body={car.kind} color={car.color} />
        {/* taillights (red) and headlights; modelled facing +z, so rear is -z */}
        <Box size={[0.5, 0.16, 0.1]} pos={[0.55, 0.75, -2.3]} color="#C21F2E" emissive="#FF2B3F" /><Box size={[0.5, 0.16, 0.1]} pos={[-0.55, 0.75, -2.3]} color="#C21F2E" emissive="#FF2B3F" />
        {lights && <><Box size={[0.4, 0.14, 0.1]} pos={[0.6, 0.7, 2.3]} color="#FFF3B0" emissive="#FFF3B0" /><Box size={[0.4, 0.14, 0.1]} pos={[-0.6, 0.7, 2.3]} color="#FFF3B0" emissive="#FFF3B0" /></>}
      </group>
    );
  }
}
/** A soft dark blob under a vehicle, so cars seen from low cameras do not float. */
function Blob({ w = 1.1, l = 2.5 }: { w?: number; l?: number }) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} scale={[w, l, 1]}><circleGeometry args={[1, 16]} /><meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} /></mesh>;
}
function Traffic({ plan, speed, walk }: { plan: TripPlan; speed: { current: number }; walk: boolean }) {
  const jam = plan.event === 'jam', nominal = 7.5;
  const cars = useMemo<CarD[]>(() => {
    const r = rng(plan.key.length * 31 + 5), out: CarD[] = [];
    // [lane x, direction, speed factor, follows the ride's own speed?]. In a go-slow everyone in our two lanes crawls with you.
    const lanes: [number, 1 | -1, number, boolean][] = [[3.3, 1, 1, true], [1.1, 1, jam ? 0.9 : 1.5, jam], [-1.1, -1, 0, false], [-3.3, -1, 0, false]];
    const gap = jam ? 5.6 : plan.event === 'crowd' ? 8 : 10.5, gapOncoming = jam ? 8 : 9;
    for (const [x, dir, f, follow] of lanes) {
      const step = dir === 1 ? gap : gapOncoming; let z = RANGE[0] + r() * 2;
      while (z < RANGE[1] - 3) {
        const clear = !walk && x === 3.3 && Math.abs(z) < 5.4; // keep the player's own ride in clear view
        if (!clear && (!plan.light || r() < 0.65)) {
          const k = r(); out.push({ x, z, dir, f, follow, u: jam && dir === -1 ? 3 : 6.5 + r() * 1.5, kind: k < 0.12 ? 'danfo' : k < 0.2 ? 'okada' : k < 0.3 ? 'keke' : k < 0.5 ? 'suv' : 'sedan', color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] });
        }
        z += step * (0.85 + r() * 0.35);
      }
    }
    return out;
  }, [plan.key, plan.event, plan.light, jam, walk]);
  const refs = useRef<Group[]>([]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25), S = speed.current, span = RANGE[1] - RANGE[0];
    cars.forEach((c, i) => {
      // ground speed S pushes everything toward the camera; our-way cars drive up the screen at their own speed, oncoming ones down it
      const own = c.dir === 1 ? -(c.follow ? c.f * S : c.f * nominal) : c.u;
      c.z += (S + own) * dt; if (c.z > RANGE[1]) c.z -= span; if (c.z < RANGE[0]) c.z += span;
      const g = refs.current[i]; if (g) g.position.set(c.x, 0.02, c.z);
    });
  });
  return <>{cars.map((c, i) => <group key={i} ref={(n) => { if (n) refs.current[i] = n; }} rotation={[0, c.dir === 1 ? Math.PI : 0, 0]}><TrafficBody car={c} plan={plan} /></group>)}</>;
}

function DestinationModel({ type }: { type: Building }) {
  switch (type) {
    case 'tower': case 'bank':
      return <group><Box size={[3.4, 11, 3.2]} pos={[0, 5.5, 0]} color="#3C6E9C" rough={0.3} />{Array.from({ length: 9 }).map((_, i) => <Box key={i} size={[3.45, 0.35, 3.25]} pos={[0, 1.4 + i * 1.1, 0]} color="#BEE3F8" emissive={i % 3 === 0 ? '#FFE9A0' : undefined} />)}<Box size={[4.2, 1.4, 3.8]} pos={[0, 0.7, 0.2]} color="#274A6B" /><Box size={[0.12, 1.4, 0.12]} pos={[0, 11.7, 0]} color="#9AA4AD" /></group>;
    case 'market':
      return <group><Box size={[7, 2.8, 3.4]} pos={[0, 1.4, 0]} color="#E8D8B0" />{Array.from({ length: 7 }).map((_, i) => <Box key={i} size={[1, 0.3, 1.4]} pos={[-3 + i, 3.0, 1.9]} color={i % 2 ? '#E4572E' : '#FFC21A'} />)}</group>;
    case 'church':
      return <group><Box size={[4.4, 3.4, 4]} pos={[0, 1.7, 0]} color="#F1ECE0" /><mesh position={[0, 4.4, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.3, 2, 4]} /><meshStandardMaterial color="#B8523D" /></mesh><Box size={[1, 4, 1]} pos={[0, 5.4, 1.4]} color="#F1ECE0" /><mesh position={[0, 8, 1.4]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.9, 1.4, 4]} /><meshStandardMaterial color="#B8523D" /></mesh></group>;
    case 'mosque':
      return <group><Box size={[4.6, 3, 4]} pos={[0, 1.5, 0]} color="#EFE7D2" /><mesh position={[0, 3.2, 0]}><sphereGeometry args={[1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#2B8C5B" /></mesh><Cyl r={0.35} h={7} pos={[-3, 3.5, 0]} color="#EFE7D2" /><mesh position={[-3, 7.5, 0]}><coneGeometry args={[0.5, 1, 8]} /><meshStandardMaterial color="#2B8C5B" /></mesh></group>;
    case 'stadium':
      return <group><Cyl r={4.6} h={2.4} pos={[0, 1.2, 0]} color="#C9CED1" seg={20} /><Cyl r={3.6} h={2.5} pos={[0, 1.25, 0]} color="#2B8C5B" seg={20} />{[-4, 4].map((x) => <Cyl key={x} r={0.12} h={6} pos={[x, 3, 0]} color="#8A929A" />)}</group>;
    case 'club':
      return <group><Box size={[5, 4, 3.4]} pos={[0, 2, 0]} color="#1C1330" /><Box size={[4.6, 0.3, 0.1]} pos={[0, 3.4, 1.75]} color="#FF2E93" emissive="#FF2E93" /><Box size={[4.6, 0.2, 0.1]} pos={[0, 2.8, 1.75]} color="#19C3A6" emissive="#19C3A6" /></group>;
    case 'gate':
      return <group>{[-2.6, 2.6].map((x) => <Box key={x} size={[0.6, 3, 0.6]} pos={[x, 1.5, 0]} color="#8A5A3C" />)}<Box size={[6.2, 0.6, 0.7]} pos={[0, 3.2, 0]} color="#2B8C5B" />{[-1.2, 0, 1.2].map((x) => <mesh key={x} position={[x * 1.4, 1.1, -1.6]}><sphereGeometry args={[1.1, 8, 6]} /><meshStandardMaterial color="#3FA66B" /></mesh>)}</group>;
    default:
      return <group><Box size={[4.4, 2.8, 3.2]} pos={[0, 1.4, 0]} color="#E9DCC2" /><Box size={[4.8, 0.3, 1.2]} pos={[0, 2.6, 1.9]} color="#E4572E" /></group>;
  }
}


// ------------------------------------------------------------------ the player's ride and the point-of-view interiors
function Ride({ plan }: { plan: TripPlan }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 9)) * (plan.event === 'jam' ? 0.012 : 0.006); });
  let body: JSX.Element | null = null;
  const north = Math.PI; // Vehicle faces +z; turn it to face up the street (-z)
  switch (plan.ride) {
    case 'keke': body = <group rotation={[0, north, 0]} scale={1.1}><Vehicle body="keke" color="#FFC21A" /></group>; break;
    case 'cab': body = <group rotation={[0, north, 0]}><Vehicle body="sedan" color="#19C37D" /></group>; break;
    case 'own': body = <group rotation={[0, north, 0]}><PlayerCar def={{ color: plan.vehicle?.color ?? '#C9CED1', model: plan.vehicle?.model ?? 'audi' }} /></group>; break;
    case 'danfo': body = <group rotation={[0, Math.PI / 2, 0]}><Danfo /></group>; break;
    case 'okada': body = <group rotation={[0, Math.PI / 2, 0]} scale={1.15}><Okada rider={plan.appearance.topColor} passenger={plan.appearance.skin} pot={plan.weather === 'rain'} /></group>; break;
    default: body = null;
  }
  return <group ref={g}>{plan.ride !== 'trek' && <Blob w={plan.ride === 'okada' ? 0.5 : 1.05} l={plan.ride === 'danfo' ? 2.8 : 2.4} />}{body}</group>;
}
/** Seen from the passenger seat of a keke: the driver's back, the handlebar, the windscreen frame and the roof edge. */
function KekeInterior() {
  return (
    <group>
      <Box size={[1.3, 0.05, 2.2]} pos={[0, 0.3, 0]} color="#2A2D31" />
      {[-0.66, 0.66].map((x) => <Box key={x} size={[0.06, 1.05, 2.0]} pos={[x, 0.85, 0.1]} color="#FFC21A" />)}
      <Box size={[1.5, 0.07, 2.2]} pos={[0, 1.8, 0.05]} color="#1F4E47" />
      {[-0.64, 0.64].map((x) => <Box key={x} size={[0.07, 1.0, 0.07]} pos={[x, 1.3, -0.95]} color="#15181B" />)}
      <Box size={[1.4, 0.09, 0.09]} pos={[0, 1.78, -0.95]} color="#15181B" />
      <Box size={[1.3, 0.28, 0.5]} pos={[0, 0.82, -0.82]} color="#15181B" />
      <Box size={[0.46, 0.66, 0.3]} pos={[-0.12, 0.95, -0.4]} color="#2B8C5B" /><mesh position={[-0.12, 1.45, -0.4]}><sphereGeometry args={[0.15, 10, 8]} /><meshStandardMaterial color="#8A5A3C" /></mesh>
      <Box size={[1.0, 0.05, 0.05]} pos={[0, 1.12, -0.82]} color="#9AA0A6" /><Box size={[0.14, 0.1, 0.05]} pos={[0, 1.55, -0.95]} color="#C9CED1" />
      <Box size={[1.3, 0.35, 0.5]} pos={[0, 0.55, 0.85]} color="#7C5A2A" />
    </group>
  );
}
/** Seen from a danfo seat: the window frame, the yellow door panel, the seat in front and another passenger's head. */
function DanfoWindow() {
  return (
    <group>
      <Box size={[0.1, 0.1, 2.6]} pos={[1.05, 2.35, 0.2]} color="#E0A810" /><Box size={[0.14, 0.18, 2.6]} pos={[1.05, 1.32, 0.2]} color="#E0A810" />
      {[-0.95, 1.35].map((z) => <Box key={z} size={[0.1, 1.1, 0.12]} pos={[1.05, 1.85, z]} color="#E0A810" />)}
      <Box size={[0.08, 0.7, 2.6]} pos={[1.05, 0.9, 0.2]} color="#FFC21A" /><Box size={[0.9, 0.06, 2.6]} pos={[0.6, 0.5, 0.2]} color="#2A2D31" />
      <Box size={[0.55, 1.0, 0.12]} pos={[0.55, 1.2, -0.62]} color="#7C5A2A" /><mesh position={[0.6, 1.85, -0.62]}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color="#4A2C1B" /></mesh>
    </group>
  );
}

// ------------------------------------------------------------------ cameras
interface Cam { p: V3; l: V3; fov: number; pov?: 'keke' | 'danfo' }
type ShotName = 'chase' | 'pavement' | 'hero' | 'lowRear' | 'high34' | 'hood' | 'kekePov' | 'danfoWin' | 'behind' | 'walkBehind' | 'walkSide' | 'walkFront';
/** Every shot is a function of progress u (0 to 1) through the shot and of where you are (b), so each one drifts a little rather than sitting still. */
const SHOT: Record<ShotName, (u: number, b: Vector3) => Cam> = {
  chase: (u, b) => ({ p: [b.x + 0.5, 2.4 - 0.4 * u, b.z + 7.5 - 1.5 * u], l: [b.x, 1.0, b.z - 7], fov: 56 }),
  pavement: (u, b) => ({ p: [b.x + 4.4, 1.7, b.z + 3.6 - 7.2 * u], l: [b.x, 0.9, b.z - 0.4], fov: 58 }),
  // from in front and above the other traffic, looking back at you coming toward the camera
  hero: (u, b) => ({ p: [b.x - 1.4, 3.7 - 0.5 * u, b.z - 9.5 + 3 * u], l: [b.x, 0.9, b.z + 0.5], fov: 50 }),
  lowRear: (u, b) => ({ p: [b.x + 1.2, 0.5, b.z + 5 - 1.2 * u], l: [b.x, 0.75, b.z - 4], fov: 64 }),
  high34: (u, b) => ({ p: [b.x - 6 + 2 * u, 8.8 - 1.2 * u, b.z + 9.5 - u], l: [b.x, 0.6, b.z - 2], fov: 46 }),
  // a camera mounted on the bonnet, looking down the street (inside the model the dark glass would fill the screen)
  hood: (u, b) => ({ p: [b.x, 1.15, b.z - 1.1], l: [b.x + 0.2 * Math.sin(u * 3), 0.85, b.z - 14], fov: 66 }),
  kekePov: (u, b) => ({ p: [b.x + 0.3, 1.3, b.z + 0.85], l: [b.x + 0.1 + 0.1 * u, 1.2, b.z - 6], fov: 72, pov: 'keke' }),
  danfoWin: (u, b) => ({ p: [b.x + 0.2, 1.75, b.z + 0.45], l: [b.x + 4, 1.75, b.z - 0.2 - 0.7 * u], fov: 62, pov: 'danfo' }),
  behind: (u, b) => ({ p: [b.x + 0.1, 2.0, b.z + 3 - 0.6 * u], l: [b.x, 1.3, b.z - 5], fov: 60 }),
  walkBehind: (u, b) => ({ p: [b.x + 0.3, 2.1, b.z + 3.4 - 0.4 * u], l: [b.x, 1.5, b.z - 5], fov: 58 }),
  walkSide: (u, b) => ({ p: [b.x - 4.6, 2.0, b.z + 2.4 - 4.8 * u], l: [b.x, 1.3, b.z], fov: 56 }),
  walkFront: (u, b) => ({ p: [b.x - 0.4, 1.3, b.z - 6.5 + 1.2 * u], l: [b.x, 1.5, b.z], fov: 48 }),
};
/** Three cuts before arriving. Two different sets per ride (picked from the trip's key) so repeat trips do not look the same. */
function shotPlan(plan: TripPlan): ShotName[] {
  const a = Number(plan.key.slice(-2)) % 2 === 0;
  switch (plan.ride) {
    case 'own': return a ? ['chase', 'pavement', 'hood'] : ['high34', 'lowRear', 'hero'];
    case 'cab': return a ? ['chase', 'pavement', 'hero'] : ['high34', 'lowRear', 'chase'];
    case 'keke': return a ? ['kekePov', 'chase', 'hero'] : ['chase', 'kekePov', 'pavement'];
    case 'danfo': return a ? ['danfoWin', 'chase', 'hero'] : ['high34', 'danfoWin', 'lowRear'];
    case 'okada': return a ? ['behind', 'pavement', 'hero'] : ['lowRear', 'high34', 'behind'];
    default: return a ? ['walkBehind', 'walkSide', 'walkFront'] : ['walkSide', 'high34', 'walkBehind'];
  }
}

// ------------------------------------------------------------------ the whole thing
function World({ plan, arrived, arriveAt }: { plan: TripPlan; arrived: boolean; arriveAt: number }) {
  const sky = SKY[plan.weather], scroll = useRef(0), speed = useRef(0), t0 = useRef<number | null>(null);
  const stripA = useRef<Group>(null), stripB = useRef<Group>(null), dest = useRef<Group>(null), walker = useRef<Group>(null), rowRefs = useRef<Group[]>([]);
  const rideRef = useRef<Group>(null), modelRef = useRef<Group>(null), kekeRef = useRef<Group>(null), danfoRef = useRef<Group>(null), rain3 = useRef<Group>(null);
  const motion = useRef<Motion>({ moving: true, lying: false, sitting: false });
  const rain = plan.weather === 'rain', jam = plan.event === 'jam', crowd = plan.event === 'crowd', walk = plan.ride === 'trek';
  const camera = useThree((st) => st.camera) as PerspectiveCamera, tmp = useMemo(() => new Vector3(), []), look = useMemo(() => new Vector3(), []);
  const dropGeo = useRef<BufferGeometry>(null);
  const N = plan.light ? 200 : 520;
  const slabs = useMemo(() => { const t = pavingTexture().clone(); t.repeat.set(30, 100); t.needsUpdate = true; return t; }, []);
  const drops = useMemo(() => { const r = rng(5), a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { a[i * 3] = (r() - 0.5) * 24; a[i * 3 + 1] = r() * 14; a[i * 3 + 2] = -18 + r() * 24; } return a; }, [N]);
  useEffect(() => { dropGeo.current?.setAttribute('position', new BufferAttribute(drops, 3)); }, [drops]);
  const crowdCount = walk ? (plan.light ? 70 : 150) : crowd ? (plan.light ? 44 : 100) : (plan.light ? 8 : 18);
  const lanes = useMemo(() => (walk ? [5.2, 5.9, 7.1, 7.7, -5.2, -5.9, -7.1] : [5.3, 6.0, 7.2, -5.3, -6.0, -7.2]), [walk]);
  const T = Math.max(1.8, arriveAt), shots = useMemo(() => shotPlan(plan), [plan]);
  // The street slows from cruising speed to a stop over T seconds, covering distance D; the destination sits D ahead, so it arrives beside you.
  const cruise = walk ? 3.4 : jam ? 4.2 : 9, D = (cruise * T) / 2, front = FRONT[plan.building];
  const base = useMemo(() => new Vector3(walk ? 6.35 : 3.3, 0, 0), [walk]);
  const lastFov = useRef(0);
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25);
    if (t0.current === null) t0.current = clock.elapsedTime;
    let t = clock.elapsedTime - t0.current; if (arrived) t = Math.max(t, T);
    const forced = (globalThis as { __travelT?: number }).__travelT; if (typeof forced === 'number') t = forced; // TEST-ONLY: lets screenshots freeze the film at a chosen second
    const u = Math.min(1, t / T), ta = Math.max(0, t - T);
    scroll.current = D * (1 - (1 - u) * (1 - u)); speed.current = u < 1 ? (2 * D * (1 - u)) / T : 0;
    slabs.offset.y = scroll.current / 2;
    const o = scroll.current % LOOP;
    if (stripA.current) stripA.current.position.z = o - 40;
    if (stripB.current) stripB.current.position.z = o - 40 - LOOP;
    const destZ = DEST_Z - D + scroll.current;
    if (dest.current) dest.current.position.set(DOOR_X + 0.3 + front, 0, destZ);
    // shop rows on the destination's side step aside where it stands
    for (const g of rowRefs.current) { g.getWorldPosition(tmp); g.visible = Math.abs(tmp.z - destZ) > 7; }
    // whoever is travelling stands in the ride's door after it stops, walks to the destination's door and goes in
    if (walker.current) {
      const w = walker.current;
      if (walk) {
        if (ta > 0) { const p = Math.min(1, ta / 1.5); w.position.set(MathUtils.lerp(6.35, DOOR_X, p), 0.02, MathUtils.lerp(0, destZ, p)); w.rotation.y = MathUtils.lerp(Math.PI, Math.PI / 2, Math.min(1, ta * 3)); motion.current.moving = p < 1; w.scale.setScalar(p > 0.93 ? Math.max(0.01, 1 - (p - 0.93) / 0.07) : 1); }
        else { w.position.set(6.35, 0.02, 0); w.rotation.y = Math.PI; motion.current.moving = true; }
      } else {
        const show = ta > 0.2; w.visible = show;
        if (show) { const p = Math.min(1, (ta - 0.2) / 1.3); w.position.set(MathUtils.lerp(4.5, DOOR_X, p), 0.02, MathUtils.lerp(0.4, destZ, p)); motion.current.moving = p < 1; w.rotation.y = Math.PI / 2; w.scale.setScalar(p > 0.93 ? Math.max(0.01, 1 - (p - 0.93) / 0.07) : 1); }
      }
    }
    // camera: three cuts while travelling, then a shot that follows the passenger in
    let cam: Cam;
    if (u < 1 && ta === 0) { const n = shots.length, x = Math.min(n - 0.001, (t / T) * n), i = Math.floor(x); cam = SHOT[shots[i]](x - i, base); }
    // arrival: a wide shot from across the street (it has to fit your ride, the pavement and the door in a tall phone screen), pushing in slowly
    else { const k = Math.min(1, ta / 2); cam = { p: [-7.8 + 1.2 * k, 4.6 - 0.6 * k, destZ + 1.6], l: [6.3, 1.2, destZ - 0.2], fov: 56 }; }
    const sh = Math.sin(clock.elapsedTime * 7) * 0.025; // a little handheld wobble
    camera.position.set(cam.p[0] + sh, cam.p[1] + Math.cos(clock.elapsedTime * 6) * 0.02, cam.p[2]);
    look.set(cam.l[0], cam.l[1], cam.l[2]); camera.lookAt(look);
    if (lastFov.current !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); lastFov.current = cam.fov; }
    // point-of-view shots hide the outside of your ride and show its inside
    if (modelRef.current) modelRef.current.visible = !cam.pov;
    if (kekeRef.current) kekeRef.current.visible = cam.pov === 'keke';
    if (danfoRef.current) danfoRef.current.visible = cam.pov === 'danfo';
    if (rain3.current) rain3.current.position.set(camera.position.x, 0, camera.position.z - 6);
    const p = dropGeo.current?.attributes.position as BufferAttribute | undefined;
    if (rain && p) { for (let i = 0; i < N; i++) { let y = p.getY(i) - 20 * dt; if (y < 0) y += 14; p.setXYZ(i, p.getX(i), y, p.getZ(i)); } p.needsUpdate = true; }
  });
  return (
    <>
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 38, 110]} />
      <hemisphereLight args={[sky.sun, '#6F6A66', sky.amb * 1.6]} />
      <directionalLight position={[8, 30, 12]} intensity={plan.weather === 'dusk' ? 2.2 : 2} color={sky.sun} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 200]} /><meshStandardMaterial map={slabs} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[9.2, 200]} /><meshStandardMaterial color={rain ? '#25292E' : '#3B3F44'} roughness={rain ? 0.3 : 0.9} /></mesh>
      {[-4.7, 4.7].map((x) => <Box key={x} size={[0.25, 0.14, 200]} pos={[x, 0.06, 0]} color="#D8D3C8" />)}
      <group ref={stripA}><Strip weather={plan.weather} rowRefs={rowRefs} /></group>
      <group ref={stripB}><Strip weather={plan.weather} rowRefs={rowRefs} /></group>
      <Traffic plan={plan} speed={speed} walk={walk} />
      <Crowd count={crowdCount} rain={rain} speed={speed} lanes={lanes} />
      {!walk && (
        <group ref={rideRef} position={[3.3, 0.02, 0]}>
          <group ref={modelRef}><Ride plan={plan} /></group>
          {plan.ride === 'keke' && <group ref={kekeRef} visible={false}><KekeInterior /></group>}
          {plan.ride === 'danfo' && <group ref={danfoRef} visible={false}><DanfoWindow /></group>}
        </group>
      )}
      <group ref={walker} position={[walk ? 6.35 : 4.5, 0.02, 0]} visible={walk} rotation={[0, Math.PI, 0]}>
        <Avatar appearance={plan.appearance} motion={motion} />
        {rain && <group position={[0, 2.15, 0]}><mesh><cylinderGeometry args={[0.55, 0.55, 0.04, 12]} /><meshStandardMaterial color="#E4572E" transparent opacity={0.85} /></mesh><Box size={[0.03, 0.5, 0.03]} pos={[0, -0.25, 0]} color="#2B2B2B" /></group>}
      </group>
      {/* the destination is part of the street from the start and comes up the road to meet you */}
      <group ref={dest} rotation={[0, -Math.PI / 2, 0]}><DestinationModel type={plan.building} /></group>
      {rain && <group ref={rain3}><points frustumCulled={false}><bufferGeometry ref={dropGeo} /><pointsMaterial color="#CFE6F7" size={0.07} transparent opacity={0.8} sizeAttenuation /></points></group>}
    </>
  );
}

export default function Scene3D({ plan, arrived, arriveAt }: { plan: TripPlan; arrived: boolean; /** seconds of travelling before the arrival shot */ arriveAt: number }) {
  // R3F frees the scene's own geometry and materials on unmount; the two shared canvas textures are ours to free.
  useEffect(() => () => { windows?.dispose(); windows = null; paving?.dispose(); paving = null; }, []);
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, plan.light ? 1 : 1.5]} camera={{ fov: 56, position: [4, 2.4, 8], near: 0.2, far: 220 }} gl={{ antialias: !plan.light, powerPreference: 'high-performance' }}>
        <World plan={plan} arrived={arrived} arriveAt={arriveAt} />
      </Canvas>
    </div>
  );
}
