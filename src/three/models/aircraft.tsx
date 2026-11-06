import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { AircraftDef } from '@/data/aircraft';

/**
 * Procedurally built aircraft (no model files): a bubble-cockpit helicopter, a high-wing propeller plane and a small private jet.
 * Each is about 6 to 9 metres long, stands on the ground at y = 0 and points its nose along +z, like the cars. Rotors and the
 * propeller turn slowly while parked, so the lawn feels alive. Cheap: 20 to 40 simple meshes each.
 */
type P = { c: string; a: string };
const M = ({ color, metal = 0.3, rough = 0.45 }: { color: string; metal?: number; rough?: number }) => <meshStandardMaterial color={color} metalness={metal} roughness={rough} />;
const GLASS = <meshStandardMaterial color="#9BC4E8" metalness={0.8} roughness={0.08} transparent opacity={0.82} />;

function Helicopter({ c, a }: P) {
  const rotor = useRef<Group>(null), tail = useRef<Group>(null);
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += dt * 9; if (tail.current) tail.current.rotation.x += dt * 14; });
  return (
    <group>
      {/* skids */}
      {[-0.95, 0.95].map((x) => <group key={x}><mesh position={[x, 0.18, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 3.6, 8]} /><M color="#1F2937" /></mesh>{[-0.9, 0.9].map((z) => <mesh key={z} position={[x * 0.92, 0.62, z]} rotation={[0, 0, x > 0 ? -0.18 : 0.18]}><cylinderGeometry args={[0.05, 0.05, 0.9, 6]} /><M color="#1F2937" /></mesh>)}</group>)}
      {/* cabin and bubble */}
      <mesh position={[0, 1.35, 0.15]} scale={[1.05, 0.95, 1.7]}><sphereGeometry args={[0.95, 20, 14]} /><M color={c} metal={0.5} rough={0.3} /></mesh>
      <mesh position={[0, 1.5, 1.05]} scale={[0.92, 0.82, 1.05]}><sphereGeometry args={[0.9, 20, 14]} />{GLASS}</mesh>
      <mesh position={[0, 1.05, 0.15]} scale={[1.07, 0.18, 1.75]}><sphereGeometry args={[0.95, 16, 8]} /><M color={a} /></mesh>
      {/* tail boom, fin and tail rotor */}
      <mesh position={[0, 1.55, -2.2]} rotation={[Math.PI / 2 + 0.05, 0, 0]}><cylinderGeometry args={[0.2, 0.08, 3.6, 10]} /><M color={c} metal={0.5} /></mesh>
      <mesh position={[0, 1.95, -3.95]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.08, 0.95, 0.6]} /><M color={a} /></mesh>
      <group ref={tail} position={[0.16, 1.7, -4.0]}><mesh><boxGeometry args={[0.03, 1.0, 0.1]} /><M color="#111827" /></mesh><mesh rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.03, 1.0, 0.1]} /><M color="#111827" /></mesh></group>
      {/* mast and main rotor */}
      <mesh position={[0, 2.35, 0.1]}><cylinderGeometry args={[0.09, 0.12, 0.5, 8]} /><M color="#1F2937" /></mesh>
      <group ref={rotor} position={[0, 2.62, 0.1]}>{[0, Math.PI / 2].map((r) => <mesh key={r} rotation={[0, r, 0]}><boxGeometry args={[7, 0.04, 0.26]} /><M color="#111827" /></mesh>)}<mesh><sphereGeometry args={[0.16, 10, 8]} /><M color="#374151" /></mesh></group>
    </group>
  );
}

function Plane({ c, a }: P) {
  const prop = useRef<Group>(null);
  useFrame((_, dt) => { if (prop.current) prop.current.rotation.z += dt * 22; });
  return (
    <group>
      {/* landing gear */}
      {[[-1.0, 0.7], [1.0, 0.7], [0, -2.9]].map(([x, z], i) => <group key={i}><mesh position={[x, 0.55, i === 2 ? z : 0.8]}><cylinderGeometry args={[0.04, 0.04, 0.9, 6]} /><M color="#374151" /></mesh><mesh position={[x, 0.2, i === 2 ? z : 0.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.14, 12]} /><M color="#111" /></mesh></group>)}
      {/* fuselage and nose */}
      <mesh position={[0, 1.35, -0.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.62, 0.55, 4.4, 16]} /><M color={c} metal={0.5} rough={0.3} /></mesh>
      <mesh position={[0, 1.35, 1.95]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.62, 0.9, 16]} /><M color={c} metal={0.5} rough={0.3} /></mesh>
      <mesh position={[0, 1.35, -3.3]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.55, 2.2, 16]} /><M color={c} metal={0.5} rough={0.3} /></mesh>
      <mesh position={[0, 1.38, -0.4]} scale={[1.02, 0.28, 1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.63, 0.56, 4.41, 16]} /><M color={a} /></mesh>
      <mesh position={[0, 1.85, 0.55]} scale={[0.95, 0.55, 1.5]}><sphereGeometry args={[0.55, 14, 10]} />{GLASS}</mesh>
      {/* high wing with struts */}
      <mesh position={[0, 2.0, 0.35]}><boxGeometry args={[8.4, 0.1, 1.35]} /><M color={c} metal={0.4} /></mesh>
      <mesh position={[0, 2.0, 0.35]}><boxGeometry args={[8.42, 0.11, 0.3]} /><M color={a} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 1.7, 1.45, 0.35]} rotation={[0, 0, s * 0.5]}><cylinderGeometry args={[0.04, 0.04, 1.8, 6]} /><M color="#374151" /></mesh>)}
      {/* tail */}
      <mesh position={[0, 2.05, -3.5]}><boxGeometry args={[0.09, 1.2, 1.1]} /><M color={a} /></mesh>
      <mesh position={[0, 1.5, -3.5]}><boxGeometry args={[3.0, 0.08, 0.8]} /><M color={c} metal={0.4} /></mesh>
      {/* propeller */}
      <mesh position={[0, 1.35, 2.45]}><sphereGeometry args={[0.2, 10, 8]} /><M color={a} /></mesh>
      <group ref={prop} position={[0, 1.35, 2.5]}><mesh><boxGeometry args={[0.16, 2.2, 0.04]} /><M color="#111827" /></mesh></group>
    </group>
  );
}

function Jet({ c, a }: P) {
  return (
    <group>
      {[[-0.9, 0.6], [0.9, 0.6], [0, 3.0]].map(([x, z], i) => <group key={i}><mesh position={[x, 0.4, z]}><cylinderGeometry args={[0.04, 0.04, 0.8, 6]} /><M color="#374151" /></mesh><mesh position={[x, 0.18, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.14, 12]} /><M color="#111" /></mesh></group>)}
      <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.72, 0.72, 6.2, 18]} /><M color={c} metal={0.6} rough={0.25} /></mesh>
      <mesh position={[0, 1.42, 4.0]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.72, 1.9, 18]} /><M color={c} metal={0.6} rough={0.25} /></mesh>
      <mesh position={[0, 1.5, -4.0]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.72, 2.4, 18]} /><M color={c} metal={0.6} rough={0.25} /></mesh>
      <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.01, 1, 0.22]}><cylinderGeometry args={[0.73, 0.73, 6.21, 18]} /><M color={a} /></mesh>
      {Array.from({ length: 6 }, (_, i) => [-1, 1].map((s) => <mesh key={`${i}${s}`} position={[s * 0.7, 1.65, -1.4 + i * 0.7]}><boxGeometry args={[0.03, 0.2, 0.28]} />{GLASS}</mesh>))}
      <mesh position={[0, 1.8, 3.3]} rotation={[0.5, 0, 0]} scale={[1, 1, 0.5]}><boxGeometry args={[0.9, 0.25, 0.8]} />{GLASS}</mesh>
      {/* swept wings */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 2.2, 1.0, -0.2]} rotation={[0, s * 0.5, s * -0.06]}><boxGeometry args={[4.4, 0.1, 1.2]} /><M color={c} metal={0.5} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`t${s}`} position={[s * 4.2, 1.3, -1.0]}><boxGeometry args={[0.08, 0.7, 0.5]} /><M color={a} /></mesh>)}
      {/* rear engines and T-tail */}
      {[-1, 1].map((s) => <mesh key={`e${s}`} position={[s * 0.95, 1.7, -3.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.26, 1.6, 12]} /><M color="#9CA3AF" metal={0.8} rough={0.3} /></mesh>)}
      <mesh position={[0, 2.5, -4.3]}><boxGeometry args={[0.1, 1.9, 1.2]} /><M color={a} /></mesh>
      <mesh position={[0, 3.35, -4.45]}><boxGeometry args={[3.3, 0.09, 0.7]} /><M color={c} metal={0.5} /></mesh>
    </group>
  );
}

/** One aircraft, nose along +z, feet on y = 0. */
export function AircraftModel({ def }: { def: AircraftDef }) {
  return def.kind === 'helicopter' ? <Helicopter c={def.color} a={def.accent} /> : def.kind === 'plane' ? <Plane c={def.color} a={def.accent} /> : <Jet c={def.color} a={def.accent} />;
}
