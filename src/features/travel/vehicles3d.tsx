import { useMemo } from 'react';
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial, Shape, Quaternion, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Appearance } from '@/types/game';
import { PosedPerson, SeatedPerson, crowdLook } from './people';
import { StreetCar } from '@/three/models/StreetCar';
import { STREET_CARS, TRAFFIC_MODEL, type StreetModel } from '@/data/streetCars';

/**
 * Vehicles for the travel scene, built to look like vehicles rather than stacks of boxes: bodies are extruded from side profiles
 * with rounded (bevelled) edges and creased normals, glass is a separate dark layer, wheels have tyres and hubs, lights glow.
 * Cars are tiny shared geometries (four draw calls per body type, and instanced for traffic), so a dense street stays cheap.
 * Everything faces +z, front at +z, wheels on y = 0.
 */
export type CarKind = 'sedan' | 'hatch' | 'suv' | 'pickup';
const color = (hex: string) => new Color(hex);
function tint(g: BufferGeometry, hex: string): BufferGeometry {
  const c = color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new Float32BufferAttribute(a, 3)); return g;
}
/** Extrude a side profile (x = along the vehicle, front at +x) across `width`, bevelled, then turn it so the front points +z. */
function side(shape: Shape, width: number, bevel = 0.09, segs = 2): BufferGeometry {
  let g: BufferGeometry = new ExtrudeGeometry(shape, { depth: Math.max(0.02, width - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 10 });
  g.rotateY(-Math.PI / 2); g.computeBoundingBox(); const b = g.boundingBox!; g.translate(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
  g.deleteAttribute('uv'); g = toCreasedNormals(g, Math.PI / 5); return g;
}
const poly = (pts: [number, number][]) => { const s = new Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((p) => s.lineTo(...p)); s.closePath(); return s; };
const noUv = (g: BufferGeometry) => { g.deleteAttribute('uv'); return g; };

interface CarSpec { L: number; W: number; belt: number; roof: number; cabF: number; cabR: number; wheelR: number; wb: number; cabW: number }
const SPEC: Record<CarKind, CarSpec> = {
  sedan: { L: 4.5, W: 1.82, belt: 0.95, roof: 1.43, cabF: 0.95, cabR: -1.35, wheelR: 0.33, wb: 2.7, cabW: 1.56 },
  hatch: { L: 3.95, W: 1.74, belt: 0.93, roof: 1.5, cabF: 0.85, cabR: -1.75, wheelR: 0.31, wb: 2.45, cabW: 1.5 },
  suv: { L: 4.75, W: 1.95, belt: 1.05, roof: 1.78, cabF: 1.0, cabR: -2.1, wheelR: 0.39, wb: 2.85, cabW: 1.7 },
  pickup: { L: 5.3, W: 1.95, belt: 1.05, roof: 1.78, cabF: 1.35, cabR: -0.35, wheelR: 0.4, wb: 3.1, cabW: 1.7 },
};
export interface CarGeos { paint: BufferGeometry; glass: BufferGeometry; trim: BufferGeometry; lights: BufferGeometry; length: number; width: number }
const carCache = new Map<CarKind, CarGeos>();
export function carGeos(kind: CarKind): CarGeos {
  const hit = carCache.get(kind); if (hit) return hit;
  const { L, W, belt, roof, cabF, cabR, wheelR, wb, cabW } = SPEC[kind], h = L / 2;
  const body = new Shape();
  body.moveTo(-h + 0.2, 0.3); body.lineTo(h - 0.2, 0.3); body.quadraticCurveTo(h, 0.3, h, 0.55); body.lineTo(h, belt * 0.8);
  body.quadraticCurveTo(h - 0.04, belt - 0.02, h - 0.5, belt); body.lineTo(cabF + 0.2, belt + 0.03);
  if (kind === 'pickup') { body.lineTo(cabR - 0.15, belt + 0.03); body.lineTo(cabR - 0.15, belt + 0.12); body.lineTo(-h + 0.05, belt + 0.12); body.lineTo(-h, belt * 0.8); }
  else { body.lineTo(cabR - 0.5, belt + 0.03); body.quadraticCurveTo(-h + 0.02, belt - 0.02, -h, belt * 0.78); }
  body.lineTo(-h, 0.55); body.quadraticCurveTo(-h, 0.3, -h + 0.2, 0.3);
  const rake = kind === 'hatch' || kind === 'suv' ? 0.35 : 0.5;
  const cab = poly([[cabF, belt], [cabF - 0.55, roof - 0.04], [cabF - 0.7, roof], [cabR + (kind === 'sedan' ? 0.75 : rake), roof], [cabR + (kind === 'sedan' ? 0.5 : 0.1), roof - 0.1], [cabR, belt]]);
  const cap = poly([[cabF - 0.66, roof + 0.015], [cabR + (kind === 'sedan' ? 0.75 : rake), roof + 0.015], [cabR + (kind === 'sedan' ? 0.7 : rake - 0.05), roof - 0.07], [cabF - 0.62, roof - 0.07]]);
  const paintParts = [side(body, W, 0.045, 1), side(cap, cabW * 0.92, 0.03, 1)];
  const pillar = (z: number, th = 0.09) => noUv(new BoxGeometry(cabW + 0.03, roof - belt - 0.06, th).translate(0, (roof + belt) / 2 - 0.01, z));
  paintParts.push(pillar((cabF + cabR) / 2 + 0.05), pillar(cabF - 0.5, 0.12), pillar(cabR + 0.25, 0.14));
  if (kind === 'pickup') paintParts.push(noUv(new BoxGeometry(W * 0.96, 0.08, 1.9).translate(0, belt + 0.14, -h + 1.05)));
  const glass = side(cab, cabW, 0.02, 1);
  const trimParts: BufferGeometry[] = []; const t = (g: BufferGeometry, hex: string) => trimParts.push(tint(noUv(g), hex));
  for (const sx of [-1, 1]) for (const z of [-wb / 2, wb / 2]) {
    t(new CylinderGeometry(wheelR, wheelR, 0.26, 14).rotateZ(Math.PI / 2).translate(sx * (W / 2 - 0.1), wheelR, z), '#16181B');
    t(new CylinderGeometry(wheelR * 0.62, wheelR * 0.62, 0.27, 10).rotateZ(Math.PI / 2).translate(sx * (W / 2 - 0.09), wheelR, z), '#B9BEC4');
  }
  for (const sx of [-1, 1]) for (const z of [-wb / 2, wb / 2]) t(new CylinderGeometry(wheelR + 0.08, wheelR + 0.08, 0.04, 16).rotateZ(Math.PI / 2).translate(sx * (W / 2 + 0.005), wheelR + 0.02, z), '#0D0E10'); // wheel arches
  for (const sx of [-1, 1]) { for (const z of [cabF - 0.3, (cabF + cabR) / 2 + 0.05, cabR + 0.3]) t(new BoxGeometry(0.015, belt - 0.5, 0.025).translate(sx * (W / 2 + 0.008), (belt + 0.35) / 2, z), '#16171A'); t(new BoxGeometry(0.16, 0.1, 0.18).translate(sx * (W / 2 + 0.1), belt + 0.1, cabF - 0.12), '#1A1B1E'); t(new BoxGeometry(0.1, 0.03, 0.2).translate(sx * (W / 2 - 0.02), belt - 0.05, cabF - 0.3), '#8C9196'); } // door seams, mirrors, handles
  t(new BoxGeometry(0.5, 0.12, 0.02).translate(0, belt * 0.68, -h - 0.02), '#F2F2F2'); // number plate
  t(new BoxGeometry(W * 0.94, 0.2, 0.18).translate(0, 0.42, h - 0.03), '#2A2D32'); t(new BoxGeometry(W * 0.94, 0.2, 0.18).translate(0, 0.42, -h + 0.03), '#2A2D32');
  t(new BoxGeometry(W * 0.5, 0.17, 0.05).translate(0, belt * 0.56, h + 0.02), '#1B1D21'); // grille
  const lightParts: BufferGeometry[] = []; const l = (g: BufferGeometry, hex: string) => lightParts.push(tint(noUv(g), hex));
  for (const sx of [-1, 1]) { l(new BoxGeometry(0.4, 0.13, 0.07).translate(sx * W * 0.32, belt * 0.72, h + 0.01), '#FFF6C8'); l(new BoxGeometry(0.42, 0.13, 0.07).translate(sx * W * 0.33, belt * 0.74, -h - 0.01), '#FF3B30'); }
  const geos: CarGeos = { paint: mergeGeometries(paintParts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!, glass, trim: mergeGeometries(trimParts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!, lights: mergeGeometries(lightParts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!, length: L, width: W };
  carCache.set(kind, geos); return geos;
}
export const paintMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.32, metalness: 0.35 });
export const glassMat = new MeshStandardMaterial({ color: '#0E161D', roughness: 0.08, metalness: 0.6 });
export const trimMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1 });
export const lightMat = new MeshBasicMaterial({ vertexColors: true });
const matCache = new Map<string, MeshStandardMaterial>();
export const paintOf = (hex: string) => { let m = matCache.get(hex); if (!m) { m = paintMat.clone(); m.color.set(hex); matCache.set(hex, m); } return m; };

/** The roof sign and door stripes of a taxi, sized from the car's own measurements. */
function TaxiExtras({ W, L, belt, roof, cabZ }: { W: number; L: number; belt: number; roof: number; cabZ: number }) {
  const tex = useMemo(() => signTexture('TAXI'), []);
  return (
    <>
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * (W / 2 + 0.012), belt * 0.6, 0]}><boxGeometry args={[0.02, 0.14, L * 0.78]} /><meshStandardMaterial color="#101113" /></mesh>)}
      <group position={[0, roof + 0.17, cabZ]}><mesh><boxGeometry args={[0.7, 0.2, 0.28]} /><meshStandardMaterial color="#F6F3E8" emissive="#FFE9A0" emissiveIntensity={0.8} /></mesh>{[-1, 1].map((k) => <mesh key={k} position={[0, 0, k * 0.141]} rotation={[0, k > 0 ? 0 : Math.PI, 0]}><planeGeometry args={[0.62, 0.15]} /><meshBasicMaterial map={tex} /></mesh>)}</group>
    </>
  );
}
/** Where a taxi's stripes and roof sign go on each street car (metres, from the built files). */
const TAXI_FIT: Partial<Record<StreetModel, { W: number; belt: number; roof: number; cabZ: number }>> = { sedan: { W: 1.62, belt: 0.82, roof: 1.3, cabZ: -0.1 } };

/** The old procedural car: only drawn if the street car file cannot load. */
function ProceduralCar({ kind, hex, taxi }: { kind: CarKind; hex: string; taxi: boolean }) {
  const g = useMemo(() => carGeos(kind), [kind]), sp = SPEC[kind];
  return (
    <group><mesh geometry={g.paint} material={paintOf(hex)} /><mesh geometry={g.glass} material={glassMat} /><mesh geometry={g.trim} material={trimMat} /><mesh geometry={g.lights} material={lightMat} />
      {taxi && <TaxiExtras W={sp.W} L={sp.L} belt={sp.belt} roof={sp.roof} cabZ={(sp.cabF + sp.cabR) / 2 + 0.05} />}
    </group>
  );
}

/**
 * One car on a street, in the owner's low-poly car models (data/streetCars.ts), painted `hex`; a taxi gets its roof sign and door stripes.
 * 'sedan' is the old saloon, 'hatch' the hatchback, 'suv' the family wagon, 'pickup' the double-cab pickup. If the model cannot load,
 * the old procedural car is drawn instead, so a missing file never breaks a scene.
 */
export function CarMesh({ kind, hex, taxi = false }: { kind: CarKind; hex: string; taxi?: boolean }) {
  const model = TRAFFIC_MODEL[kind], fit = TAXI_FIT[model], def = STREET_CARS[model];
  return (
    <StreetCar model={model} color={hex} fallback={<ProceduralCar kind={kind} hex={hex} taxi={taxi} />}>
      {taxi && <TaxiExtras W={fit?.W ?? def.width * 0.85} L={def.length} belt={fit?.belt ?? def.height * 0.55} roof={fit?.roof ?? def.height * 0.92} cabZ={fit?.cabZ ?? 0} />}
    </StreetCar>
  );
}

// ------------------------------------------------------------------ danfo
const SLOGANS = ['NO CONDITION IS PERMANENT', 'GOD DEY', 'SHINE YOUR EYE', 'LAGOS NO DEY SLEEP', 'BLESSED', 'HUSTLE HARD', 'JESUS IS LORD', 'NO RETREAT'];
const signCache = new Map<string, CanvasTexture>();
function signTexture(text: string): CanvasTexture {
  let t = signCache.get(text); if (t) return t;
  const c = document.createElement('canvas'); c.width = 512; c.height = 112; const g = c.getContext('2d')!;
  g.fillStyle = '#16140F'; g.fillRect(0, 0, 512, 112); g.strokeStyle = '#E0B02A'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 102);
  g.fillStyle = '#F2C230'; g.font = 'bold 52px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 52; while (g.measureText(text).width > 470 && size > 20) { size -= 3; g.font = `bold ${size}px Impact, "Arial Black", sans-serif`; }
  g.fillText(text, 256, 58); t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; signCache.set(text, t); return t;
}
let danfoGeos: { body: BufferGeometry; stripe: BufferGeometry; glass: BufferGeometry; trim: BufferGeometry } | null = null;
function danfoParts() {
  if (danfoGeos) return danfoGeos;
  const body = new Shape(); // VW-style van: short nose, tall box, rounded corners
  body.moveTo(-2.35, 0.42); body.lineTo(2.3, 0.42); body.quadraticCurveTo(2.55, 0.42, 2.55, 0.7); body.lineTo(2.55, 1.45); body.quadraticCurveTo(2.5, 1.7, 2.3, 2.2);
  body.quadraticCurveTo(2.2, 2.45, 1.95, 2.45); body.lineTo(-2.3, 2.45); body.quadraticCurveTo(-2.55, 2.45, -2.55, 2.2); body.lineTo(-2.55, 0.7); body.quadraticCurveTo(-2.55, 0.42, -2.35, 0.42);
  const stripe = poly([[-2.57, 1.02], [2.57, 1.02], [2.57, 1.3], [-2.57, 1.3]]);
  const glass: BufferGeometry[] = []; // side windows (both sides) and the windscreen
  for (const sx of [-1, 1]) for (const z of [-1.7, -0.55, 0.6, 1.65]) glass.push(noUv(new BoxGeometry(0.06, 0.62, 0.95).translate(sx * 1.0, 1.82, z)));
  glass.push(noUv(new BoxGeometry(1.7, 0.75, 0.06).rotateX(-0.35).translate(0, 1.85, 2.4)));
  const trim: BufferGeometry[] = []; const t = (g: BufferGeometry, hex: string) => trim.push(tint(noUv(g), hex));
  for (const sx of [-1, 1]) for (const z of [-1.55, 1.6]) { t(new CylinderGeometry(0.42, 0.42, 0.3, 14).rotateZ(Math.PI / 2).translate(sx * 0.95, 0.42, z), '#16181B'); t(new CylinderGeometry(0.26, 0.26, 0.31, 10).rotateZ(Math.PI / 2).translate(sx * 0.96, 0.42, z), '#B9BEC4'); }
  t(new BoxGeometry(2.05, 0.2, 0.2).translate(0, 0.5, 2.55), '#1B1D21'); t(new BoxGeometry(2.05, 0.2, 0.2).translate(0, 0.5, -2.55), '#1B1D21');
  for (const x of [-0.75, 0.75]) t(new SphereGeometry(0.17, 8, 6).translate(x, 0.95, 2.58), '#FFF6C8');
  for (const x of [-0.8, 0.8]) t(new BoxGeometry(0.3, 0.4, 0.06).translate(x, 1.0, -2.58), '#E22B2B');
  t(new BoxGeometry(1.9, 0.06, 0.05).translate(0, 2.47, 2.0), '#1B1D21'); // visor
  for (const sx of [-1, 1]) for (const z of [-2.2, 2.0, 0]) t(new BoxGeometry(0.06, 0.07, 0.5).translate(sx * 1.05, 0.62, z), '#1B1D21'); // sill
  danfoGeos = { body: side(body, 2.04, 0.12), stripe: side(stripe, 2.1, 0.01, 1), glass: mergeGeometries(glass.map((g) => g), false)!, trim: mergeGeometries(trim.map((g) => (g.index ? g.toNonIndexed() : g)), false)! };
  return danfoGeos;
}
let luggage: BufferGeometry | null = null;
/** Roof rack and cargo like the real thing: rails, a mattress, boxes and sacks tied down with rope, a couple of jerrycans. All boxy, nothing floating. */
function luggageGeo(): BufferGeometry {
  if (luggage) return luggage;
  const p: BufferGeometry[] = []; const t = (g: BufferGeometry, hex: string) => p.push(tint(noUv(g), hex));
  for (const x of [-0.92, 0.92]) t(new BoxGeometry(0.05, 0.28, 4.5).translate(x, 2.6, 0), '#2A2D32');
  for (const z of [-2.1, -0.7, 0.7, 2.1]) t(new BoxGeometry(1.9, 0.05, 0.05).translate(0, 2.52, z), '#2A2D32');
  t(new BoxGeometry(1.7, 0.32, 2.0).translate(0, 2.72, -1.1), '#E8E1CC'); t(new BoxGeometry(1.6, 0.02, 0.1).translate(0, 2.89, -1.6), '#9A8A5A'); // mattress and its strap
  t(new BoxGeometry(1.0, 0.7, 0.8).rotateY(0.1).translate(-0.35, 3.2, -1.35), '#B83A32'); t(new BoxGeometry(0.8, 0.55, 0.9).rotateY(-0.12).translate(0.45, 3.1, -0.55), '#2F5E9E');
  t(new BoxGeometry(1.5, 0.6, 1.1).translate(0, 2.84, 0.85), '#CDB892'); t(new BoxGeometry(0.9, 0.45, 0.7).rotateY(0.2).translate(-0.3, 3.35, 0.9), '#6B4A2B');
  t(new BoxGeometry(1.4, 0.55, 0.8).translate(0, 2.8, 1.95), '#4C7A3E');
  for (const [x, z] of [[0.55, 1.95], [0.75, 0.2]]) t(new BoxGeometry(0.28, 0.4, 0.2).translate(x, 3.15, z), '#E4B422'); // jerrycans
  for (const z of [-1.3, 0.85, 1.95]) t(new BoxGeometry(1.95, 0.03, 0.04).translate(0, 3.0 + (z > 0 ? 0.0 : 0.1), z), '#2A2D32'); // ropes
  luggage = flat(p); return luggage;
}
function flat(gs: BufferGeometry[]) { return mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false)!; }
/** A Lagos danfo: yellow, black stripe, windows, a rack piled with cargo, a painted slogan across the back, a footboard and a conductor hanging off the side door. */
export function Danfo({ slogan = 0, conductor = false }: { slogan?: number; conductor?: boolean }) {
  const g = useMemo(danfoParts, []), lug = useMemo(luggageGeo, []), tex = useMemo(() => signTexture(SLOGANS[slogan % SLOGANS.length]), [slogan]);
  return (
    <group>
      <mesh geometry={g.body}><meshStandardMaterial color="#F4B91E" roughness={0.45} metalness={0.2} /></mesh>
      <mesh geometry={g.stripe}><meshStandardMaterial color="#121315" roughness={0.6} /></mesh>
      <mesh geometry={g.glass} material={glassMat} /><mesh geometry={g.trim} material={trimMat} /><mesh geometry={lug} material={trimMat} />
      <mesh position={[0, 0.86, -2.6]}><planeGeometry args={[1.5, 0.33]} /><meshBasicMaterial map={tex} side={DoubleSide} /></mesh>
      {[-1, 1].map((x) => <mesh key={x} position={[x * 1.07, 1.62, 0.0]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}><planeGeometry args={[1.3, 0.2]} /><meshBasicMaterial map={signTexture('LAGOS')} side={DoubleSide} /></mesh>)}
      <mesh position={[-1.18, 0.42, -1.05]}><boxGeometry args={[0.4, 0.07, 0.95]} /><meshStandardMaterial color="#2A2D32" /></mesh>
      <mesh position={[-1.05, 1.55, -0.58]}><boxGeometry args={[0.07, 0.9, 0.07]} /><meshStandardMaterial color="#B9BEC4" metalness={0.7} roughness={0.3} /></mesh>
      {conductor && <PosedPerson look={CONDUCTOR} pose="hang" pos={[-1.42, 0.5, -1.05]} rot={-Math.PI / 2} lean={0.22} scale={0.95} />}
    </group>
  );
}
/** The conductor: a lean, loud man in a vest. His position on the danfo is where the camera finds his face. */
export const CONDUCTOR: Appearance = { skin: '#6B4128', body: 'masc', eye: '#2A1A10', beard: 'stubble', hairStyle: 'lowcut', hairColor: '#17110D', top: 'tee', topColor: '#C23B3B', bottom: 'trousers', bottomColor: '#2B2B2B', shoes: 'sandals', shoeColor: '#2A2A2A', accessory: 'none' };

// ------------------------------------------------------------------ keke napep
let kekeGeos: { body: BufferGeometry; rear: BufferGeometry; roof: BufferGeometry; glass: BufferGeometry; trim: BufferGeometry } | null = null;
/**
 * A keke napep (Piaggio-style three-wheeler), about 2.7 m long: a narrow nose over a single front wheel with a curved windscreen and a
 * motorbike-style handlebar, an open cab with a black hard-top on thin posts, a wider rear tub with a bench seat, and two rear wheels
 * under fenders. Front is +z, wheels on y = 0.
 */
function kekeParts() {
  if (kekeGeos) return kekeGeos;
  const nose = new Shape(); // side profile of the front cowl: bullet nose over the wheel, sloping up to the windscreen base
  nose.moveTo(-0.2, 0.36); nose.lineTo(1.2, 0.36); nose.quadraticCurveTo(1.5, 0.4, 1.52, 0.72); nose.quadraticCurveTo(1.5, 1.02, 1.12, 1.1); nose.lineTo(0.55, 1.14); nose.lineTo(0.2, 1.0); nose.lineTo(-0.2, 0.9); nose.closePath();
  const rear = new Shape(); // the passenger tub behind: lower sides, curved tail
  rear.moveTo(-1.38, 0.38); rear.lineTo(0.0, 0.38); rear.lineTo(0.0, 0.88); rear.lineTo(-1.15, 0.9); rear.quadraticCurveTo(-1.38, 0.88, -1.4, 0.6); rear.closePath();
  const roof = new Shape(); // the hard-top: a thin curved slab, overhanging the windscreen
  roof.moveTo(-1.42, 1.62); roof.lineTo(0.55, 1.68); roof.quadraticCurveTo(0.85, 1.68, 0.88, 1.56); roof.lineTo(0.85, 1.5); roof.lineTo(-1.4, 1.52); roof.closePath();
  const trim: BufferGeometry[] = []; const t = (g: BufferGeometry, hex: string) => trim.push(tint(noUv(g), hex));
  // wheels: one in front, two behind, with fenders
  t(new CylinderGeometry(0.29, 0.29, 0.15, 14).rotateZ(Math.PI / 2).translate(0, 0.29, 1.05), '#16181B'); t(new CylinderGeometry(0.17, 0.17, 0.16, 8).rotateZ(Math.PI / 2).translate(0, 0.29, 1.05), '#B9BEC4');
  t(new BoxGeometry(0.2, 0.06, 0.8).translate(0, 0.62, 1.05), '#2A2D32'); // front fender
  for (const sx of [-1, 1]) {
    t(new CylinderGeometry(0.3, 0.3, 0.2, 14).rotateZ(Math.PI / 2).translate(sx * 0.66, 0.3, -0.85), '#16181B'); t(new CylinderGeometry(0.18, 0.18, 0.21, 8).rotateZ(Math.PI / 2).translate(sx * 0.66, 0.3, -0.85), '#B9BEC4');
    t(new BoxGeometry(0.26, 0.05, 0.8).translate(sx * 0.66, 0.64, -0.85), '#2A2D32');
    t(new BoxGeometry(0.05, 0.8, 0.05).translate(sx * 0.66, 1.12, -1.3), '#16181B'); t(new BoxGeometry(0.05, 0.8, 0.05).translate(sx * 0.62, 1.12, 0.45), '#16181B'); // roof posts
  }
  t(new CylinderGeometry(0.03, 0.03, 0.55, 6).translate(0, 0.9, 0.78), '#2A2D32'); t(new CylinderGeometry(0.025, 0.025, 0.72, 6).rotateZ(Math.PI / 2).translate(0, 1.2, 0.74), '#16181B'); // steering stem and handlebar
  for (const sx of [-1, 1]) t(new SphereGeometry(0.045, 6, 5).translate(sx * 0.36, 1.2, 0.74), '#16181B');
  t(new SphereGeometry(0.14, 10, 8).translate(0, 0.8, 1.5), '#FFF6C8'); // headlamp
  t(new BoxGeometry(0.08, 0.07, 0.04).translate(0.4, 1.28, 0.66), '#B9BEC4'); t(new BoxGeometry(0.08, 0.07, 0.04).translate(-0.4, 1.28, 0.66), '#B9BEC4'); // mirrors
  t(new BoxGeometry(1.0, 0.24, 0.5).translate(0, 0.55, -0.7), '#3A2E24'); t(new BoxGeometry(1.0, 0.5, 0.1).translate(0, 0.88, -1.12), '#3A2E24'); // rear bench and its back
  t(new BoxGeometry(0.4, 0.2, 0.34).translate(0, 0.52, 0.1), '#3A2E24'); // driver's seat
  for (const sx of [-1, 1]) t(new BoxGeometry(0.22, 0.1, 0.05).translate(sx * 0.45, 0.8, -1.42), '#E22B2B'); // tail lights
  t(new BoxGeometry(0.4, 0.1, 0.02).translate(0, 0.62, -1.43), '#F2F2F2'); // plate
  t(new BoxGeometry(1.4, 0.07, 0.05).translate(0, 1.5, -1.43), '#16181B');
  const glass: BufferGeometry[] = [noUv(new BoxGeometry(0.86, 0.55, 0.03).rotateX(-0.55).translate(0, 1.38, 0.5)), noUv(new BoxGeometry(1.15, 0.5, 0.03).translate(0, 1.15, -1.42))];
  kekeGeos = { body: side(nose, 0.8, 0.07, 1), rear: side(rear, 1.36, 0.07, 1), roof: side(roof, 1.56, 0.06, 1), glass: flat(glass), trim: flat(trim) };
  return kekeGeos;
}
/** A keke napep with a driver and, optionally, a passenger on the rear bench. */
export function Keke({ hex = '#F4B91E', driver = 1, passenger }: { hex?: string; driver?: number; passenger?: Appearance }) {
  const g = useMemo(kekeParts, []);
  return (
    <group>
      <mesh geometry={g.body} material={paintOf(hex)} /><mesh geometry={g.rear} material={paintOf(hex)} /><mesh geometry={g.roof}><meshStandardMaterial color="#17191C" roughness={0.6} /></mesh>
      <mesh geometry={g.glass} material={glassMat} /><mesh geometry={g.trim} material={trimMat} />
      <mesh position={[0, 0.7, 0.3]}><boxGeometry args={[0.05, 0.02, 0.02]} /><meshBasicMaterial color={hex} /></mesh>
      <SeatedPerson look={crowdLook(driver)} pos={[0, 0.24, 0.12]} scale={0.84} />
      {passenger && <SeatedPerson look={passenger} pos={[0, 0.26, -0.78]} scale={0.84} />}
    </group>
  );
}

// ------------------------------------------------------------------ okada (motorbike taxi)
let bikeGeos: { frame: BufferGeometry; tyres: BufferGeometry } | null = null;
function bikeParts() {
  if (bikeGeos) return bikeGeos;
  const f: BufferGeometry[] = []; const t = (g: BufferGeometry, hex: string) => f.push(tint(noUv(g), hex));
  const tube = (a: [number, number, number], b: [number, number, number], r: number, hex: string) => { const A = new Vector3(...a), B = new Vector3(...b), d = B.clone().sub(A), len = d.length(), g = new CylinderGeometry(r, r, len, 6); g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize())); const m = A.clone().add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); t(g, hex); };
  tube([0, 0.38, 0.85], [0, 0.95, 0.75], 0.04, '#2A2D32'); // forks
  tube([0, 0.5, 0.75], [0, 0.55, -0.7], 0.05, '#C21F2E'); tube([0, 0.95, 0.7], [0, 0.78, -0.2], 0.05, '#C21F2E'); tube([0, 0.78, -0.2], [0, 0.4, -0.8], 0.04, '#2A2D32');
  t(new CylinderGeometry(0.03, 0.03, 0.8, 6).rotateZ(Math.PI / 2).translate(0, 1.0, 0.72), '#16181B'); // handlebar
  t(new SphereGeometry(0.1, 8, 6).translate(0, 0.9, 0.9), '#FFF6C8'); // headlamp
  const tank = new SphereGeometry(0.25, 10, 8); tank.scale(0.85, 0.75, 1.5); tank.translate(0, 0.85, 0.35); t(tank, '#C21F2E');
  t(new BoxGeometry(0.3, 0.1, 1.2).translate(0, 0.78, -0.35), '#1A1C1F'); // seat
  t(new BoxGeometry(0.36, 0.05, 0.3).translate(0, 0.52, -0.95), '#1A1C1F'); t(new BoxGeometry(0.2, 0.1, 0.05).translate(0, 0.62, -1.05), '#E22B2B');
  t(new CylinderGeometry(0.04, 0.05, 0.9, 6).rotateX(Math.PI / 2).translate(0.2, 0.32, -0.45), '#9AA0A6'); // exhaust
  const tyres: BufferGeometry[] = [];
  for (const z of [0.85, -0.85]) { const w = new TorusGeometry(0.31, 0.07, 8, 16); w.rotateY(Math.PI / 2); w.translate(0, 0.38, z); tyres.push(tint(noUv(w), '#16181B')); tyres.push(tint(noUv(new CylinderGeometry(0.2, 0.2, 0.05, 10).rotateZ(Math.PI / 2).translate(0, 0.38, z)), '#B9BEC4')); }
  bikeGeos = { frame: mergeGeometries(f.map((g) => (g.index ? g.toNonIndexed() : g)), false)!, tyres: mergeGeometries(tyres.map((g) => (g.index ? g.toNonIndexed() : g)), false)! };
  return bikeGeos;
}
/** An okada: a real bike with a rider and one passenger, using the game's own characters. */
export function Okada({ rider, passenger, pot = false }: { rider?: Appearance; passenger?: Appearance; pot?: boolean }) {
  const g = useMemo(bikeParts, []), a = useMemo(() => rider ?? crowdLook(5), [rider]), b = useMemo(() => passenger ?? crowdLook(8), [passenger]);
  return (
    <group>
      <mesh geometry={g.frame} material={trimMat} /><mesh geometry={g.tyres} material={trimMat} />
      <SeatedPerson look={a} pos={[0, 0.3, 0.12]} scale={0.95} /><SeatedPerson look={b} pos={[0, 0.3, -0.6]} scale={0.95} />
      {pot && <mesh position={[0, 2.18, 0.12]}><cylinderGeometry args={[0.2, 0.2, 0.04, 10]} /><meshStandardMaterial color="#B0B6BA" metalness={0.6} roughness={0.4} /></mesh>}
    </group>
  );
}
