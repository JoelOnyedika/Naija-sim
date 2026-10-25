import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import { CanvasTexture, SRGBColorSpace, type PointLight } from 'three';
import { INTERIORS, type InteriorDef, type InteriorKind } from '@/data/interiors';
import { B, Cyl, Mat, Sph } from '../models/primitives';

/**
 * Decoration for public venues: wainscot and trim, framed art, banners, neon signs, windows, shelves, rugs, string lights and
 * coloured ambient lights. Pure scenery: it is never part of the walking grid, so it only goes on the walls (shallow) and as
 * flat rugs on the floor. Each venue type has its own recipe below.
 */
const T = 0.1; // how far the wall's inner face is from the room edge
type Wall = 'b' | 'l'; // back wall (z = 0) or left wall (x = 0): the two walls the camera looks at

/** Children are laid out in the wall's own frame: x to the right along the wall, y up, z out into the room. */
function OnWall({ wall, t, y = 0, children }: { wall: Wall; t: number; y?: number; children: ReactNode }) {
  return wall === 'b' ? <group position={[t, y, T]}>{children}</group> : <group position={[T, y, t]} rotation={[0, Math.PI / 2, 0]}>{children}</group>;
}
const Glow = ({ pos, size, color, k = 1 }: { pos: [number, number, number]; size: [number, number]; color: string; k?: number }) => <mesh position={pos}><planeGeometry args={size} /><Mat color={color} emissive={color} emissiveIntensity={k} /></mesh>;

const textCache = new Map<string, CanvasTexture>();
function textTexture(text: string, color: string, bg = 'transparent', font = '800 64px sans-serif') {
  const key = `${text}|${color}|${bg}`; const hit = textCache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  if (bg !== 'transparent') { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = bg === 'transparent' ? 18 : 0;
  let size = 64; g.font = font.replace('64', String(size));
  while (g.measureText(text).width > 470 && size > 18) { size -= 3; g.font = font.replace('64', String(size)); }
  g.fillText(text, 256, 66);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; textCache.set(key, t); return t;
}

function Frame({ w = 1.1, h = 0.8, color = '#C4552D', art = '#F4F1EA', frame = '#2B2F32' }: { w?: number; h?: number; color?: string; art?: string; frame?: string }) {
  return (
    <group>
      <B size={[w, h, 0.05]} pos={[0, 0, 0.03]} color={frame} rough={0.5} radius={0.01} />
      <B size={[w - 0.12, h - 0.12, 0.03]} pos={[0, 0, 0.06]} color={art} rough={0.9} radius={0.005} />
      <B size={[(w - 0.12) * 0.55, (h - 0.12) * 0.6, 0.02]} pos={[-0.05, 0.02, 0.085]} color={color} rough={0.8} radius={0.005} />
      <Sph r={Math.min(w, h) * 0.14} pos={[(w - 0.12) * 0.2, (h - 0.12) * 0.12, 0.09]} scale={[1, 1, 0.2]} color={frame} rough={0.7} />
    </group>
  );
}
function Banner({ w = 0.7, h = 1.6, color = '#C4552D', stripe = '#E9B949' }: { w?: number; h?: number; color?: string; stripe?: string }) {
  return (
    <group>
      <B size={[w + 0.12, 0.06, 0.06]} pos={[0, h / 2 + 0.03, 0.05]} color="#3A2A22" rough={0.6} />
      <B size={[w, h, 0.03]} pos={[0, 0, 0.04]} color={color} rough={0.9} radius={0.005} />
      <B size={[w * 0.6, 0.08, 0.035]} pos={[0, h * 0.18, 0.06]} color={stripe} rough={0.8} />
      <B size={[w * 0.6, 0.08, 0.035]} pos={[0, h * 0.02, 0.06]} color={stripe} rough={0.8} />
      <B size={[w * 0.3, 0.3, 0.035]} pos={[0, -h * 0.22, 0.06]} color={stripe} rough={0.8} />
    </group>
  );
}
function Neon({ text, color = '#FF3FA4', w = 2.0, h = 0.5 }: { text: string; color?: string; w?: number; h?: number }) {
  const tex = useMemo(() => textTexture(text, color), [text, color]);
  return <mesh position={[0, 0, 0.05]}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} transparent toneMapped={false} /></mesh>;
}
function Sign({ text, bg = '#12301F', color = '#FFFFFF', w = 2.4, h = 0.6 }: { text: string; bg?: string; color?: string; w?: number; h?: number }) {
  const tex = useMemo(() => textTexture(text.toUpperCase(), color, bg), [text, color, bg]);
  return (
    <group>
      <B size={[w + 0.1, h + 0.1, 0.05]} pos={[0, 0, 0.03]} color="#2A2D31" rough={0.5} radius={0.01} />
      <mesh position={[0, 0, 0.06]}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  );
}
function Win({ w = 1.6, h = 1.3, sky = '#9FD3F0', city = true }: { w?: number; h?: number; sky?: string; city?: boolean }) {
  return (
    <group>
      <B size={[w + 0.14, h + 0.14, 0.06]} pos={[0, 0, 0.03]} color="#F4F1EA" rough={0.6} radius={0.01} />
      <Glow pos={[0, 0, 0.065]} size={[w, h]} color={sky} k={0.55} />
      {city && [-0.45, -0.1, 0.25, 0.55].map((x, i) => <B key={x} size={[0.22, 0.3 + (i % 2) * 0.25, 0.01]} pos={[x * (w / 1.6), -h / 2 + 0.2 + (i % 2) * 0.1, 0.07]} color="#5B7186" rough={0.7} shadow={false} />)}
      <B size={[0.04, h, 0.02]} pos={[0, 0, 0.08]} color="#F4F1EA" rough={0.6} /><B size={[w, 0.04, 0.02]} pos={[0, 0, 0.08]} color="#F4F1EA" rough={0.6} />
    </group>
  );
}
function Shelf({ w = 2.0, colors = ['#3FA35A', '#E9B949', '#C4552D', '#2E86C1'] }: { w?: number; colors?: string[] }) {
  const n = Math.floor(w / 0.22);
  return (
    <group>
      <B size={[w, 0.05, 0.28]} pos={[0, 0, 0.16]} color="#7A5A48" rough={0.6} />
      {Array.from({ length: n }).map((_, i) => <Cyl key={i} r={0.055} h={0.28 + (i % 3) * 0.06} pos={[-w / 2 + 0.15 + i * 0.22, 0.17 + (i % 3) * 0.03, 0.16]} color={colors[i % colors.length]} rough={0.25} seg={8} />)}
    </group>
  );
}
function Clock({ r = 0.28 }: { r?: number }) {
  return (
    <group>
      <Cyl r={r} h={0.05} pos={[0, 0, 0.05]} rot={[Math.PI / 2, 0, 0]} color="#F4F1EA" rough={0.4} seg={24} />
      <Cyl r={r * 1.1} h={0.03} pos={[0, 0, 0.035]} rot={[Math.PI / 2, 0, 0]} color="#2B2F32" rough={0.5} seg={24} />
      <B size={[0.025, r * 0.7, 0.02]} pos={[0, r * 0.3, 0.085]} color="#15171B" /><B size={[r * 0.55, 0.025, 0.02]} pos={[r * 0.25, 0, 0.088]} color="#15171B" />
    </group>
  );
}

/** Wainscot, skirting and a trim line along the two visible walls. */
function Trim({ def }: { def: InteriorDef }) {
  const { w, d, wallHeight: H, palette: p } = def;
  if (H < 1.2) return null;
  const h1 = Math.min(1.15, H * 0.3);
  return (
    <group>
      <OnWall wall="b" t={w / 2}><B size={[w - 0.3, h1, 0.04]} pos={[0, h1 / 2, 0.02]} color={p.trim} rough={0.7} shadow={false} /><B size={[w - 0.3, 0.08, 0.07]} pos={[0, h1 + 0.04, 0.035]} color={p.accent} rough={0.5} shadow={false} /><B size={[w - 0.3, 0.1, 0.06]} pos={[0, H - 0.1, 0.03]} color={p.trim} rough={0.6} shadow={false} /></OnWall>
      <OnWall wall="l" t={d / 2}><B size={[d - 0.3, h1, 0.04]} pos={[0, h1 / 2, 0.02]} color={p.trim} rough={0.7} shadow={false} /><B size={[d - 0.3, 0.08, 0.07]} pos={[0, h1 + 0.04, 0.035]} color={p.accent} rough={0.5} shadow={false} /><B size={[d - 0.3, 0.1, 0.06]} pos={[0, H - 0.1, 0.03]} color={p.trim} rough={0.6} shadow={false} /></OnWall>
    </group>
  );
}


/** A stained-glass window: lead frame, a grid of coloured panes and a pointed arch on top. */
function Stained({ w = 1.4, h = 2.6, hues = ['#E4572E', '#2E86C1', '#E9B949', '#3FA35A', '#8A3F6A'] }: { w?: number; h?: number; hues?: string[] }) {
  const cols = 3, rows = 6, cw = w / cols, rh = (h - w / 2) / rows;
  return (
    <group>
      <B size={[w + 0.16, h + 0.1, 0.07]} pos={[0, h / 2 - w / 4, 0.03]} color="#E8E0CF" rough={0.7} radius={0.02} />
      {Array.from({ length: rows }).flatMap((_, r) => Array.from({ length: cols }).map((__, c) => <Glow key={`${r}${c}`} pos={[-w / 2 + cw * (c + 0.5), -h / 2 + w / 4 + rh * (r + 0.5), 0.075]} size={[cw - 0.05, rh - 0.05]} color={hues[(r * 2 + c * 3 + (r % 2)) % hues.length]} k={0.8} />))}
      <B size={[w, w / 2, 0.01]} pos={[0, h / 2 - w / 4 + w / 4, 0.075]} color="#0B0D12" shadow={false} />
      <Glow pos={[0, h / 2, 0.08]} size={[w * 0.8, w * 0.38]} color={hues[0]} k={0.9} />
      <B size={[0.03, h, 0.02]} pos={[0, h / 2 - w / 4, 0.09]} color="#15171B" /><B size={[w, 0.03, 0.02]} pos={[0, h * 0.2, 0.09]} color="#15171B" /><B size={[w, 0.03, 0.02]} pos={[0, -h * 0.15, 0.09]} color="#15171B" />
    </group>
  );
}
function Sconce() {
  return (<group><B size={[0.16, 0.3, 0.06]} pos={[0, 0, 0.04]} color="#B89A5A" metal={0.6} rough={0.4} radius={0.02} /><Cyl r={0.05} h={0.2} pos={[0, 0.2, 0.1]} color="#FFF1C2" rough={0.7} seg={8} /><Glow pos={[0, 0.36, 0.1]} size={[0.1, 0.16]} color="#FFB45C" k={1.8} /></group>);
}
function CrossGold({ s = 1 }: { s?: number }) {
  return (<group scale={s}><B size={[0.2, 1.6, 0.08]} pos={[0, 0, 0.05]} color="#E9B949" metal={0.7} rough={0.25} radius={0.02} /><B size={[1.0, 0.2, 0.08]} pos={[0, 0.3, 0.05]} color="#E9B949" metal={0.7} rough={0.25} radius={0.02} /></group>);
}
/** Light falling through a window onto the floor: a faint, additive slanted plane. */
function Shaft({ x, z, w = 1.2, len = 4.5, color = '#FFE7B8', rotY = 0, opacity = 0.1 }: { x: number; z: number; w?: number; len?: number; color?: string; rotY?: number; opacity?: number }) {
  return (<mesh position={[x, 1.4, z]} rotation={[0.9, rotY, 0]}><planeGeometry args={[w, len]} /><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} side={2} /></mesh>);
}
/** A glowing ring on the floor with a faint column of light above it (a showroom spotlight). */
function Spot({ x, z, r = 2.1, color = '#FFFFFF' }: { x: number; z: number; r?: number; color?: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, 0]}><ringGeometry args={[r - 0.12, r, 48]} /><meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.112, 0]}><circleGeometry args={[r - 0.12, 48]} /><meshBasicMaterial color={color} transparent opacity={0.16} toneMapped={false} depthWrite={false} /></mesh>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[r * 0.7, r * 0.95, 3.2, 24, 1, true]} /><meshBasicMaterial color={color} transparent opacity={0.07} toneMapped={false} depthWrite={false} side={2} /></mesh>
    </group>
  );
}


/** A flat coloured rectangle on the floor (pitch lines, towels, markings). */
const Flat = ({ x, z, w, d, color, y = 0.12, rot = 0 }: { x: number; z: number; w: number; d: number; color: string; y?: number; rot?: number }) => <B size={[w, 0.015, d]} pos={[x, y, z]} rot={[0, rot, 0]} color={color} rough={0.95} shadow={false} />;
const Cone = ({ x, z }: { x: number; z: number }) => (<group position={[x, 0.1, z]}><Cyl r={0.2} r2={0.2} h={0.04} pos={[0, 0.02, 0]} color="#2A2D31" seg={8} /><Cyl r={0.2} r2={0.06} h={0.5} pos={[0, 0.27, 0]} color="#FF7A2B" rough={0.6} seg={10} /><Cyl r={0.12} r2={0.1} h={0.06} pos={[0, 0.3, 0]} color="#FFFFFF" rough={0.6} seg={10} /></group>);
function FlowerBed({ x, z, w = 1.6, d = 0.8, seed = 0 }: { x: number; z: number; w?: number; d?: number; seed?: number }) {
  const cols = ['#E4572E', '#FFE08A', '#FF7AA8', '#FFFFFF', '#8A3F6A'];
  return (<group position={[x, 0.1, z]}><B size={[w, 0.18, d]} pos={[0, 0.09, 0]} color="#7A5A3C" rough={1} radius={0.04} shadow={false} />{Array.from({ length: 9 }).map((_, i) => <Sph key={i} r={0.1} pos={[-w / 2 + 0.2 + (i % 5) * ((w - 0.4) / 4), 0.3 + (i % 2) * 0.05, (i < 5 ? -1 : 1) * d * 0.2]} color={cols[(i + seed) % cols.length]} rough={0.8} />)}</group>);
}
function Pond({ x, z, rx = 1.5, rz = 1.0 }: { x: number; z: number; rx?: number; rz?: number }) {
  return (<group position={[x, 0, z]}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, 0]} scale={[rx, rz, 1]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#4DA6D8" roughness={0.1} metalness={0.2} emissive="#1D6FA3" emissiveIntensity={0.3} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]} scale={[rx + 0.18, rz + 0.18, 1]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#9A9A9E" roughness={0.9} /></mesh>{[[-0.4, 0.2], [0.5, -0.2], [0.1, 0.45]].map(([lx, lz], i) => <Cyl key={i} r={0.18} h={0.01} pos={[lx * rx, 0.14, lz * rz]} color="#3FA35A" seg={10} />)}</group>);
}
function Sandcastle({ x, z }: { x: number; z: number }) {
  return (<group position={[x, 0.1, z]}><B size={[0.9, 0.35, 0.9]} pos={[0, 0.17, 0]} color="#D9B86F" rough={1} radius={0.05} />{[[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].map(([a, b]) => <Cyl key={`${a}${b}`} r={0.14} r2={0.1} h={0.55} pos={[a, 0.45, b]} color="#D9B86F" rough={1} seg={8} />)}<Cyl r={0.2} r2={0.05} h={0.4} pos={[0, 0.55, 0]} color="#D9B86F" rough={1} seg={8} /><B size={[0.02, 0.3, 0.02]} pos={[0, 0.95, 0]} color="#5A3A20" /><B size={[0.16, 0.1, 0.01]} pos={[0.08, 1.0, 0]} color="#E4572E" /></group>);
}
/** A grid of floor tiles whose colours cycle (the club dance floor). Only 24 meshes, updated once a frame. */
function DanceFloor({ x, z, cols = 6, rows = 4, size = 1 }: { x: number; z: number; cols?: number; rows?: number; size?: number }) {
  const refs = useRef<(import('three').Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => { if (!m) return; const c = i % cols, r = Math.floor(i / cols); const hue = (t * 0.15 + (c + r) * 0.07) % 1; const lit = (Math.sin(t * 2 + c * 1.1 + r * 0.7) + 1) / 2; (m.material as import('three').MeshStandardMaterial).emissive.setHSL(hue, 0.9, 0.2 + lit * 0.35); (m.material as import('three').MeshStandardMaterial).color.setHSL(hue, 0.5, 0.12); });
  });
  return (<group position={[x - (cols * size) / 2 + size / 2, 0.125, z - (rows * size) / 2 + size / 2]}>{Array.from({ length: cols * rows }).map((_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={[(i % cols) * size, 0, Math.floor(i / cols) * size]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[size - 0.06, size - 0.06]} /><meshStandardMaterial color="#201A33" emissive="#FF3FA4" emissiveIntensity={1} roughness={0.3} /></mesh>)}</group>);
}
/** Slowly sweeping coloured light beams (additive planes), for clubs and live venues. */
function Beams({ x, z, colors, height = 3.4 }: { x: number; z: number; colors: string[]; height?: number }) {
  const g = useRef<import('three').Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.children.forEach((c, i) => { c.rotation.z = Math.sin(clock.elapsedTime * 0.6 + i * 1.7) * 0.5; c.rotation.x = Math.cos(clock.elapsedTime * 0.5 + i) * 0.35; }); });
  return (<group ref={g} position={[x, height, z]}>{colors.map((c, i) => <group key={c} position={[(i - (colors.length - 1) / 2) * 1.6, 0, 0]}><mesh position={[0, -height / 2, 0]}><cylinderGeometry args={[0.04, 0.55, height, 14, 1, true]} /><meshBasicMaterial color={c} transparent opacity={0.13} depthWrite={false} toneMapped={false} side={2} /></mesh></group>)}</group>);
}

/** Rectangular rug with a border. */
function Rug({ x, z, w, d, a, b }: { x: number; z: number; w: number; d: number; a: string; b: string }) {
  return (
    <group position={[x, 0.11, z]}>
      <B size={[w, 0.02, d]} pos={[0, 0, 0]} color={a} rough={1} radius={0.01} shadow={false} />
      <B size={[w - 0.3, 0.025, d - 0.3]} pos={[0, 0.002, 0]} color={b} rough={1} radius={0.01} shadow={false} />
      <B size={[w - 0.8, 0.03, d - 0.8]} pos={[0, 0.004, 0]} color={a} rough={1} radius={0.01} shadow={false} />
    </group>
  );
}

/** A line of small lights (or flags) hung along a wall just below the top. */
function Strings({ wall, from, to, y, colors, bulbs = true }: { wall: Wall; from: number; to: number; y: number; colors: string[]; bulbs?: boolean }) {
  const n = Math.max(3, Math.floor(Math.abs(to - from) / 0.45));
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const u = i / (n - 1), t = from + (to - from) * u, sag = Math.sin(u * Math.PI) * 0.22;
        return <OnWall key={i} wall={wall} t={t} y={y - sag}>{bulbs ? <Sph r={0.06} pos={[0, 0, 0.12]} color={colors[i % colors.length]} emissive={colors[i % colors.length]} emissiveIntensity={1.4} /> : <B size={[0.2, 0.2, 0.02]} pos={[0, -0.1, 0.12]} rot={[0, 0, Math.PI / 4]} color={colors[i % colors.length]} rough={0.9} shadow={false} />}</OnWall>;
      })}
    </group>
  );
}

/** A coloured ambient light that drifts a little so the room feels alive. */
function Ambient({ x, z, y = 2.6, color, intensity = 10, dist = 9, sway = 0.5 }: { x: number; z: number; y?: number; color: string; intensity?: number; dist?: number; sway?: number }) {
  const l = useRef<PointLight>(null);
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (l.current) { l.current.position.x = x + Math.sin(t * 0.5 + x) * sway; l.current.position.z = z + Math.cos(t * 0.4 + z) * sway; l.current.intensity = intensity * (0.92 + Math.sin(t * 1.3 + x) * 0.08); } });
  return <pointLight ref={l} position={[x, y, z]} color={color} intensity={intensity} distance={dist} decay={1.6} />;
}

type Recipe = (def: InteriorDef) => ReactNode; // gets the whole venue definition (size, palette, items)
const R: Partial<Record<InteriorKind, Recipe>> = {
  market: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.75}><Sign text="Grand Market" w={3.4} h={0.75} bg="#8A5A2E" color="#FFE08A" /></OnWall>
    {[0.12, 0.24, 0.36, 0.64, 0.76, 0.88].map((u, i) => <OnWall key={u} wall="b" t={w * u} y={1.9}><Banner w={0.62} h={1.7} color={['#C4552D', '#2E86C1', '#E9B949', '#8A3F6A', '#2F8F4E', '#E4572E'][i]} stripe={['#FFE08A', '#FFFFFF', '#7A1F3D', '#FFE08A', '#FFFFFF', '#1F3D6B'][i]} /></OnWall>)}
    {[0.15, 0.4, 0.65, 0.88].map((u, i) => <OnWall key={u} wall="l" t={d * u} y={2.0}><Banner w={0.7} h={1.6} color={['#2E86C1', '#C4552D', '#E9B949', '#2F8F4E'][i]} stripe="#FFFFFF" /></OnWall>)}
    <OnWall wall="l" t={d * 0.55} y={2.9}><Neon text="BARGAINS" color="#FFB547" w={1.8} h={0.5} /></OnWall>
    <Strings wall="b" from={1} to={w - 1} y={3.1} colors={['#E4572E', '#FFE08A', '#2F8F4E', '#2E86C1', '#8A3F6A']} bulbs={false} />
    <Strings wall="l" from={1} to={d - 1} y={3.1} colors={['#E4572E', '#FFE08A', '#2F8F4E', '#2E86C1', '#8A3F6A']} bulbs={false} />
    <Rug x={w * 0.5} z={d * 0.3} w={w - 2.5} d={1.1} a="#8A5A2E" b="#C4552D" />
    <Rug x={w * 0.48} z={d * 0.78} w={6.5} d={2.6} a="#7A3A1A" b="#B4532A" />
    <Ambient x={w * 0.3} z={d * 0.45} color="#FFB45C" intensity={10} /><Ambient x={w * 0.72} z={d * 0.6} color="#FFD98A" intensity={8} />
  </>),
  church: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={1.1}><Stained w={2.2} h={3.2} hues={['#E4572E', '#2E86C1', '#E9B949', '#3FA35A', '#8A3F6A']} /></OnWall>
    <OnWall wall="b" t={w * 0.5} y={3.2}><CrossGold s={0.7} /></OnWall>
    <OnWall wall="b" t={w * 0.2} y={1.5}><Stained w={1.2} h={2.4} hues={['#2E86C1', '#8A3F6A', '#E9B949']} /></OnWall>
    <OnWall wall="b" t={w * 0.8} y={1.5}><Stained w={1.2} h={2.4} hues={['#3FA35A', '#E4572E', '#E9B949']} /></OnWall>
    {[0.22, 0.45, 0.68, 0.88].map((u, i) => <OnWall key={u} wall="l" t={d * u} y={1.5}><Stained w={1.1} h={2.3} hues={i % 2 ? ['#3FA35A', '#2E86C1', '#E9B949'] : ['#E4572E', '#8A3F6A', '#E9B949']} /></OnWall>)}
    {[0.1, 0.34, 0.57, 0.78].map((u) => <OnWall key={u} wall="l" t={d * u} y={1.8}><Sconce /></OnWall>)}
    <OnWall wall="b" t={w * 0.05} y={1.8}><Sconce /></OnWall><OnWall wall="b" t={w * 0.95} y={1.8}><Sconce /></OnWall>
    <OnWall wall="b" t={w * 0.35} y={2.3}><Sign text="Hymn 214" w={1.0} h={0.4} bg="#2B2F32" color="#E9B949" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.56} w={2.2} d={d - 5.4} a="#7A1F3D" b="#A8283F" />
    <Rug x={w * 0.5} z={2.3} w={4.4} d={2.2} a="#E9B949" b="#F4E1A0" />
    <Shaft x={w * 0.5} z={d * 0.3} w={2.2} len={6} color="#FFD98A" opacity={0.1} /><Shaft x={w * 0.25} z={d * 0.22} w={1.1} len={4.5} color="#7CB8FF" opacity={0.09} /><Shaft x={w * 0.75} z={d * 0.22} w={1.1} len={4.5} color="#FF9AB8" opacity={0.09} />
    <Shaft x={w * 0.18} z={d * 0.5} w={1.0} len={5} color="#9AFFB8" rotY={Math.PI / 2} opacity={0.07} />
    <Ambient x={w * 0.5} z={d * 0.2} color="#FFE0A0" intensity={9} /><Ambient x={w * 0.3} z={d * 0.6} color="#9CC8FF" intensity={6} /><Ambient x={w * 0.7} z={d * 0.6} color="#FFB0C8" intensity={6} />
  </>),
  showroom: ({ w, d, items }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.7}><Neon text="POLANCO MOTORS" color="#E9B949" w={6.2} h={1.1} /></OnWall>
    <OnWall wall="b" t={w * 0.5} y={1.7}><B size={[6.6, 0.06, 0.06]} pos={[0, 0, 0.06]} color="#E9B949" metal={0.7} rough={0.3} /></OnWall>
    <OnWall wall="b" t={w * 0.15} y={2.2}><Frame w={2.0} h={1.1} color="#C0392B" art="#ECEEF0" frame="#B8892F" /></OnWall>
    <OnWall wall="b" t={w * 0.85} y={2.2}><Frame w={2.0} h={1.1} color="#2E86C1" art="#ECEEF0" frame="#B8892F" /></OnWall>
    <OnWall wall="b" t={w * 0.3} y={1.7}><Banner w={0.8} h={1.6} color="#1F3D6B" stripe="#E9B949" /></OnWall>
    <OnWall wall="b" t={w * 0.7} y={1.7}><Banner w={0.8} h={1.6} color="#1F3D6B" stripe="#E9B949" /></OnWall>
    {[0.2, 0.5, 0.8].map((u) => <OnWall key={u} wall="l" t={d * u} y={1.6}><Win w={1.8} h={2.0} sky="#CFE8F5" city /></OnWall>)}
    <OnWall wall="l" t={d * 0.5} y={3.3}><Sign text="Finance available" w={2.6} h={0.5} bg="#1F3D6B" color="#E9B949" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.5} w={w - 7} d={1.5} a="#1F3D6B" b="#2E5A9B" />
    {items.filter((i) => i.defId === 'v_podium').map((i, k) => <Spot key={k} x={i.x} z={i.z} r={2.2} color={k % 2 ? '#BFE3FF' : '#FFF1C2'} />)}
    <Ambient x={w * 0.25} z={d * 0.5} color="#FFFFFF" intensity={9} dist={14} /><Ambient x={w * 0.75} z={d * 0.5} color="#FFE7B8" intensity={9} dist={14} />
  </>),
  gallery: ({ w, d }) => (<>
    {[0.15, 0.35, 0.55, 0.75, 0.92].map((u, i) => <OnWall key={u} wall="b" t={w * u} y={1.9}><Frame w={1.1 + (i % 2) * 0.5} h={0.9 + (i % 3) * 0.3} color={['#C4552D', '#2E86C1', '#E9B949', '#3FA35A', '#8A3F6A'][i]} frame={i % 2 ? '#B8892F' : '#15171B'} /></OnWall>)}
    {[0.25, 0.55, 0.85].map((u, i) => <OnWall key={u} wall="l" t={d * u} y={1.9}><Frame w={1.2} h={1.2} color={['#2E86C1', '#C4552D', '#E9B949'][i]} frame="#15171B" /></OnWall>)}
    <OnWall wall="b" t={w * 0.5} y={3.0}><Neon text="EXHIBITION" color="#FFFFFF" w={2.4} h={0.5} /></OnWall>
    <Rug x={w * 0.5} z={d * 0.55} w={w - 5} d={1.8} a="#2B2F32" b="#3A3F45" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFFFFF" intensity={9} dist={12} />
  </>),
  stadium: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.2}><Sign text="Tafawa Balewa Square" w={4.0} h={0.7} bg="#1F6F4D" /></OnWall>
    {[0.2, 0.8].map((u) => <OnWall key={u} wall="b" t={w * u} y={1.8}><Banner w={0.9} h={1.6} color="#1F8A4D" stripe="#FFFFFF" /></OnWall>)}
    <Strings wall="b" from={1} to={w - 1} y={2.9} colors={['#1F8A4D', '#FFFFFF', '#1F8A4D']} bulbs={false} />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFF4D0" intensity={7} dist={16} y={4} />
  </>),
  club: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.7}><Neon text="QUILOX" color="#FF3FA4" w={3.4} h={0.9} /></OnWall>
    <OnWall wall="l" t={d * 0.5} y={2.5}><Neon text="VIP" color="#4DD0FF" w={1.6} h={0.6} /></OnWall>
    <Strings wall="b" from={1} to={w - 1} y={3.2} colors={['#FF3FA4', '#4DD0FF', '#B04DFF']} />
    <Rug x={w * 0.5} z={d * 0.55} w={6} d={4} a="#15171B" b="#2A2D3A" />
    <Ambient x={w * 0.3} z={d * 0.5} color="#FF3FA4" intensity={10} /><Ambient x={w * 0.7} z={d * 0.5} color="#4DD0FF" intensity={10} />
  </>),
  viewing: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.2} y={2.2}><Neon text="OGA SUNDAY" color="#FFE08A" w={2.4} h={0.6} /></OnWall>
    <OnWall wall="b" t={w * 0.8} y={2.1}><Banner w={0.8} h={1.5} color="#E4572E" stripe="#FFE08A" /></OnWall>
    <OnWall wall="b" t={w * 0.05} y={1.9}><Frame w={0.9} h={0.7} color="#2F8F4E" /></OnWall>
    <OnWall wall="l" t={d * 0.3} y={2.0}><Banner w={0.8} h={1.5} color="#1F5F8B" stripe="#FFFFFF" /></OnWall>
    <OnWall wall="l" t={d * 0.55} y={2.0}><Sign text="Fixtures" w={1.6} h={0.5} bg="#14301F" /></OnWall>
    <OnWall wall="l" t={d * 0.78} y={1.9}><Frame w={1.0} h={0.75} color="#E9B949" /></OnWall>
    <OnWall wall="l" t={d * 0.9} y={1.7}><Shelf w={1.5} /></OnWall>
    <Strings wall="b" from={1} to={w - 1} y={3.2} colors={['#E4572E', '#FFE08A', '#2F8F4E', '#2E86C1']} bulbs={false} />
    <Rug x={w * 0.5} z={d * 0.62} w={8} d={4.4} a="#1F5F3A" b="#2F8F4E" />
    <Ambient x={w * 0.5} z={d * 0.35} color="#7CFFAE" intensity={8} />
  </>),
  eatery: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.5}><Sign text="Mama's Kitchen" w={3.0} h={0.7} bg="#9C4A1A" /></OnWall>
    <OnWall wall="b" t={w * 0.15} y={2.0}><Frame w={0.9} h={0.7} color="#E4572E" /></OnWall>
    <OnWall wall="b" t={w * 0.88} y={2.0}><Clock /></OnWall>
    <OnWall wall="l" t={d * 0.35} y={1.9}><Win w={1.3} h={1.1} /></OnWall>
    <OnWall wall="l" t={d * 0.7} y={1.9}><Banner w={0.7} h={1.4} color="#2F6B4A" stripe="#E9B949" /></OnWall>
    <Strings wall="b" from={1} to={w - 1} y={3.0} colors={['#FFE08A', '#E4572E', '#2F8F4E']} bulbs={false} />
    <Rug x={w * 0.4} z={d * 0.62} w={9} d={5.4} a="#7A3A1A" b="#B4532A" />
    <Ambient x={w * 0.35} z={d * 0.5} color="#FFB45C" intensity={9} />
  </>),
  bank: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.7}><Sign text="Eko Trust" w={3.2} h={0.7} bg="#1F3D6B" color="#E9B949" /></OnWall>
    <OnWall wall="b" t={w * 0.12} y={2.0}><Frame w={1.1} h={0.8} color="#1F3D6B" /></OnWall>
    <OnWall wall="b" t={w * 0.88} y={2.0}><Clock r={0.32} /></OnWall>
    <OnWall wall="l" t={d * 0.4} y={2.0}><Banner w={0.8} h={1.6} color="#1F3D6B" stripe="#B8892F" /></OnWall>
    <OnWall wall="l" t={d * 0.72} y={2.0}><Win w={1.4} h={1.2} sky="#BFE3F4" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.7} w={9} d={4} a="#1F3D6B" b="#2E5A9B" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#BFD8FF" intensity={7} />
  </>),
  mall: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={3.0}><Neon text="SALE  SALE  SALE" color="#FF6B4D" w={4} h={0.6} /></OnWall>
    <OnWall wall="b" t={w * 0.25} y={2.2}><Frame w={1.2} h={0.9} color="#C4552D" /></OnWall>
    <OnWall wall="b" t={w * 0.75} y={2.2}><Frame w={1.2} h={0.9} color="#2E86C1" /></OnWall>
    <OnWall wall="l" t={d * 0.25} y={2.4}><Banner w={0.9} h={1.8} color="#2E86C1" stripe="#FFFFFF" /></OnWall>
    <OnWall wall="l" t={d * 0.7} y={2.4}><Banner w={0.9} h={1.8} color="#C4552D" stripe="#FFE08A" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.5} w={10} d={8} a="#C9C6BE" b="#E8E4DC" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFE7B8" intensity={9} dist={12} />
  </>),
  cinema: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.12} y={2.4}><Neon text="NOW SHOWING" color="#FF3F6B" w={2.2} h={0.5} /></OnWall>
    <OnWall wall="b" t={w * 0.88} y={2.2}><Frame w={1.0} h={1.4} color="#9B1C2E" art="#E9B949" /></OnWall>
    <OnWall wall="l" t={d * 0.3} y={2.2}><Frame w={1.0} h={1.4} color="#2E86C1" art="#E9B949" /></OnWall>
    <OnWall wall="l" t={d * 0.6} y={2.2}><Frame w={1.0} h={1.4} color="#3FA35A" art="#E9B949" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.62} w={w - 4} d={1.4} a="#9B1C2E" b="#C4263F" />
    <Ambient x={w * 0.5} z={d * 0.3} color="#6C8CFF" intensity={9} />
    <Ambient x={w * 0.5} z={d * 0.85} color="#FF5A7A" intensity={5} />
  </>),
  concert: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={3.0}><Neon text="LIVE TONIGHT" color="#FFB547" w={3.4} h={0.7} /></OnWall>
    <OnWall wall="b" t={w * 0.15} y={2.2}><Banner w={0.9} h={1.8} color="#C4552D" stripe="#FFE08A" /></OnWall>
    <OnWall wall="b" t={w * 0.85} y={2.2}><Banner w={0.9} h={1.8} color="#2F8F4E" stripe="#FFE08A" /></OnWall>
    <OnWall wall="l" t={d * 0.35} y={2.3}><Frame w={1.2} h={1.5} color="#E9B949" art="#3A1A12" /></OnWall>
    <OnWall wall="l" t={d * 0.8} y={2.0}><Shelf w={1.6} /></OnWall>
    <Strings wall="b" from={1} to={w - 1} y={3.4} colors={['#FFB547', '#FF5A5A', '#FFE08A']} />
    <Rug x={w * 0.5} z={d * 0.55} w={8} d={5} a="#5A2A1A" b="#8A4020" />
    <Ambient x={w * 0.3} z={d * 0.5} color="#FF6A3D" intensity={9} /><Ambient x={w * 0.7} z={d * 0.5} color="#B04DFF" intensity={9} />
  </>),
  hotel: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.28} y={2.8}><Sign text="Eko Suites" w={3.2} h={0.7} bg="#1F5F8B" color="#E9B949" /></OnWall>
    <OnWall wall="b" t={w * 0.6} y={2.1}><Win w={1.8} h={1.5} /></OnWall>
    <OnWall wall="b" t={w * 0.8} y={2.1}><Win w={1.8} h={1.5} /></OnWall>
    <OnWall wall="l" t={d * 0.3} y={2.1}><Frame w={1.3} h={1.0} color="#1F5F8B" /></OnWall>
    <OnWall wall="l" t={d * 0.6} y={2.1}><Frame w={1.3} h={1.0} color="#B8892F" /></OnWall>
    <Rug x={w * 0.27} z={d * 0.5} w={6.5} d={4.5} a="#8B6B3A" b="#C9A66B" />
    <Ambient x={w * 0.3} z={d * 0.4} color="#FFD9A0" intensity={9} /><Ambient x={w * 0.72} z={d * 0.6} color="#4DD0FF" intensity={7} />
  </>),
  techhub: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.8}><Neon text="{ CODE.LAGOS }" color="#3BE3A0" w={3.4} h={0.7} /></OnWall>
    <OnWall wall="b" t={w * 0.12} y={2.0}><Frame w={1.0} h={0.8} color="#2E86C1" /></OnWall>
    <OnWall wall="b" t={w * 0.9} y={2.0}><Clock /></OnWall>
    <OnWall wall="l" t={d * 0.35} y={2.1}><Banner w={0.8} h={1.6} color="#2E86C1" stripe="#3BE3A0" /></OnWall>
    <OnWall wall="l" t={d * 0.7} y={2.1}><Win w={1.4} h={1.2} sky="#BFE3F4" /></OnWall>
    <Strings wall="b" from={1.5} to={w - 1.5} y={3.2} colors={['#3BE3A0', '#3B9AD6', '#B04DFF']} />
    <Ambient x={w * 0.5} z={d * 0.55} color="#5CC8FF" intensity={8} />
  </>),
  park: ({ w, d }) => (<>
    <Rug x={w * 0.5} z={d * 0.4} w={w * 0.5} d={0.9} a="#C9B27A" b="#D9C289" />
    <Rug x={w * 0.5} z={d * 0.62} w={0.9} d={d * 0.5} a="#C9B27A" b="#D9C289" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFF4D0" intensity={6} dist={14} y={4} />
  </>),
  beach: ({ w, d }) => (<>
    <Rug x={w * 0.5} z={d * 0.28} w={w * 0.7} d={0.5} a="#EAF6FB" b="#CFE8F0" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFE7B8" intensity={6} dist={16} y={4} />
  </>),
  recreation: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.6} y={2.5}><Sign text="Members Only" w={3.0} h={0.7} bg="#1F6F4D" color="#E9B949" /></OnWall>
    <OnWall wall="b" t={w * 0.2} y={2.1}><Frame w={1.2} h={0.9} color="#1F6F4D" /></OnWall>
    <OnWall wall="l" t={d * 0.35} y={2.1}><Win w={1.5} h={1.3} /></OnWall>
    <OnWall wall="l" t={d * 0.7} y={2.1}><Banner w={0.8} h={1.5} color="#1F6F4D" stripe="#E9B949" /></OnWall>
    <Rug x={w * 0.72} z={d * 0.3} w={6} d={3.4} a="#1F6F4D" b="#2F8F6A" />
    <Ambient x={w * 0.4} z={d * 0.5} color="#BFFFE0" intensity={8} />
  </>),
  government: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.7}><Sign text="Service Desk" w={3.0} h={0.65} bg="#1F8A4D" /></OnWall>
    <OnWall wall="b" t={w * 0.15} y={2.0}><Frame w={0.9} h={1.1} color="#1F8A4D" art="#F4F1EA" /></OnWall>
    <OnWall wall="b" t={w * 0.85} y={2.0}><Clock r={0.3} /></OnWall>
    <OnWall wall="l" t={d * 0.45} y={2.0}><Banner w={0.8} h={1.5} color="#1F8A4D" stripe="#FFFFFF" /></OnWall>
    <OnWall wall="l" t={d * 0.78} y={2.0}><Sign text="Take a number" w={1.8} h={0.5} bg="#2B2F32" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.68} w={9} d={5} a="#1F8A4D" b="#3FA35A" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#E8FFE0" intensity={7} />
  </>),
  business: ({ w, d }) => (<>
    <OnWall wall="l" t={d * 0.3} y={2.0}><Frame w={1.2} h={0.9} color="#3BE3A0" /></OnWall>
    <OnWall wall="l" t={d * 0.65} y={2.0}><Frame w={1.2} h={0.9} color="#1F3D6B" /></OnWall>
    <OnWall wall="b" t={w * 0.07} y={2.4}><Sign text="Floor 24" w={1.4} h={0.45} bg="#1F3D6B" color="#3BE3A0" /></OnWall>
    <Rug x={w * 0.35} z={d * 0.62} w={9} d={4.6} a="#2B3A52" b="#43587A" />
    <Ambient x={w * 0.5} z={d * 0.45} color="#9FD8FF" intensity={8} />
  </>),
  airport: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={3.0}><Sign text="Departures" w={3.6} h={0.75} bg="#1F5F8B" color="#E9B949" /></OnWall>
    <OnWall wall="b" t={w * 0.1} y={2.2}><Win w={2.0} h={1.5} sky="#BFE3F4" /></OnWall>
    <OnWall wall="b" t={w * 0.9} y={2.2}><Win w={2.0} h={1.5} sky="#BFE3F4" /></OnWall>
    <OnWall wall="l" t={d * 0.4} y={2.2}><Win w={2.0} h={1.5} sky="#BFE3F4" /></OnWall>
    <OnWall wall="l" t={d * 0.75} y={2.0}><Banner w={0.9} h={1.6} color="#1F5F8B" stripe="#E9B949" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.75} w={w - 8} d={4.6} a="#1F5F8B" b="#2E7FB5" />
    <Ambient x={w * 0.3} z={d * 0.5} color="#DDEBFF" intensity={8} dist={12} /><Ambient x={w * 0.7} z={d * 0.5} color="#DDEBFF" intensity={8} dist={12} />
  </>),
  port: ({ w, d }) => (<>
    <Rug x={w * 0.5} z={d * 0.5} w={w - 6} d={0.35} a="#E9B949" b="#E9B949" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFE7B8" intensity={6} dist={16} y={4} />
  </>),
};

const R2: Partial<Record<InteriorKind, Recipe>> = {
  gallery: ({ w, d, items }) => (<>
    {[0.15, 0.35, 0.55, 0.75, 0.92].map((u, i) => <OnWall key={u} wall="b" t={w * u} y={1.9}><Frame w={1.1 + (i % 2) * 0.5} h={0.9 + (i % 3) * 0.3} color={['#C4552D', '#2E86C1', '#E9B949', '#3FA35A', '#8A3F6A'][i]} frame={i % 2 ? '#B8892F' : '#15171B'} /></OnWall>)}
    {[0.25, 0.55, 0.85].map((u, i) => <OnWall key={u} wall="l" t={d * u} y={1.9}><Frame w={1.2} h={1.2} color={['#2E86C1', '#C4552D', '#E9B949'][i]} frame="#15171B" /></OnWall>)}
    <OnWall wall="b" t={w * 0.5} y={3.0}><Neon text="EXHIBITION" color="#FFFFFF" w={2.4} h={0.5} /></OnWall>
    <OnWall wall="l" t={d * 0.1} y={2.5}><Sign text="Opening night" w={1.8} h={0.5} bg="#2B2F32" color="#E9B949" /></OnWall>
    <Rug x={w * 0.5} z={d * 0.55} w={w - 5} d={2.0} a="#2B2F32" b="#3A3F45" />
    {items.filter((i) => i.defId === 'v_plinth' || i.defId === 'v_sculpture').map((i, k) => <Spot key={k} x={i.x} z={i.z} r={i.defId === 'v_sculpture' ? 1.6 : 1.1} color={k % 3 === 0 ? '#FFE7B8' : k % 3 === 1 ? '#CFE8FF' : '#FFD0E0'} />)}
    <Ambient x={w * 0.3} z={d * 0.5} color="#FFFFFF" intensity={9} dist={12} /><Ambient x={w * 0.7} z={d * 0.5} color="#FFE7B8" intensity={7} dist={12} />
  </>),
  stadium: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.2}><Sign text="Tafawa Balewa Square" w={4.0} h={0.7} bg="#1F6F4D" /></OnWall>
    {[0.15, 0.85].map((u) => <OnWall key={u} wall="b" t={w * u} y={1.8}><Banner w={0.9} h={1.6} color="#1F8A4D" stripe="#FFFFFF" /></OnWall>)}
    {['Naija Bank', 'Spark Power', 'Sky Naija'].map((t, i) => <OnWall key={t} wall="l" t={d * (0.3 + i * 0.25)} y={1.7}><Sign text={t} w={1.8} h={0.45} bg={['#0B2A4A', '#10243E', '#12345B'][i]} color="#FFFFFF" /></OnWall>)}
    <Strings wall="b" from={1} to={w - 1} y={2.9} colors={['#1F8A4D', '#FFFFFF', '#1F8A4D']} bulbs={false} />
    <Flat x={w / 2} z={7.5} w={w - 4} d={0.12} color="#FFFFFF" /><Flat x={w / 2} z={15.4} w={w - 4} d={0.12} color="#FFFFFF" />
    <Flat x={2.1} z={11.45} w={0.12} d={7.95} color="#FFFFFF" /><Flat x={w - 2.1} z={11.45} w={0.12} d={7.95} color="#FFFFFF" />
    <Flat x={w / 2} z={11.45} w={w - 4} d={0.1} color="#FFFFFF" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0.125, 11.45]}><ringGeometry args={[1.6, 1.72, 40]} /><meshBasicMaterial color="#FFFFFF" toneMapped={false} /></mesh>
    {[[2.1, 7.5], [w - 2.1, 7.5], [2.1, 15.4], [w - 2.1, 15.4]].map(([cx, cz], i) => <group key={i} position={[cx, 0, cz]}><B size={[0.04, 0.9, 0.04]} pos={[0, 0.45, 0]} color="#F4F1EA" /><B size={[0.3, 0.2, 0.01]} pos={[0.15, 0.8, 0]} color="#E4572E" /></group>)}
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFF4D0" intensity={8} dist={18} y={4} />
  </>),
  club: ({ w, d }) => (<>
    <OnWall wall="b" t={w * 0.5} y={2.7}><Neon text="QUILOX" color="#FF3FA4" w={3.4} h={0.9} /></OnWall>
    <OnWall wall="l" t={d * 0.5} y={2.5}><Neon text="VIP" color="#4DD0FF" w={1.6} h={0.6} /></OnWall>
    <OnWall wall="l" t={d * 0.2} y={2.0}><Neon text="BOTTLES" color="#FFB547" w={1.6} h={0.4} /></OnWall>
    <Strings wall="b" from={1} to={w - 1} y={3.2} colors={['#FF3FA4', '#4DD0FF', '#B04DFF']} />
    <Strings wall="l" from={1} to={d - 1} y={3.2} colors={['#4DD0FF', '#B04DFF', '#FF3FA4']} />
    <DanceFloor x={w * 0.5} z={d * 0.55} cols={6} rows={4} size={1.05} />
    <Beams x={w * 0.5} z={d * 0.5} colors={['#FF3FA4', '#4DD0FF', '#B04DFF', '#FFB547']} height={3.4} />
    <Ambient x={w * 0.3} z={d * 0.5} color="#FF3FA4" intensity={10} /><Ambient x={w * 0.7} z={d * 0.5} color="#4DD0FF" intensity={10} />
  </>),
  park: ({ w, d }) => (<>
    <FlowerBed x={1.8} z={d * 0.42} seed={0} /><FlowerBed x={w - 1.8} z={d * 0.42} seed={2} /><FlowerBed x={1.8} z={d * 0.62} seed={1} /><FlowerBed x={w - 1.8} z={d * 0.62} seed={3} />
    <FlowerBed x={w * 0.5 - 3} z={d * 0.42} w={1.2} d={0.6} seed={4} /><FlowerBed x={w * 0.5 + 3} z={d * 0.42} w={1.2} d={0.6} seed={5} />
    <Pond x={6.8} z={10.8} rx={1.6} rz={1.1} />
    <Rug x={w * 0.5} z={d * 0.4} w={w * 0.5} d={0.9} a="#C9B27A" b="#D9C289" />
    <Rug x={w * 0.5} z={d * 0.62} w={0.9} d={d * 0.5} a="#C9B27A" b="#D9C289" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFF4D0" intensity={7} dist={16} y={4} />
  </>),
  beach: ({ w, d }) => (<>
    <Rug x={w * 0.5} z={d * 0.28} w={w * 0.7} d={0.5} a="#EAF6FB" b="#CFE8F0" />
    {[[5.3, 11.4, '#E4572E'], [9.7, 13.6, '#2E86C1'], [15.3, 13.6, '#E9B949'], [19.7, 11.4, '#3FA35A']].map(([x, z, c]) => <Flat key={String(x)} x={x as number} z={z as number} w={0.9} d={1.7} color={c as string} y={0.13} rot={0.3} />)}
    <Sandcastle x={8.6} z={8.2} /><Sandcastle x={13.2} z={9.6} />
    {[[6.4, 9.8, '#E4572E'], [12.4, 11.2, '#2E86C1'], [17.6, 8.8, '#E9B949']].map(([x, z, c]) => <Sph key={String(x)} r={0.22} pos={[x as number, 0.3, z as number]} color={c as string} rough={0.5} />)}
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFE7B8" intensity={7} dist={18} y={4} />
  </>),
  port: ({ w, d }) => (<>
    <Flat x={w * 0.5} z={4.2} w={w - 6} d={0.2} color="#E9B949" /><Flat x={w * 0.5} z={11.6} w={w - 6} d={0.2} color="#E9B949" />
    {[7, 11, 15].map((x) => <Flat key={x} x={x} z={8} w={0.2} d={7.2} color="#FFFFFF" y={0.12} />)}
    {[[8, 5.4], [14.8, 5.4], [8, 11.4], [14.8, 11.4], [11.4, 8], [17, 8]].map(([x, z], i) => <Cone key={i} x={x} z={z} />)}
    {[3, 7, 11, 15, 19].map((x) => <group key={x} position={[x, 0, d - 0.9]}><Cyl r={0.14} h={0.55} pos={[0, 0.3, 0]} color="#E9B949" rough={0.6} seg={10} /><B size={[0.3, 0.06, 0.3]} pos={[0, 0.58, 0]} color="#2A2D31" /></group>)}
    <Rug x={w * 0.5} z={d * 0.5} w={w - 6} d={0.35} a="#E9B949" b="#E9B949" />
    <Ambient x={w * 0.5} z={d * 0.5} color="#FFE7B8" intensity={7} dist={18} y={4} />
  </>),
};
const RECIPES: Partial<Record<InteriorKind, Recipe>> = { ...R, ...R2 };

export function VenueDecor({ layoutId }: { layoutId: string }) {
  const def = INTERIORS[layoutId.replace('interior.', '') as InteriorKind];
  if (!def) return null;
  const recipe = RECIPES[def.kind];
  return <group><Trim def={def} />{recipe?.(def)}</group>;
}
