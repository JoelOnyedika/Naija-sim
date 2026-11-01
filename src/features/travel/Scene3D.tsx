import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, BoxGeometry, BufferAttribute, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, MathUtils, MeshStandardMaterial, Object3D, RepeatWrapping, SphereGeometry, SRGBColorSpace, Vector3, type BufferGeometry, type Group, type InstancedMesh, type PerspectiveCamera, type Texture } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Avatar, type Motion } from '@/three/avatar/Avatar';
import { PlayerCar } from '@/three/models/CarModel';
import type { Building, TripPlan } from './plan';
import { Crowd, SeatedPerson, crowdLook, disposeBakedPeople } from './people';
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
const tint = (g: BufferGeometry, hex: string): BufferGeometry => {
  const c = new Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new Float32BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g;
};
const flat = (gs: BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;

// ------------------------------------------------------------------ shared canvas textures
let wallTex: Texture | null = null, glassTex: Texture | null = null, pavingTex: Texture | null = null;
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c: HTMLCanvasElement) => { const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t; };
/** Concrete walls with rows of windows, a balcony line and some stains, so they do not look like cardboard. */
function wallTexture(): Texture {
  if (wallTex) return wallTex;
  const c = canvas(128, 128), g = c.getContext('2d')!, r = rng(3);
  g.fillStyle = '#F3EEE4'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? '#00000010' : '#FFFFFF14'; g.fillRect(r() * 128, r() * 128, 4 + r() * 20, 6 + r() * 24); }
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const X = 12 + x * 64, Y = 10 + y * 64; g.fillStyle = '#D8D2C6'; g.fillRect(X - 4, Y - 4, 40, 50); g.fillStyle = '#34495B'; g.fillRect(X, Y, 32, 42); g.fillStyle = '#7FA6C2'; g.fillRect(X, Y, 32, 14); g.fillStyle = '#26343F'; g.fillRect(X + 15, Y, 2, 42); g.fillStyle = '#9A9488'; g.fillRect(X - 6, Y + 44, 44, 5); }
  return (wallTex = tex(c));
}
/** Glass curtain wall: blue-green panes with a bright sky reflection running diagonally. */
function glassTexture(): Texture {
  if (glassTex) return glassTex;
  const c = canvas(128, 128), g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, '#6E9BB8'); gr.addColorStop(0.5, '#BFE0EE'); gr.addColorStop(1, '#4E7A96'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#1F3445'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  return (glassTex = tex(c));
}
function pavingTexture(): Texture {
  if (pavingTex) return pavingTex;
  const c = canvas(128, 128), g = c.getContext('2d')!, r = rng(9);
  g.fillStyle = '#BDB7AC'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#00000012' : '#FFFFFF14'; g.fillRect(r() * 128, r() * 128, 6 + r() * 14, 4 + r() * 10); }
  g.fillStyle = '#8A847A'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128); g.fillRect(0, 62, 128, 2); g.fillRect(62, 0, 2, 128);
  return (pavingTex = tex(c));
}

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
    let z = r() * 3; const edge = 8.3 + row * 7.5;
    while (z < LOOP) {
      const l = 4 + r() * 3, d = 4.5 + r() * 2, k = r();
      const cls = row === 0 ? (k < 0.6 ? 0 : 1) : row === 1 ? (k < 0.25 ? 1 : k < 0.7 ? 2 : 3) : (k < 0.4 ? 2 : 3);
      out.push({ cls, x: side * (edge + d / 2), z: z + l / 2, w: l, d, wall: WALLS[Math.floor(r() * WALLS.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)], right1: side === 1 && row === 0 });
      z += l + 0.8 + r() * 2.2;
    }
  }
  return out;
})();
/** Street furniture merged into one mesh: lamp posts, round trees, palms, stalls with umbrellas. */
function furnitureGeo(): { solid: BufferGeometry; lamps: BufferGeometry } {
  const r = rng(77), s: BufferGeometry[] = [], l: BufferGeometry[] = [];
  for (let z = 4; z < LOOP; z += 12) for (const x of [4.9, -4.9]) {
    s.push(tint(new CylinderGeometry(0.07, 0.1, 6.2, 7).translate(x, 3.1, z), '#4B4540'));
    s.push(tint(new CylinderGeometry(0.05, 0.05, 1.6, 6).rotateZ(Math.PI / 2).translate(x > 0 ? x - 0.8 : x + 0.8, 6.1, z), '#4B4540'));
    l.push(tint(new BoxGeometry(0.5, 0.1, 0.25).translate(x > 0 ? x - 1.5 : x + 1.5, 6.05, z), '#FFF3B0'));
  }
  for (let i = 0; i < 6; i++) { // round shade trees
    const z = i * 10 + 2 + r() * 3, x = i % 2 ? 8.0 : -6.2, k = 0.75 + r() * 0.3;
    s.push(tint(new CylinderGeometry(0.15 * k, 0.2 * k, 2 * k, 7).translate(x, k, z), '#6B4A2B'));
    s.push(tint(new SphereGeometry(1.25 * k, 9, 7).translate(x, 2.7 * k, z), i % 2 ? '#3FA66B' : '#2F8A55'));
  }
  for (let z = 6; z < LOOP; z += 15) for (const x of [8.0, -5.6]) { // palms: a leaning trunk and a crown of drooping fronds
    const lean = x > 0 ? -0.1 : 0.12, h = 7 + r() * 2;
    s.push(tint(new CylinderGeometry(0.16, 0.26, h, 7).translate(0, h / 2, 0).rotateZ(lean).translate(x, 0, z), '#8A6B4A'));
    const top = new Vector3(x - Math.sin(lean) * h, Math.cos(lean) * h, z);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, fr = new SphereGeometry(1, 6, 4); fr.scale(1.9, 0.07, 0.34); fr.translate(1.7, -0.25, 0); fr.rotateZ(-0.25); fr.rotateY(a); fr.translate(top.x, top.y, top.z);
      s.push(tint(fr, k % 2 ? '#3E9B52' : '#2F8545'));
    }
  }
  for (let i = 0; i < 4; i++) { const z = i * 15 + 9 + r() * 3; s.push(tint(new CylinderGeometry(0.05, 0.05, 2, 6).translate(-6.1, 1, z), '#4B4540')); s.push(tint(new ConeGeometry(1.2, 0.4, 10).translate(-6.1, 2.2, z), ['#E4572E', '#FFC21A', '#2B8C5B', '#8A63D2'][i])); s.push(tint(new BoxGeometry(1.3, 0.8, 0.8).translate(-6.1, 0.4, z + 0.4), '#7C5A2A')); }
  return { solid: flat(s), lamps: flat(l) };
}
function markingsGeo(): BufferGeometry {
  const m: BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) for (const x of [-2.2, 2.2]) m.push(tint(new BoxGeometry(0.14, 0.02, 2.4).translate(x, 0.025, i * 5 + 1), '#E6E2D4'));
  for (const x of [-0.12, 0.12]) m.push(tint(new BoxGeometry(0.1, 0.02, LOOP).translate(x, 0.03, LOOP / 2), '#E8B923'));
  for (const x of [-4.55, 4.55]) m.push(tint(new BoxGeometry(0.12, 0.02, LOOP).translate(x, 0.03, LOOP / 2), '#E6E2D4'));
  for (let i = 0; i < 10; i++) m.push(tint(new BoxGeometry(0.55, 0.02, 2.6).translate(-4 + i * 0.9, 0.03, 34), '#EFEBDD'));
  return flat(m);
}
const furnMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const markMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
let street: { furn: ReturnType<typeof furnitureGeo>; marks: BufferGeometry; geos: BufferGeometry[] } | null = null;
const streetKit = () => (street ??= { furn: furnitureGeo(), marks: markingsGeo(), geos: CLASSES.map((c) => classGeo(c.h)) });

/** One 60 m piece of avenue: buildings (instanced by height class), furniture, markings. Three of them leapfrog. */
function Strip({ weather, destZ }: { weather: TripPlan['weather']; destZ: { current: number } }) {
  const kit = streetKit(), root = useRef<Group>(null), dummy = useMemo(() => new Object3D(), []);
  const lists = useMemo(() => CLASSES.map((_, ci) => buildingItems.filter((b) => b.cls === ci)), []);
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const mats = useMemo(() => {
    const side = new MeshStandardMaterial({ map: wallTexture(), roughness: 0.9 }), glass = new MeshStandardMaterial({ map: glassTexture(), roughness: 0.25, metalness: 0.4 });
    const roof = new MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    return { side, glass, roof };
  }, []);
  const apply = (hideZ: number | null) => lists.forEach((list, ci) => {
    const m = refs.current[ci]; if (!m) return;
    list.forEach((b, j) => {
      const hidden = hideZ !== null && b.right1 && Math.abs(b.z + (root.current?.position.z ?? 0) - hideZ) < 7.5;
      dummy.position.set(b.x, 0, b.z); dummy.scale.set(hidden ? 0.001 : b.d, hidden ? 0.001 : 1, hidden ? 0.001 : b.w); dummy.updateMatrix(); m.setMatrixAt(j, dummy.matrix);
    }); m.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => {
    const c = new Color(); lists.forEach((list, ci) => list.forEach((b, j) => refs.current[ci]?.setColorAt(j, c.set(CLASSES[ci].glass ? ['#FFFFFF', '#DDEBFF', '#CFE3E8'][j % 3] : b.wall))));
    refs.current.forEach((m) => { if (m?.instanceColor) m.instanceColor.needsUpdate = true; }); apply(null);
  }, [lists]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = useRef(1e9);
  useFrame(() => { const z = (root.current?.position.z ?? 0), key = Math.round((destZ.current - z) * 2); if (key !== last.current) { last.current = key; apply(destZ.current); } });
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
  const jam = plan.event === 'jam', nominal = 9;
  const cars = useMemo<CarD[]>(() => {
    const r = rng(plan.key.length * 31 + 5), out: CarD[] = [];
    // [lane x, direction, speed factor, follows the ride's own speed?]. In a go-slow everyone in our two lanes crawls with you.
    const lanes: [number, 1 | -1, number, boolean][] = [[3.3, 1, 1, true], [1.1, 1, jam ? 0.9 : 1.4, jam], [-1.1, -1, 0, false], [-3.3, -1, 0, false]];
    const gap = jam ? 6 : plan.event === 'crowd' ? 11 : 15, gapOn = jam ? 10 : 13;
    for (const [x, dir, f, follow] of lanes) {
      const step = dir === 1 ? gap : gapOn; let z = RANGE[0] + r() * 3;
      while (z < RANGE[1] - 3) {
        const clear = !walk && x === 3.3 && Math.abs(z) < 6; // keep the player's own ride in clear view
        if (!clear && (!plan.light || r() < 0.7)) {
          const k = r(), kind: Kind = k < 0.28 ? 'sedan' : k < 0.4 ? 'hatch' : k < 0.58 ? 'suv' : k < 0.66 ? 'pickup' : k < 0.78 ? 'danfo' : k < 0.86 ? 'okada' : 'keke';
          out.push({ x, z, dir, f, follow, u: jam && dir === -1 ? 3 : 7 + r() * 2, kind, color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], slogan: Math.floor(r() * 8), look: Math.floor(r() * 12) });
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
    case 'keke': body = <group rotation={[0, north, 0]}><Keke driver={2} /></group>; break;
    case 'cab': body = <group rotation={[0, north, 0]}><CarMesh kind="sedan" hex="#19C37D" /></group>; break;
    case 'own': body = <group rotation={[0, north, 0]}><PlayerCar def={{ color: plan.vehicle?.color ?? '#C9CED1', model: plan.vehicle?.model ?? 'audi' }} /></group>; break;
    case 'danfo': body = <group rotation={[0, north, 0]}><Danfo slogan={slogan} conductor /></group>; break;
    case 'okada': body = <group rotation={[0, north, 0]}><Okada rider={crowdLook(5)} passenger={plan.appearance} pot={plan.weather === 'rain'} /></group>; break;
    default: body = null;
  }
  return <group ref={g}>{plan.ride !== 'trek' && <Blob w={plan.ride === 'okada' ? 0.6 : plan.ride === 'danfo' ? 1.25 : 1.1} l={plan.ride === 'danfo' ? 3 : plan.ride === 'okada' ? 1.3 : 2.5} />}{body}</group>;
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
      <SeatedPerson look={crowdLook(1)} pos={[-0.1, 0.3, -0.35]} rot={Math.PI} scale={0.88} />
      <Box size={[1.0, 0.05, 0.05]} pos={[0, 1.12, -0.82]} color="#9AA0A6" /><Box size={[0.14, 0.1, 0.05]} pos={[0, 1.55, -0.95]} color="#C9CED1" />
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
      <SeatedPerson look={crowdLook(6)} pos={[0.5, 0.42, -0.75]} rot={Math.PI} scale={0.95} />
    </group>
  );
}

// ------------------------------------------------------------------ cameras
interface Cam { p: V3; l: V3; fov: number; pov?: 'keke' | 'danfo' }
type ShotName = 'chase' | 'pavement' | 'hero' | 'lowRear' | 'high34' | 'hood' | 'kekePov' | 'danfoWin' | 'behind' | 'walkBehind' | 'walkSide' | 'walkFront';
/** Every shot is a function of progress u (0 to 1) through the shot and of where you are (b), so each one drifts a little rather than sitting still. */
const SHOT: Record<ShotName, (u: number, b: Vector3) => Cam> = {
  chase: (u, b) => ({ p: [b.x + 0.5, 2.4 - 0.4 * u, b.z + 7.5 - 1.5 * u], l: [b.x, 1.0, b.z - 7], fov: 56 }),
  pavement: (u, b) => ({ p: [b.x + 3.8, 1.7, b.z + 3.6 - 7.2 * u], l: [b.x, 0.9, b.z - 0.4], fov: 58 }),
  // from in front and above the other traffic, looking back at you coming toward the camera
  hero: (u, b) => ({ p: [b.x - 1.4, 3.7 - 0.5 * u, b.z - 9.5 + 3 * u], l: [b.x, 0.9, b.z + 0.5], fov: 50 }),
  lowRear: (u, b) => ({ p: [b.x + 1.2, 0.5, b.z + 5 - 1.2 * u], l: [b.x, 0.75, b.z - 4], fov: 64 }),
  high34: (u, b) => ({ p: [b.x - 6 + 2 * u, 8.8 - 1.2 * u, b.z + 9.5 - u], l: [b.x, 0.6, b.z - 2], fov: 46 }),
  // a camera mounted on the bonnet, looking down the street (inside the model the dark glass would fill the screen)
  hood: (u, b) => ({ p: [b.x, 1.15, b.z - 1.1], l: [b.x + 0.2 * Math.sin(u * 3), 0.85, b.z - 14], fov: 66 }),
  kekePov: (u, b) => ({ p: [b.x + 0.3, 1.3, b.z + 1.1], l: [b.x + 0.1 + 0.1 * u, 1.2, b.z - 6], fov: 72, pov: 'keke' }),
  danfoWin: (u, b) => ({ p: [b.x + 0.2, 1.75, b.z + 0.45], l: [b.x + 3, 1.7, b.z - 2.6 - 1.4 * u], fov: 62, pov: 'danfo' }),
  behind: (u, b) => ({ p: [b.x + 0.1, 2.0, b.z + 3 - 0.6 * u], l: [b.x, 1.3, b.z - 5], fov: 60 }),
  walkBehind: (u, b) => ({ p: [b.x + 0.3, 2.1, b.z + 3.4 - 0.4 * u], l: [b.x, 1.5, b.z - 5], fov: 58 }),
  walkSide: (u, b) => ({ p: [b.x - 4.6, 2.0, b.z + 2.4 - 4.8 * u], l: [b.x, 1.3, b.z], fov: 56 }),
  walkFront: (u, b) => ({ p: [b.x - 0.4, 1.3, b.z - 6.5 + 1.2 * u], l: [b.x, 1.5, b.z], fov: 48 }),
};
/** Four cuts before arriving. Two different sets per ride (picked from the trip's key) so repeat trips do not look the same. */
function shotPlan(plan: TripPlan): ShotName[] {
  const a = Number(plan.key.slice(-2)) % 2 === 0;
  switch (plan.ride) {
    case 'own': return a ? ['chase', 'pavement', 'hood', 'hero'] : ['high34', 'lowRear', 'hero', 'chase'];
    case 'cab': return a ? ['chase', 'pavement', 'hero', 'high34'] : ['high34', 'lowRear', 'chase', 'pavement'];
    case 'keke': return a ? ['kekePov', 'chase', 'hero', 'high34'] : ['chase', 'kekePov', 'pavement', 'lowRear'];
    case 'danfo': return a ? ['danfoWin', 'chase', 'hero', 'high34'] : ['high34', 'danfoWin', 'lowRear', 'chase'];
    case 'okada': return a ? ['behind', 'pavement', 'hero', 'lowRear'] : ['lowRear', 'high34', 'behind', 'pavement'];
    default: return a ? ['walkBehind', 'walkSide', 'walkFront', 'high34'] : ['walkSide', 'high34', 'walkBehind', 'walkFront'];
  }
}


// ------------------------------------------------------------------ the whole thing
function World({ plan, arrived, arriveAt }: { plan: TripPlan; arrived: boolean; arriveAt: number }) {
  const sky = SKY[plan.weather], scroll = useRef(0), speed = useRef(0), t0 = useRef<number | null>(null), destZRef = useRef(-100);
  const strips = [useRef<Group>(null), useRef<Group>(null), useRef<Group>(null)], dest = useRef<Group>(null), walker = useRef<Group>(null);
  const rideRef = useRef<Group>(null), modelRef = useRef<Group>(null), kekeRef = useRef<Group>(null), danfoRef = useRef<Group>(null), rain3 = useRef<Group>(null);
  const motion = useRef<Motion>({ moving: true, lying: false, sitting: false });
  const rain = plan.weather === 'rain', jam = plan.event === 'jam', crowd = plan.event === 'crowd', walk = plan.ride === 'trek';
  const camera = useThree((st) => st.camera) as PerspectiveCamera, look = useMemo(() => new Vector3(), []);
  const glInfo = useThree((st) => st.gl.info); // TEST-ONLY: tests read draw calls and triangles from this
  (globalThis as { __renderInfo?: unknown }).__renderInfo = glInfo;
  const dropGeo = useRef<BufferGeometry>(null);
  const N = plan.light ? 200 : 520;
  const slabs = useMemo(() => { const t = pavingTexture().clone(); t.repeat.set(30, 200); t.needsUpdate = true; return t; }, []);
  const drops = useMemo(() => { const r = rng(5), a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { a[i * 3] = (r() - 0.5) * 24; a[i * 3 + 1] = r() * 14; a[i * 3 + 2] = -18 + r() * 24; } return a; }, [N]);
  useEffect(() => { dropGeo.current?.setAttribute('position', new BufferAttribute(drops, 3)); }, [drops]);
  const crowdCount = walk ? (plan.light ? 12 : 26) : crowd ? (plan.light ? 10 : 20) : (plan.light ? 4 : 8);
  const lanes = useMemo(() => (walk ? [5.2, 5.9, 7.1, 7.7, -5.2, -5.9, -7.1] : [5.3, 6.0, 7.2, -5.3, -6.0, -7.2]), [walk]);
  const T = Math.max(3, arriveAt), shots = useMemo(() => shotPlan(plan), [plan]);
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
    strips.forEach((s, k) => { if (s.current) s.current.position.z = o - 40 - LOOP * k; });
    const destZ = DEST_Z - D + scroll.current; destZRef.current = destZ;
    if (dest.current) dest.current.position.set(DOOR_X + 0.3 + front, 0, destZ);
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
    // camera: four cuts while travelling, then a raised, angled shot from the road that fits your ride, the passenger's path and the door in a tall phone screen
    let cam: Cam;
    if (u < 1 && ta === 0) { const n = shots.length, x = Math.min(n - 0.001, (t / T) * n), i = Math.floor(x); cam = SHOT[shots[i]](x - i, base); }
    else { const k = Math.min(1, ta / 2.2); cam = { p: [0.4, 3.4 - 0.6 * k, destZ + 9.8 - 1.5 * k], l: [6.0, 1.3, destZ - 0.5], fov: 68 }; }
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
      <color attach="background" args={[sky.hor]} />
      <fog attach="fog" args={[sky.fog, 60, 330]} />
      <hemisphereLight args={[sky.sun, '#6F6A66', sky.amb * 1.6]} />
      <directionalLight position={[8, 30, 12]} intensity={plan.weather === 'dusk' ? 2.2 : 2} color={sky.sun} />
      <SkyDome weather={plan.weather} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}><planeGeometry args={[600, 600]} /><meshStandardMaterial color="#8E9A7A" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 400]} /><meshStandardMaterial map={slabs} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[9.2, 400]} /><meshStandardMaterial color={rain ? '#25292E' : '#3B3F44'} roughness={rain ? 0.3 : 0.9} /></mesh>
      {[-4.7, 4.7].map((x) => <Box key={x} size={[0.25, 0.14, 400]} pos={[x, 0.06, 0]} color="#D8D3C8" />)}
      {strips.map((s, k) => <group key={k} ref={s}><Strip weather={plan.weather} destZ={destZRef} /></group>)}
      <Traffic plan={plan} speed={speed} walk={walk} />
      <Crowd count={crowdCount} rain={rain} speed={speed} lanes={lanes} range={RANGE} />
      {!walk && (
        <group ref={rideRef} position={[3.3, 0.02, 0]}>
          <group ref={modelRef}><Ride plan={plan} /></group>
          {plan.ride === 'keke' && <group ref={kekeRef} visible={false}><KekeInterior /></group>}
          {plan.ride === 'danfo' && <group ref={danfoRef} visible={false}><DanfoWindow /></group>}
        </group>
      )}
      <group ref={walker} position={[walk ? 6.35 : 4.5, 0.02, 0]} visible={walk} rotation={[0, Math.PI, 0]}>
        <Avatar appearance={plan.appearance} motion={motion} />
        {rain && <group position={[0, 2.15, 0]}><mesh><coneGeometry args={[0.62, 0.28, 10, 1, true]} /><meshStandardMaterial color="#E4572E" side={DoubleSide} /></mesh><Box size={[0.03, 0.5, 0.03]} pos={[0, -0.25, 0]} color="#2B2B2B" /></group>}
      </group>
      {/* the destination is part of the street from the start and comes up the road to meet you */}
      <group ref={dest} rotation={[0, -Math.PI / 2, 0]}><DestinationModel type={plan.building} /></group>
      {rain && <group ref={rain3}><points frustumCulled={false}><bufferGeometry ref={dropGeo} /><pointsMaterial color="#CFE6F7" size={0.07} transparent opacity={0.8} sizeAttenuation /></points></group>}
    </>
  );
}

export default function Scene3D({ plan, arrived, arriveAt }: { plan: TripPlan; arrived: boolean; /** seconds of travelling before the arrival shot */ arriveAt: number }) {
  // R3F frees the scene's own geometry and materials on unmount; the shared canvas textures and baked people are ours to free.
  useEffect(() => () => { wallTex?.dispose(); wallTex = null; glassTex?.dispose(); glassTex = null; pavingTex?.dispose(); pavingTex = null; disposeBakedPeople(); }, []);
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, plan.light ? 1 : 1.5]} camera={{ fov: 56, position: [4, 2.4, 8], near: 0.2, far: 700 }} gl={{ antialias: !plan.light, powerPreference: 'high-performance' }}>
        <World plan={plan} arrived={arrived} arriveAt={arriveAt} />
      </Canvas>
    </div>
  );
}
