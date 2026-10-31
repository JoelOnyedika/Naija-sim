import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, type BufferGeometry, type Group, type Texture } from 'three';
import { Avatar, type Motion } from '@/three/avatar/Avatar';
import { Vehicle } from '@/three/models/vehicles';
import type { Building, TripPlan } from './plan';

/**
 * The full 3D version of a trip. Your own car (its real model and colour) stays in the middle while the street slides past:
 * road marks, shop rows, poles and people. Deliberately simple geometry, no shadows and a short life (3 to 5 seconds); it only
 * loads when planTrip picked it for a capable device.
 */
const LOOP = 60; // length of one street strip; two copies leapfrog so the street never ends
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const SKY = { clear: { bg: '#8CCBFF', fog: '#CFE9FF', sun: '#FFF1D6', amb: 0.9 }, rain: { bg: '#58636E', fog: '#7C8893', sun: '#B8C4CF', amb: 0.7 }, dusk: { bg: '#FF9A62', fog: '#FFC58A', sun: '#FFB070', amb: 0.75 } } as const;

type V3 = [number, number, number];
function Box({ size, pos, color, rot, emissive, rough = 0.85 }: { size: V3; pos: V3; color: string; rot?: V3; emissive?: string; rough?: number }) {
  return <mesh position={pos} rotation={rot}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 1.2 : 0} /></mesh>;
}
function Cyl({ r, h, pos, color, rot, seg = 12 }: { r: number; h: number; pos: V3; color: string; rot?: V3; seg?: number }) {
  return <mesh position={pos} rotation={rot}><cylinderGeometry args={[r, r, h, seg]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}

// ------------------------------------------------------------------ the street (one strip, drawn twice)
/** One small canvas of windows, shared by every building (each box just repeats it) so the street does not look like blank cardboard. */
let windows: Texture | null = null;
function windowTexture(): Texture {
  if (windows) return windows;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  g.fillStyle = '#F2EEE6'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = '#5B7894'; g.fillRect(8 + x * 32, 8 + y * 32, 16, 20); g.fillStyle = '#B9D3E6'; g.fillRect(8 + x * 32, 8 + y * 32, 16, 7); }
  g.fillStyle = '#00000014'; g.fillRect(0, 62, 64, 2);
  windows = new CanvasTexture(c); windows.wrapS = windows.wrapT = RepeatWrapping; windows.colorSpace = SRGBColorSpace; return windows;
}
let paving: Texture | null = null;
/** Paving slabs for the ground: faint tile lines plus a few darker speckles, so the lower half of the screen is not one flat colour. */
function pavingTexture(): Texture {
  if (paving) return paving;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#B9B3A8'; g.fillRect(0, 0, 128, 128);
  const r = rng(9); for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#00000012' : '#FFFFFF14'; g.fillRect(r() * 128, r() * 128, 6 + r() * 14, 4 + r() * 10); }
  g.fillStyle = '#7F796F'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128); g.fillRect(0, 62, 128, 2); g.fillRect(62, 0, 2, 128);
  paving = new CanvasTexture(c); paving.wrapS = paving.wrapT = RepeatWrapping; paving.colorSpace = SRGBColorSpace; paving.anisotropy = 4; return paving;
}
function Block({ w, h, d, pos, color }: { w: number; h: number; d: number; pos: V3; color: string }) {
  const map = useMemo(() => { const t = windowTexture().clone(); t.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))); t.needsUpdate = true; return t; }, [w, h]);
  return <mesh position={pos}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={color} map={map} roughness={0.85} /></mesh>;
}
function Strip({ light, weather }: { light: boolean; weather: TripPlan['weather'] }) {
  const items = useMemo(() => {
    const r = rng(21), out: { x: number; w: number; h: number; z: number; c: string; awn: string }[] = [];
    const walls = ['#E9DCC2', '#D6C7A3', '#CFD8DC', '#F1E4C8', '#C9B896', '#B9C7D6'], awn = ['#E4572E', '#FFC21A', '#19C3A6', '#8A63D2', '#2B8C5B'];
    for (const z of [-6.2, -10.5]) { let x = 0; while (x < LOOP) { const w = 3.2 + r() * 2.6, h = 3 + r() * (z < -8 ? 9 : 5); out.push({ x: x + w / 2, w, h, z, c: walls[Math.floor(r() * walls.length)], awn: awn[Math.floor(r() * awn.length)] }); x += w + 0.3; } }
    return out;
  }, []);
  const poles = useMemo(() => Array.from({ length: 6 }, (_, i) => i * 10 + 3), []);
  return (
    <group>
      {items.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <Block w={b.w} h={b.h} d={3} pos={[0, b.h / 2, 0]} color={b.c} />
          {b.z > -8 && <Box size={[b.w + 0.2, 0.25, 1.1]} pos={[0, 2.5, 1.9]} color={b.awn} />}
          {!light && b.z > -8 && <Box size={[b.w * 0.6, 1.2, 0.05]} pos={[0, 1.2, 1.52]} color="#9FD0E8" emissive={weather === 'dusk' ? '#FFD98A' : undefined} />}
        </group>
      ))}
      {poles.map((x) => <group key={x} position={[x, 0, 3.9]}><Cyl r={0.07} h={5} pos={[0, 2.5, 0]} color="#4B4540" /><Box size={[0.9, 0.08, 0.08]} pos={[0, 4.9, 0]} color="#4B4540" /></group>)}
      {Array.from({ length: 12 }).map((_, i) => <Box key={i} size={[2, 0.02, 0.12]} pos={[i * 5 + 1, 0.021, 0.6]} color="#E6E2D4" />)}
    </group>
  );
}

// ------------------------------------------------------------------ people on the pavements
function Pedestrian({ seed, z, dir, scroll, rain }: { seed: number; z: number; dir: 1 | -1; scroll: { current: number }; rain: boolean }) {
  const g = useRef<Group>(null), legs = useRef<Group[]>([]);
  const look = useMemo(() => {
    const r = rng(seed);
    return { x: r() * LOOP, skin: ['#F1C9A5', '#B77B4E', '#8A5A3C', '#6B4128', '#4A2C1B'][Math.floor(r() * 5)], top: ['#E4572E', '#2B8C5B', '#8A63D2', '#FFC21A', '#2B4C7E', '#F4F1EA'][Math.floor(r() * 6)], bot: ['#1B1F24', '#2B4C7E', '#5A3E1E'][Math.floor(r() * 3)], ph: r() * 6 };
  }, [seed]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, x = (((look.x - scroll.current + dir * t * 1.3) % LOOP) + LOOP) % LOOP - LOOP * 0.4;
    if (g.current) { g.current.position.set(x, 0, z); g.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    legs.current.forEach((l, i) => { if (l) l.rotation.x = Math.sin(t * 7 + look.ph + i * Math.PI) * 0.6; });
  });
  return (
    <group ref={g}>
      {[-1, 1].map((s, i) => <group key={s} ref={(n) => { if (n) legs.current[i] = n; }} position={[s * 0.09, 0.8, 0]}><Box size={[0.13, 0.8, 0.14]} pos={[0, -0.4, 0]} color={look.bot} /></group>)}
      <Box size={[0.42, 0.62, 0.24]} pos={[0, 1.12, 0]} color={look.top} />
      <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.15, 8, 6]} /><meshStandardMaterial color={look.skin} /></mesh>
      {rain && <mesh position={[0, 2.05, 0]}><coneGeometry args={[0.55, 0.28, 8]} /><meshStandardMaterial color="#E4572E" /></mesh>}
    </group>
  );
}

// ------------------------------------------------------------------ rides that the shared Vehicle model does not cover
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
function Ride({ plan }: { plan: TripPlan }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 9)) * (plan.event === 'jam' ? 0.012 : 0.006); });
  let body: JSX.Element | null = null;
  switch (plan.ride) {
    case 'keke': body = <group rotation={[0, Math.PI / 2, 0]} scale={1.1}><Vehicle body="keke" color="#FFC21A" /></group>; break;
    case 'cab': body = <group rotation={[0, Math.PI / 2, 0]}><Vehicle body="sedan" color="#19C37D" /></group>; break;
    case 'own': body = <group rotation={[0, Math.PI / 2, 0]}><Vehicle body={plan.vehicle?.body ?? 'sedan'} color={plan.vehicle?.color ?? '#C9CED1'} /></group>; break;
    case 'danfo': body = <Danfo />; break;
    case 'okada': body = <Okada rider={plan.appearance.topColor} passenger={plan.appearance.skin} pot={plan.weather === 'rain'} />; break;
    default: body = null;
  }
  return <group ref={g}>{body}</group>;
}

// ------------------------------------------------------------------ the destination, built up on arrival
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
  const stripA = useRef<Group>(null), stripB = useRef<Group>(null), dest = useRef<Group>(null), walker = useRef<Group>(null);
  const motion = useRef<Motion>({ moving: true, lying: false, sitting: false });
  const rain = plan.weather === 'rain', jam = plan.event === 'jam', crowd = plan.event === 'crowd', walk = plan.ride === 'trek';
  const camera = useThree((s) => s.camera);
  const dropGeo = useRef<BufferGeometry>(null);
  const N = plan.light ? 260 : 620;
  const slabs = useMemo(() => { const t = pavingTexture().clone(); t.repeat.set(60, 20); t.needsUpdate = true; return t; }, []);
  const drops = useMemo(() => { const r = rng(5), a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { a[i * 3] = (r() - 0.5) * 22; a[i * 3 + 1] = r() * 9; a[i * 3 + 2] = (r() - 0.5) * 14; } return a; }, [N]);
  useEffect(() => { dropGeo.current?.setAttribute('position', new BufferAttribute(drops, 3)); }, [drops]);
  // Cars stuck around the ride, never right beside it, so the player's own vehicle stays in clear view. Near lane = towards the camera.
  const jamCars = useMemo(() => [['#C23B3B', -6.5, -1.3], ['#F4F1EA', -15, -1.3], ['#2B4C7E', -9.5, 2.9], ['#FFC21A', 8.5, 2.9], ['#1B1F24', 12.5, -1.3], ['#2B8C5B', -20, 2.9], ['#C9CED1', 17, 2.9]].map(([c, x, z]) => ({ c: c as string, x: x as number, z: z as number })), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25), target = arrived ? 0 : jam ? 1.8 : walk ? 2.2 : 7.5;
    speed.current += (target - speed.current) * (1 - Math.exp(-dt * (arrived ? 3.5 : 2.2)));
    scroll.current += speed.current * dt;
    slabs.offset.x = scroll.current / 3.33; // the paving slides past with the street
    const o = scroll.current % LOOP;
    if (stripA.current) stripA.current.position.x = -o - 6;
    if (stripB.current) stripB.current.position.x = -o + LOOP - 6;
    if (arrived) arriveT.current = Math.min(1, arriveT.current + dt / 0.9);
    const k = MathUtils.smoothstep(arriveT.current, 0, 1);
    if (dest.current) { dest.current.visible = arrived; dest.current.scale.y = Math.max(0.001, k); dest.current.position.set(6.5 - (1 - k) * 8, 0, -3.6); }
    // whoever is travelling steps out and walks to the door
    // The walker ends in front of the door (not inside the building) and shrinks away as they go in.
    if (walker.current) {
      const w = walker.current;
      if (walk) {
        if (arrived) { w.position.x = Math.min(5.9, w.position.x + dt * 1.9); w.position.z = MathUtils.lerp(w.position.z, -1.1, 1 - Math.exp(-dt * 2)); }
        const atDoor = arrived && w.position.x >= 5.9; motion.current.moving = !atDoor; w.rotation.y = arrived ? 1.0 : 1.5;
        w.scale.setScalar(atDoor ? Math.max(0.01, w.scale.x - dt * 3) : 1.5);
      } else {
        const show = arrived && arriveT.current > 0.3; w.visible = show;
        if (show) { const p = Math.min(1, (arriveT.current - 0.3) / 0.7); w.position.set(0.8 + p * 5.1, 0.02, 2.3 - p * 3.4); motion.current.moving = p < 1; w.rotation.y = 1.1; w.scale.setScalar(p > 0.92 ? Math.max(0.01, 1.4 * (1 - (p - 0.92) / 0.08)) : 1.4); }
      }
    }
    // camera: a slow drift, then it swings over to frame the destination
    // portrait phones see only ~0.43 x the distance sideways, so the camera sits far back to fit a whole vehicle in frame
    camera.position.set(MathUtils.lerp(1.5, 3.2, k) + Math.sin(scroll.current * 0.05 + arriveT.current) * 0.25, 3.4, MathUtils.lerp(30, 31, k));
    camera.lookAt(MathUtils.lerp(1.0, 3.0, k), MathUtils.lerp(2.6, 3.6, k), 0);
    const p = dropGeo.current?.attributes.position as BufferAttribute | undefined;
    if (rain && p) { for (let i = 0; i < N; i++) { let y = p.getY(i) - 20 * dt, x = p.getX(i) - 3 * dt; if (y < 0) { y += 9; x += 2; } p.setXYZ(i, x < -11 ? x + 22 : x, y, p.getZ(i)); } p.needsUpdate = true; }
  });
  return (
    <>
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 40, 110]} />
      <hemisphereLight args={[sky.sun, '#6F6A66', sky.amb * 1.6]} />
      <directionalLight position={[4, 8, 6]} intensity={plan.weather === 'dusk' ? 2.4 : 2.1} color={sky.sun} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 60]} /><meshStandardMaterial map={slabs} roughness={0.95} /></mesh>
      <Box size={[200, 0.12, 0.3]} pos={[0, 0.05, 3.7]} color="#D8D3C8" /><Box size={[200, 0.12, 0.3]} pos={[0, 0.05, -2.2]} color="#D8D3C8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.6]}><planeGeometry args={[200, 5.6]} /><meshStandardMaterial color={rain ? '#2C3238' : '#3B3F44'} roughness={rain ? 0.35 : 0.9} /></mesh>
      <group ref={stripA}><Strip light={plan.light} weather={plan.weather} /></group>
      <group ref={stripB}><Strip light={plan.light} weather={plan.weather} /></group>
      {crowd && Array.from({ length: plan.light ? 6 : 12 }).map((_, i) => <Pedestrian key={i} seed={i * 31 + 7} z={i % 2 ? 3.2 : -3.0 + (i % 3) * 0.3} dir={i % 3 === 0 ? 1 : -1} scroll={scroll} rain={rain} />)}
      {jam && jamCars.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, Math.PI / 2, 0]} scale={0.95}><Vehicle body={i % 3 === 0 ? 'suv' : 'sedan'} color={c.c} /><Box size={[0.5, 0.15, 0.1]} pos={[0, 0.7, -2.3]} color="#C21F2E" emissive="#FF2B3F" /></group>
      ))}
      {!walk && <group position={[0, 0.02, 0.9]}><Ride plan={plan} /></group>}
      <group ref={walker} position={[0, 0.02, 1.4]} visible={walk} rotation={[0, 1.5, 0]} scale={walk ? 1.5 : 1.4}>
        <Avatar appearance={plan.appearance} motion={motion} />
        {rain && <group position={[0.15, 1.78, 0]}><mesh><coneGeometry args={[0.7, 0.3, 10]} /><meshStandardMaterial color="#E4572E" /></mesh><Box size={[0.03, 0.5, 0.03]} pos={[0, -0.25, 0]} color="#2B2B2B" /></group>}
      </group>
      <group ref={dest} visible={false}><DestinationModel type={plan.building} /></group>
      {rain && <points frustumCulled={false}><bufferGeometry ref={dropGeo} /><pointsMaterial color="#CFE6F7" size={0.11} transparent opacity={0.8} sizeAttenuation /></points>}
    </>
  );
}

export default function Scene3D({ plan, arrived }: { plan: TripPlan; arrived: boolean }) {
  // R3F frees the scene's own geometry and materials on unmount; the two shared canvas textures are ours to free.
  useEffect(() => () => { windows?.dispose(); windows = null; paving?.dispose(); paving = null; }, []);
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, plan.light ? 1 : 1.5]} camera={{ fov: 40, position: [1.5, 3.4, 30], near: 0.5, far: 200 }} gl={{ antialias: !plan.light, powerPreference: 'high-performance' }}>
        <World plan={plan} arrived={arrived} />
      </Canvas>
    </div>
  );
}
