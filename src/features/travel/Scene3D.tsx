import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, BoxGeometry, BufferAttribute, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, MathUtils, MeshStandardMaterial, Object3D, Plane, SphereGeometry, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Material, type Mesh, type PerspectiveCamera } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Avatar, type Motion } from '@/three/avatar/Avatar';
import { PlayerCar } from '@/three/models/CarModel';
import type { TripPlan } from './plan';
import { DestinationBuilding, disposeDestinations, styleFor } from './destinations';
import { Crowd, crowdLook, disposeBakedPeople } from './people';
import { disposeTextures, glassTexture, pavingTexture, wallTexture } from './textures';
import { CarMesh, Danfo, Keke, Okada, carGeos, glassMat, lightMat, paintMat, trimMat, type CarKind } from './vehicles3d';

/**
 * A trip as a short film (8 to 10 seconds): quick cuts between different cameras (third-person chase, a dolly along the pavement,
 * a high front shot of you coming at the camera, a low rear shot, a high three-quarter view, and a point of view from inside a keke,
 * a danfo or your own car's bonnet), then an arrival shot that follows the passenger to the door. The set of shots is picked per trip.
 *
 * The street is meant to feel like a real avenue, not a toy: a long straight road with depth (a hazy skyline, glass towers, palms),
 * rounded vehicles, and the game's own sculpted characters (baked and instanced) walking the pavements. The destination is part of
 * the street from the start and comes up the road as the ride slows to a stop beside it; nothing grows out of the ground.
 * Deliberately cheap: buildings, cars and people are instanced or merged, there are no real shadows (blob shadows instead).
 *
 * Axes: the ride faces -z (up the screen). +x is the right-hand pavement where the destination appears. Our lanes are at
 * x = 1.1 and 3.3 (the ride sits in the kerb lane, 3.3); oncoming lanes are at x = -1.1 and -3.3.
 */
const LOOP = 60; // length of one street strip along z; three copies leapfrog so the street never ends
const RANGE = [-72, 28] as const; // traffic and people wrap inside this z range (long, so the road has depth)
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const SKY = {
  clear: { top: '#4F8FD6', hor: '#CFE3F2', fog: '#C4D8E8', sun: '#FFF1D6', amb: 0.95 },
  rain: { top: '#4A545E', hor: '#8E99A3', fog: '#8E99A3', sun: '#B8C4CF', amb: 0.75 },
  dusk: { top: '#5B5FA8', hor: '#F2A36B', fog: '#E3A079', sun: '#FFB070', amb: 0.8 },
} as const;
const DOOR_X = 9.3, DEST_Z = -1;

/**
 * How fast the street rushes past, second by second: a launch, a fast cruise that surges and eases, and a long brake to a stop beside
 * the destination. (It used to start at one low speed and just slow down, which felt like a crawl.) Speeds are in metres per second.
 */
const CRUISE: Record<string, number> = { own: 38, cab: 30, danfo: 25, okada: 27, keke: 17, trek: 3.4 };
export interface Profile { speed: (t: number) => number; dist: (t: number) => number; total: number; cruise: number }
export function makeProfile(ride: string, jam: boolean, T: number): Profile {
  const walk = ride === 'trek', cruise = (CRUISE[ride] ?? 25) * (jam ? 0.3 : 1);
  const launch = walk ? 0.5 : Math.min(2.4, T * 0.25), brake = walk ? 1.2 : Math.min(3.4, T * 0.34);
  const speed = (t: number): number => {
    if (t <= 0) return 0; if (t >= T) return 0;
    if (t < launch) { const u = t / launch; return cruise * (1 - (1 - u) * (1 - u) * (1 - u)); } // hard launch
    const surge = walk ? 1 : 1 + 0.13 * Math.sin(t * 1.5) + (jam ? 0 : 0.08 * Math.sin(t * 3.1 + 1));
    if (t > T - brake) { const u = (T - t) / brake; return cruise * surge * Math.pow(u, 1.5); } // long, firm brake
    return cruise * surge;
  };
  const n = Math.ceil(T * 120), table = new Float32Array(n + 1); let acc = 0;
  for (let i = 1; i <= n; i++) { acc += speed(((i - 0.5) / n) * T) * (T / n); table[i] = acc; }
  return { speed, dist: (t) => { const x = Math.max(0, Math.min(1, t / T)) * n, i = Math.floor(x); return i >= n ? table[n] : table[i] + (table[i + 1] - table[i]) * (x - i); }, total: acc, cruise };
}

type V3 = [number, number, number];
function Box({ size, pos, color, rot, emissive, rough = 0.85 }: { size: V3; pos: V3; color: string; rot?: V3; emissive?: string; rough?: number }) {
  return <mesh position={pos} rotation={rot}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 1.2 : 0} /></mesh>;
}
const tint = (g: BufferGeometry, hex: string): BufferGeometry => {
  const c = new Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new Float32BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g;
};
const flat = (gs: BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;

// ------------------------------------------------------------------ the street
interface BClass { id: string; h: number; glass: boolean }
const CLASSES: BClass[] = [{ id: 'low', h: 5.5, glass: false }, { id: 'mid', h: 10, glass: false }, { id: 'tall', h: 17, glass: false }, { id: 'tower', h: 30, glass: true }];
const classGeo = (h: number) => {
  const g = new BoxGeometry(1, h, 1); g.translate(0, h / 2, 0);
  const uv = g.attributes.uv as BufferAttribute; // windows repeat with the wall size (about 2 windows per 4.5 m, one storey per 3 m)
  for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); if (face === 2 || face === 3) continue; uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * (h / 3)); }
  return g;
};
const WALLS = ['#EADFC8', '#D9CBA8', '#CFD8DC', '#F1E4C8', '#C9B896', '#B9C7D6', '#E6D3B8'], ROOFS = ['#8E5B4A', '#6F7B86', '#A67C52', '#5E6F8A', '#7D8A6E', '#9A9084'];
interface BItem { cls: number; x: number; z: number; w: number; d: number; wall: string; roof: string; right1: boolean }
const buildingItems = (() => {
  const r = rng(21), out: BItem[] = [];
  for (const side of [1, -1]) for (const row of [0, 1, 2]) {
    let z = r() * 12; const edge = side === 1 ? 17 + row * 10 : 14 + row * 10; // set well back from the road; a wide verge of grass and trees between
    while (z < LOOP) {
      const k = r(), cls = side === -1 && row === 0 ? (k < 0.6 ? 3 : 2) : row === 0 ? (k < 0.6 ? 0 : 1) : row === 1 ? (k < 0.25 ? 1 : k < 0.7 ? 2 : 3) : (k < 0.4 ? 2 : 3);
      const l = (cls === 3 ? 7 : 4) + r() * 3, d = (cls === 3 ? 6.5 : 4.5) + r() * 2;
      out.push({ cls, x: side * (edge + d / 2), z: z + l / 2, w: l, d, wall: WALLS[Math.floor(r() * WALLS.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)], right1: side === 1 && row <= 1 });
      z += l + 7 + r() * 16; // lots of air between buildings
    }
  }
  return out;
})();

/** Street furniture merged into one mesh: lamp posts, round trees, palms, stalls with umbrellas. */
function furnitureGeo(): { solid: BufferGeometry; lamps: BufferGeometry } {
  const r = rng(77), g: BufferGeometry[] = [], l: BufferGeometry[] = [];
  const lamp = (x: number, z: number, arms: number[]) => { // a tall lamp post with one or two arms
    g.push(tint(new CylinderGeometry(0.08, 0.12, 7.6, 7).translate(x, 3.8, z), '#4B4540'));
    for (const a of arms) { g.push(tint(new CylinderGeometry(0.05, 0.05, 2.2, 6).rotateZ(Math.PI / 2).translate(x + a * 1.1, 7.5, z), '#4B4540')); l.push(tint(new BoxGeometry(0.7, 0.12, 0.3).translate(x + a * 2.1, 7.42, z), '#FFF3B0')); }
  };
  for (let z = 4; z < LOOP; z += 15) { lamp(4.9, z, [-1]); lamp(-6.9, z + 7, [1]); lamp(-1.0, z + 3, [-1, 1]); } // kerbside, far pavement, and the middle of the road
  for (let z = 1.5; z < LOOP; z += 3) g.push(tint(new SphereGeometry(0.42, 7, 5).scale(1, 0.8, 1.2).translate(-1.0, 0.45, z), z % 6 ? '#2F8A55' : '#3FA66B')); // hedge along the median
  for (let z = 9; z < LOOP; z += 15) { // palms in the median
    const h = 6.5 + r() * 1.5; g.push(tint(new CylinderGeometry(0.14, 0.22, h, 7).translate(-1.0, h / 2, z), '#8A6B4A'));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, fr = new SphereGeometry(1, 6, 4); fr.scale(1.9, 0.07, 0.34); fr.translate(1.7, -0.25, 0); fr.rotateZ(-0.25); fr.rotateY(a); fr.translate(-1.0, h, z); g.push(tint(fr, k % 2 ? '#3E9B52' : '#2F8545')); }
  }
  for (let z = 6; z < LOOP; z += 15) for (const x of [8.4, -9.4]) { // palms out on the verges
    const lean = x > 0 ? -0.1 : 0.12, h = 7 + r() * 2;
    g.push(tint(new CylinderGeometry(0.16, 0.26, h, 7).translate(0, h / 2, 0).rotateZ(lean).translate(x, 0, z), '#8A6B4A'));
    const top = new Vector3(x - Math.sin(lean) * h, Math.cos(lean) * h, z);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, fr = new SphereGeometry(1, 6, 4); fr.scale(1.9, 0.07, 0.34); fr.translate(1.7, -0.25, 0); fr.rotateZ(-0.25); fr.rotateY(a); fr.translate(top.x, top.y, top.z); g.push(tint(fr, k % 2 ? '#3E9B52' : '#2F8545')); }
  }
  for (let i = 0; i < 5; i++) { // round shade trees out on the grass
    const z = i * 12 + 2 + r() * 4, x = i % 2 ? 11 + r() * 3 : -12 - r() * 3, k = 1.1 + r() * 0.5;
    g.push(tint(new CylinderGeometry(0.2 * k, 0.28 * k, 2.4 * k, 7).translate(x, 1.2 * k, z), '#6B4A2B')); g.push(tint(new SphereGeometry(1.7 * k, 9, 7).translate(x, 3.4 * k, z), i % 2 ? '#3FA66B' : '#2F8A55'));
  }
  for (let i = 0; i < 3; i++) { const z = i * 20 + 10 + r() * 4; g.push(tint(new CylinderGeometry(0.05, 0.05, 2, 6).translate(-8.2, 1, z), '#4B4540')); g.push(tint(new ConeGeometry(1.2, 0.4, 10).translate(-8.2, 2.2, z), ['#E4572E', '#FFC21A', '#2B8C5B'][i])); g.push(tint(new BoxGeometry(1.3, 0.8, 0.8).translate(-8.2, 0.4, z + 0.4), '#7C5A2A')); }
  return { solid: flat(g), lamps: flat(l) };
}
function markingsGeo(): BufferGeometry {
  const m: BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) for (const x of [2.2, -4.2]) m.push(tint(new BoxGeometry(0.14, 0.02, 2.4).translate(x, 0.025, i * 5 + 1), '#E6E2D4'));
  for (const x of [4.5, -6.35]) m.push(tint(new BoxGeometry(0.12, 0.02, LOOP).translate(x, 0.03, LOOP / 2), '#E6E2D4'));
  for (const x of [-2.04, 0.04]) m.push(tint(new BoxGeometry(0.2, 0.16, LOOP).translate(x, 0.08, LOOP / 2), '#D8D3C8')); // median kerbs
  m.push(tint(new BoxGeometry(1.9, 0.12, LOOP).translate(-1.0, 0.07, LOOP / 2), '#5E7F4A')); // grass in the median
  for (let i = 0; i < 12; i++) m.push(tint(new BoxGeometry(0.55, 0.02, 2.6).translate(-5.9 + i * 0.93, 0.03, 34), '#EFEBDD'));
  return flat(m);
}
const furnMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const markMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
let street: { furn: ReturnType<typeof furnitureGeo>; marks: BufferGeometry; geos: BufferGeometry[] } | null = null;
const streetKit = () => (street ??= { furn: furnitureGeo(), marks: markingsGeo(), geos: CLASSES.map((c) => classGeo(c.h)) });

/** One 60 m piece of avenue: buildings (instanced by height class), furniture, markings. Three of them leapfrog. */
function Strip({ weather, dest }: { weather: TripPlan['weather']; dest: { current: { z: number; half: number } } }) {
  const kit = streetKit(), root = useRef<Group>(null), dummy = useMemo(() => new Object3D(), []);
  const lists = useMemo(() => CLASSES.map((_, ci) => buildingItems.filter((b) => b.cls === ci)), []);
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const mats = useMemo(() => {
    const side = new MeshStandardMaterial({ map: wallTexture(), roughness: 0.9 }), glass = new MeshStandardMaterial({ map: glassTexture(), roughness: 0.25, metalness: 0.4 });
    const roof = new MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    return { side, glass, roof };
  }, []);
  const stripZ = () => root.current?.parent?.position.z ?? 0; // the strip's offset lives on the wrapper group the scene moves
  const apply = (hideZ: number | null, half = 7.5) => lists.forEach((list, ci) => {
    const m = refs.current[ci]; if (!m) return;
    list.forEach((b, j) => {
      const hidden = hideZ !== null && b.right1 && Math.abs(b.z + stripZ() - hideZ) < half;
      dummy.position.set(b.x, 0, b.z); dummy.scale.set(hidden ? 0.001 : b.d, hidden ? 0.001 : 1, hidden ? 0.001 : b.w); dummy.updateMatrix(); m.setMatrixAt(j, dummy.matrix);
    }); m.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => {
    const c = new Color(); lists.forEach((list, ci) => list.forEach((b, j) => refs.current[ci]?.setColorAt(j, c.set(CLASSES[ci].glass ? ['#FFFFFF', '#DDEBFF', '#CFE3E8'][j % 3] : b.wall))));
    refs.current.forEach((m) => { if (m?.instanceColor) m.instanceColor.needsUpdate = true; }); apply(null);
  }, [lists]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = useRef(1e9);
  useFrame(() => { const z = stripZ(), key = Math.round((dest.current.z - z) * 2); if (key !== last.current) { last.current = key; apply(dest.current.z, dest.current.half); } });
  return (
    <group ref={root}>
      {CLASSES.map((c, ci) => lists[ci].length > 0 && (
        <instancedMesh key={c.id} ref={(m) => { refs.current[ci] = m; }} args={[kit.geos[ci], undefined, lists[ci].length]} frustumCulled={false} material={[c.glass ? mats.glass : mats.side, c.glass ? mats.glass : mats.side, mats.roof, mats.roof, c.glass ? mats.glass : mats.side, c.glass ? mats.glass : mats.side]} />
      ))}
      <mesh geometry={kit.furn.solid} material={furnMat} /><mesh geometry={kit.furn.lamps}><meshBasicMaterial vertexColors color={weather === 'dusk' ? '#FFE9A0' : '#FFF6D8'} /></mesh>
      <mesh geometry={kit.marks} material={markMat} />
    </group>
  );
}

/** Painted sky that follows the camera, plus a hazy skyline far away (it drifts slowly, which gives parallax and depth). */
function SkyDome({ weather }: { weather: TripPlan['weather'] }) {
  const sky = SKY[weather], g = useRef<Group>(null);
  const geo = useMemo(() => {
    const s = new SphereGeometry(400, 24, 14), p = s.attributes.position, col = new Float32Array(p.count * 3), top = new Color(sky.top), hor = new Color(sky.hor), c = new Color();
    for (let i = 0; i < p.count; i++) { const t = MathUtils.clamp(p.getY(i) / 400, 0, 1); c.copy(hor).lerp(top, Math.pow(t, 0.55)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    s.setAttribute('color', new Float32BufferAttribute(col, 3)); return s;
  }, [sky]);
  const cam = useThree((st) => st.camera);
  useFrame(() => { g.current?.position.set(cam.position.x, 0, cam.position.z); });
  const skyline = useMemo(() => {
    const r = rng(8), a: BufferGeometry[] = [];
    for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1, h = 30 + r() * 80, w = 8 + r() * 14; a.push(tint(new BoxGeometry(w, h, w).translate(side * (70 + r() * 70), h / 2, -260 + (i / 70) * 330), '#B9C9D6')); }
    return flat(a);
  }, []);
  return (
    <group ref={g}>
      <mesh geometry={geo} renderOrder={-10}><meshBasicMaterial vertexColors side={BackSide} depthWrite={false} fog={false} /></mesh>
      <mesh geometry={skyline}><meshBasicMaterial vertexColors color={sky.fog} transparent opacity={0.85} /></mesh>
    </group>
  );
}

// ------------------------------------------------------------------ traffic
type Kind = CarKind | 'danfo' | 'okada' | 'keke';
const CAR_KINDS: CarKind[] = ['sedan', 'hatch', 'suv', 'pickup'];
interface CarD { x: number; z: number; dir: 1 | -1; f: number; follow: boolean; u: number; kind: Kind; color: string; slogan: number; look: number }
const CAR_COLORS = ['#C23B3B', '#F4F1EA', '#2B4C7E', '#2A2D32', '#2B8C5B', '#C9CED1', '#8A63D2', '#E4572E', '#7C8791', '#B8202E', '#E8D8B0'];
const blobGeo = new CylinderGeometry(1, 1, 0.01, 16);
/** A soft dark blob under a vehicle, so vehicles seen from low cameras do not float. */
function Blob({ w = 1, l = 2.4 }: { w?: number; l?: number }) {
  return <mesh position={[0, 0.04, 0]} scale={[w, 1, l]} geometry={blobGeo}><meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} /></mesh>;
}
/** Dense but not crammed: cars are instanced (four draw calls per body type); danfos, kekes and okadas are a few separate meshes. */
function Traffic({ plan, speed, walk }: { plan: TripPlan; speed: { current: number }; walk: boolean }) {
  const jam = plan.event === 'jam', nominal = 13;
  const cars = useMemo<CarD[]>(() => {
    const r = rng(plan.key.length * 31 + 5), out: CarD[] = [];
    // [lane x, direction, speed factor, follows the ride's own speed?]. In a go-slow everyone in our two lanes crawls with you.
    const lanes: [number, 1 | -1, number, boolean][] = [[3.3, 1, 1, true], [1.1, 1, jam ? 0.9 : 1.15, jam], [-3.1, -1, 0, false], [-5.3, -1, 0, false]];
    const gap = jam ? 6 : plan.event === 'crowd' ? 14 : 17, gapOn = jam ? 10 : plan.event === 'crowd' ? 12 : 13; // lively but flowing: cars to overtake and oncoming traffic. Only a go-slow is packed
    for (const [x, dir, f, follow] of lanes) {
      const step = dir === 1 ? gap : gapOn; let z = RANGE[0] + r() * 3;
      while (z < RANGE[1] - 3) {
        const clear = !walk && (x === 3.3 || x === 1.1) && z > -9 && z < 22; // keep your ride and the chase camera behind it in clear view
        if (!clear && (!plan.light || r() < 0.7)) {
          const k = r(), kind: Kind = k < 0.28 ? 'sedan' : k < 0.4 ? 'hatch' : k < 0.58 ? 'suv' : k < 0.66 ? 'pickup' : k < 0.78 ? 'danfo' : k < 0.86 ? 'okada' : 'keke';
          out.push({ x, z, dir, f, follow, u: jam && dir === -1 ? 3 : 12 + r() * 5, kind, color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], slogan: Math.floor(r() * 8), look: Math.floor(r() * 12) });
        }
        z += step * (0.85 + r() * 0.4);
      }
    }
    return out;
  }, [plan.key, plan.event, plan.light, jam, walk]);
  const fleet = useMemo(() => Object.fromEntries(CAR_KINDS.map((k) => [k, cars.map((c, i) => ({ c, i })).filter((x) => x.c.kind === k)])), [cars]);
  const specials = useMemo(() => cars.map((c, i) => ({ c, i })).filter((x) => !(CAR_KINDS as string[]).includes(x.c.kind)), [cars]);
  const parts = useRef<Record<string, (InstancedMesh | null)[]>>({}), blobs = useRef<InstancedMesh>(null), sp = useRef<Record<number, Group | null>>({});
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => {
    const c = new Color();
    for (const k of CAR_KINDS) fleet[k].forEach((x, j) => parts.current[k]?.[0]?.setColorAt(j, c.set(x.c.color)));
    for (const k of CAR_KINDS) if (parts.current[k]?.[0]?.instanceColor) parts.current[k][0]!.instanceColor!.needsUpdate = true;
  }, [fleet]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25), S = speed.current, span = RANGE[1] - RANGE[0];
    cars.forEach((c) => {
      // ground speed S pushes everything toward the camera; our-way cars drive up the street at their own speed, oncoming ones down it
      const own = c.dir === 1 ? -(c.follow ? c.f * S : c.f * nominal) : c.u;
      c.z += (S + own) * dt; if (c.z > RANGE[1]) c.z -= span; if (c.z < RANGE[0]) c.z += span;
    });
    for (const k of CAR_KINDS) {
      const list = fleet[k], g = carGeos(k);
      list.forEach(({ c, i }, j) => {
        dummy.position.set(c.x, 0.02, c.z); dummy.rotation.set(0, c.dir === 1 ? Math.PI : 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        for (let p = 0; p < 4; p++) parts.current[k]?.[p]?.setMatrixAt(j, dummy.matrix);
        dummy.position.set(c.x, 0.04, c.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(g.width * 0.62, 1, g.length * 0.58); dummy.updateMatrix(); blobs.current?.setMatrixAt(i, dummy.matrix);
      });
      for (let p = 0; p < 4; p++) { const m = parts.current[k]?.[p]; if (m) m.instanceMatrix.needsUpdate = true; }
    }
    specials.forEach(({ c, i }) => { const g = sp.current[i]; if (g) g.position.set(c.x, 0.02, c.z); dummy.position.set(c.x, 0.04, c.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(c.kind === 'danfo' ? 1.2 : c.kind === 'okada' ? 0.5 : 0.9, 1, c.kind === 'danfo' ? 3 : c.kind === 'okada' ? 1.1 : 1.5); dummy.updateMatrix(); blobs.current?.setMatrixAt(i, dummy.matrix); });
    if (blobs.current) blobs.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      {CAR_KINDS.map((k) => { const n = fleet[k].length, g = carGeos(k); if (!n) return null; const set = (p: number) => (m: InstancedMesh | null) => { (parts.current[k] ??= [])[p] = m; };
        return <group key={k}><instancedMesh ref={set(0)} args={[g.paint, paintMat, n]} frustumCulled={false} /><instancedMesh ref={set(1)} args={[g.glass, glassMat, n]} frustumCulled={false} /><instancedMesh ref={set(2)} args={[g.trim, trimMat, n]} frustumCulled={false} /><instancedMesh ref={set(3)} args={[g.lights, lightMat, n]} frustumCulled={false} /></group>; })}
      {specials.map(({ c, i }) => (
        <group key={i} ref={(n) => { sp.current[i] = n; }}>
          <group rotation={[0, c.dir === 1 ? Math.PI : 0, 0]}>
            {c.kind === 'danfo' ? <Danfo slogan={c.slogan} /> : c.kind === 'okada' ? <Okada rider={crowdLook(c.look)} passenger={crowdLook(c.look + 1)} /> : <Keke driver={c.look} hex={c.look % 2 ? '#F4B91E' : '#3FA66B'} />}
          </group>
        </group>
      ))}
      <instancedMesh ref={blobs} args={[blobGeo, undefined, cars.length]} frustumCulled={false}><meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} /></instancedMesh>
    </>
  );
}

// ------------------------------------------------------------------ the player's ride and the point-of-view interiors
function Ride({ plan }: { plan: TripPlan }) {
  const g = useRef<Group>(null), north = Math.PI; // vehicles are modelled facing +z; turn them to face up the street (-z)
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 9)) * (plan.event === 'jam' ? 0.012 : 0.006); });
  const slogan = Number(plan.key.slice(-1)) % 8;
  let body: JSX.Element | null = null;
  switch (plan.ride) {
    case 'keke': body = <group rotation={[0, north, 0]}><Keke driver={2} passenger={plan.appearance} /></group>; break;
    case 'cab': body = <group rotation={[0, north, 0]}><CarMesh kind="sedan" hex="#F4B91E" taxi /></group>; break;
    case 'own': body = <group rotation={[0, north, 0]}><PlayerCar def={{ color: plan.vehicle?.color ?? '#C9CED1', model: plan.vehicle?.model ?? 'audi' }} /></group>; break;
    case 'danfo': body = <group rotation={[0, north, 0]}><Danfo slogan={slogan} conductor /></group>; break;
    case 'okada': body = <group rotation={[0, north, 0]}><Okada rider={crowdLook(5)} passenger={plan.appearance} pot={plan.weather === 'rain'} /></group>; break;
    default: body = null;
  }
  return <group ref={g}>{plan.ride !== 'trek' && <Blob w={plan.ride === 'okada' ? 0.6 : plan.ride === 'danfo' ? 1.25 : 1.1} l={plan.ride === 'danfo' ? 3 : plan.ride === 'okada' ? 1.3 : 2.5} />}{body}</group>;
}

interface Cam { p: V3; l: V3; fov: number }

// ------------------------------------------------------------------ the whole thing
function World({ plan, arrived, arriveAt, onReady }: { plan: TripPlan; arrived: boolean; arriveAt: number; onReady?: () => void }) {
  const sky = SKY[plan.weather], scroll = useRef(0), speed = useRef(0), t0 = useRef<number | null>(null), destRef = useRef({ z: -100, half: 7.5 }), openRef = useRef(0), clip = useMemo(() => new Plane(new Vector3(-1, 0, 0), DOOR_X + 0.3 + 0.02), []);
  const strips = [useRef<Group>(null), useRef<Group>(null), useRef<Group>(null)], dest = useRef<Group>(null), walker = useRef<Group>(null);
  const dummyS = useMemo(() => new Object3D(), []);
  const prevSpeed = useRef(0), pitch = useRef(0), frames = useRef(0), streaks = useRef<InstancedMesh>(null), rushRef = useRef(0);
  const rideRef = useRef<Group>(null), rain3 = useRef<Group>(null);
  const motion = useRef<Motion>({ moving: true, lying: false, sitting: false });
  const rain = plan.weather === 'rain', jam = plan.event === 'jam', crowd = plan.event === 'crowd', walk = plan.ride === 'trek';
  const camera = useThree((st) => st.camera) as PerspectiveCamera, look = useMemo(() => new Vector3(), []);
  const glInfo = useThree((st) => st.gl.info); // TEST-ONLY: tests read draw calls and triangles from this
  (globalThis as { __renderInfo?: unknown }).__renderInfo = glInfo;
  const dropGeo = useRef<BufferGeometry>(null);
  const N = plan.light ? 200 : 520;
  const slabs = useMemo(() => { const t = pavingTexture().clone(); t.repeat.set(11, 200); t.needsUpdate = true; return t; }, []);
  const drops = useMemo(() => { const r = rng(5), a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { a[i * 3] = (r() - 0.5) * 24; a[i * 3 + 1] = r() * 14; a[i * 3 + 2] = -18 + r() * 24; } return a; }, [N]);
  useEffect(() => { dropGeo.current?.setAttribute('position', new BufferAttribute(drops, 3)); }, [drops]);
  const crowdCount = walk ? (plan.light ? 8 : 16) : crowd ? (plan.light ? 6 : 12) : (plan.light ? 3 : 6);
  const lanes = useMemo(() => (walk ? [5.2, 5.9, 7.1, 7.7, -7.4, -8.1, -9.0] : [5.3, 6.0, 7.2, -7.4, -8.2, -9.0]), [walk]);
  const T = Math.max(3, arriveAt);
  // The street slows from cruising speed to a stop over T seconds, covering distance D; the destination sits D ahead, so it arrives beside you.
  const prof = useMemo(() => makeProfile(plan.ride, jam, T), [plan.ride, jam, T]), D = prof.total, style = useMemo(() => styleFor(plan.destination), [plan.destination]), front = style.d / 2, walkThrough = style.kind === 'gate';
  const base = useMemo(() => new Vector3(walk ? 6.35 : 3.3, 0, 0), [walk]);
  const lastFov = useRef(0), planes = useMemo(() => [clip], [clip]), glr = useThree((st) => st.gl);
  useEffect(() => { glr.localClippingEnabled = true; }, [glr]);
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25);
    if (t0.current === null) t0.current = clock.elapsedTime;
    let t = clock.elapsedTime - t0.current; if (arrived) t = Math.max(t, T);
    const forced = (globalThis as { __travelT?: number }).__travelT; if (typeof forced === 'number') t = forced; // TEST-ONLY: lets screenshots freeze the film at a chosen second
    const u = Math.min(1, t / T), ta = Math.max(0, t - T);
    scroll.current = prof.dist(t); speed.current = u < 1 ? prof.speed(t) : 0;
    const lastS = prevSpeed.current, accel = dt > 0 ? (speed.current - lastS) / dt : 0; prevSpeed.current = speed.current; pitch.current += (MathUtils.clamp(accel * 0.0035, -0.07, 0.05) - pitch.current) * Math.min(1, dt * 5); // nose lifts when you launch, dips when you brake
    frames.current++; if (frames.current === 3) onReady?.();
    const rush = prof.cruise > 0 ? Math.min(1.3, speed.current / prof.cruise) : 0; // 0 standing .. 1 at full speed
    slabs.offset.y = scroll.current / 2;
    const o = scroll.current % LOOP;
    strips.forEach((s, k) => { if (s.current) s.current.position.z = o - 40 - LOOP * k; });
    const destZ = DEST_Z - D + scroll.current; destRef.current.z = destZ; destRef.current.half = Math.max(11, style.w / 2 + 6);
    if (dest.current) dest.current.position.set(DOOR_X + 0.3 + front, 0, destZ);
    // whoever is travelling steps out, walks to the destination's doorway, and goes IN: the scene clips them at the wall plane, so they vanish through the opening (the doors slide apart as they arrive)
    if (walker.current) {
      const w = walker.current, face = DOOR_X + 0.3, tx = walkThrough ? face + 3.5 : face + 1.2;
      if (walk) {
        if (ta > 0) { const p = Math.min(1, ta / 2.3); w.position.set(MathUtils.lerp(6.35, tx, p), 0.02, MathUtils.lerp(0, destZ, p)); w.rotation.y = MathUtils.lerp(Math.PI, Math.PI / 2, Math.min(1, ta * 3)); motion.current.moving = p < 1; }
        else { w.position.set(6.35, 0.02, 0); w.rotation.y = Math.PI; motion.current.moving = true; }
      } else {
        const show = ta > 0.2; w.visible = show;
        if (show) { const p = Math.min(1, (ta - 0.2) / 2.1); w.position.set(MathUtils.lerp(4.5, tx, p), 0.02, MathUtils.lerp(0.4, destZ, p)); motion.current.moving = p < 1; w.rotation.y = Math.PI / 2; }
      }
      const near = ta > 0 && w.position.x > face - 3.2;
      openRef.current += ((walkThrough ? 0 : near ? 1 : 0) - openRef.current) * Math.min(1, dt * 6);
      if (ta > 0 && !walkThrough) w.traverse((o) => { const m = (o as Mesh).material as Material | Material[] | undefined; if (!m) return; for (const mm of Array.isArray(m) ? m : [m]) if (mm.clippingPlanes !== planes) { mm.clippingPlanes = planes; mm.needsUpdate = true; } });
    }
    // ONE continuous camera, no cuts: a third-person chase behind you (a little above, a little to the side), which drifts smoothly toward the destination once you arrive
    const ch = walk ? { d: 4.0, h: 2.1, dx: 0.4 } : plan.ride === 'danfo' ? { d: 10.8, h: 3.8, dx: 1.6 } : plan.ride === 'okada' ? { d: 6.4, h: 2.7, dx: 0.4 } : plan.ride === 'keke' ? { d: 7.4, h: 3.0, dx: 0.5 } : { d: 9.0, h: 3.4, dx: 0.6 };
    const k = MathUtils.smoothstep(ta / 2.6, 0, 1), end: Cam = walk ? { p: [2.4, 2.8, destZ + 9], l: [7.2, 1.4, destZ - 0.3], fov: 62 } : { p: [0.8, 3.5, destZ + 12.5], l: [6.6, 1.5, destZ - 0.4], fov: 64 };
    const fast = walk ? 0 : Math.min(1, rush); rushRef.current = fast;
    const cam: Cam = { p: [MathUtils.lerp(base.x + ch.dx, end.p[0], k), MathUtils.lerp(ch.h - fast * 0.35, end.p[1], k), MathUtils.lerp(base.z + ch.d + fast * 1.6, end.p[2], k)], l: [MathUtils.lerp(base.x + 0.1, end.l[0], k), MathUtils.lerp(1.3, end.l[1], k), MathUtils.lerp(base.z - 7, end.l[2], k)], fov: MathUtils.lerp(56 + fast * 15, end.fov, k) }; // the view widens and the camera pulls back with speed
    const sh = Math.sin(clock.elapsedTime * 1.3) * 0.12; // a slow drift, so it feels like a camera on a moving rig
    const rough = fast * (1 - k) * 0.035; // a little road buzz at speed
    camera.position.set(cam.p[0] + sh + Math.sin(clock.elapsedTime * 47) * rough, cam.p[1] + Math.cos(clock.elapsedTime * 1.1) * 0.05 + Math.sin(clock.elapsedTime * 61) * rough, cam.p[2]);
    if (rideRef.current && !walk) { // the ride weaves a little between lanes at speed and its nose lifts and dips with the throttle and the brake
      const sw = Math.sin(clock.elapsedTime * 0.9) * 0.32 * fast;
      rideRef.current.position.x = 3.3 + sw; rideRef.current.rotation.y = -Math.cos(clock.elapsedTime * 0.9) * 0.09 * fast; rideRef.current.rotation.x = pitch.current;
    }
    if (streaks.current) { // speed lines: thin streaks rush past the camera, longer the faster you go
      const m = streaks.current; m.visible = fast > 0.3 && !arrived;
      if (m.visible) for (let i = 0; i < 44; i++) {
        const a = (i * 0.618034) % 1, b = (i * 0.381966 + 0.13) % 1, side = i % 2 ? 1 : -1;
        dummyS.position.set(side * (3.2 + a * 7) + 3.3, 0.3 + b * 3.4, ((a * 90 + b * 70 + scroll.current * 1.05) % 90) - 70);
        dummyS.scale.set(0.035, 0.035, 1 + fast * 7); dummyS.updateMatrix(); m.setMatrixAt(i, dummyS.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    look.set(cam.l[0], cam.l[1], cam.l[2]); camera.lookAt(look);
    if (lastFov.current !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); lastFov.current = cam.fov; }
    if (rain3.current) rain3.current.position.set(camera.position.x, 0, camera.position.z - 6);
    const p = dropGeo.current?.attributes.position as BufferAttribute | undefined;
    if (rain && p) { for (let i = 0; i < N; i++) { let y = p.getY(i) - 20 * dt; if (y < 0) y += 14; p.setXYZ(i, p.getX(i), y, p.getZ(i)); } p.needsUpdate = true; }
  });
  return (
    <>
      <color attach="background" args={[sky.hor]} />
      <fog attach="fog" args={[sky.fog, 60, 330]} />
      <hemisphereLight args={[sky.sun, '#6F6A66', sky.amb * 1.6]} />
      <directionalLight position={[8, 30, 12]} intensity={plan.weather === 'dusk' ? 2.2 : 2} color={sky.sun} />
      <SkyDome weather={plan.weather} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}><planeGeometry args={[600, 600]} /><meshStandardMaterial color="#8E9A7A" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0, 0]}><planeGeometry args={[22, 400]} /><meshStandardMaterial map={slabs} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.9, 0.01, 0]}><planeGeometry args={[11, 400]} /><meshStandardMaterial color={rain ? '#25292E' : '#3B3F44'} roughness={rain ? 0.3 : 0.9} /></mesh>
      {[-6.55, 4.7].map((x) => <Box key={x} size={[0.25, 0.14, 400]} pos={[x, 0.06, 0]} color="#D8D3C8" />)}
      {strips.map((s, k) => <group key={k} ref={s}><Strip weather={plan.weather} dest={destRef} /></group>)}
      <Traffic plan={plan} speed={speed} walk={walk} />
      <Crowd count={crowdCount} rain={rain} speed={speed} lanes={lanes} range={RANGE} />
      {!walk && <instancedMesh ref={streaks} args={[undefined, undefined, 44]} frustumCulled={false} visible={false}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.3} depthWrite={false} fog={false} /></instancedMesh>}
      {!walk && (
        <group ref={rideRef} position={[3.3, 0.02, 0]}>
          <Ride plan={plan} />
        </group>
      )}
      <group ref={walker} position={[walk ? 6.35 : 4.5, 0.02, 0]} visible={walk} rotation={[0, Math.PI, 0]}>
        <Avatar appearance={plan.appearance} motion={motion} />
        {rain && <group position={[0, 2.15, 0]}><mesh><coneGeometry args={[0.62, 0.28, 10, 1, true]} /><meshStandardMaterial color="#E4572E" side={DoubleSide} /></mesh><Box size={[0.03, 0.5, 0.03]} pos={[0, -0.25, 0]} color="#2B2B2B" /></group>}
      </group>
      {/* the destination is part of the street from the start and comes up the road to meet you */}
      <group ref={dest} rotation={[0, -Math.PI / 2, 0]}><DestinationBuilding style={style} open={openRef} /></group>
      {rain && <group ref={rain3}><points frustumCulled={false}><bufferGeometry ref={dropGeo} /><pointsMaterial color="#CFE6F7" size={0.07} transparent opacity={0.8} sizeAttenuation /></points></group>}
    </>
  );
}

export default function Scene3D({ plan, arrived, arriveAt, onReady }: { plan: TripPlan; arrived: boolean; /** seconds of travelling before the arrival */ arriveAt: number; /** called once the street has drawn its first frames */ onReady?: () => void }) {
  // R3F frees the scene's own geometry and materials on unmount; the shared canvas textures and baked people are ours to free.
  useEffect(() => () => { disposeTextures(); disposeBakedPeople(); disposeDestinations(); }, []);
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, plan.light ? 1 : 1.5]} camera={{ fov: 56, position: [4, 2.4, 8], near: 0.2, far: 700 }} gl={{ antialias: !plan.light, powerPreference: 'high-performance' }}>
        <World plan={plan} arrived={arrived} arriveAt={arriveAt} onReady={onReady} />
      </Canvas>
    </div>
  );
}
