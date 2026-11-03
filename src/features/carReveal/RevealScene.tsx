import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, Color, DoubleSide, Float32BufferAttribute, MathUtils, Object3D, SphereGeometry, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Mesh, type PerspectiveCamera } from 'three';
import { PlayerCar } from '@/three/models/CarModel';
import type { VehicleDef } from '@/data/vehicles';
import { bakeCharacter, crowdLook } from '../travel/people';

/**
 * The "you bought a car" film. A lit stage at night, your real car model on a turntable, six camera cuts (a wide reveal, the headlights,
 * a wheel, the side, the rear, a closing orbit), confetti, and a party around the car that grows with the price: ordinary cars get a
 * cheering crowd; expensive ones add friends popping champagne; the really expensive ones add models walking past.
 */
export type Tier = 'standard' | 'rich' | 'luxury';
export const tierOf = (price: number): Tier => (price >= 300_000_000 ? 'luxury' : price >= 100_000_000 ? 'rich' : 'standard');
export const SHOTS = 6;
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const CONFETTI = ['#FF4D6D', '#FFC21A', '#19C3A6', '#8A63D2', '#2B8CFF', '#FFFFFF', '#FF8A3D'];

type V3 = [number, number, number];
interface Cam { p: V3; l: V3; fov: number }
const SPIN = 0.35; // turntable speed, rad/s
/** Cameras are written in the car's own frame (front is +z) and turned with the turntable so close-ups stay on the right part of the car. */
const local = (th: number, p: V3, l: V3, fov: number): Cam => { const c = Math.cos(th), s = Math.sin(th), r = (v: V3): V3 => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; return { p: r(p), l: r(l), fov }; };
const CAMS: ((u: number, th: number) => Cam)[] = [
  (u, th) => local(th, [-7.5 + 2 * u, 1.9 + 0.5 * u, 12.8 - 2.5 * u], [0, 0.9, 0], 50), // wide reveal, pushing in (kept outside the ring of guests)
  (u, th) => local(th, [1.8 - 0.5 * u, 0.7, 4.3 - 0.5 * u], [0.3, 0.65, 2.1], 46), // headlights
  (u, th) => local(th, [3.3, 0.5, 1.9 - 0.7 * u], [0.95, 0.42, 1.4], 44), // wheel
  (u, th) => local(th, [6.3, 1.2, 3.2 - 6.4 * u], [0, 0.75, 0], 40), // side profile sweep
  (u, th) => local(th, [-1.8 + 0.8 * u, 1.2, -5.7 + 0.9 * u], [0, 0.8, -2.2], 46), // rear
  (u) => { const a = 0.4 + u * 2.0; return { p: [Math.sin(a) * 12, 2.4 + u * 1.0, Math.cos(a) * 12], l: [0, 0.9, 0], fov: 48 }; }, // closing orbit (not tied to the car)
];

function Stage({ accent, light }: { accent: string; light: boolean }) {
  const bokeh = useMemo(() => {
    const r = rng(7), g = new SphereGeometry(0.35, 6, 4), n = light ? 50 : 110, out: BufferGeometry[] = [];
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 32 + r() * 30, c = g.clone(); c.scale(1 + r() * 1.5, 1 + r() * 1.5, 1 + r() * 1.5); c.translate(Math.cos(a) * d, 2 + r() * 24, Math.sin(a) * d); const col = new Color(['#FFD58A', '#FF9ECF', '#9ED8FF', '#FFFFFF'][Math.floor(r() * 4)]), arr = new Float32Array(c.attributes.position.count * 3); for (let k = 0; k < arr.length; k += 3) { arr[k] = col.r; arr[k + 1] = col.g; arr[k + 2] = col.b; } c.setAttribute('color', new Float32BufferAttribute(arr, 3)); c.deleteAttribute('uv'); c.deleteAttribute('normal'); out.push(c); }
    const pos: number[] = [], colr: number[] = []; out.forEach((c) => { const nonIdx = c.index ? c.toNonIndexed() : c; pos.push(...(nonIdx.attributes.position.array as Float32Array)); colr.push(...(nonIdx.attributes.color.array as Float32Array)); });
    const m = new Float32BufferAttribute(pos, 3); const h = new SphereGeometry(1, 1, 1); h.setAttribute('position', m); h.setAttribute('color', new Float32BufferAttribute(colr, 3)); h.setIndex(null); return h;
  }, [light]);
  const sky = useMemo(() => { const s = new SphereGeometry(120, 20, 12), p = s.attributes.position, a = new Float32Array(p.count * 3), top = new Color('#150B2E'), hor = new Color('#6B2F6E'), c = new Color(); for (let i = 0; i < p.count; i++) { const t = MathUtils.clamp(p.getY(i) / 120, 0, 1); c.copy(hor).lerp(top, Math.pow(t, 0.6)); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } s.setAttribute('color', new Float32BufferAttribute(a, 3)); return s; }, []);
  return (
    <>
      <mesh geometry={sky}><meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} /></mesh>
      <mesh geometry={bokeh}><meshBasicMaterial vertexColors fog={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><circleGeometry args={[60, 40]} /><meshStandardMaterial color="#14141C" roughness={0.3} metalness={0.7} /></mesh>
      <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[3.7, 3.8, 0.18, 40]} /><meshStandardMaterial color="#2A2C38" roughness={0.25} metalness={0.7} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}><torusGeometry args={[3.55, 0.05, 8, 60]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.5} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><torusGeometry args={[6.6, 0.04, 8, 80]} /><meshStandardMaterial color="#FFFFFF" emissive="#B9A4FF" emissiveIntensity={1.4} /></mesh>
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.sin(i * 1.57 + 0.8) * 4.2, 5, Math.cos(i * 1.57 + 0.8) * 4.2]} rotation={[Math.cos(i * 1.57 + 0.8) * 0.45, 0, -Math.sin(i * 1.57 + 0.8) * 0.45]}><coneGeometry args={[2.6, 10, 20, 1, true]} /><meshBasicMaterial color={i % 2 ? '#FFE9B8' : '#CFE0FF'} transparent opacity={0.06} depthWrite={false} side={DoubleSide} /></mesh>)}
      <hemisphereLight args={['#B9A4FF', '#201830', 0.9]} />
      <directionalLight position={[5, 8, 6]} intensity={2.6} color="#FFF1D6" />
      <directionalLight position={[-6, 4, -5]} intensity={1.8} color="#8FB4FF" />
      <pointLight position={[0, 0.5, 0]} intensity={14} distance={9} color={accent} />
    </>
  );
}

/** Party guests: baked real characters in a cheering pose, bobbing in a ring round the stage. Some hold up champagne. */
function Party({ count, poppers, light }: { count: number; poppers: number; light: boolean }) {
  const guests = useMemo(() => Array.from({ length: count }, (_, i) => { const a = (i / count) * Math.PI * 2 + 0.3, r = 8.8 + (i % 2) * 1.0; return { x: Math.sin(a) * r, z: Math.cos(a) * r, yaw: a + Math.PI, pose: i < poppers ? 'pop' as const : 'cheer' as const, geo: bakeCharacter(crowdLook(i + 3), i < poppers ? 'pop' : 'cheer', true), ph: i * 1.3 }; }), [count, poppers]);
  const refs = useRef<(Mesh | null)[]>([]), N = light ? 40 : 70;
  const state = useMemo(() => { const r = rng(3); return Array.from({ length: poppers }, (_, k) => ({ at: [1.0, 1.8, 10.9, 11.6][k % 4], vel: Array.from({ length: N }, () => new Vector3((r() - 0.5) * 1.6, 3.5 + r() * 3, (r() - 0.5) * 1.6)), seed: r() })); }, [poppers, N]);
  const sprayGeo = useRef<BufferGeometry>(null);
  useEffect(() => { sprayGeo.current?.setAttribute('position', new BufferAttribute(new Float32Array(Math.max(1, poppers) * N * 3).fill(-100), 3)); }, [poppers, N]);
  useFrame(({ clock }) => {
    const forced = (globalThis as { __revealT?: number }).__revealT, t = typeof forced === 'number' ? forced : clock.elapsedTime;
    guests.forEach((g, i) => { const m = refs.current[i]; if (m) { m.position.y = Math.abs(Math.sin(t * 5 + g.ph)) * 0.18; m.rotation.z = Math.sin(t * 3 + g.ph) * 0.06; } });
    const pos = sprayGeo.current?.attributes.position as BufferAttribute | undefined; if (!pos) return;
    state.forEach((s, k) => {
      const g = guests[k], age = t - s.at; // the cork pops, a fountain of foam goes up and over
      for (let j = 0; j < N; j++) { const idx = (k * N + j) * 3; if (age < 0 || age > 1.8) { pos.setXYZ(idx / 3, 0, -100, 0); continue; } const v = s.vel[j], a = age * (0.6 + (j % 5) * 0.12); pos.setXYZ(idx / 3, g.x + v.x * a, 2.35 + v.y * a - 4.9 * a * a, g.z + v.z * a); }
    });
    pos.needsUpdate = true;
  });
  return (
    <>
      {guests.map((g, i) => <group key={i} position={[g.x, 0, g.z]} rotation={[0, g.yaw, 0]}><mesh ref={(m) => { refs.current[i] = m; }} geometry={g.geo}><meshStandardMaterial vertexColors roughness={0.9} flatShading side={DoubleSide} /></mesh>{g.pose === 'pop' && <mesh position={[-0.25, 2.3, 0.1]} rotation={[0.25, 0, 0]}><cylinderGeometry args={[0.07, 0.09, 0.42, 8]} /><meshStandardMaterial color="#1F5E3A" roughness={0.3} /></mesh>}</group>)}
      {poppers > 0 && <points frustumCulled={false}><bufferGeometry ref={sprayGeo} /><pointsMaterial color="#FFF3C4" size={0.3} transparent opacity={0.95} sizeAttenuation depthWrite={false} /></points>}
    </>
  );
}

/** Models: women walking past the car in evening wear. Two baked half-steps are swapped to make them walk. */
function Models({ count }: { count: number }) {
  const m = useMemo(() => Array.from({ length: count }, (_, i) => { const look = { ...crowdLook(i * 2), body: 'femme' as const, bottom: 'dress' as const }; return { a: bakeCharacter(look, 'stride', true), b: bakeCharacter(look, 'stride2', true), lane: i % 2 ? -1 : 1, off: i * 2.4 }; }), [count]);
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const forced = (globalThis as { __revealT?: number }).__revealT, t = typeof forced === 'number' ? forced : clock.elapsedTime;
    m.forEach((p, i) => { const mesh = refs.current[i]; if (!mesh) return; const x = ((t * 1.3 + p.off) % 20) - 10; mesh.position.set(p.lane * x, 0.02, p.lane * 5.6 + 0.0); mesh.rotation.y = p.lane > 0 ? Math.PI / 2 : -Math.PI / 2; mesh.geometry = Math.floor(t * 4 + i) % 2 ? p.a : p.b; });
  });
  return <>{m.map((p, i) => <mesh key={i} ref={(r) => { refs.current[i] = r; }} geometry={p.a}><meshStandardMaterial vertexColors roughness={0.9} flatShading side={DoubleSide} /></mesh>)}</>;
}

function Confetti({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null), dummy = useMemo(() => new Object3D(), []);
  const bits = useMemo(() => { const r = rng(11); return Array.from({ length: count }, () => ({ x: (r() - 0.5) * 18, z: (r() - 0.5) * 18, y: 4 + r() * 10, sp: 1.6 + r() * 1.8, sw: r() * 6, spin: 2 + r() * 5, c: CONFETTI[Math.floor(r() * CONFETTI.length)] })); }, [count]);
  useEffect(() => { const c = new Color(); bits.forEach((b, i) => mesh.current?.setColorAt(i, c.set(b.c))); if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true; }, [bits]);
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), t = clock.elapsedTime;
    bits.forEach((b, i) => { b.y -= b.sp * dt; if (b.y < 0) b.y += 13; dummy.position.set(b.x + Math.sin(t * 1.5 + b.sw) * 0.7, b.y, b.z + Math.cos(t * 1.2 + b.sw) * 0.5); dummy.rotation.set(t * b.spin, t * b.spin * 0.7, 0); dummy.updateMatrix(); mesh.current?.setMatrixAt(i, dummy.matrix); });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}><planeGeometry args={[0.16, 0.1]} /><meshBasicMaterial side={DoubleSide} /></instancedMesh>;
}

function World({ car, duration, tier, light, onShot }: { car: VehicleDef; duration: number; tier: Tier; light: boolean; onShot: (i: number) => void }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera, table = useRef<Group>(null), look = useMemo(() => new Vector3(), []), last = useRef(-1), fov = useRef(0);
  useFrame(({ clock }) => {
    const forced = (globalThis as { __revealT?: number }).__revealT, t = Math.min(duration, typeof forced === 'number' ? forced : clock.elapsedTime), th = t * SPIN;
    if (table.current) table.current.rotation.y = th;
    const x = Math.min(SHOTS - 0.001, (t / duration) * SHOTS), i = Math.floor(x), c = CAMS[i](x - i, th);
    camera.position.set(c.p[0] + Math.sin(clock.elapsedTime * 6) * 0.015, c.p[1], c.p[2]); look.set(...c.l); camera.lookAt(look);
    if (fov.current !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); fov.current = c.fov; }
    if (i !== last.current) { last.current = i; onShot(i); }
  });
  const accent = car.color;
  return (
    <>
      <fog attach="fog" args={['#2A1840', 40, 110]} />
      <Stage accent={accent} light={light} />
      <group ref={table} position={[0, 0.18, 0]} scale={1.12}><PlayerCar def={car} /></group>
      <Party count={tier === 'standard' ? (light ? 5 : 7) : tier === 'rich' ? (light ? 7 : 10) : (light ? 8 : 12)} poppers={tier === 'standard' ? 0 : tier === 'rich' ? 2 : 4} light={light} />
      {tier === 'luxury' && <Models count={light ? 3 : 5} />}
      <Confetti count={light ? 110 : 240} />
    </>
  );
}

export default function RevealScene({ car, duration, light, onShot }: { car: VehicleDef; duration: number; light: boolean; onShot: (i: number) => void }) {
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, light ? 1 : 1.5]} camera={{ fov: 48, position: [-6, 2, 10], near: 0.2, far: 300 }} gl={{ antialias: !light, powerPreference: 'high-performance' }}>
        <World car={car} duration={duration} tier={tierOf(car.price)} light={light} onShot={onShot} />
      </Canvas>
    </div>
  );
}
