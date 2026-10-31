import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, CanvasTexture, Color, MathUtils, Object3D, RepeatWrapping, SRGBColorSpace, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Texture } from 'three';
import { Avatar, type Motion } from '@/three/avatar/Avatar';
import { Vehicle } from '@/three/models/vehicles';
import { PlayerCar } from '@/three/models/CarModel';
import type { VehicleBody } from '@/data/vehicles';
import type { Building, TripPlan } from './plan';

/**
 * The 3D version of a trip, seen from ABOVE (a bird's-eye camera looking down at the road). The road runs up the screen and the
 * world scrolls toward you, so your ride seems to drive (or you seem to walk) up the street. Dense traffic in four lanes (two
 * going your way, two oncoming), crowds on the pavements, umbrellas in rain, brake lights in a go-slow. On arrival the
 * destination rises beside the road and the passenger walks to its door.
 * Deliberately cheap: no shadows, instanced people, a few dozen cars, a 3 to 5 second life. Only loads when planTrip picks it.
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
      {bits.trees.map((t, i) => <group key={i} position={[t.side * 7.1, 0, t.z]} scale={t.s}><Cyl r={0.18} h={1.8} pos={[0, 0.9, 0]} color="#6B4A2B" /><mesh position={[0, 2.5, 0]}><sphereGeometry args={[1.25, 9, 7]} /><meshStandardMaterial color={i % 2 ? '#3FA66B' : '#2F8A55'} roughness={0.9} /></mesh></group>)}
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
    case 'okada': return <group rotation={[0, Math.PI / 2, 0]} scale={1.3}><Okada rider="#8A5A3C" passenger="#4A2C1B" pot={false} /></group>;
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

/** A bright ring on the ground so you can always tell which vehicle or person is you in the traffic. */
function Ring({ r, stretch }: { r: number; stretch: number }) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} scale={[1, stretch, 1]}><ringGeometry args={[r, r + 0.18, 32]} /><meshBasicMaterial color="#FFE14A" transparent opacity={0.9} /></mesh>;
}
function Ride({ plan }: { plan: TripPlan }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 9)) * (plan.event === 'jam' ? 0.012 : 0.006); });
  let body: JSX.Element | null = null;
  const north = Math.PI; // Vehicle faces +z; turn it to face up the screen (-z)
  switch (plan.ride) {
    case 'keke': body = <group rotation={[0, north, 0]} scale={1.1}><Vehicle body="keke" color="#FFC21A" /></group>; break;
    case 'cab': body = <group rotation={[0, north, 0]}><Vehicle body="sedan" color="#19C37D" /></group>; break;
    case 'own': body = <group rotation={[0, north, 0]}><PlayerCar def={{ type: plan.vehicle?.body ?? 'sedan', color: plan.vehicle?.color ?? '#C9CED1', model: plan.vehicle?.model }} /></group>; break;
    case 'danfo': body = <group rotation={[0, Math.PI / 2, 0]}><Danfo /></group>; break;
    case 'okada': body = <group rotation={[0, Math.PI / 2, 0]} scale={1.3}><Okada rider={plan.appearance.topColor} passenger={plan.appearance.skin} pot={plan.weather === 'rain'} /></group>; break;
    default: body = null;
  }
  return <group ref={g}>{body}</group>;
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

// ------------------------------------------------------------------ the whole thing
function World({ plan, arrived }: { plan: TripPlan; arrived: boolean }) {
  const sky = SKY[plan.weather], scroll = useRef(0), speed = useRef(0), arriveT = useRef(0);
  const stripA = useRef<Group>(null), stripB = useRef<Group>(null), dest = useRef<Group>(null), walker = useRef<Group>(null), rowRefs = useRef<Group[]>([]);
  const motion = useRef<Motion>({ moving: true, lying: false, sitting: false });
  const rain = plan.weather === 'rain', jam = plan.event === 'jam', crowd = plan.event === 'crowd', walk = plan.ride === 'trek';
  const camera = useThree((s) => s.camera), tmp = useMemo(() => new Vector3(), []);
  const dropGeo = useRef<BufferGeometry>(null);
  const N = plan.light ? 200 : 520;
  const slabs = useMemo(() => { const t = pavingTexture().clone(); t.repeat.set(30, 100); t.needsUpdate = true; return t; }, []);
  const drops = useMemo(() => { const r = rng(5), a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { a[i * 3] = (r() - 0.5) * 26; a[i * 3 + 1] = r() * 30; a[i * 3 + 2] = -24 + r() * 40; } return a; }, [N]);
  useEffect(() => { dropGeo.current?.setAttribute('position', new BufferAttribute(drops, 3)); }, [drops]);
  // people: a trek is walked through a packed pavement; otherwise the pavements are busy only in a crowd event
  const crowdCount = walk ? (plan.light ? 70 : 150) : crowd ? (plan.light ? 44 : 100) : (plan.light ? 6 : 14);
  const lanes = useMemo(() => (walk ? [5.2, 5.9, 7.1, 7.7, -5.2, -5.9, -7.1] : [5.3, 6.0, 7.2, -5.3, -6.0, -7.2]), [walk]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25), target = arrived ? 0 : jam ? 1.8 : walk ? 2.2 : 7.5;
    speed.current += (target - speed.current) * (1 - Math.exp(-dt * (arrived ? 3.5 : 2.2)));
    scroll.current += speed.current * dt;
    slabs.offset.y = scroll.current / 2; // the paving slides toward you with the street
    const o = scroll.current % LOOP;
    if (stripA.current) stripA.current.position.z = o - 40;
    if (stripB.current) stripB.current.position.z = o - 40 - LOOP;
    if (arrived) arriveT.current = Math.min(1, arriveT.current + dt / 0.9);
    const k = MathUtils.smoothstep(arriveT.current, 0, 1), front = FRONT[plan.building];
    if (dest.current) { dest.current.visible = arrived; dest.current.scale.y = Math.max(0.001, k); dest.current.position.set(DOOR_X + 0.3 + front, 0, DEST_Z); }
    // make room: shop rows on the destination's side step aside where the building rises
    if (arrived) for (const g of rowRefs.current) { g.getWorldPosition(tmp); g.visible = Math.abs(tmp.z - DEST_Z) > 7; }
    // whoever is travelling steps out and walks to the door, then shrinks away through it
    if (walker.current) {
      const w = walker.current;
      if (walk) {
        if (arrived) { w.position.x = Math.min(DOOR_X, w.position.x + dt * 1.9); w.position.z = MathUtils.lerp(w.position.z, DEST_Z, 1 - Math.exp(-dt * 2)); }
        const atDoor = arrived && w.position.x >= DOOR_X; motion.current.moving = !atDoor; w.rotation.y = arrived ? Math.PI / 2 : Math.PI;
        w.scale.setScalar(atDoor ? Math.max(0.01, w.scale.x - dt * 3) : 1.7);
      } else {
        const show = arrived && arriveT.current > 0.3; w.visible = show;
        if (show) { const p = Math.min(1, (arriveT.current - 0.3) / 0.7); w.position.set(4.5 + p * (DOOR_X - 4.5), 0.02, 0.4 + p * (DEST_Z - 0.4)); motion.current.moving = p < 1; w.rotation.y = Math.PI / 2; w.scale.setScalar(p > 0.92 ? Math.max(0.01, 1.7 * (1 - (p - 0.92) / 0.08)) : 1.7); }
      }
    }
    // camera: high above, a little behind (a bird's-eye view with a touch of tilt so you still see faces of buildings); it slides toward the destination on arrival
    const cx = MathUtils.lerp(walk ? 3.8 : 1.6, 7.6, k) + Math.sin(scroll.current * 0.04) * 0.15;
    camera.position.set(cx, 34, 17 + k * 1);
    camera.lookAt(cx, 0, MathUtils.lerp(-3, -3.5, k));
    const p = dropGeo.current?.attributes.position as BufferAttribute | undefined;
    if (rain && p) { for (let i = 0; i < N; i++) { let y = p.getY(i) - 24 * dt; if (y < 0) y += 30; p.setXYZ(i, p.getX(i), y, p.getZ(i)); } p.needsUpdate = true; }
  });
  return (
    <>
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 70, 150]} />
      <hemisphereLight args={[sky.sun, '#6F6A66', sky.amb * 1.6]} />
      <directionalLight position={[8, 30, 12]} intensity={plan.weather === 'dusk' ? 2.2 : 2} color={sky.sun} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 200]} /><meshStandardMaterial map={slabs} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[9.2, 200]} /><meshStandardMaterial color={rain ? '#25292E' : '#3B3F44'} roughness={rain ? 0.3 : 0.9} /></mesh>
      {[-4.7, 4.7].map((x) => <Box key={x} size={[0.25, 0.14, 200]} pos={[x, 0.06, 0]} color="#D8D3C8" />)}
      <group ref={stripA}><Strip weather={plan.weather} rowRefs={rowRefs} /></group>
      <group ref={stripB}><Strip weather={plan.weather} rowRefs={rowRefs} /></group>
      <Traffic plan={plan} speed={speed} walk={walk} />
      <Crowd count={crowdCount} rain={rain} speed={speed} lanes={lanes} />
      {!walk && <group position={[3.3, 0.02, 0]}><Ride plan={plan} /><Ring r={1.6} stretch={1.75} /></group>}
      <group ref={walker} position={[walk ? 6.35 : 4.5, 0.02, 0]} visible={walk} rotation={[0, Math.PI, 0]} scale={1.7}>
        <Avatar appearance={plan.appearance} motion={motion} />
        <Ring r={0.75} stretch={1} />
        {/* see-through so you can still watch the walking from above */}
        {rain && <group position={[0, 2.1, 0]}><mesh><cylinderGeometry args={[0.85, 0.85, 0.04, 12]} /><meshStandardMaterial color="#E4572E" transparent opacity={0.4} /></mesh><Box size={[0.03, 0.5, 0.03]} pos={[0, -0.25, 0]} color="#2B2B2B" /></group>}
      </group>
      <group ref={dest} visible={false} rotation={[0, -Math.PI / 2, 0]}><DestinationModel type={plan.building} /></group>
      {rain && <points frustumCulled={false}><bufferGeometry ref={dropGeo} /><pointsMaterial color="#CFE6F7" size={0.12} transparent opacity={0.8} sizeAttenuation /></points>}
    </>
  );
}

export default function Scene3D({ plan, arrived }: { plan: TripPlan; arrived: boolean }) {
  // R3F frees the scene's own geometry and materials on unmount; the two shared canvas textures are ours to free.
  useEffect(() => () => { windows?.dispose(); windows = null; paving?.dispose(); paving = null; }, []);
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, plan.light ? 1 : 1.5]} camera={{ fov: 40, position: [1.6, 34, 17], near: 1, far: 260 }} gl={{ antialias: !plan.light, powerPreference: 'high-performance' }}>
        <World plan={plan} arrived={arrived} />
      </Canvas>
    </div>
  );
}
