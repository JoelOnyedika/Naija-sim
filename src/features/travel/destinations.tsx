import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, DoubleSide, BackSide, MeshStandardMaterial, SRGBColorSpace, type Group } from 'three';
import { CarMesh } from './vehicles3d';
import { glassTexture, wallTexture } from './textures';

/**
 * A distinct building for every place you can travel to. Each one has the place's name on a sign, a style that suits it (a glass
 * showroom for Polanco Motors, a neon club front for Quilox, a columned bank, a market with striped awnings, a church with a spire...),
 * and a REAL doorway: the front wall has an opening with a lit lobby behind it and sliding doors. The passenger walks through the
 * opening and disappears at the wall plane (the scene clips them there), instead of walking through a solid wall.
 *
 * Local frame: the front (door side) faces +z, the building's front plane is at z = depth / 2, the ground is y = 0. The scene turns
 * the group so +z points at the road.
 */
export type Kind = 'church' | 'showroom' | 'club' | 'market' | 'gate' | 'theatre' | 'tower' | 'food' | 'bank' | 'mall' | 'cinema' | 'gov' | 'hotel' | 'airport' | 'villa';
export interface Style { kind: Kind; w: number; d: number; h: number; wall: string; accent: string; sign: string; doorW?: number; doorH?: number }
export interface DestPlace { id: string; name: string; category: string }

const G = '#0F6B3E', STYLES: Record<string, Partial<Style> & { kind: Kind }> = {
  cathedral: { kind: 'church', wall: '#E8E0D0', accent: '#7A2E2E' }, polanco: { kind: 'showroom', wall: '#F2F4F7', accent: '#1F5FBF' }, quilox: { kind: 'club', wall: '#16121C', accent: '#FF2D95' },
  balogun: { kind: 'market', wall: '#C9B089', accent: '#C23B3B' }, 'freedom-park': { kind: 'gate', wall: '#CFC8B8', accent: '#2F8A55' }, 'national-theatre': { kind: 'theatre', wall: '#D9D4C8', accent: '#2B6CB0' },
  'eko-atlantic': { kind: 'tower', wall: '#7FB4D8', accent: '#1F5FBF', h: 28 }, 'computer-village': { kind: 'market', wall: '#D8C7A0', accent: '#2B8C5B' }, 'mama-put': { kind: 'food', wall: '#E4A11B', accent: '#B03A2E' },
  'eko-trust-bank': { kind: 'bank', wall: '#D9D2C3', accent: '#1F4E79' }, 'lekki-beach': { kind: 'gate', wall: '#E8D9A8', accent: '#19A7CE' }, tejuosho: { kind: 'market', wall: '#BFA77A', accent: '#2B6CB0' },
  'mushin-market': { kind: 'market', wall: '#B49A70', accent: '#2B8C5B' }, 'ikeja-city-mall': { kind: 'mall', wall: '#EDEFF2', accent: '#E4572E' }, 'landmark-centre': { kind: 'mall', wall: '#DDE6EE', accent: '#6A4CC2' },
  'terra-kulture': { kind: 'villa', wall: '#F2D9A8', accent: '#8A63D2' }, 'lekki-arts-market': { kind: 'market', wall: '#D8B98A', accent: '#8A63D2' }, 'new-afrika-shrine': { kind: 'club', wall: '#2A2018', accent: '#2B8C5B' },
  'oga-sunday-viewing': { kind: 'cinema', wall: '#2B2B33', accent: '#FFC21A' }, 'genesis-cinema': { kind: 'cinema', wall: '#1D2B53', accent: '#FF5A5F' }, 'suya-obalende': { kind: 'food', wall: '#3B2A22', accent: '#E4572E' },
  'agege-bakery': { kind: 'food', wall: '#F2D9A8', accent: '#C2762B' }, 'yaba-tech-hub': { kind: 'tower', wall: '#9FB6C9', accent: '#19C3A6', h: 12 }, 'naija-first-bank': { kind: 'bank', wall: '#E7E1D3', accent: G },
  'lekki-conservation': { kind: 'gate', wall: '#B9B29A', accent: '#2F8A55' }, 'ikoyi-club': { kind: 'villa', wall: '#F7F3EA', accent: '#B03A2E', h: 6.5 }, 'banana-marina': { kind: 'gate', wall: '#D8D3C8', accent: '#2B6CB0' },
  'alausa-secretariat': { kind: 'gov', wall: '#E3DFD3', accent: G }, 'tafawa-balewa-square': { kind: 'gov', wall: '#EAE6DA', accent: G }, 'lagos-house': { kind: 'gov', wall: '#F4F0E6', accent: '#B03A2E' },
  'federal-secretariat': { kind: 'gov', wall: '#DAD6CA', accent: G }, 'eko-hotel': { kind: 'hotel', wall: '#E9EEF3', accent: '#1F5FBF' }, mmia: { kind: 'airport', wall: '#E6EAEE', accent: '#1F5FBF' },
};
const BY_CATEGORY: Record<string, Kind> = { market: 'market', Market: 'market', food: 'food', Food: 'food', bank: 'bank', business: 'tower', Work: 'tower', tech: 'tower', government: 'gov', culture: 'theatre', entertainment: 'cinema', club: 'club', Nightlife: 'club', park: 'gate', Outdoors: 'gate', beach: 'gate', shopping: 'mall', Shopping: 'mall', recreation: 'villa', Fitness: 'villa', transport: 'airport' };
const SIZE: Record<Kind, [number, number, number, number, number]> = { // w, d, h, doorW, doorH
  church: [6, 9, 5.5, 1.8, 3], showroom: [10, 7, 4.2, 2.8, 2.7], club: [8, 7, 6, 2, 2.6], market: [11, 6, 3.6, 3.2, 2.7], gate: [8, 2, 4.6, 5, 4], theatre: [12, 8, 5, 3, 3], tower: [7, 6, 16, 2.6, 2.8],
  food: [5, 4.2, 3.4, 1.4, 2.3], bank: [9, 7, 7.5, 2.2, 3.2], mall: [12, 7.5, 7, 4.2, 3.4], cinema: [8, 6, 6.5, 2.4, 2.8], gov: [11, 7.5, 8, 2.4, 3.2], hotel: [10, 7, 14, 3, 3], airport: [15, 8, 6, 4, 3.2], villa: [6, 5, 4.5, 1.6, 2.5],
};
/** The look of a place: its own entry if it has one, else a style chosen from its category. */
export function styleFor(place: DestPlace): Style {
  const key = place.id.replace(/^lagos\./, ''), s = STYLES[key];
  const kind: Kind = s?.kind ?? BY_CATEGORY[place.category] ?? 'villa', [w, d, h, doorW, doorH] = SIZE[kind];
  return { kind, w, d, h: s?.h ?? h, wall: s?.wall ?? '#E4D8BE', accent: s?.accent ?? '#C2762B', sign: place.name.toUpperCase(), doorW, doorH };
}

// ------------------------------------------------------------------ pieces
const cache = new Map<string, CanvasTexture>();
function signTex(text: string, bg: string, fg: string): CanvasTexture {
  const key = `${text}|${bg}|${fg}`; let t = cache.get(key); if (t) return t;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let size = 60; g.font = `bold ${size}px "Arial Black", Impact, sans-serif`;
  while (g.measureText(text).width > 470 && size > 18) { size -= 3; g.font = `bold ${size}px "Arial Black", Impact, sans-serif`; }
  g.fillText(text, 256, 66); t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; cache.set(key, t); return t;
}
export function disposeDestinations() { cache.forEach((t) => t.dispose()); cache.clear(); }
type V = [number, number, number];
const B = ({ s, p, c, r, e, o }: { s: V; p: V; c: string; r?: V; e?: string; o?: number }) => <mesh position={p} rotation={r}><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={0.85} emissive={e ?? '#000'} emissiveIntensity={e ? 1.3 : 0} transparent={o !== undefined} opacity={o ?? 1} /></mesh>;
const Sign = ({ text, w, h = w / 4, p, bg, fg, r }: { text: string; w: number; h?: number; p: V; bg: string; fg: string; r?: V }) => {
  const t = useMemo(() => signTex(text, bg, fg), [text, bg, fg]);
  return <group position={p} rotation={r}><mesh><boxGeometry args={[w, h, 0.18]} /><meshStandardMaterial color="#1A1A1E" /></mesh><mesh position={[0, 0, 0.1]}><planeGeometry args={[w * 0.96, h * 0.9]} /><meshBasicMaterial map={t} /></mesh></group>;
};
/** Wall material with windows that repeat with the wall's size. */
function useWall(w: number, h: number, color: string, glass = false) {
  return useMemo(() => { const t = (glass ? glassTexture() : wallTexture()).clone(); t.repeat.set(Math.max(1, Math.round(w / 2.4)), Math.max(1, Math.round(h / 3))); t.needsUpdate = true; return new MeshStandardMaterial({ map: t, color, roughness: 0.85 }); }, [w, h, color, glass]);
}
/** Doorway: sliding leaves, a frame, and a lit lobby behind (the lobby faces inward so you can see into it through the opening). */
function Door({ w, h, d, open, glass }: { w: number; h: number; d: number; open: { current: number }; glass: boolean }) {
  const l = useRef<Group>(null), r = useRef<Group>(null), z = d / 2;
  useFrame(() => { const o = open.current; if (l.current) l.current.position.x = -w / 4 - o * (w * 0.5); if (r.current) r.current.position.x = w / 4 + o * (w * 0.5); });
  return (
    <group>
      <mesh position={[0, (h + 0.2) / 2, z - 0.5 - 1.5]}><boxGeometry args={[w + 0.5, h + 0.2, 3]} /><meshStandardMaterial color="#2A2018" emissive="#6A4A22" emissiveIntensity={0.9} side={BackSide} /></mesh>
      <B s={[w + 0.3, 0.16, 0.3]} p={[0, h + 0.08, z + 0.05]} c="#2A2D32" /><B s={[0.14, h, 0.3]} p={[-w / 2 - 0.07, h / 2, z + 0.05]} c="#2A2D32" /><B s={[0.14, h, 0.3]} p={[w / 2 + 0.07, h / 2, z + 0.05]} c="#2A2D32" />
      {[l, r].map((g, i) => <group key={i} ref={g} position={[(i ? 1 : -1) * w / 4, 0, z + 0.04]}><mesh position={[0, h / 2, 0]}><boxGeometry args={[w / 2 - 0.04, h - 0.1, 0.07]} /><meshStandardMaterial color={glass ? '#8FB8CF' : '#5A3F26'} transparent={glass} opacity={glass ? 0.45 : 1} roughness={0.2} metalness={glass ? 0.5 : 0} /></mesh></group>)}
      <B s={[w * 0.9, 0.04, 2.2]} p={[0, 0.02, z + 1.1]} c="#B8B2A6" />
    </group>
  );
}
/** The wall with a doorway cut into it (three slabs round the opening), the solid mass behind it, and the doorway itself. */
function Shell({ s, open, glassFront = false, hollow = false }: { s: Style; open: { current: number }; glassFront?: boolean; hollow?: boolean }) {
  const { w, d, h, doorW = 2, doorH = 2.6 } = s, side = (w - doorW) / 2, t = 0.5, z0 = d / 2 - t - 3, mat = useWall(w, h, s.wall), massW = useWall(w, h, s.wall);
  return (
    <group>
      {side > 0.05 && [-1, 1].map((k) => (glassFront ? <mesh key={k} position={[k * (doorW / 2 + side / 2), doorH / 2 + 0.3, d / 2 - t / 2]}><boxGeometry args={[side, doorH + 0.6, t]} /><meshStandardMaterial color="#9CC3D6" transparent opacity={0.35} roughness={0.1} metalness={0.5} /></mesh> : <mesh key={k} position={[k * (doorW / 2 + side / 2), h / 2, d / 2 - t / 2]} material={mat}><boxGeometry args={[side, h, t]} /></mesh>))}
      {glassFront && [-1, 1].map((k) => <mesh key={`u${k}`} position={[k * (doorW / 2 + side / 2), (h + doorH + 0.6) / 2, d / 2 - t / 2]} material={mat}><boxGeometry args={[side, h - doorH - 0.6, t]} /></mesh>)}
      <mesh position={[0, doorH + (h - doorH) / 2, d / 2 - t / 2]} material={mat}><boxGeometry args={[doorW, h - doorH, t]} /></mesh>
      {glassFront && <>{[-1, 1].map((k) => <mesh key={`g${k}`} position={[k * (doorW / 2 + side / 2), 0.15, d / 2 - t / 2]} material={mat}><boxGeometry args={[side, 0.3, t]} /></mesh>)}</>}
      {hollow ? <mesh position={[0, h / 2, 0]}><boxGeometry args={[w - 0.4, h - 0.3, d - 0.6]} /><meshStandardMaterial color="#E9EDF2" emissive="#CFD6DF" emissiveIntensity={0.55} side={BackSide} /></mesh>
        : <mesh position={[0, h / 2, (z0 - d / 2) / 2]} material={massW}><boxGeometry args={[w, h, z0 + d / 2]} /></mesh>}
      <mesh position={[0, h + 0.1, 0]}><boxGeometry args={[w + 0.3, 0.2, d + 0.3]} /><meshStandardMaterial color="#8A8F94" roughness={0.9} /></mesh>
      <Door w={doorW} h={doorH} d={d} open={open} glass={glassFront || s.kind === 'mall' || s.kind === 'hotel' || s.kind === 'airport'} />
    </group>
  );
}
const Columns = ({ n, w, h, z, c = '#EDE8DC' }: { n: number; w: number; h: number; z: number; c?: string }) => <>{Array.from({ length: n }).map((_, i) => <mesh key={i} position={[-w / 2 + (w * i) / (n - 1), h / 2, z]}><cylinderGeometry args={[0.32, 0.36, h, 10]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>)}</>;
const Flag = ({ p }: { p: V }) => <group position={p}><mesh position={[0, 3, 0]}><cylinderGeometry args={[0.05, 0.06, 6, 6]} /><meshStandardMaterial color="#C9CED1" /></mesh>{[-0.4, 0, 0.4].map((x, i) => <B key={i} s={[0.4, 0.8, 0.04]} p={[0.2 + x * 0.0 + (i - 1) * 0.4 + 0.4, 5.4, 0]} c={i === 1 ? '#FFFFFF' : '#0F8A3E'} />)}</group>;
const Neon = ({ s, p, c }: { s: V; p: V; c: string }) => <B s={s} p={p} c={c} e={c} />;
const Stripe = ({ w, z, y, tilt, cols }: { w: number; z: number; y: number; tilt: number; cols: [string, string] }) => <group position={[0, y, z]} rotation={[tilt, 0, 0]}>{Array.from({ length: Math.round(w / 0.7) }).map((_, i) => <B key={i} s={[0.7, 0.06, 1.3]} p={[-w / 2 + 0.35 + i * 0.7, 0, 0]} c={cols[i % 2]} />)}</group>;

export function DestinationBuilding({ style: s, open }: { style: Style; open: { current: number } }) {
  const { kind, w, d, h, accent, doorW = 2, doorH = 2.6 } = s, z = d / 2;
  switch (kind) {
    case 'showroom': return (
      <group><Shell s={s} open={open} glassFront hollow />
        <group position={[-2.6, 0, -0.6]} rotation={[0, 0.5, 0]}><CarMesh kind="sedan" hex="#B8202E" /></group><group position={[2.7, 0, 0.2]} rotation={[0, -0.6, 0]}><CarMesh kind="suv" hex="#E8D8B0" /></group>
        <Sign text={s.sign} w={w * 0.8} p={[0, h + 1.2, z - 0.4]} bg={accent} fg="#FFFFFF" />
        <B s={[w + 0.4, 0.5, 1.6]} p={[0, doorH + 1, z + 0.5]} c={accent} /></group>);
    case 'club': return (
      <group><Shell s={s} open={open} />
        {[-1, 1].map((k) => <Neon key={k} s={[0.14, h - 0.6, 0.14]} p={[k * (w / 2 - 0.1), h / 2, z + 0.05]} c={accent} />)}<Neon s={[w - 0.4, 0.14, 0.14]} p={[0, h - 0.3, z + 0.05]} c={accent} />
        <Sign text={s.sign} w={w * 0.7} p={[0, h - 1.3, z + 0.3]} bg="#0B0B10" fg={accent} />
        <B s={[1.8, 0.03, 4.5]} p={[0, 0.02, z + 2.4]} c="#A5121F" />{[-1.1, 1.1].map((x) => [0.4, 2.6, 4.4].map((zz) => <mesh key={`${x}${zz}`} position={[x, 0.45, z + zz]}><cylinderGeometry args={[0.05, 0.05, 0.9, 6]} /><meshStandardMaterial color="#D8B04A" metalness={0.6} roughness={0.3} /></mesh>))}</group>);
    case 'market': return (
      <group><Shell s={s} open={open} />
        <Stripe w={w - 0.4} z={z + 0.7} y={doorH + 0.5} tilt={0.45} cols={[accent, '#F4F1EA']} />
        {Array.from({ length: 6 }).map((_, i) => <group key={i} position={[-w / 2 + 1 + i * ((w - 2) / 5) + (i < 3 ? 0 : 0), 0, z + 1.2]}><B s={[1.3, 0.8, 0.9]} p={[0, 0.4, 0]} c="#7C5A2A" />{[0, 1, 2].map((k) => <mesh key={k} position={[-0.3 + k * 0.3, 0.95, 0]}><sphereGeometry args={[0.22, 8, 6]} /><meshStandardMaterial color={['#E4572E', '#FFC21A', '#2B8C5B'][(i + k) % 3]} /></mesh>)}</group>)}
        {Array.from({ length: 7 }).map((_, i) => <B key={i} s={[w / 7 - 0.05, 0.12, d + 0.3]} p={[-w / 2 + (i + 0.5) * (w / 7), h + 0.3, 0]} c={i % 2 ? '#8E9AA3' : '#A3AEB6'} />)}
        <Sign text={s.sign} w={w * 0.75} p={[0, h + 1.2, z - 0.3]} bg={accent} fg="#FFFFFF" /></group>);
    case 'gate': return (
      <group>{[-1, 1].map((k) => <B key={k} s={[1, h, 1]} p={[k * (w / 2 - 0.5), h / 2, 0]} c={s.wall} />)}<B s={[w, 0.9, 1]} p={[0, h + 0.2, 0]} c={s.wall} /><Sign text={s.sign} w={w - 0.8} h={1.4} p={[0, h + 0.2, 0.55]} bg={accent} fg="#FFFFFF" />
        {[-1, 1].map((k) => [1, 2, 3].map((i) => <B key={`${k}${i}`} s={[2.2, 1.2, 0.12]} p={[k * (w / 2 + 1.1 + (i - 1) * 2.3), 0.6, 0]} c="#6E6A60" />))}
        {[-1, 1].map((k) => <group key={`t${k}`} position={[k * (w / 2 + 3), 0, -2]}><mesh position={[0, 2.4, 0]}><sphereGeometry args={[1.6, 9, 7]} /><meshStandardMaterial color={accent} /></mesh><B s={[0.3, 2.4, 0.3]} p={[0, 1.2, 0]} c="#6B4A2B" /></group>)}
        <B s={[doorW, 0.02, 6]} p={[0, 0.02, 2.4]} c="#C9B98F" /></group>);
    case 'church': return (
      <group><Shell s={s} open={open} />
        {[-1, 1].map((k) => <B key={k} s={[w * 0.62, 0.22, d + 0.8]} p={[k * w * 0.23, h + 1.2, 0]} c="#7A2E2E" r={[0, 0, -k * 0.55]} />)}
        <B s={[2.2, 9.5, 2.2]} p={[-w / 2 + 0.2, 4.75, z - 1.2]} c={s.wall} /><mesh position={[-w / 2 + 0.2, 11, z - 1.2]}><coneGeometry args={[1.7, 3, 4]} /><meshStandardMaterial color="#7A2E2E" /></mesh>
        <B s={[0.15, 1.2, 0.15]} p={[-w / 2 + 0.2, 13.3, z - 1.2]} c="#E8D8A8" /><B s={[0.7, 0.15, 0.15]} p={[-w / 2 + 0.2, 13.5, z - 1.2]} c="#E8D8A8" />
        {[-1.6, 1.6].map((x) => <B key={x} s={[0.7, 1.7, 0.1]} p={[x, 3.2, z + 0.06]} c={['#2B6CB0', '#C23B3B'][x > 0 ? 0 : 1]} e="#334" />)}<Sign text={s.sign} w={4.4} h={0.9} p={[0, doorH + 1.1, z + 0.15]} bg="#F4EFE2" fg="#5A2020" /></group>);
    case 'theatre': return (
      <group><Shell s={s} open={open} /><mesh position={[0, h + 1.2, 0]} scale={[w * 0.5, 2.6, d * 0.55]}><sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#C9C2B2" roughness={0.8} /></mesh>
        {[-1, 1].map((k) => <B key={k} s={[3.2, 0.5, d * 0.8]} p={[k * (w / 2 + 1.2), 3.6, 0]} c="#B9B2A2" r={[0, 0, k * 0.3]} />)}<Sign text={s.sign} w={w * 0.55} p={[0, doorH + 0.9, z + 0.2]} bg={accent} fg="#FFFFFF" /></group>);
    case 'tower': return (
      <group><Shell s={{ ...s, h: 4.4, w: w + 1, d }} open={open} />
        <mesh position={[0, 4.4 + (h - 4.4) / 2, -0.7]}><boxGeometry args={[w - 1, h - 4.4, d - 1.6]} /><meshStandardMaterial map={useMemo(() => { const t = glassTexture().clone(); t.repeat.set(3, Math.round((h - 4.4) / 3)); t.needsUpdate = true; return t; }, [h])} roughness={0.2} metalness={0.4} /></mesh>
        <Sign text={s.sign} w={w * 0.8} h={0.9} p={[0, 5.2, z - 0.2]} bg="#0F1B2A" fg="#FFFFFF" /><B s={[w - 1.3, 0.4, 0.4]} p={[0, h + 0.2, z - 1.2]} c={accent} e={accent} /><B s={[0.12, 3, 0.12]} p={[1.5, h + 1.6, -0.7]} c="#9AA4AD" /></group>);
    case 'food': return (
      <group><Shell s={s} open={open} /><Stripe w={w + 0.4} z={z + 0.7} y={doorH + 0.55} tilt={0.5} cols={[accent, '#F4F1EA']} />
        <B s={[2.2, 0.8, 0.8]} p={[1.6, 0.4, z + 0.9]} c="#4A3626" /><B s={[1.8, 0.05, 0.6]} p={[1.6, 0.85, z + 0.9]} c="#E8E2D2" />{[0, 1].map((i) => <mesh key={i} position={[1.2 + i * 0.8, 1.0, z + 0.9]}><sphereGeometry args={[0.2, 8, 6]} /><meshStandardMaterial color={accent} emissive="#331100" /></mesh>)}
        <Sign text={s.sign} w={w * 0.9} h={0.8} p={[0, h + 0.8, z - 0.3]} bg={accent} fg="#FFFFFF" /></group>);
    case 'bank': return (
      <group><Shell s={s} open={open} /><Columns n={4} w={w * 0.75} h={h - 1.2} z={z + 1.1} /><B s={[w * 0.85, 0.7, 2.6]} p={[0, h - 0.5, z + 0.9]} c="#E8E2D2" />
        <B s={[w * 0.85, 0.2, 2.8]} p={[0, h, z + 0.9]} c="#C9C2B2" />{[0.4, 0.8, 1.2].map((i) => <B key={i} s={[w * 0.9, 0.2, 2.2 + i]} p={[0, i * 0.2, z + 1 + i * 0.4]} c="#D8D3C8" />)}
        <Sign text={s.sign} w={w * 0.6} h={0.9} p={[0, h - 0.5, z + 2.25]} bg={accent} fg="#FFFFFF" /></group>);
    case 'gov': return (
      <group><Shell s={s} open={open} /><Columns n={6} w={w * 0.8} h={h - 1.2} z={z + 1.1} /><B s={[w * 0.9, 0.8, 2.6]} p={[0, h - 0.6, z + 0.9]} c="#EEE9DD" />{[0.4, 0.8, 1.2, 1.6].map((i) => <B key={i} s={[w * 0.95, 0.2, 2 + i]} p={[0, i * 0.2 - 0.1, z + 1 + i * 0.4]} c="#D8D3C8" />)}
        <Flag p={[-w / 2 - 0.8, 0, z + 1.5]} /><Flag p={[w / 2 + 0.8, 0, z + 1.5]} /><Sign text={s.sign} w={w * 0.7} h={0.9} p={[0, h - 0.6, z + 2.25]} bg={accent} fg="#FFFFFF" /></group>);
    case 'mall': return (
      <group><Shell s={s} open={open} glassFront /><B s={[w, 1.6, 0.4]} p={[0, h - 0.2, z + 0.25]} c={accent} /><Sign text={s.sign} w={w * 0.62} h={1.3} p={[0, h - 0.2, z + 0.5]} bg="#FFFFFF" fg={accent} />
        {[-1, 1].map((k) => <B key={k} s={[0.6, h, 0.5]} p={[k * (w / 2 - 0.2), h / 2, z + 0.2]} c={accent} />)}<B s={[doorW + 1.6, 0.4, 2.4]} p={[0, doorH + 0.6, z + 1.2]} c="#2A2D32" />{[0, 1, 2].map((i) => <B key={i} s={[1.6, 0.9, 3.2]} p={[-3 + i * 3, 0.45, z + 4.4]} c="#6E6A60" />)}</group>);
    case 'cinema': return (
      <group><Shell s={s} open={open} /><B s={[w * 0.8, 1.3, 1.4]} p={[0, doorH + 1.1, z + 0.7]} c="#1A1A22" />{Array.from({ length: 12 }).map((_, i) => <mesh key={i} position={[-w * 0.38 + i * (w * 0.76 / 11), doorH + 1.75, z + 1.45]}><sphereGeometry args={[0.1, 6, 5]} /><meshStandardMaterial color="#FFE9A0" emissive="#FFD060" emissiveIntensity={2} /></mesh>)}
        <Sign text={s.sign} w={w * 0.7} h={1} p={[0, doorH + 1.1, z + 1.45]} bg="#12121A" fg={accent} />{[-1, 1].map((k) => [0, 1].map((i) => <B key={`${k}${i}`} s={[0.9, 1.4, 0.06]} p={[k * (doorW / 2 + 1.2 + i * 1.2), 1.8, z + 0.07]} c={['#E4572E', '#2B6CB0', '#8A63D2', '#2B8C5B'][(i + (k > 0 ? 2 : 0))]} />))}</group>);
    case 'hotel': return (
      <group><Shell s={{ ...s, h: 4.6 }} open={open} glassFront /><mesh position={[0, 4.6 + (h - 4.6) / 2, -0.8]}><boxGeometry args={[w - 1, h - 4.6, d - 2.2]} /><meshStandardMaterial map={useMemo(() => { const t = wallTexture().clone(); t.repeat.set(4, Math.round((h - 4.6) / 3)); t.needsUpdate = true; return t; }, [h])} color="#EFF3F7" roughness={0.6} /></mesh>
        {Array.from({ length: 4 }).map((_, i) => <B key={i} s={[w - 0.6, 0.18, 1]} p={[0, 6.5 + i * 2.6, z - 1.7]} c="#C9D2DB" />)}<B s={[doorW + 2, 0.4, 3]} p={[0, doorH + 0.9, z + 1.5]} c="#2A3A4A" />{[-1, 1].map((k) => <B key={k} s={[0.3, doorH + 0.9, 0.3]} p={[k * (doorW / 2 + 0.9), (doorH + 0.9) / 2, z + 2.8]} c="#2A3A4A" />)}
        <Sign text={s.sign} w={w * 0.7} h={1} p={[0, 5.2, z - 0.1]} bg={accent} fg="#FFFFFF" /></group>);
    case 'airport': return (
      <group><Shell s={s} open={open} glassFront /><mesh position={[0, h + 1.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}><cylinderGeometry args={[2.2, 2.2, w + 0.4, 14, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#C9D2DB" side={DoubleSide} /></mesh>
        <B s={[2.2, 14, 2.2]} p={[w / 2 + 1.8, 7, -1]} c="#E6EAEE" /><B s={[3.4, 1.8, 3.4]} p={[w / 2 + 1.8, 14.8, -1]} c="#1F3A5A" e="#223" /><Sign text={s.sign} w={w * 0.7} h={1.1} p={[0, h - 0.3, z + 0.3]} bg={accent} fg="#FFFFFF" /><B s={[doorW + 3, 0.3, 2.6]} p={[0, doorH + 0.7, z + 1.3]} c="#9AA4AD" /></group>);
    default: return ( // villa / shop
      <group><Shell s={s} open={open} />{[-1, 1].map((k) => <B key={k} s={[w * 0.62, 0.2, d + 0.6]} p={[k * w * 0.24, h + 0.7, 0]} c="#A8503A" r={[0, 0, -k * 0.5]} />)}
        <Stripe w={doorW + 1.2} z={z + 0.6} y={doorH + 0.4} tilt={0.4} cols={[accent, '#F4F1EA']} /><Sign text={s.sign} w={w * 0.8} h={0.9} p={[0, h - 0.5, z + 0.12]} bg={accent} fg="#FFFFFF" /></group>);
  }
}
