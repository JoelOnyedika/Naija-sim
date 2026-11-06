import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { BackSide, BoxGeometry, CanvasTexture, Color, Float32BufferAttribute, RepeatWrapping, SphereGeometry, SRGBColorSpace, type BufferAttribute, type Group, type InstancedMesh, type Mesh, Object3D } from 'three';
import { carModelUrl } from '@/data/showroom';
import type { VehicleDef } from '@/data/vehicles';
import { stepDrive, trackTop, TRACK, type CarSpec, type DriveState, type Obstacle } from '@/game/testDrive';
import { CarMesh, Danfo } from '@/features/travel/vehicles3d';
import { glassTexture, wallTexture } from '@/features/travel/textures';
import { PlayerCar } from '@/three/models/CarModel';

/**
 * The Polanco test track in full 3D. The car you are testing is its real 3D model (the same file the showroom and the garage use),
 * driven down a long Lagos avenue at dusk. The maths (game/testDrive.ts) is the same as before; this file only draws it and runs the
 * clock. Scenery is instanced (a few dozen draw calls in all), obstacles are real 3D shapes, and the danfo is the game's own danfo.
 */
export interface DriveRefs { st: MutableRefObject<DriveState>; course: MutableRefObject<Obstacle[]>; inp: MutableRefObject<{ left: boolean; right: boolean; gas: boolean; brake: boolean }>; steer: MutableRefObject<number>; phase: MutableRefObject<string>; onHit: () => void; onDone: () => void; onReady: () => void }
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const tex = (draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, rx = 1, ry = 1): CanvasTexture => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!, w, h); const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; };

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn('[testdrive] car model failed, using a stand-in', e); this.props.onFail(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
/** Mounts only once the car's GLB has loaded (Suspense), then tells the screen it can start. */
function CarReady({ model, onReady }: { model: string; onReady: () => void }) { useGLTF(carModelUrl(model), false); useEffect(() => { onReady(); }, [onReady]); return null; }

function Goat() { return (<group scale={1.25}><mesh position={[0, 0.62, 0]}><boxGeometry args={[0.38, 0.4, 0.9]} /><meshStandardMaterial color="#E8DFC9" /></mesh><mesh position={[0, 0.86, 0.5]}><boxGeometry args={[0.24, 0.26, 0.3]} /><meshStandardMaterial color="#D9CDB0" /></mesh><mesh position={[0.07, 1.04, 0.52]} rotation={[0.4, 0, 0.3]}><coneGeometry args={[0.04, 0.2, 5]} /><meshStandardMaterial color="#4A3A2A" /></mesh><mesh position={[-0.07, 1.04, 0.52]} rotation={[0.4, 0, -0.3]}><coneGeometry args={[0.04, 0.2, 5]} /><meshStandardMaterial color="#4A3A2A" /></mesh>{[[-0.13, -0.35], [0.13, -0.35], [-0.13, 0.35], [0.13, 0.35]].map(([x, z], i) => <mesh key={i} position={[x, 0.2, z]}><cylinderGeometry args={[0.04, 0.035, 0.42, 5]} /><meshStandardMaterial color="#C9BEA6" /></mesh>)}</group>); }
function Drum({ blue }: { blue: boolean }) { return (<group><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.36, 0.36, 1, 14]} /><meshStandardMaterial color={blue ? '#2563EB' : '#C62828'} metalness={0.3} roughness={0.5} /></mesh>{[0.25, 0.75].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.365, 0.025, 6, 16]} /><meshStandardMaterial color="#222" /></mesh>)}</group>); }
function Cone() { return (<group><mesh position={[0, 0.02, 0]}><boxGeometry args={[0.7, 0.04, 0.7]} /><meshStandardMaterial color="#222" /></mesh><mesh position={[0, 0.45, 0]}><coneGeometry args={[0.28, 0.85, 10]} /><meshStandardMaterial color="#F26B1D" /></mesh><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.18, 0.2, 0.14, 10]} /><meshStandardMaterial color="#fff" /></mesh></group>); }
function Pothole({ w }: { w: number }) { return (<group><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><circleGeometry args={[w * 0.55, 20]} /><meshBasicMaterial color="#17181B" /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[w * 0.55, w * 0.7, 20]} /><meshBasicMaterial color="#2B2D31" /></mesh></group>); }

function Obstacles({ list }: { list: Obstacle[] }) {
  return <>{list.map((o, i) => (
    <group key={i} position={[o.x, 0, -o.z]} rotation={[0, o.kind === 'goat' ? (i % 2 ? 1.2 : -1.2) : Math.PI, 0]}>
      {o.kind === 'danfo' ? <Danfo slogan={i} /> : o.kind === 'goat' ? <Goat /> : o.kind === 'drum' ? <Drum blue={i % 2 === 0} /> : o.kind === 'cone' ? <Cone /> : <Pothole w={o.w} />}
    </group>
  ))}</>;
}

/** Everything that does not move: road, kerbs, zone, finish line, barrier, sidewalks, towers, palms, lamps. */
function Track() {
  const roadTex = useMemo(() => tex((c, w, h) => { c.fillStyle = '#454952'; c.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},0.035)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.fillStyle = '#E6E2D4'; const u = (x: number) => (x / 9) * w; c.fillRect(u(3) - 1.5, 0, 3, h * 0.45); c.fillRect(u(6) - 1.5, 0, 3, h * 0.45); c.fillRect(0, 0, 8, h); c.fillRect(w - 8, 0, 8, h); }, 128, 256, 1, TRACK.length / 10), []);
  const kerbTex = useMemo(() => tex((c, w, h) => { c.fillStyle = '#F4F1EA'; c.fillRect(0, 0, w, h); c.fillStyle = '#D62828'; c.fillRect(0, 0, w, h / 2); }, 8, 32, 1, TRACK.length / 2), []);
  const zoneTex = useMemo(() => tex((c, w, h) => { c.fillStyle = '#F5C518'; c.fillRect(0, 0, w, h); c.fillStyle = '#B88A00'; for (let i = -h; i < w + h; i += 28) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 14, h); c.lineTo(i + 14 + h, 0); c.lineTo(i + h, 0); c.fill(); } }, 128, 128, 1, 9), []);
  const checker = useMemo(() => tex((c, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 9; x++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect((x * w) / 9, (y * h) / 2, w / 9, h / 2); } }, 180, 40), []);
  const stripe = useMemo(() => tex((c, w, h) => { for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#fff' : '#D62828'; c.fillRect((i * w) / 9, 0, w / 9, h); } }, 180, 40), []);
  const wall = useMemo(() => wallTexture(), []), glass = useMemo(() => glassTexture(), []);
  const bld = useRef<InstancedMesh>(null), bld2 = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null), crowns = useRef<InstancedMesh>(null), poles = useRef<InstancedMesh>(null), globes = useRef<InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(77), A: { x: number; z: number; w: number; h: number; c: string }[] = [], B: typeof A = [], palms: [number, number][] = [], lamps: [number, number][] = [];
    for (let z = 10; z < TRACK.length + 60; z += 16 + r() * 8) for (const side of [-1, 1]) { const w = 7 + r() * 8, h = 9 + r() * 34, o = { x: side * (13 + w / 2 + r() * 4), z: -z, w, h, c: ['#F1D9B8', '#E6D3B8', '#D8C6A6', '#F0E2C6'][Math.floor(r() * 4)] }; (r() < 0.5 ? A : B).push(o); }
    for (let z = 6; z < TRACK.length + 40; z += 26) { palms.push([-7.4, -z], [7.4, -z - 13]); }
    for (let z = 20; z < TRACK.length + 40; z += 44) { lamps.push([-5.8, -z], [5.8, -z]); }
    return { A, B, palms, lamps };
  }, []);
  const gA = useMemo(() => { const g = new BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; }, []);
  useEffect(() => {
    const d = new Object3D(), col = new Color();
    const fill = (m: InstancedMesh | null, arr: typeof data.A) => { if (!m) return; arr.forEach((b, i) => { d.position.set(b.x, 0, b.z); d.scale.set(b.w, b.h, 9); d.rotation.set(0, 0, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, col.set(b.c)); }); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; };
    fill(bld.current, data.A); fill(bld2.current, data.B);
    data.palms.forEach(([x, z], i) => { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 2.5, z); d.updateMatrix(); trunks.current?.setMatrixAt(i, d.matrix); d.position.set(x, 5.3, z); d.scale.set(2.2, 0.55, 2.2); d.rotation.set(0, i, 0); d.updateMatrix(); crowns.current?.setMatrixAt(i, d.matrix); });
    data.lamps.forEach(([x, z], i) => { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 2.6, z); d.updateMatrix(); poles.current?.setMatrixAt(i, d.matrix); d.position.set(x + (x < 0 ? 0.6 : -0.6), 5.3, z); d.updateMatrix(); globes.current?.setMatrixAt(i, d.matrix); });
    [trunks, crowns, poles, globes].forEach((r) => { if (r.current) r.current.instanceMatrix.needsUpdate = true; });
  }, [data]);
  const L = TRACK.length;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -L / 2]}><planeGeometry args={[600, L + 700]} /><meshStandardMaterial color="#5E8F55" roughness={1} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 6.9, 0.012, -L / 2]}><planeGeometry args={[3.4, L + 200]} /><meshStandardMaterial color="#B3A69A" roughness={1} /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -L / 2]}><planeGeometry args={[9, L + 100]} /><meshStandardMaterial map={roadTex} roughness={0.95} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 4.75, 0.02, -L / 2]}><planeGeometry args={[0.5, L + 100]} /><meshStandardMaterial map={kerbTex} /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -(TRACK.finish + TRACK.zoneEnd) / 2]}><planeGeometry args={[9, TRACK.zoneEnd - TRACK.finish]} /><meshStandardMaterial map={zoneTex} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -TRACK.finish]}><planeGeometry args={[9, 1.6]} /><meshBasicMaterial map={checker} /></mesh>
      <mesh position={[0, 1.1, -L - 0.5]}><boxGeometry args={[9.6, 2.2, 0.8]} /><meshStandardMaterial map={stripe} /></mesh>
      <mesh position={[0, 4.6, -TRACK.finish]}><boxGeometry args={[10, 0.5, 0.5]} /><meshStandardMaterial map={checker} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 5.2, 2.2, -TRACK.finish]}><boxGeometry args={[0.4, 4.4, 0.4]} /><meshStandardMaterial color="#222" /></mesh>)}
      <instancedMesh ref={bld} args={[gA, undefined, data.A.length]}><meshStandardMaterial map={wall} roughness={0.85} emissive="#FFC77A" emissiveIntensity={0.14} /></instancedMesh>
      <instancedMesh ref={bld2} args={[gA, undefined, data.B.length]}><meshStandardMaterial map={glass} roughness={0.5} emissive="#FFC77A" emissiveIntensity={0.12} /></instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, data.palms.length]}><cylinderGeometry args={[0.16, 0.24, 5, 7]} /><meshStandardMaterial color="#8A6B4A" /></instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, data.palms.length]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#2F8A55" /></instancedMesh>
      <instancedMesh ref={poles} args={[undefined, undefined, data.lamps.length]}><cylinderGeometry args={[0.08, 0.12, 5.2, 6]} /><meshStandardMaterial color="#4B4540" /></instancedMesh>
      <instancedMesh ref={globes} args={[undefined, undefined, data.lamps.length]}><sphereGeometry args={[0.32, 10, 8]} /><meshBasicMaterial color="#FFE9A0" /></instancedMesh>
    </>
  );
}

function Sky({ follow }: { follow: MutableRefObject<Group | null> }) {
  const dome = useMemo(() => {
    const g = new SphereGeometry(380, 24, 14), p = g.attributes.position as BufferAttribute, col = new Float32Array(p.count * 3), top = new Color('#3F4A9A'), mid = new Color('#C9617E'), hor = new Color('#FFB066'), c = new Color();
    for (let i = 0; i < p.count; i++) { const t = Math.max(0, Math.min(1, p.getY(i) / 380)); if (t < 0.22) c.copy(hor).lerp(mid, t / 0.22); else c.copy(mid).lerp(top, (t - 0.22) / 0.78); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new Float32BufferAttribute(col, 3)); return g;
  }, []);
  return (<group ref={follow}><mesh geometry={dome}><meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} /></mesh><mesh position={[40, 60, -340]}><circleGeometry args={[34, 32]} /><meshBasicMaterial color="#FFE2A8" fog={false} /></mesh><mesh position={[40, 60, -341]}><circleGeometry args={[62, 32]} /><meshBasicMaterial color="#FFB066" transparent opacity={0.3} fog={false} depthWrite={false} /></mesh></group>);
}

function Scene({ v, spec, refs }: { v: Pick<VehicleDef, 'color' | 'model'>; spec: CarSpec; refs: DriveRefs }) {
  const car = useRef<Group>(null), sky = useRef<Group | null>(null), brake1 = useRef<Mesh>(null), brake2 = useRef<Mesh>(null), frames = useRef(0), wasHits = useRef(0), done = useRef(false), shown = useRef(false);
  const top = trackTop(spec), course = refs.course.current;
  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(0.05, rawDt), s = refs.st.current;
    if (refs.phase.current === 'drive') {
      const target = (refs.inp.current.right ? 1 : 0) - (refs.inp.current.left ? 1 : 0); refs.steer.current += (target - refs.steer.current) * Math.min(1, dt * 12);
      let left = dt; while (left > 0) { const h = Math.min(1 / 60, left); stepDrive(s, { steer: refs.steer.current, gas: refs.inp.current.gas ? 1 : 0, brake: refs.inp.current.brake ? 1 : 0 }, h, spec, refs.course.current); left -= h; }
      if (s.hits > wasHits.current) { wasHits.current = s.hits; refs.onHit(); }
      if (s.phase === 'done' && !done.current) { done.current = true; refs.onDone(); }
    } else if (refs.phase.current !== 'result') { done.current = false; wasHits.current = 0; }
    const rush = Math.min(1, s.v / top), st = refs.steer.current;
    if (car.current) { car.current.position.set(s.x, 0, -s.z); car.current.rotation.set(s.braking ? 0.012 : -0.008 * rush, Math.PI - st * 0.16 * Math.min(1, 0.3 + rush), -st * 0.04 * rush); car.current.visible = !(s.inv > 0 && Math.floor(performance.now() / 90) % 2); }
    [brake1.current, brake2.current].forEach((b, i) => { if (b) { b.position.set(s.x + (i ? 0.52 : -0.52), 0.8, -s.z + 2.2); (b.material as unknown as { emissiveIntensity: number }).emissiveIntensity = s.braking ? 4 : 0.35; } });
    const shake = rush * 0.035;
    camera.position.set(s.x * 0.55 + Math.sin(performance.now() * 0.047) * shake, 2.6 - rush * 0.35 + Math.cos(performance.now() * 0.061) * shake, -s.z + 7.4 + rush * 2.4);
    camera.lookAt(s.x * 0.5, 1.05, -s.z - 12);
    (camera as unknown as { fov: number; updateProjectionMatrix: () => void }).fov = 56 + rush * 17; (camera as unknown as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    if (sky.current) sky.current.position.set(camera.position.x, 0, camera.position.z);
    if (++frames.current === 3 && !shown.current) shown.current = true;
  });
  return (
    <>
      <fog attach="fog" args={['#F0A06A', 70, 330]} />
      <hemisphereLight args={['#FFD9A8', '#5B4A5E', 1.45]} /><directionalLight position={[40, 30, 20]} intensity={2.1} color="#FFB872" />
      <Sky follow={sky} /><Track /><Obstacles list={course} />
      <group ref={car}>
        <Boundary onFail={refs.onReady} fallback={<CarMesh kind="sedan" hex={v.color} />}>
          <Suspense fallback={null}><CarReady model={v.model} onReady={refs.onReady} /><PlayerCar def={v} /></Suspense>
        </Boundary>
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.3, 5.2]} /><meshBasicMaterial color="#000" transparent opacity={0.28} /></mesh>
      </group>
      {[-0.72, 0.72].map((x, i) => <mesh key={x} ref={i ? brake2 : brake1} position={[x, 0.82, 2.3]}><boxGeometry args={[0.3, 0.07, 0.04]} /><meshStandardMaterial color="#400" emissive="#FF1A1A" emissiveIntensity={0.35} /></mesh>)}
    </>
  );
}
// The tail lamps live in world space (not in the rotated car group), so they follow the car's x through the group transform below.

export default function DriveScene({ v, spec, refs }: { v: Pick<VehicleDef, 'color' | 'model'>; spec: CarSpec; refs: DriveRefs }) {
  return (
    <Canvas className="absolute inset-0" dpr={[1, 1.6]} camera={{ fov: 56, position: [0, 2.6, 7.4], near: 0.2, far: 800 }} gl={{ antialias: true }}>
      <Scene v={v} spec={spec} refs={refs} />
    </Canvas>
  );
}
