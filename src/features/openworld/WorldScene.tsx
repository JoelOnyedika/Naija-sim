import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { CanvasTexture, Color, DoubleSide, DynamicDrawUsage, SRGBColorSpace, MeshStandardMaterial, Object3D, Vector3, type Group, type InstancedMesh, type Mesh } from 'three';
import { ACCESSORIES, BOTTOM_STYLES, CLOTH_COLORS, HAIR_COLORS, HAIR_STYLES, SHOE_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import { sfx } from '@/audio/sfx';
import { WEAPONS } from '@/data/weapons';
import type { StreetModel } from '@/data/streetCars';
import { StreetFleet } from '@/three/models/StreetCar';
import { addHeat } from '@/game/weapons';
import { useWeaponStore } from '@/stores/weaponStore';
import { getStreetEvent } from '@/data/streetEvents';
import { AK_MUZZLE, Avatar, type HeadCargo, type Motion } from '@/three/avatar/Avatar';
import type { Appearance } from '@/types/game';
import { say, type Combat } from './combat';
import { assistAim, canFire, officersFor, reload, shoot, spend, stars, type V3 } from './shooting';
import { BLOCK, EXTENT, GRID, PITCH, ROAD, blockCentre, driveStep, groundY, ownedSpots, resolveMove, signalState, stopLineAhead, trafficSpeed, type City } from './worldGen';
import { PlayerCar } from '@/three/models/CarModel';
import { getVehicle, type VehicleDef } from '@/data/vehicles';
import { useVehicleStore } from '@/stores/vehicleStore';

export interface WorldInput { mx: number; mz: number; run: boolean; yaw: number; pitch: number; frozen?: boolean;
  /** Driving pedals (held buttons or W / S): the accelerator and the brake, which reverses once the car has stopped. */
  gas?: boolean; brake?: boolean }
export interface WorldState { x: number; z: number; heading: number }
/** The player's own cars in the open world: where each is, which one is being driven, which one is close enough to get into. */
export interface DriveState { carId: string | null; near: string | null; enterReq: boolean; exitReq: boolean; speed: number; cars: Record<string, { x: number; z: number; heading: number; speed: number }> }

const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)];
const mulberry = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Everything that never changes is drawn with a handful of instanced meshes: one draw call per kind, not per building. */
/** A signal head at every approach of every junction, red or green with the cycle in worldGen.signalState. */
function TrafficLights() {
  const heads = useRef<InstancedMesh>(null), poles = useRef<InstancedMesh>(null), last = useRef('');
  const spots = useMemo(() => { const out: { x: number; z: number; axis: 'x' | 'z' }[] = [], off = ROAD / 2 + 2.5, k = ROAD / 2 + 0.6;
    for (let a = 0; a <= GRID; a++) for (let b = 0; b <= GRID; b++) { const jx = (a - GRID / 2) * PITCH, jz = (b - GRID / 2) * PITCH;
      out.push({ x: jx - off, z: jz + k, axis: 'x' }, { x: jx + off, z: jz - k, axis: 'x' }, { x: jx - k, z: jz - off, axis: 'z' }, { x: jx + k, z: jz + off, axis: 'z' }); }
    return out; }, []);
  useEffect(() => { const o = new Object3D(); spots.forEach((s, i) => { o.position.set(s.x, 0.3 + 2.4, s.z); o.updateMatrix(); poles.current!.setMatrixAt(i, o.matrix); o.position.set(s.x, 0.3 + 5.0, s.z); o.updateMatrix(); heads.current!.setMatrixAt(i, o.matrix); }); poles.current!.instanceMatrix.needsUpdate = true; heads.current!.instanceMatrix.needsUpdate = true; }, [spots]);
  const col = useMemo(() => ({ g: new Color('#22E06B'), r: new Color('#FF3B30') }), []);
  useFrame(() => { const s = signalState(performance.now() / 1000), key = `${s.x}${s.z}`; if (key === last.current) return; last.current = key; spots.forEach((p, i) => heads.current!.setColorAt(i, (p.axis === 'x' ? s.x : s.z) ? col.g : col.r)); if (heads.current!.instanceColor) heads.current!.instanceColor.needsUpdate = true; });
  return (<>
    <instancedMesh ref={poles} args={[undefined, undefined, spots.length]} frustumCulled={false}><cylinderGeometry args={[0.09, 0.11, 4.8, 6]} /><meshStandardMaterial color="#2A2E34" /></instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, spots.length]} frustumCulled={false}><boxGeometry args={[0.7, 0.9, 0.5]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
  </>);
}

/** Road furniture: white edge lines along every road, zebra crossings on all four arms of every junction, and street lamps on the pavement corners. */
function RoadDetails() {
  const edge = useRef<InstancedMesh>(null), zebra = useRef<InstancedMesh>(null), poles = useRef<InstancedMesh>(null), heads = useRef<InstancedMesh>(null), kerb = useRef<InstancedMesh>(null);
  const lampSpots = useMemo(() => { const out: { x: number; z: number; ry: number }[] = []; for (let a = 0; a < GRID; a += 1) for (let b = 0; b < GRID; b += 1) { if ((a + b) % 2) continue; const cx = blockCentre(a), cz = blockCentre(b), o = BLOCK / 2 - 1.2; out.push({ x: cx + o, z: cz + o, ry: Math.PI * 0.75 }, { x: cx - o, z: cz - o, ry: -Math.PI * 0.25 }); } return out; }, []);
  const N_ZEBRA = (GRID + 1) * (GRID + 1) * 4 * 7, N_EDGE = (GRID + 1) * 2 * 2, N_KERB = GRID * GRID;
  useEffect(() => {
    const o = new Object3D(); let n = 0;
    for (let r = 0; r <= GRID; r++) { const line = (r - GRID / 2) * PITCH; for (const sd of [-1, 1]) { o.rotation.set(0, 0, 0); o.position.set(0, 0.035, line + sd * (ROAD / 2 - 0.55)); o.scale.set(EXTENT * 2 + 8, 0.02, 0.22); o.updateMatrix(); edge.current!.setMatrixAt(n++, o.matrix); o.position.set(line + sd * (ROAD / 2 - 0.55), 0.035, 0); o.scale.set(0.22, 0.02, EXTENT * 2 + 8); o.updateMatrix(); edge.current!.setMatrixAt(n++, o.matrix); } }
    edge.current!.count = n; edge.current!.instanceMatrix.needsUpdate = true;
    let z = 0;
    for (let a = 0; a <= GRID; a++) for (let b = 0; b <= GRID; b++) { const jx = (a - GRID / 2) * PITCH, jz = (b - GRID / 2) * PITCH, off = ROAD / 2 + 2.4;
      for (const [dx, dz, along] of [[off, 0, 'x'], [-off, 0, 'x'], [0, off, 'z'], [0, -off, 'z']] as const) for (let k = -3; k <= 3; k++) {
        o.position.set(jx + dx + (along === 'z' ? k * 1.5 : 0), 0.036, jz + dz + (along === 'x' ? k * 1.5 : 0)); o.scale.set(along === 'x' ? 3.4 : 0.7, 0.02, along === 'x' ? 0.7 : 3.4); o.updateMatrix(); zebra.current!.setMatrixAt(z++, o.matrix); } }
    zebra.current!.instanceMatrix.needsUpdate = true;
    lampSpots.forEach((l, i) => { o.rotation.set(0, 0, 0); o.position.set(l.x, 0.3 + 3.2, l.z); o.scale.set(1, 1, 1); o.updateMatrix(); poles.current!.setMatrixAt(i, o.matrix); o.position.set(l.x - Math.sin(l.ry) * 0.9, 0.3 + 6.5, l.z - Math.cos(l.ry) * 0.9); o.updateMatrix(); heads.current!.setMatrixAt(i, o.matrix); });
    poles.current!.instanceMatrix.needsUpdate = true; heads.current!.instanceMatrix.needsUpdate = true;
    for (let a = 0, i = 0; a < GRID; a++) for (let b = 0; b < GRID; b++, i++) { o.position.set(blockCentre(a), 0.31, blockCentre(b)); o.scale.set(BLOCK + 0.6, 0.04, BLOCK + 0.6); o.updateMatrix(); kerb.current!.setMatrixAt(i, o.matrix); }
    kerb.current!.instanceMatrix.needsUpdate = true;
  }, [lampSpots]);
  return (<>
    <instancedMesh ref={edge} args={[undefined, undefined, N_EDGE]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#E9E9E4" /></instancedMesh>
    <instancedMesh ref={zebra} args={[undefined, undefined, N_ZEBRA]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#F2F2EE" /></instancedMesh>
    <instancedMesh ref={poles} args={[undefined, undefined, lampSpots.length]} frustumCulled={false}><cylinderGeometry args={[0.1, 0.14, 6.4, 6]} /><meshStandardMaterial color="#3A3F46" roughness={0.6} metalness={0.4} /></instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, lampSpots.length]} frustumCulled={false}><boxGeometry args={[1.5, 0.18, 0.4]} /><meshBasicMaterial color="#FFE9A8" /></instancedMesh>
    <instancedMesh ref={kerb} args={[undefined, undefined, N_KERB]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#8E8B84" roughness={1} /></instancedMesh>
  </>);
}

/** Windows drawn in the wall shader from world position: a grid of glass on every side face above the ground floor, a few lit at random. No textures, no extra meshes. */
function windowShader(sh: { vertexShader: string; fragmentShader: string }) {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nfloat hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }').replace('#include <color_fragment>', `#include <color_fragment>
    vec3 fn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
    if (abs(fn.y) < 0.5 && vWPos.y > 4.2) {
      float u = abs(fn.x) > abs(fn.z) ? vWPos.z : vWPos.x;
      vec2 g = vec2(u / 3.4, vWPos.y / 3.8), id = floor(g), f = fract(g);
      float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.22, f.y) * step(f.y, 0.78);
      float lit = step(0.72, hash21(id + vec2(floor(vWPos.x * 0.07), floor(vWPos.z * 0.07))));
      vec3 glass = mix(vec3(0.13, 0.19, 0.26) + 0.12 * f.y, vec3(1.0, 0.86, 0.5), lit * 0.85);
      diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
      diffuseColor.rgb *= 1.0 - 0.18 * step(f.y, 0.1) * (1.0 - win); // a ledge line under each floor
    }`);
}

function Buildings({ city }: { city: City }) {
  const body = useRef<InstancedMesh>(null), roofs = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null), crowns = useRef<InstancedMesh>(null);
  useEffect(() => {
    const o = new Object3D(), c = new Color();
    city.buildings.forEach((b, i) => {
      o.position.set(b.x, 0.3 + b.h / 2, b.z); o.scale.set(b.w, b.h, b.d); o.rotation.set(0, 0, 0); o.updateMatrix(); body.current!.setMatrixAt(i, o.matrix); body.current!.setColorAt(i, c.set(b.color));
      o.position.set(b.x, 0.3 + b.h + 0.25, b.z); o.scale.set(b.w + 0.6, 0.5, b.d + 0.6); o.updateMatrix(); roofs.current!.setMatrixAt(i, o.matrix); roofs.current!.setColorAt(i, c.set(b.roof));
    });
    city.trees.forEach((t, i) => {
      o.position.set(t.x, 0.3 + 1 * t.s, t.z); o.scale.set(0.35 * t.s, 2 * t.s, 0.35 * t.s); o.updateMatrix(); trunks.current!.setMatrixAt(i, o.matrix);
      o.position.set(t.x, 0.3 + 3.2 * t.s, t.z); o.scale.set(2.2 * t.s, 2.4 * t.s, 2.2 * t.s); o.updateMatrix(); crowns.current!.setMatrixAt(i, o.matrix);
    });
    for (const m of [body, roofs, trunks, crowns]) { m.current!.instanceMatrix.needsUpdate = true; if (m.current!.instanceColor) m.current!.instanceColor.needsUpdate = true; }
  }, [city]);
  return (<>
    <instancedMesh ref={body} args={[undefined, undefined, city.buildings.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={0.95} onBeforeCompile={windowShader} customProgramCacheKey={() => 'naija-windows'} /></instancedMesh>
    <instancedMesh ref={roofs} args={[undefined, undefined, city.buildings.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={1} /></instancedMesh>
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
const signTexture = (name: string, icon: string, bg: string) => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 192; const x = c.getContext('2d')!;
  x.fillStyle = bg; x.fillRect(0, 0, 1024, 192); x.strokeStyle = '#E5B93C'; x.lineWidth = 10; x.strokeRect(10, 10, 1004, 172);
  x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle'; let size = 84; x.font = `800 ${size}px system-ui, sans-serif`; const label = name.toUpperCase();
  while (x.measureText(label).width > 840 && size > 30) { size -= 4; x.font = `800 ${size}px system-ui, sans-serif`; }
  x.fillText(label, 540, 100); x.font = '90px system-ui, sans-serif'; x.fillText(icon, 94, 100);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t;
};
/**
 * What makes each landmark look like itself from the street: a name board over the door, steps and a podium; columns and a pediment on schools, government
 * and cultural buildings; a market awning; a neon strip on clubs. The University of Lagos also gets its gate arch and lawns on the road side.
 */
function LandmarkFacades({ city }: { city: City }) {
  const items = useMemo(() => city.landmarks.map((l) => ({ l, b: city.buildings.find((x) => x.landmark === l.id)! })).filter((x) => x.b), [city]);
  const textures = useMemo(() => items.map(({ l }) => signTexture(l.name.replace(/,.*$/, ''), l.icon, l.category === 'club' ? '#2A1646' : l.category === 'market' ? '#7A2E12' : '#142B45')), [items]);
  useEffect(() => () => { textures.forEach((t) => t.dispose()); }, [textures]);
  const stone = '#E9E4DA', dark = '#2B2F36';
  return (<>{items.map(({ l, b }, i) => {
    const zf = b.z + b.d / 2, big = b.d < 16, columns = !big && (l.category === 'government' || l.category === 'culture' || l.category === 'business');
    const nCol = Math.max(4, Math.floor(b.w / 4.2)), colH = Math.min(b.h - 1.5, 9);
    return (
      <group key={l.id}>
        {/* podium and steps */}
        <mesh position={[b.x, 0.3 + 0.35, b.z]} receiveShadow><boxGeometry args={[b.w + 3, 0.7, b.d + 3]} /><meshStandardMaterial color="#B9B2A4" roughness={1} /></mesh>
        <mesh position={[b.x, 0.3 + 0.2, zf + 1.85]}><boxGeometry args={[9, 0.4, 0.7]} /><meshStandardMaterial color="#CFC8B8" roughness={1} /></mesh>
        {/* name board */}
        <mesh position={[b.x, 0.3 + Math.min(b.h - 1.8, 6.4), zf + 0.2]}><planeGeometry args={[Math.min(b.w - 1, 15), 2.8]} /><meshBasicMaterial map={textures[i]} side={DoubleSide} toneMapped={false} /></mesh>
        {columns && (<>
          {Array.from({ length: nCol }, (_, k) => <mesh key={k} position={[b.x - b.w / 2 + 1.6 + k * ((b.w - 3.2) / (nCol - 1)), 0.7 + colH / 2, zf + 1.6]} castShadow><cylinderGeometry args={[0.55, 0.62, colH, 10]} /><meshStandardMaterial color={stone} roughness={0.8} /></mesh>)}
          <mesh position={[b.x, 0.7 + colH + 0.45, zf + 1.6]}><boxGeometry args={[b.w, 0.9, 2.2]} /><meshStandardMaterial color={stone} roughness={0.8} /></mesh>
          <mesh position={[b.x, 0.7 + colH + 1.55, zf + 1.6]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[2.4, 2.4, 2.2]} /><meshStandardMaterial color={stone} roughness={0.8} /></mesh>
        </>)}
        {l.category === 'market' && Array.from({ length: 8 }, (_, k) => <mesh key={k} position={[b.x - b.w / 2 + 1.6 + k * ((b.w - 3.2) / 7), 0.3 + 3.9, zf + 2.4]} rotation={[0.45, 0, 0]}><boxGeometry args={[(b.w - 3.2) / 7 - 0.1, 0.1, 3.4]} /><meshStandardMaterial color={k % 2 ? '#F4F1EA' : '#E4572E'} roughness={0.9} /></mesh>)}
        {l.category === 'club' && <mesh position={[b.x, 0.3 + 3.2, zf + 0.25]}><boxGeometry args={[b.w - 2, 0.25, 0.2]} /><meshBasicMaterial color="#FF3DCB" toneMapped={false} /></mesh>}
        {l.id === 'lagos.unilag' && (<>
          {/* the main gate: two piers, a lintel with the university's name, and a low wall each side */}
          {[-7, 7].map((dx) => <mesh key={dx} position={[b.x + dx, 0.3 + 4, b.z + 18.6]} castShadow><boxGeometry args={[2.2, 8, 2.2]} /><meshStandardMaterial color="#C9B79C" roughness={0.9} /></mesh>)}
          <mesh position={[b.x, 0.3 + 8.6, b.z + 18.6]} castShadow><boxGeometry args={[18.4, 1.8, 2.4]} /><meshStandardMaterial color="#C9B79C" roughness={0.9} /></mesh>
          <mesh position={[b.x, 0.3 + 8.6, b.z + 19.85]}><planeGeometry args={[16, 1.5]} /><meshBasicMaterial map={textures[i]} toneMapped={false} /></mesh>
          {[-14, 14].map((dx) => <mesh key={dx} position={[b.x + dx * 1.0, 0.3 + 1.1, b.z + 18.6]}><boxGeometry args={[11, 2.2, 0.8]} /><meshStandardMaterial color="#B9B2A4" roughness={1} /></mesh>)}
          {/* lawns and flagpoles */}
          {[-10, 10].map((dx) => <mesh key={dx} position={[b.x + dx, 0.34, b.z + 15.6]}><boxGeometry args={[11, 0.08, 6]} /><meshStandardMaterial color="#4B9A57" roughness={1} /></mesh>)}
          {[-3, 0, 3].map((dx, k) => <group key={dx} position={[b.x + dx, 0.3, b.z + 16.2]}><mesh position={[0, 4.5, 0]}><cylinderGeometry args={[0.06, 0.08, 9, 6]} /><meshStandardMaterial color="#C9CED1" metalness={0.6} roughness={0.4} /></mesh><mesh position={[0.7, 8.2, 0]}><boxGeometry args={[1.4, 0.9, 0.04]} /><meshBasicMaterial color={['#0B8F4D', '#F4F1EA', '#0B8F4D'][k]} /></mesh></group>)}
        </>)}
        {/* two lamps flanking the door */}
        {[-1, 1].map((sd) => <group key={sd} position={[b.x + sd * 6.4, 0.3, zf + 1.2]}><mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.07, 0.09, 3.2, 6]} /><meshStandardMaterial color={dark} /></mesh><mesh position={[0, 3.3, 0]}><sphereGeometry args={[0.28, 8, 6]} /><meshBasicMaterial color="#FFE9A8" toneMapped={false} /></mesh></group>)}
      </group>
    );
  })}</>);
}
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
function Pedestrian({ id, look, centre, seed, player, combat, cargo }: { id: string; cargo?: HeadCargo | null; look: Appearance; centre: [number, number]; seed: number; player: MutableRefObject<WorldState>; combat: MutableRefObject<Combat> }) {
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
  return <group ref={g}>{near ? <Avatar appearance={look} motion={motion} cargo={cargo} /> : <Impostor look={look} motion={motion} />}</group>;
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
const CAR_MODELS: StreetModel[] = ['sedan', 'hatch', 'wagon', 'pickup_s', 'pickup_l'];
interface CarDef { axis: 'x' | 'z'; lane: number; dir: 1 | -1; t: number; speed: number; v?: number; kind: 'car' | 'danfo' | 'bus'; colour: string; model: StreetModel }

/** One model's cars as two instanced meshes (painted body + dark trim) from the real street-car GLBs. `place(i, o)` positions instance i; colours are set once, when the meshes appear. */
function Fleet({ model, colours, bind }: { model: StreetModel; colours: string[]; bind: (m: StreetModel, body: InstancedMesh | null, trim: InstancedMesh | null) => void }) {
  const refs = useRef<{ body: InstancedMesh | null; trim: InstancedMesh | null }>({ body: null, trim: null });
  const tmp = useMemo(() => new Color(), []);
  const upd = () => { const { body, trim } = refs.current; if (!body || !trim) return; colours.forEach((c, i) => body.setColorAt(i, tmp.set(c))); if (body.instanceColor) body.instanceColor.needsUpdate = true; bind(model, body, trim); };
  return <StreetFleet model={model} n={colours.length} refBody={(m) => { refs.current.body = m; upd(); }} refTrim={(m) => { refs.current.trim = m; upd(); }} fallback={null} />;
}

/** All moving traffic: real car models, instanced per model (a handful of draw calls for 150 cars). Cars keep to their own lane and direction, spaced out so the roads look busy but never pile up. Danfos are the yellow van, buses a longer white one. */
function Traffic({ cars }: { cars: CarDef[] }) {
  const groups = useMemo(() => { const m = new Map<StreetModel, number[]>(); cars.forEach((c, i) => { const g = m.get(c.model) ?? []; g.push(i); m.set(c.model, g); }); return [...m.entries()]; }, [cars]);
  const mesh = useRef(new Map<StreetModel, { body: InstancedMesh; trim: InstancedMesh }>());
  const o = useMemo(() => new Object3D(), []);
  // cars that share a lane and direction, so each can see the one in front
  const lanes = useMemo(() => { const m = new Map<string, number[]>(); cars.forEach((c, i) => { const k = `${c.axis}:${c.lane}:${c.dir}`; const g = m.get(k) ?? []; g.push(i); m.set(k, g); }); return [...m.values()]; }, [cars]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), span = EXTENT * 2 + 24, wrap = (t: number) => ((t + EXTENT + 12) % span + span) % span - EXTENT - 12;
    const sig = signalState(performance.now() / 1000);
    // speed: cruise, slow for a red signal, keep a gap to the car in front
    for (const lane of lanes) {
      const c0 = cars[lane[0]], order = lane.map((i) => ({ i, p: wrap(cars[i].t) })).sort((a, b) => (a.p - b.p) * c0.dir);
      order.forEach((e, k) => {
        const c = cars[e.i], lead = order[k + 1], gap = lead ? (lead.p - e.p) * c.dir - 5.2 : 99, red = !(c.axis === 'x' ? sig.x : sig.z);
        const target = trafficSpeed(c.speed, stopLineAhead(e.p, c.dir), red, gap), v = c.v ?? c.speed;
        c.v = v + Math.max(-9 * dt, Math.min(2.6 * dt, target - v));
        c.t += c.v * c.dir * dt;
      });
    }
    for (const [model, idx] of groups) {
      const m = mesh.current.get(model); if (!m) continue;
      idx.forEach((ci, j) => {
        const c = cars[ci], p = wrap(c.t), side = c.dir * 2.7, rotY = c.axis === 'x' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : c.dir > 0 ? 0 : Math.PI;
        o.position.set(c.axis === 'x' ? p : c.lane - side, 0.04, c.axis === 'x' ? c.lane + side : p); o.rotation.set(0, rotY, 0); o.scale.set(1, 1, c.kind === 'bus' ? 1.45 : 1); o.updateMatrix();
        m.body.setMatrixAt(j, o.matrix); m.trim.setMatrixAt(j, o.matrix);
      });
      m.body.instanceMatrix.needsUpdate = true; m.trim.instanceMatrix.needsUpdate = true;
    }
  });
  return <>{groups.map(([model, idx]) => <Fleet key={model} model={model} colours={idx.map((i) => cars[i].colour)} bind={(mo, body, trim) => { if (body && trim) mesh.current.set(mo, { body, trim }); }} />)}</>;
}

/** Cars parked along the kerbs: placed once, never updated. */
function ParkedCars({ city }: { city: City }) {
  const spots = useMemo(() => { const r = mulberry(31), out: { x: number; z: number; rot: number; c: string; model: StreetModel }[] = []; for (const b of city.blockCentres) { if (r() < 0.45) continue; const side = r() < 0.5 ? -1 : 1, along = (r() - 0.5) * 24, model = pick(CAR_MODELS, r), c = pick(CAR_COLOURS, r); out.push(r() < 0.5 ? { x: b.x + along, z: b.z + side * (BLOCK / 2 + 2.1), rot: Math.PI / 2, c, model } : { x: b.x + side * (BLOCK / 2 + 2.1), z: b.z + along, rot: 0, c, model }); } return out; }, [city]);
  const groups = useMemo(() => CAR_MODELS.map((m) => [m, spots.filter((s) => s.model === m)] as const).filter(([, g]) => g.length), [spots]);
  const o = useMemo(() => new Object3D(), []);
  const bind = (model: StreetModel, body: InstancedMesh | null, trim: InstancedMesh | null) => {
    if (!body || !trim) return; const g = groups.find(([m]) => m === model)?.[1] ?? [];
    g.forEach((p, i) => { o.position.set(p.x, 0.04, p.z); o.rotation.set(0, p.rot, 0); o.scale.set(1, 1, 1); o.updateMatrix(); body.setMatrixAt(i, o.matrix); trim.setMatrixAt(i, o.matrix); });
    body.instanceMatrix.needsUpdate = true; trim.instanceMatrix.needsUpdate = true;
  };
  return <>{groups.map(([model, g]) => <Fleet key={model} model={model} colours={g.map((s) => s.c)} bind={bind} />)}</>;
}

/** The cars the player owns, parked beside the home spot. Walk up to one and Drive; Exit leaves it where it stands. */
function OwnedCars({ city, state, input, combat, drive }: { city: City; state: MutableRefObject<WorldState>; input: MutableRefObject<WorldInput>; combat: MutableRefObject<Combat>; drive: MutableRefObject<DriveState> }) {
  const owned = useVehicleStore((v) => v.owned);
  const defs = useMemo(() => owned.map((id) => getVehicle(id)).filter((d): d is VehicleDef => !!d).slice(0, 6), [owned]);
  const spots = useMemo(() => ownedSpots(city, defs.length), [city, defs.length]);
  const refs = useRef(new Map<string, Group>());
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), d = drive.current, s = state.current, i = input.current;
    defs.forEach((def, k) => { if (!d.cars[def.id]) d.cars[def.id] = { ...spots[k], speed: 0 }; });
    if (d.carId && !d.cars[d.carId]) d.carId = null;
    if (d.carId) {
      const car = d.cars[d.carId];
      driveStep(car, i.gas ? 1 : 0, !!i.brake, i.mx, dt);
      const [nx, nz] = resolveMove(city, car.x, car.z, 1.7);
      if (Math.hypot(nx - car.x, nz - car.z) > 0.02) { if (Math.abs(car.speed) > 6) sfx.error(); car.speed *= -0.25; }
      car.x = nx; car.z = nz; s.x = nx; s.z = nz; s.heading = car.heading; d.speed = car.speed;
    }
    d.near = null;
    if (!d.carId) { let best = 4.8; for (const def of defs) { const car = d.cars[def.id]; const dist = Math.hypot(car.x - s.x, car.z - s.z); if (dist < best) { best = dist; d.near = def.id; } } }
    if (d.enterReq) { d.enterReq = false; if (d.near) { d.carId = d.near; combat.current.drawn = false; sfx.click(); } }
    if (d.exitReq) { d.exitReq = false; if (d.carId) { const car = d.cars[d.carId]; const [nx, nz] = resolveMove(city, car.x + Math.cos(car.heading) * 2.6, car.z - Math.sin(car.heading) * 2.6); s.x = nx; s.z = nz; d.carId = null; d.speed = 0; car.speed = 0; sfx.click(); } }
    for (const def of defs) { const g = refs.current.get(def.id), car = d.cars[def.id]; if (!g || !car) continue; g.position.set(car.x, groundY(car.x, car.z) + 0.02, car.z); g.rotation.y = car.heading; }
  });
  return <>{defs.map((def) => <group key={def.id} ref={(g) => { if (g) refs.current.set(def.id, g); else refs.current.delete(def.id); }}><PlayerCar def={def} /></group>)}</>;
}

function Player({ look, input, city, state, combat, drive }: { look: Appearance; input: MutableRefObject<WorldInput>; city: City; state: MutableRefObject<WorldState>; combat: MutableRefObject<Combat>; drive: MutableRefObject<DriveState> }) {
  const g = useRef<Group>(null), motion = useRef<Motion>({ moving: false, lying: false, sitting: false, speed: 2.4 });
  const [held, setHeld] = useState(false), heldRef = useRef(false);
  const { camera } = useThree();
  const vel = useRef(0), gy = useRef(0.3);
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
        // the barrel points AK_MUZZLE.yaw to one side of the body's front, so turn the body that much less: the bullet leaves the real muzzle along the aim line
        const aimYaw = Math.atan2(aimed[0], aimed[2]), bodyYaw = aimYaw - AK_MUZZLE.yaw, mz = new Vector3(...AK_MUZZLE.body).applyAxisAngle(new Vector3(0, 1, 0), bodyYaw);
        const muzzle: V3 = [s.x + mz.x, 0.3 + mz.y, s.z + mz.z];
        c.clip = spend(c.clip); c.nextShot = now + w.cooldownMs; c.aimUntil = now + 700; c.shots++; c.muzzle = muzzle; c.muzzleAt = now;
        s.heading = bodyYaw;
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
    const shown = c.drawn && !!c.weapon; motion.current.action = shown ? 'rifle' : undefined;
    if (shown !== heldRef.current) { heldRef.current = shown; setHeld(shown); }
    // ---- walking
    const driving = !!drive.current.carId, mag = Math.min(1, Math.hypot(i.mx, i.mz)), locked = now < c.aimUntil || c.arrested || !!i.frozen || driving;
    const fx = -Math.sin(i.yaw), fz = -Math.cos(i.yaw), rx = Math.cos(i.yaw), rz = -Math.sin(i.yaw);
    const dx = fx * i.mz + rx * i.mx, dz = fz * i.mz + rz * i.mx;
    const top = i.run ? 7.2 : mag > 0.6 ? 4.4 : 1.7, want = mag > 0.08 && !locked ? top : 0; // push the stick part way to walk, all the way to run, press Run to sprint
    vel.current += (want - vel.current) * (1 - Math.exp(-dt * 10));
    if (want > 0) { const len = Math.hypot(dx, dz) || 1; const [nx, nz] = resolveMove(city, s.x + (dx / len) * vel.current * dt, s.z + (dz / len) * vel.current * dt); s.x = nx; s.z = nz; const target = Math.atan2(dx, dz); let d = target - s.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); s.heading += d * (1 - Math.exp(-dt * 12)); }
    motion.current.moving = vel.current > 0.3; motion.current.speed = Math.max(1.2, vel.current);
    gy.current += (groundY(s.x, s.z) - gy.current) * (1 - Math.exp(-dt * 16)); // up onto the pavement, down onto the road
    o.position.set(s.x, gy.current, s.z); o.rotation.y = s.heading; o.visible = !driving;
    if (driving) { const car = drive.current.cars[drive.current.carId!]; if (car) { let d = car.heading + Math.PI - i.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); i.yaw += d * (1 - Math.exp(-dt * 2.2)); } }
    // third-person camera: behind the player, orbiting with yaw and pitch, smoothed
    const dist = driving ? 9.5 + Math.min(3, Math.abs(drive.current.speed) * 0.1) : 6.2 + Math.min(2.2, vel.current * 0.2), cy = 1.5, ph = driving ? Math.max(0.22, i.pitch) : i.pitch;
    const tx = s.x + Math.sin(i.yaw) * Math.cos(ph) * dist, tz = s.z + Math.cos(i.yaw) * Math.cos(ph) * dist, ty = cy + 0.3 + Math.sin(ph) * dist;
    const k = 1 - Math.exp(-dt * 8);
    camera.position.x += (tx - camera.position.x) * k; camera.position.y += (ty - camera.position.y) * k; camera.position.z += (tz - camera.position.z) * k;
    camera.lookAt(s.x, cy + 0.2, s.z);
  });
  return (
    <group ref={g}>
      <Avatar appearance={look} motion={motion} held={held ? 'ak47' : null} />
    </group>
  );
}

export function randomLook(r: () => number, base: Appearance): Appearance {
  const femme = r() < 0.45;
  return { ...base, body: femme ? 'femme' : 'masc', beard: !femme && r() < 0.2 ? 'stubble' : 'none', skin: pick(SKIN_TONES, r), hairStyle: pick(HAIR_STYLES, r).id, hairColor: pick(HAIR_COLORS.slice(0, 3), r),
    top: pick(TOP_STYLES.filter((t) => t.id !== 'vest'), r).id, topColor: pick(CLOTH_COLORS, r), bottom: pick(BOTTOM_STYLES.filter((b) => b.id !== 'dress' && (!femme ? b.id !== 'skirt' : true)), r).id, bottomColor: pick(['#1B1F24', '#2B4C7E', '#6B4128', '#FFFFFF'], r),
    shoes: pick(SHOE_STYLES, r).id, shoeColor: pick(['#FFFFFF', '#1B1F24', '#6B4128'], r), accessory: r() < 0.7 ? ACCESSORIES[0].id : pick(ACCESSORIES, r).id, bag: 'none', gun: false, bro: undefined };
}

export function WorldScene({ city, look, input, state, combat, drive, npcCount = 150 }: { city: City; look: Appearance; input: MutableRefObject<WorldInput>; state: MutableRefObject<WorldState>; combat: MutableRefObject<Combat>; drive: MutableRefObject<DriveState>; npcCount?: number }) {
  const cops = useMemo(() => POLICE_LOOK(look), [look]);
  // a crowd spread over every block, each person on a loop of their own pavement
  const npcs = useMemo(() => { const r = mulberry(77), free = city.blockCentres; return Array.from({ length: npcCount }, (_, i) => { const b = free[Math.floor(r() * free.length)]; const lk = randomLook(r, look), q = r(), hawker = q < 0.28, cargo: HeadCargo | null = hawker ? (lk.body === 'femme' ? (q < 0.14 ? 'oranges' : 'bread') : q < 0.14 ? 'water' : 'oranges') : null;
      // hawkers dress for the day: plain tops, slippers
      return { id: i, look: hawker ? { ...lk, top: 'tee' as const, shoes: 'slippers' as const, bag: 'none' as const } : lk, cargo, centre: [b.x, b.z] as [number, number] }; }); }, [city, look, npcCount]);
  // traffic: every road has a lane each way, with a few cars per lane spaced well apart; some danfos and buses
  const cars = useMemo(() => { const r = mulberry(5), out: CarDef[] = []; const span = EXTENT * 2 + 24;
    for (let road = 0; road <= GRID; road++) for (const axis of ['x', 'z'] as const) for (const dir of [1, -1] as const) {
      if (r() < 0.12) continue; const n = 2 + (r() < 0.5 ? 1 : 0), gap = span / n, base = r() * span;
      for (let k = 0; k < n; k++) { const q = r(); out.push({ axis, lane: (road - GRID / 2) * PITCH, dir, t: base + k * gap + (r() - 0.5) * gap * 0.4 - EXTENT, speed: 6 + r() * 6, kind: q < 0.28 ? 'danfo' : q < 0.36 ? 'bus' : 'car', model: q < 0.36 ? 'van' : pick(CAR_MODELS, r), colour: q < 0.28 ? '#FFC21A' : q < 0.36 ? '#F4F1EA' : pick(CAR_COLOURS, r) }); }
    } return out; }, []);
  return (
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ fov: 55, near: 0.5, far: 900, position: [state.current.x + Math.sin(input.current.yaw) * 7, 4, state.current.z + Math.cos(input.current.yaw) * 7] }} style={{ touchAction: 'none' }}>
      <color attach="background" args={['#9CC9F0']} /><fog attach="fog" args={['#BFD9EE', 160, 520]} />
      <hemisphereLight args={['#FFFFFF', '#7E8C72', 1.15]} /><directionalLight position={[80, 120, 40]} intensity={1.9} color="#FFF1D6" />
      <Ground /><RoadDetails /><TrafficLights /><Buildings city={city} /><LandmarkPins city={city} /><LandmarkFacades city={city} />
      <Traffic cars={cars} /><ParkedCars city={city} /><Doors city={city} /><Moments city={city} look={look} />
      {npcs.map((n) => <Pedestrian key={n.id} id={`p${n.id}`} look={n.look} centre={n.centre} seed={n.id + 3} player={state} combat={combat} cargo={n.cargo} />)}
      {[0, 1, 2, 3].map((n) => <Officer key={n} idx={n} look={cops} combat={combat} player={state} city={city} />)}
      <OwnedCars city={city} state={state} input={input} combat={combat} drive={drive} /><Player look={look} input={input} city={city} state={state} combat={combat} drive={drive} /><Law combat={combat} /><Effects combat={combat} />
    </Canvas>
  );
}
