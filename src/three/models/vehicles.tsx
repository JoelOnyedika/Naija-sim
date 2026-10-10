import { B, Cyl, Mat } from './primitives';
import type { VehicleBody } from '@/data/vehicles';

const GLASS = '#14222B';

function Wheel({ x, z, r = 0.36 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <Cyl r={r} h={0.26} color="#16181C" rough={0.9} seg={20} />
      <Cyl r={r * 0.62} h={0.275} color="#C9CED1" metal={0.9} rough={0.25} seg={16} />
      <Cyl r={r * 0.2} h={0.29} color="#2B2F32" metal={0.6} seg={8} />
    </group>
  );
}
const Lights = ({ y, w, front, back }: { y: number; w: number; front: number; back: number }) => (
  <>
    {[-1, 1].map((s) => (
      <group key={s}>
        <B size={[0.34, 0.12, 0.05]} pos={[s * w, y, front]} color="#FFFDF0" emissive="#FFF3C4" emissiveIntensity={1.2} radius={0.03} shadow={false} />
        <B size={[0.34, 0.1, 0.05]} pos={[s * w, y, back]} color="#C21F2E" emissive="#FF2B3F" emissiveIntensity={0.9} radius={0.03} shadow={false} />
      </group>
    ))}
  </>
);

/** Procedural car. Faces +z. `body` picks the silhouette; swap for a GLB later via the same props. */
export function Vehicle({ body, color }: { body: VehicleBody; color: string }) {
  if (body === 'keke') return <Keke color={color} />;
  const sport = body === 'sport', suv = body === 'suv', truck = body === 'truck';
  const L = sport ? 4.4 : suv ? 4.8 : truck ? 5.2 : 4.5;
  const W = sport ? 2.0 : suv ? 1.95 : 1.8;
  const r = suv || truck ? 0.4 : sport ? 0.34 : 0.34;
  const bodyH = sport ? 0.42 : suv ? 0.8 : truck ? 0.75 : 0.6;
  const baseY = r + bodyH / 2 - 0.1;
  return (
    <group>
      <B size={[W, bodyH, L]} pos={[0, baseY, 0]} color={color} metal={0.55} rough={0.28} radius={0.16} />
      {truck ? (
        <>
          <B size={[W - 0.1, 0.8, 1.9]} pos={[0, baseY + 0.75, 0.9]} color={color} metal={0.55} rough={0.28} radius={0.12} />
          <B size={[W - 0.3, 0.5, 1.82]} pos={[0, baseY + 0.8, 0.9]} color={GLASS} metal={0.6} rough={0.1} radius={0.1} />
          <B size={[W - 0.1, 0.3, 2.3]} pos={[0, baseY + 0.45, -1.4]} color="#2B2F32" rough={0.7} radius={0.04} />
        </>
      ) : (
        <>
          <B size={[W - 0.2, sport ? 0.34 : suv ? 0.66 : 0.52, sport ? 1.7 : suv ? 3.0 : 2.3]} pos={[0, baseY + (sport ? 0.34 : suv ? 0.7 : 0.55), sport ? 0.1 : -0.25]} color={color} metal={0.55} rough={0.28} radius={0.15} />
          <B size={[W - 0.12, sport ? 0.26 : suv ? 0.5 : 0.4, sport ? 1.5 : suv ? 2.8 : 2.1]} pos={[0, baseY + (sport ? 0.36 : suv ? 0.72 : 0.57), sport ? 0.1 : -0.25]} color={GLASS} metal={0.6} rough={0.08} radius={0.12} />
          <B size={[W - 0.3, 0.06, sport ? 1.4 : suv ? 2.7 : 2.0]} pos={[0, baseY + (sport ? 0.54 : suv ? 1.06 : 0.82), sport ? 0.1 : -0.25]} color={color} metal={0.55} rough={0.28} radius={0.03} />
        </>
      )}
      {sport && <B size={[1.9, 0.05, 0.4]} pos={[0, baseY + 0.45, -L / 2 + 0.1]} color="#16181C" rough={0.5} radius={0.02} />}
      <B size={[W + 0.02, 0.18, 0.18]} pos={[0, r + 0.05, L / 2 - 0.02]} color="#1B1F24" rough={0.6} radius={0.05} />
      <B size={[W + 0.02, 0.18, 0.18]} pos={[0, r + 0.05, -L / 2 + 0.02]} color="#1B1F24" rough={0.6} radius={0.05} />
      <B size={[0.7, 0.2, 0.03]} pos={[0, baseY + 0.02, L / 2 + 0.01]} color="#16181C" rough={0.6} radius={0.02} />
      <Lights y={baseY + 0.12} w={W / 2 - 0.3} front={L / 2 + 0.01} back={-L / 2 - 0.01} />
      {[-1, 1].map((s) => [-1, 1].map((t) => <Wheel key={`${s}${t}`} x={s * (W / 2 - 0.06)} z={t * (L / 2 - (sport ? 0.85 : 1.0))} r={r} />))}
    </group>
  );
}

function Keke({ color }: { color: string }) {
  return (
    <group scale={1.1}>
      <B size={[1.3, 0.35, 2.3]} pos={[0, 0.5, 0]} color={color} rough={0.5} radius={0.12} />
      <B size={[1.28, 0.1, 1.5]} pos={[0, 1.55, -0.2]} color="#1B1F24" rough={0.6} radius={0.05} />
      {[[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.9], [0.6, -0.9]].map(([x, z], i) => <B key={i} size={[0.05, 1.0, 0.05]} pos={[x, 1.05, z]} color="#2B2F32" metal={0.5} />)}
      <B size={[1.1, 0.3, 0.5]} pos={[0, 0.8, -0.7]} color="#2B2F32" rough={0.8} radius={0.08} />
      <B size={[0.9, 0.5, 0.06]} pos={[0, 1.2, 0.55]} color={GLASS} rough={0.1} radius={0.02} />
      <B size={[0.3, 0.15, 0.06]} pos={[0, 0.65, 1.15]} color="#FFFDF0" emissive="#FFF3C4" emissiveIntensity={1.1} shadow={false} />
      <Wheel x={0} z={1.0} r={0.28} />
      <Wheel x={-0.62} z={-0.7} r={0.28} />
      <Wheel x={0.62} z={-0.7} r={0.28} />
      <mesh position={[0, 1.0, 1.0]}><boxGeometry args={[0.06, 0.4, 0.06]} /><Mat color="#555" metal={0.6} /></mesh>
    </group>
  );
}
