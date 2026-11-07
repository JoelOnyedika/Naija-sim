import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Quaternion, Vector3, type BufferGeometry, type Group } from 'three';
import { defaultLivery, type AircraftDef, type Livery } from '@/data/aircraft';
import { loft, paintTexture, tube, wing, type PaintSpec, type Station } from './aircraftParts';

/**
 * Procedurally built aircraft (no model files). Bodies are lofted from cross-sections, wings and tails have real airfoil
 * sections, and the paint job (body colour, stripe, windows, the player's name on both sides) is drawn on a canvas and wrapped
 * round the body. Each stands on y = 0 with its nose along +z, like the cars. Rotors and propellers turn slowly while parked.
 * Shapes: Robinson R44 and Airbus H125 helicopters, a Cessna-style high-wing plane and a Phenom-style light jet.
 */
type Vec = [number, number, number];

const geoCache = new Map<string, BufferGeometry>();
const cached = (key: string, make: () => BufferGeometry) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };

const STEEL = '#2B3138', TIRE = '#14161A', HUB = '#CDD3D8';
/** Glossy car-style paint: a little clearcoat so the body catches the light like a real aircraft. */
const Gloss = ({ color, map }: { color?: string; map?: import('three').Texture }) => <meshPhysicalMaterial color={color ?? '#fff'} map={map} roughness={0.38} metalness={0.12} clearcoat={0.55} clearcoatRoughness={0.25} />;
const Matte = ({ color, rough = 0.6, metal = 0.2 }: { color: string; rough?: number; metal?: number }) => <meshStandardMaterial color={color} roughness={rough} metalness={metal} />;

/** A round rod between two points: struts, landing legs. */
function Strut({ a, b, r = 0.04, color = STEEL }: { a: Vec; b: Vec; r?: number; color?: string }) {
  const { pos, quat, len } = useMemo(() => { const va = new Vector3(...a), vb = new Vector3(...b), d = vb.clone().sub(va), len = d.length(); return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()), len }; }, [a, b]);
  return <mesh position={pos} quaternion={quat}><cylinderGeometry args={[r, r, len, 8]} /><Matte color={color} metal={0.5} /></mesh>;
}
/** Tyre and hub; the axle runs along x. */
function Wheel({ p, r = 0.26, w = 0.17 }: { p: Vec; r?: number; w?: number }) {
  return (
    <group position={p}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, w, 18]} /><Matte color={TIRE} rough={0.9} metal={0} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.52, r * 0.52, w + 0.02, 14]} /><Matte color={HUB} metal={0.7} rough={0.35} /></mesh>
    </group>
  );
}
/** Draws its children and a mirror image of them across the middle of the aircraft (left and right wing). */
const Pair = ({ children }: { children: ReactNode }) => <><group>{children}</group><group scale={[-1, 1, 1]}>{children}</group></>;
const Light = ({ p, color }: { p: Vec; color: string }) => <mesh position={p}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>;

/** The painted body: one lofted mesh with the livery wrapped round it. */
function Hull({ id, spec, lv }: { id: string; spec: PaintSpec; lv: Livery }) {
  const geo = cached(`hull:${id}`, () => loft(spec.stations));
  const key = [lv.name, lv.body, lv.engine, lv.stripe, lv.text, lv.style].join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(() => paintTexture(spec, lv), [id, key]);
  useEffect(() => () => tex.dispose(), [tex]);
  return <mesh geometry={geo} castShadow receiveShadow><Gloss map={tex} /></mesh>;
}
const wingGeo = (key: string, o: Parameters<typeof wing>[0]) => cached(`wing:${key}`, () => wing(o));

/* ------------------------------------------------------------------------------------------------------------------------ */
/* Cessna-style high-wing plane                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------------ */
const SKY: Station[] = [
  { z: 2.62, hw: 0.06, hh: 0.06, cy: 1.22 }, { z: 2.5, hw: 0.34, hh: 0.34, cy: 1.22, n: 2.2 }, { z: 2.15, hw: 0.48, hh: 0.46, cy: 1.26, n: 2.4 }, { z: 1.55, hw: 0.56, hh: 0.56, cy: 1.32, n: 2.6 },
  { z: 0.95, hw: 0.62, hh: 0.7, cy: 1.44, n: 2.8 }, { z: 0.25, hw: 0.66, hh: 0.78, cy: 1.52, n: 3 }, { z: -0.6, hw: 0.65, hh: 0.76, cy: 1.54, n: 3 }, { z: -1.4, hw: 0.56, hh: 0.64, cy: 1.58, n: 2.8 },
  { z: -2.2, hw: 0.44, hh: 0.5, cy: 1.64, n: 2.5 }, { z: -3, hw: 0.3, hh: 0.38, cy: 1.72, n: 2.3 }, { z: -3.7, hw: 0.17, hh: 0.26, cy: 1.8, n: 2.1 }, { z: -4.05, hw: 0.06, hh: 0.12, cy: 1.86 }, { z: -4.12, hw: 0.02, hh: 0.04, cy: 1.88 },
];
const SKY_PAINT: PaintSpec = {
  stations: SKY, engineFrom: 1.78,
  windows: [{ z0: 1.2, z1: 0.5, a0: 0.62, a1: Math.PI - 0.62, top: true, r: 22 }, { z0: 0.95, z1: 0.08, a0: 0.12, a1: 0.82, r: 20 }, { z0: 0.0, z1: -1.2, a0: 0.12, a1: 0.8, r: 20 }, { z0: -1.45, z1: -1.85, a0: 0.5, a1: Math.PI - 0.5, top: true, r: 14 }],
  seams: [{ z: 0.04, a0: -0.5, a1: 0.9 }, { z: 1.0, a0: -0.5, a1: 0.9 }],
  name: { zc: -2.35, len: 1.9, phi: -0.1, h: 0.24 }, stripe: { phi: 0.02, half: 0.05, rise: 0.5 },
};
function Skyhawk({ lv }: { lv: Livery }) {
  const prop = useRef<Group>(null);
  useFrame((_, dt) => { if (prop.current) prop.current.rotation.z += dt * 20; });
  const w = wingGeo('sky-wing', { span: 4.4, root: 1.35, tip: 0.95, thick: 0.12, sweep: 0.05, rise: 0.22, z: 0.62, round: true });
  const stab = wingGeo('sky-stab', { span: 1.5, root: 0.85, tip: 0.5, thick: 0.1, sweep: 0.3, rise: 0.04, z: -3.3, round: true });
  const fin = wingGeo('sky-fin', { span: 1.25, root: 1.2, tip: 0.6, thick: 0.1, sweep: 0.75, z: -2.95, round: true });
  const blade = wingGeo('sky-blade', { span: 0.95, root: 0.17, tip: 0.12, thick: 0.08, z: 0.08 });
  return (
    <group>
      <Hull id="skyhawk" spec={SKY_PAINT} lv={lv} />
      {/* wings, struts and tail */}
      <Pair><mesh geometry={w} position={[0, 2.3, 0]} castShadow><Gloss color={lv.wings} /></mesh></Pair>
      <Pair><Strut a={[0.64, 1.3, 0.2]} b={[2.3, 2.3, 0.05]} r={0.05} color={lv.wings} /><Strut a={[0.64, 1.3, 0.05]} b={[2.3, 2.3, 0.05]} r={0.02} color={STEEL} /></Pair>
      <Pair><mesh geometry={stab} position={[0, 1.82, 0]} castShadow><Gloss color={lv.wings} /></mesh></Pair>
      <mesh geometry={fin} position={[0, 1.88, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><Gloss color={lv.wings} /></mesh>
      <mesh position={[0, 3.14, -3.5]}><boxGeometry args={[0.1, 0.1, 0.46]} /><Gloss color={lv.stripe} /></mesh>
      {/* nav lights: red on the left wing tip, green on the right */}
      <Light p={[4.4, 2.5, 0.0]} color="#FF2A2A" /><Light p={[-4.4, 2.5, 0.0]} color="#22E06B" />
      {/* landing gear: spring-steel legs, wheel fairings, a nose wheel */}
      <Pair><Strut a={[0.5, 1.2, 0.5]} b={[1.12, 0.36, 0.58]} r={0.045} /><mesh position={[1.12, 0.42, 0.58]} scale={[0.13, 0.27, 0.5]}><sphereGeometry args={[1, 14, 10]} /><Gloss color={lv.wings} /></mesh><Wheel p={[1.12, 0.26, 0.58]} /></Pair>
      <Strut a={[0, 1.05, 1.85]} b={[0, 0.3, 2.0]} r={0.05} /><Wheel p={[0, 0.22, 2.0]} r={0.21} w={0.14} />
      {/* propeller and spinner */}
      <mesh position={[0, 1.22, 2.72]} scale={[0.2, 0.2, 0.34]}><sphereGeometry args={[1, 16, 12]} /><Gloss color={lv.engine} /></mesh>
      <group ref={prop} position={[0, 1.22, 2.76]}>
        <Pair><mesh geometry={blade} rotation={[0, 0, Math.PI / 2]}><Matte color="#15181C" rough={0.5} /></mesh></Pair>
      </group>
      <mesh position={[0, 2.34, -1.2]}><cylinderGeometry args={[0.012, 0.012, 0.5, 5]} /><Matte color="#222" /></mesh>
    </group>
  );
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/* Phenom-style light jet                                                                                                     */
/* ------------------------------------------------------------------------------------------------------------------------ */
const PHENOM: Station[] = [
  { z: 4.85, hw: 0.03, hh: 0.03, cy: 1.4 }, { z: 4.5, hw: 0.22, hh: 0.24, cy: 1.42, n: 2.1 }, { z: 3.8, hw: 0.45, hh: 0.5, cy: 1.5, n: 2.1 }, { z: 2.8, hw: 0.66, hh: 0.72, cy: 1.58, n: 2.1 },
  { z: 1.6, hw: 0.78, hh: 0.82, cy: 1.6, n: 2.05 }, { z: -2.2, hw: 0.78, hh: 0.82, cy: 1.6, n: 2.05 }, { z: -3.2, hw: 0.66, hh: 0.7, cy: 1.63, n: 2.05 }, { z: -4.2, hw: 0.42, hh: 0.46, cy: 1.7, n: 2.05 },
  { z: -5, hw: 0.16, hh: 0.2, cy: 1.8 }, { z: -5.35, hw: 0.02, hh: 0.03, cy: 1.84 },
];
const cabinWin = Array.from({ length: 6 }, (_, i) => ({ z0: 2.2 - i * 0.78 + 0.2, z1: 2.2 - i * 0.78 - 0.2, a0: 0.3, a1: 0.72, r: 30 }));
const PHENOM_PAINT: PaintSpec = {
  stations: PHENOM,
  windows: [{ z0: 3.75, z1: 3.0, a0: 0.5, a1: Math.PI - 0.5, top: true, r: 26 }, { z0: 3.6, z1: 2.85, a0: 0.2, a1: 0.8, r: 24 }, ...cabinWin],
  seams: [{ z: 2.9, a0: -0.7, a1: 0.9 }, { z: 1.6, a0: -0.7, a1: 0.9 }],
  name: { zc: -0.15, len: 4.1, phi: -0.42, h: 0.3 }, stripe: { phi: -0.08, half: 0.045, rise: 0.5 },
};
const NACELLE: Station[] = [{ z: -1.9, hw: 0.03, hh: 0.03, cy: 0, n: 2 }, { z: -2, hw: 0.27, hh: 0.27, cy: 0, n: 2 }, { z: -2.6, hw: 0.35, hh: 0.35, cy: 0, n: 2 }, { z: -3.5, hw: 0.35, hh: 0.35, cy: 0, n: 2 }, { z: -4.2, hw: 0.28, hh: 0.28, cy: 0, n: 2 }, { z: -4.46, hw: 0.2, hh: 0.2, cy: 0, n: 2 }, { z: -4.48, hw: 0.02, hh: 0.02, cy: 0, n: 2 }];
function Phenom({ lv }: { lv: Livery }) {
  const w = wingGeo('ph-wing', { span: 4.5, root: 2.2, tip: 0.95, thick: 0.1, sweep: 1.7, rise: 0.32, z: 1.0, round: true });
  const winglet = wingGeo('ph-winglet', { span: 0.75, root: 0.75, tip: 0.32, thick: 0.1, sweep: 0.4, z: 0 });
  const fin = wingGeo('ph-fin', { span: 1.65, root: 1.55, tip: 0.8, thick: 0.1, sweep: 1.05, z: -3.2 });
  const stab = wingGeo('ph-stab', { span: 1.85, root: 0.95, tip: 0.5, thick: 0.09, sweep: 0.65, z: -4.2, round: true });
  const nac = cached('nacelle', () => loft(NACELLE));
  return (
    <group>
      <Hull id="phenom" spec={PHENOM_PAINT} lv={lv} />
      <Pair><mesh geometry={w} position={[0.3, 0.98, 0]} castShadow><Gloss color={lv.wings} /></mesh></Pair>
      <Pair><mesh geometry={winglet} position={[4.78, 1.26, -0.7]} rotation={[0, 0, Math.PI / 2]}><Gloss color={lv.stripe} /></mesh></Pair>
      <Light p={[4.82, 1.3, -0.4]} color="#FF2A2A" /><Light p={[-4.82, 1.3, -0.4]} color="#22E06B" />
      {/* rear engines on short pylons */}
      <Pair>
        <mesh position={[0.74, 1.72, -3.0]}><boxGeometry args={[0.32, 0.16, 1.5]} /><Gloss color={lv.wings} /></mesh>
        <mesh geometry={nac} position={[1.0, 1.76, 0]} castShadow><Matte color={lv.engine} rough={0.35} metal={0.75} /></mesh>
        <mesh position={[1.0, 1.76, -1.985]} rotation={[0, Math.PI, 0]}><circleGeometry args={[0.25, 16]} /><meshBasicMaterial color="#0A0B0D" /></mesh>
        <mesh position={[1.0, 1.76, -4.47]} rotation={[0, Math.PI, 0]}><circleGeometry args={[0.18, 16]} /><meshBasicMaterial color="#15171A" /></mesh>
      </Pair>
      {/* T-tail */}
      <mesh geometry={fin} position={[0, 1.95, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><Gloss color={lv.wings} /></mesh>
      <Pair><mesh geometry={stab} position={[0, 3.58, -0.05]} castShadow><Gloss color={lv.wings} /></mesh></Pair>
      {/* landing gear */}
      <Pair><Strut a={[0.55, 1.05, 0.2]} b={[1.05, 0.3, 0.1]} r={0.06} /><Wheel p={[1.05, 0.28, 0.1]} r={0.28} w={0.2} /></Pair>
      <Strut a={[0, 1.0, 3.3]} b={[0, 0.26, 3.3]} r={0.05} /><Wheel p={[0, 0.2, 3.3]} r={0.2} w={0.14} />
    </group>
  );
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/* Helicopters                                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------------ */
const R44: Station[] = [
  { z: 2.05, hw: 0.05, hh: 0.05, cy: 1.05 }, { z: 1.95, hw: 0.36, hh: 0.38, cy: 1.05, n: 2.2 }, { z: 1.6, hw: 0.62, hh: 0.62, cy: 1.12, n: 2.3 }, { z: 1.0, hw: 0.82, hh: 0.8, cy: 1.22, n: 2.4 },
  { z: 0.2, hw: 0.88, hh: 0.9, cy: 1.32, n: 2.5 }, { z: -0.6, hw: 0.78, hh: 0.86, cy: 1.38, n: 2.5 }, { z: -1.2, hw: 0.55, hh: 0.62, cy: 1.45, n: 2.4 }, { z: -1.8, hw: 0.3, hh: 0.34, cy: 1.58, n: 2.2 },
  { z: -2.6, hw: 0.2, hh: 0.22, cy: 1.68, n: 2 }, { z: -3.4, hw: 0.15, hh: 0.16, cy: 1.76, n: 2 }, { z: -4.1, hw: 0.11, hh: 0.12, cy: 1.84, n: 2 }, { z: -4.16, hw: 0.01, hh: 0.01, cy: 1.84, n: 2 },
];
const R44_PAINT: PaintSpec = {
  stations: R44, enginePatch: { z0: -0.3, z1: -1.45, a0: Math.PI / 2 - 0.85, a1: Math.PI / 2 + 0.85 },
  windows: [{ z0: 1.88, z1: 0.38, a0: -0.12, a1: Math.PI + 0.12, top: true, r: 40 }, { z0: 0.24, z1: -0.6, a0: 0.05, a1: 1.0, r: 26 }],
  seams: [{ z: 0.3, a0: -0.7, a1: 1.1 }, { z: -0.65, a0: -0.7, a1: 1.1 }],
  name: { zc: 0.2, len: 1.5, phi: -0.5, h: 0.24 }, stripe: { phi: -0.14, half: 0.09 },
};
const H125: Station[] = [
  { z: 2.4, hw: 0.05, hh: 0.05, cy: 1.1 }, { z: 2.3, hw: 0.3, hh: 0.34, cy: 1.08, n: 2.2 }, { z: 1.9, hw: 0.6, hh: 0.62, cy: 1.14, n: 2.3 }, { z: 1.2, hw: 0.92, hh: 0.88, cy: 1.28, n: 2.5 },
  { z: 0.3, hw: 1.0, hh: 1.0, cy: 1.45, n: 2.7 }, { z: -0.7, hw: 0.92, hh: 0.98, cy: 1.52, n: 2.7 }, { z: -1.4, hw: 0.66, hh: 0.7, cy: 1.58, n: 2.4 }, { z: -2.1, hw: 0.36, hh: 0.4, cy: 1.66, n: 2.2 },
  { z: -3, hw: 0.24, hh: 0.26, cy: 1.76, n: 2 }, { z: -4, hw: 0.19, hh: 0.2, cy: 1.86, n: 2 }, { z: -4.9, hw: 0.14, hh: 0.15, cy: 1.95, n: 2 }, { z: -4.96, hw: 0.01, hh: 0.01, cy: 1.95, n: 2 },
];
const H125_PAINT: PaintSpec = {
  stations: H125, enginePatch: { z0: -0.35, z1: -1.5, a0: Math.PI / 2 - 0.9, a1: Math.PI / 2 + 0.9 },
  windows: [{ z0: 2.08, z1: 0.62, a0: -0.1, a1: Math.PI + 0.1, top: true, r: 44 }, { z0: 0.48, z1: -0.62, a0: 0.1, a1: 1.05, r: 28 }, { z0: -0.78, z1: -1.2, a0: 0.2, a1: 0.9, r: 18 }],
  seams: [{ z: 0.55, a0: -0.8, a1: 1.1 }, { z: -0.7, a0: -0.8, a1: 1.1 }],
  name: { zc: 0.3, len: 1.8, phi: -0.52, h: 0.27 }, stripe: { phi: -0.14, half: 0.1 },
};
function Helicopter({ lv, big }: { lv: Livery; big: boolean }) {
  const rotor = useRef<Group>(null), tail = useRef<Group>(null);
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += dt * 9; if (tail.current) tail.current.rotation.x += dt * 16; });
  const id = big ? 'h125' : 'r44', blades = big ? 3 : 2, R = big ? 3.9 : 3.5, mastZ = big ? -0.35 : -0.25, hubY = big ? 3.25 : 2.95, endZ = big ? -4.9 : -4.1, endY = big ? 1.95 : 1.84, sk = big ? 1.15 : 0.95;
  const blade = wingGeo(`${id}-blade`, { span: R, root: big ? 0.3 : 0.28, tip: big ? 0.24 : 0.22, thick: 0.07, rise: -0.14, z: 0.08, round: true });
  const fin = wingGeo(`${id}-fin`, { span: big ? 1.15 : 0.95, root: big ? 0.9 : 0.78, tip: big ? 0.45 : 0.4, thick: 0.1, sweep: big ? 0.55 : 0.4, z: 0.2, round: true });
  const stab = wingGeo(`${id}-stab`, { span: big ? 0.95 : 0.8, root: big ? 0.6 : 0.5, tip: big ? 0.42 : 0.34, thick: 0.1, sweep: 0.1, z: 0.2, round: true });
  const skid = useMemo(() => cached(`${id}-skid`, () => tube([[sk, 0.34, -1.9], [sk, 0.12, -1.55], [sk, 0.08, -0.6], [sk, 0.08, 1.2], [sk, 0.12, 1.75], [sk, 0.34, 2.1]], 0.05, 28)), [id, sk]);
  return (
    <group>
      <Hull id={id} spec={big ? H125_PAINT : R44_PAINT} lv={lv} />
      {/* skids on cross tubes */}
      <Pair>
        <mesh geometry={skid} castShadow><Matte color={STEEL} metal={0.6} /></mesh>
        <Strut a={[sk, 0.1, 0.95]} b={[sk * 0.4, 0.62, 0.95]} r={0.045} /><Strut a={[sk, 0.1, -0.55]} b={[sk * 0.4, 0.62, -0.55]} r={0.045} />
      </Pair>
      {/* tail: fin up, a small stabiliser on the boom, tail rotor on the right */}
      <mesh geometry={fin} position={[0, endY - 0.02, endZ + 0.62]} rotation={[0, 0, Math.PI / 2]} castShadow><Gloss color={lv.wings} /></mesh>
      <mesh geometry={fin} position={[0, endY + 0.02, endZ + 0.62]} rotation={[0, 0, -Math.PI / 2]} scale={[0.45, 1, 0.8]}><Gloss color={lv.wings} /></mesh>
      <Pair><mesh geometry={stab} position={[0, endY - 0.1, endZ + 0.95]} castShadow><Gloss color={lv.wings} /></mesh></Pair>
      <group ref={tail} position={[0.19, endY + (big ? 0.4 : 0.34), endZ + 0.05]}>
        {[0, Math.PI / 2].map((r) => <mesh key={r} rotation={[r, 0, 0]}><boxGeometry args={[0.03, 0.95, 0.09]} /><Matte color={lv.engine} rough={0.5} /></mesh>)}
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.06, 8]} /><Matte color={STEEL} /></mesh>
      </group>
      {/* mast, hub and main rotor */}
      <mesh position={[0, hubY - 0.35, mastZ]}><cylinderGeometry args={[0.1, 0.15, 0.7, 10]} /><Matte color={STEEL} metal={0.6} /></mesh>
      <group ref={rotor} position={[0, hubY, mastZ]}>
        <mesh><cylinderGeometry args={[0.18, 0.18, 0.14, 12]} /><Matte color={lv.engine} rough={0.4} metal={0.5} /></mesh>
        {Array.from({ length: blades }, (_, i) => <mesh key={i} geometry={blade} rotation={[0, (i * Math.PI * 2) / blades, 0]} position={[0, 0.02, 0]}><Matte color={lv.engine} rough={0.45} metal={0.3} /></mesh>)}
      </group>
      <Light p={[0.0, endY + 0.95, endZ + 0.7]} color="#FF2A2A" />
    </group>
  );
}

/** One aircraft, nose along +z, feet on y = 0. Pass a livery to paint it; without one it wears its factory colours. */
export function AircraftModel({ def, livery }: { def: AircraftDef; livery?: Livery }) {
  const lv = useMemo(() => livery ?? defaultLivery(def, ''), [livery, def]);
  return def.shape === 'skyhawk' ? <Skyhawk lv={lv} /> : def.shape === 'phenom' ? <Phenom lv={lv} /> : <Helicopter lv={lv} big={def.shape === 'h125'} />;
}
