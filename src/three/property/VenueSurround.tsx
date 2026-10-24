import { useMemo } from 'react';
import { BoxGeometry, CanvasTexture, CylinderGeometry, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { INTERIORS, type InteriorKind } from '@/data/interiors';
import { useInteriorStore } from '@/stores/interiorStore';
import type { PropertyLayout } from '@/types/world';

/**
 * The street a public venue sits in: a paved plaza, kerb, road with lane markings, real 3D buildings along the two far sides,
 * palms, lamps, parked cars and a sign with the venue's name. It replaces the green ground disc and the flat skyline picture
 * that homes use. All geometry and materials are shared and built once, so it stays cheap. It is a stand-in for the real
 * open-world map: when that exists, the venue simply sits in it and this component goes away.
 */
const BOX = new BoxGeometry(1, 1, 1);
const CYL = new CylinderGeometry(1, 1, 1, 10);
const mat = (color: string, rough = 0.9, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) => new MeshStandardMaterial({ color, roughness: rough, ...extra });
const M = {
  asphalt: mat('#3B3F46', 0.95), plaza: mat('#A9A9AB', 0.85), plazaTile: mat('#9A9A9E', 0.9), kerb: mat('#C9C6BE', 0.8), line: mat('#EDEBE3', 0.7),
  trunk: mat('#7A5A3C'), leaf: mat('#2E8B4A'), leaf2: mat('#3FA35A'), pole: mat('#2A2D31', 0.5, { metalness: 0.4 }),
  lampOn: mat('#FFF1C2', 0.4, { emissive: '#FFD98A', emissiveIntensity: 1.1 }), glass: mat('#1E2A36', 0.2), tyre: mat('#15171A'),
  curb2: mat('#E2D9C4', 0.9), base: mat('#8C8268', 1), roof: mat('#7D8289', 0.85),
  grass: mat('#6FAE5A', 1), grassDark: mat('#4F8F45', 1), sand: mat('#E8D3A0', 1), sandDark: mat('#D9C289', 1), conc: mat('#8C9094', 0.9), sea: mat('#2E9BD6', 0.15, { emissive: '#1D6FA3', emissiveIntensity: 0.35 }), foam: mat('#EAF6FB', 0.5),
};
const FACADES = ['#D8C3A5', '#B8C4CC', '#C7A99B', '#A9B7A0', '#9FB0C6', '#E0D2B4', '#C2B8A8'].map((c) => mat(c, 0.9));
const BOXES = ['#C4552D', '#1F5F8B', '#3FA35A', '#E9B949', '#8A3F6A', '#2B2F32'].map((c) => mat(c, 0.6));
const CARS = ['#C0392B', '#2E86C1', '#E5B80B', '#ECEFF1', '#1B1F24'];

/** Seeded pseudo-random so the same venue always has the same street. */
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function facadeTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y * 3) % 5 === 0 ? '#F4D58A' : '#5B7186'; g.fillRect(10 + x * 29, 12 + y * 29, 17, 17); }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function signTexture(name: string, trim: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#12301F'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = trim; g.lineWidth = 8; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 52; g.font = `800 ${size}px sans-serif`;
  while (g.measureText(name.toUpperCase()).width > 440 && size > 20) { size -= 2; g.font = `800 ${size}px sans-serif`; }
  g.fillText(name.toUpperCase(), 256, 66);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function Palm({ x, z, h = 2.6, s = 1 }: { x: number; z: number; h?: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh geometry={CYL} material={M.trunk} position={[0, h / 2, 0]} scale={[0.1, h, 0.1]} />
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} geometry={BOX} material={i % 2 ? M.leaf : M.leaf2} position={[Math.cos((i * Math.PI) / 3) * 0.55, h + 0.05, Math.sin((i * Math.PI) / 3) * 0.55]} rotation={[0.35 * Math.sin((i * Math.PI) / 3), -(i * Math.PI) / 3, -0.35 * Math.cos((i * Math.PI) / 3)]} scale={[1.2, 0.05, 0.28]} />)}
    </group>
  );
}

function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={CYL} material={M.pole} position={[0, 1.4, 0]} scale={[0.04, 2.8, 0.04]} />
      <mesh geometry={BOX} material={M.lampOn} position={[0, 2.85, 0]} scale={[0.34, 0.1, 0.18]} />
    </group>
  );
}

function ParkedCar({ x, z, rot, color }: { x: number; z: number; rot: number; color: string }) {
  const body = useMemo(() => mat(color, 0.35, { metalness: 0.3 }), [color]);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh geometry={BOX} material={body} position={[0, 0.3, 0]} scale={[1.9, 0.38, 0.95]} />
      <mesh geometry={BOX} material={M.glass} position={[-0.1, 0.62, 0]} scale={[1.0, 0.3, 0.85]} />
      {[[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.45], [0.6, -0.45]].map(([wx, wz], i) => <mesh key={i} geometry={CYL} material={M.tyre} position={[wx, 0.17, wz]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.12, 0.17]} />)}
    </group>
  );
}

export function VenueSurround({ layout }: { layout: PropertyLayout }) {
  const kind = layout.id.replace('interior.', '') as InteriorKind;
  const def = INTERIORS[kind];
  const name = useInteriorStore((s) => s.current?.name) ?? def.label;
  const facade = useMemo(() => facadeTexture(), []);
  const sign = useMemo(() => signTexture(name, def.palette.trim), [name, def.palette.trim]);
  const mats = useMemo(() => FACADES.map((m) => { const c = m.clone(); c.map = facade; return c; }), [facade]);
  const w = def.w, d = def.d, cx = w / 2, cz = d / 2;
  const theme = def.theme ?? 'street';
  const plazaMat = theme === 'park' ? M.grass : theme === 'beach' ? M.sand : theme === 'port' ? M.conc : M.plaza;
  const roadMat = theme === 'park' ? M.grassDark : theme === 'beach' ? M.sandDark : M.asphalt;
  const half = Math.max(w, d) / 2;
  const plaza = half + 4.2, road = plaza + 4.2, R = road + 9;
  const buildings = useMemo(() => {
    if (theme !== 'street') return [];
    const r = rng(kind.length * 977 + w * 31 + d);
    const out: { x: number; z: number; sx: number; sz: number; h: number; m: number }[] = [];
    // back row (z far side) and left column (x far side): the two sides the camera looks toward
    for (let x = -road - 2; x <= road + 6; ) { const sx = 4 + r() * 3, h = 4 + r() * 6; out.push({ x: cx + x + sx / 2, z: cz - road - 3.5, sx, sz: 5 + r() * 2, h, m: Math.floor(r() * mats.length) }); x += sx + 0.35; }
    for (let z = -road + 6; z <= road + 6; ) { const sz = 4 + r() * 3, h = 4 + r() * 6; out.push({ x: cx - road - 3.5, z: cz + z + sz / 2, sx: 5 + r() * 2, sz, h, m: Math.floor(r() * mats.length) }); z += sz + 0.35; }
    return out;
  }, [kind, w, d, cx, cz, road, mats.length, theme]);
  /** Backdrop for the non-street themes: tree lines, a beach's sea, or container stacks and cranes. */
  const backdrop = useMemo(() => {
    const r = rng(w * 13 + d * 7 + 11); const trees: { x: number; z: number; s: number }[] = []; const stacks: { x: number; z: number; n: number; m: number; rot: number }[] = [];
    if (theme === 'park') for (let i = -8; i <= 9; i++) { trees.push({ x: cx + i * 3.1, z: cz - road - 2 - r() * 2, s: 1.1 + r() * 0.6 }, { x: cx - road - 2 - r() * 2, z: cz + i * 3.1, s: 1.1 + r() * 0.6 }); }
    if (theme === 'port') for (let i = -7; i <= 8; i++) { stacks.push({ x: cx + i * 3.0, z: cz - road - 3, n: 1 + Math.floor(r() * 3), m: Math.floor(r() * BOXES.length), rot: 0 }, { x: cx - road - 3, z: cz + i * 3.0, n: 1 + Math.floor(r() * 3), m: Math.floor(r() * BOXES.length), rot: Math.PI / 2 }); }
    return { trees, stacks };
  }, [theme, w, d, cx, cz, road]);
  const palms = useMemo(() => {
    const r = rng(w * 17 + d * 5 + 3); const o: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 7; i++) o.push({ x: cx - plaza + 1.2 + i * ((plaza * 2 - 2.4) / 6), z: cz - plaza + 0.9, s: 0.9 + r() * 0.3 });
    for (let i = 1; i < 6; i++) o.push({ x: cx - plaza + 0.9, z: cz - plaza + 1.2 + i * ((plaza * 2 - 2.4) / 6), s: 0.9 + r() * 0.3 });
    o.push({ x: cx + plaza - 1.2, z: cz + plaza - 1.0, s: 1 }, { x: cx - plaza + 1.2, z: cz + plaza - 1.0, s: 1.05 }, { x: cx + plaza - 1.0, z: cz - plaza + 1.2, s: 1 });
    return o;
  }, [w, d, cx, cz, plaza]);
  const frontZ = d + 2.6;
  return (
    <group>
      {/* ground: dark base disc, asphalt road, light plaza slab with a kerb */}
      <mesh geometry={CYL} material={M.base} position={[cx, -0.32, cz]} scale={[R + 0.9, 0.5, R + 0.9]} />
      <mesh geometry={CYL} material={roadMat} position={[cx, -0.03, cz]} scale={[R, 0.04, R]} />
      <mesh geometry={BOX} material={M.curb2} position={[cx, -0.01, cz]} scale={[road * 2 + 0.8, 0.06, road * 2 + 0.8]} />
      <mesh geometry={BOX} material={roadMat} position={[cx, 0.021, cz]} scale={[road * 2, 0.02, road * 2]} />
      <mesh geometry={BOX} material={M.kerb} position={[cx, 0.025, cz]} scale={[plaza * 2 + 0.5, 0.06, plaza * 2 + 0.5]} />
      <mesh geometry={BOX} material={plazaMat} position={[cx, 0.06, cz]} scale={[plaza * 2, 0.04, plaza * 2]} />
      {/* paving pattern: a lighter ring of slabs hugging the venue */}
      {(theme === 'street' || theme === 'port') && <mesh geometry={BOX} material={M.plazaTile} position={[cx, 0.085, cz]} scale={[w + 3, 0.01, d + 3]} />}
      {/* the sea, behind a beach */}
      {theme === 'beach' && (
        <group>
          <mesh geometry={BOX} material={M.sea} position={[cx, 0.03, cz - plaza - 7]} scale={[road * 2 + 28, 0.06, 14]} />
          <mesh geometry={BOX} material={M.sea} position={[cx - plaza - 7, 0.03, cz + 4]} scale={[14, 0.06, road * 2 + 20]} />
          <mesh geometry={BOX} material={M.foam} position={[cx, 0.07, cz - plaza - 0.4]} scale={[plaza * 2 + 1, 0.02, 0.35]} />
          <mesh geometry={BOX} material={M.foam} position={[cx - plaza - 0.4, 0.07, cz]} scale={[0.35, 0.02, plaza * 2 + 1]} />
        </group>
      )}
      {backdrop.trees.map((t, i) => <Palm key={`t${i}`} x={t.x} z={t.z} h={3.2} s={t.s * 1.3} />)}
      {backdrop.stacks.map((c, i) => Array.from({ length: c.n }).map((_, k) => <mesh key={`${i}-${k}`} geometry={BOX} material={BOXES[(c.m + k) % BOXES.length]} position={[c.x, 0.6 + k * 1.2, c.z]} rotation={[0, c.rot, 0]} scale={[2.6, 1.15, 1.2]} />))}
      {/* lane markings on the road ring */}
      {theme === 'street' && Array.from({ length: 9 }).map((_, i) => { const t = -road + 1.4 + i * ((road * 2 - 2.8) / 8); const mid = plaza + 2.1; return (
        <group key={i}>
          <mesh geometry={BOX} material={M.line} position={[cx + t, 0.035, cz - mid]} scale={[1.2, 0.01, 0.1]} />
          <mesh geometry={BOX} material={M.line} position={[cx - mid, 0.035, cz + t]} scale={[0.1, 0.01, 1.2]} />
          <mesh geometry={BOX} material={M.line} position={[cx + t, 0.035, cz + mid]} scale={[1.2, 0.01, 0.1]} />
          <mesh geometry={BOX} material={M.line} position={[cx + mid, 0.035, cz + t]} scale={[0.1, 0.01, 1.2]} />
        </group>
      ); })}
      {/* city blocks on the far sides (the near sides stay open so the camera sees in) */}
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh geometry={BOX} material={mats[b.m]} position={[b.x, b.h / 2, b.z]} scale={[b.sx, b.h, b.sz]} />
          <mesh geometry={BOX} material={M.roof} position={[b.x, b.h + 0.12, b.z]} scale={[b.sx + 0.2, 0.24, b.sz + 0.2]} />
        </group>
      ))}
      {theme !== 'port' && palms.map((p, i) => <Palm key={i} x={p.x} z={p.z} s={p.s} />)}
      {(theme === 'street' || theme === 'park') && [-1, 0, 1].map((k) => <Lamp key={k} x={cx + k * (plaza * 0.62)} z={cz - plaza + 0.5} />)}
      {(theme === 'street' || theme === 'park') && [-1, 1].map((k) => <Lamp key={`l${k}`} x={cx - plaza + 0.5} z={cz + k * (plaza * 0.55)} />)}
      {(theme === 'street' || theme === 'park') && <Lamp x={cx + plaza - 0.6} z={cz + plaza - 0.6} />}
      {/* parked cars on the road */}
      {theme === 'street' && <>
      <ParkedCar x={cx - 5} z={cz - plaza - 2.1} rot={0} color={CARS[0]} />
      <ParkedCar x={cx + 3} z={cz - plaza - 2.1} rot={0} color={CARS[1]} />
      <ParkedCar x={cx - plaza - 2.1} z={cz + 2} rot={Math.PI / 2} color={CARS[3]} />
      <ParkedCar x={cx + plaza + 2.1} z={cz - 3} rot={Math.PI / 2} color={CARS[2]} />
      <ParkedCar x={cx + 6} z={cz + plaza + 2.1} rot={0} color={CARS[4]} />
      </>}
      {/* the venue sign, in front of the entrance and facing the camera */}
      <group position={[cx + w * 0.18, 0, frontZ]} rotation={[0, Math.PI / 4, 0]}>
        {[-1.55, 1.55].map((x) => <mesh key={x} geometry={BOX} material={M.pole} position={[x, 0.95, 0]} scale={[0.1, 1.9, 0.1]} />)}
        <mesh geometry={BOX} position={[0, 1.95, 0]} scale={[3.5, 0.9, 0.1]}><meshStandardMaterial map={sign} roughness={0.6} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.35} /></mesh>
      </group>
    </group>
  );
}
