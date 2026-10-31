import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { VehicleDef } from '@/data/vehicles';
import { PlayerCar } from './CarModel';
import { B, Cyl } from './primitives';

/** The stand-in car: a readable, detailed body per vehicle type (lights, grille, rims, spoiler, roof rack, truck bed). It is a placeholder and the showroom says so. */
function Placeholder({ v }: { v: VehicleDef }) {
  const c = v.color, dark = '#15181B', glass = '#7FA9BF';
  const keke = v.type === 'keke', sport = v.type === 'sport', big = v.type === 'suv' || v.type === 'truck';
  const L = keke ? 1.9 : sport ? 4.1 : v.type === 'truck' ? 4.6 : 4.2, Wd = keke ? 1.0 : sport ? 1.9 : 1.8, wr = keke ? 0.25 : sport ? 0.34 : 0.4;
  const wheelZ = keke ? [0.75] : [L * 0.32, -L * 0.32], wheelX = keke ? [0] : [Wd / 2 - 0.02, -(Wd / 2 - 0.02)];
  const Wheel = ({ x, z }: { x: number; z: number }) => (
    <group position={[x, wr, z]}>
      <Cyl r={wr} h={0.28} rot={[0, 0, Math.PI / 2]} color="#101214" rough={0.9} seg={20} />
      <Cyl r={wr * 0.62} h={0.3} rot={[0, 0, Math.PI / 2]} color="#C9CED1" metal={0.8} rough={0.25} seg={14} />
      <Cyl r={wr * 0.2} h={0.32} rot={[0, 0, Math.PI / 2]} color="#2A2D31" metal={0.5} seg={8} />
    </group>
  );
  return (
    <group scale={keke ? 1.25 : 1}>
      {keke ? (
        <group>
          <Wheel x={0} z={0.75} /><Wheel x={-0.42} z={-0.6} /><Wheel x={0.42} z={-0.6} />
          <B size={[0.95, 0.55, 1.5]} pos={[0, 0.62, -0.1]} color={c} rough={0.45} radius={0.1} />
          <B size={[0.9, 0.5, 0.12]} pos={[0, 1.0, 0.55]} rot={[-0.25, 0, 0]} color={glass} rough={0.15} radius={0.03} />
          <B size={[1.05, 0.07, 1.7]} pos={[0, 1.42, -0.15]} color="#1F4E47" rough={0.6} radius={0.03} />
          {[-0.45, 0.45].map((x) => <B key={x} size={[0.05, 0.4, 0.05]} pos={[x, 1.2, -0.85]} color={dark} />)}
          <B size={[0.2, 0.15, 0.08]} pos={[0, 0.6, 0.86]} color="#FFF4C2" rough={0.2} />
        </group>
      ) : (
        <group>
          {wheelX.flatMap((x) => wheelZ.map((z) => <Wheel key={`${x}${z}`} x={x} z={z} />))}
          <B size={[Wd, 0.5, L]} pos={[0, wr + 0.28, 0]} color={c} metal={0.45} rough={0.28} radius={0.16} />
          {v.type !== 'truck' && <B size={[Wd - 0.18, sport ? 0.34 : big ? 0.55 : 0.45, L * (sport ? 0.4 : 0.52)]} pos={[0, wr + 0.5 + (sport ? 0.24 : big ? 0.35 : 0.3), sport ? -0.2 : -0.15]} color={glass} metal={0.3} rough={0.12} radius={0.12} />}
          {v.type !== 'truck' && <B size={[Wd - 0.3, 0.05, L * (sport ? 0.34 : 0.46)]} pos={[0, wr + 0.5 + (sport ? 0.42 : big ? 0.63 : 0.55), sport ? -0.2 : -0.15]} color={c} metal={0.4} rough={0.3} radius={0.04} />}
          {v.type === 'truck' && (<>
            <B size={[Wd - 0.1, 0.62, 1.5]} pos={[0, wr + 0.82, L * 0.18]} color={glass} metal={0.3} rough={0.12} radius={0.1} />
            <B size={[Wd - 0.1, 0.1, 1.5]} pos={[0, wr + 1.16, L * 0.18]} color={c} metal={0.4} rough={0.3} radius={0.04} />
            <B size={[Wd - 0.1, 0.5, 0.06]} pos={[0, wr + 0.62, -L * 0.2]} color={c} rough={0.5} />
            <B size={[Wd - 0.1, 0.06, 1.7]} pos={[0, wr + 0.86, -L * 0.34]} color="#101214" rough={0.7} />
          </>)}
          {big && v.type === 'suv' && [-0.6, 0.6].map((x) => <B key={x} size={[0.05, 0.05, L * 0.4]} pos={[x * 0.7, wr + 1.2, -0.15]} color="#2A2D31" metal={0.6} rough={0.3} />)}
          {sport && <><B size={[Wd - 0.1, 0.05, 0.4]} pos={[0, wr + 0.86, -L / 2 + 0.25]} color={dark} rough={0.4} /><B size={[0.05, 0.22, 0.1]} pos={[0.6, wr + 0.74, -L / 2 + 0.25]} color={dark} /><B size={[0.05, 0.22, 0.1]} pos={[-0.6, wr + 0.74, -L / 2 + 0.25]} color={dark} /></>}
          {[-1, 1].map((k) => <group key={k}><B size={[0.34, 0.14, 0.06]} pos={[k * (Wd / 2 - 0.3), wr + 0.42, L / 2 + 0.01]} color="#FFF4C2" rough={0.15} /><B size={[0.34, 0.12, 0.06]} pos={[k * (Wd / 2 - 0.3), wr + 0.42, -L / 2 - 0.01]} color="#E4363A" rough={0.2} /></group>)}
          <B size={[Wd * 0.5, 0.2, 0.06]} pos={[0, wr + 0.34, L / 2 + 0.01]} color={dark} rough={0.4} />
          <B size={[Wd + 0.04, 0.12, 0.2]} pos={[0, wr + 0.1, L / 2 - 0.05]} color={dark} rough={0.6} radius={0.04} /><B size={[Wd + 0.04, 0.12, 0.2]} pos={[0, wr + 0.1, -L / 2 + 0.05]} color={dark} rough={0.6} radius={0.04} />
        </group>
      )}
    </group>
  );
}

/** One car on a podium. Slowly turns (cheap: one rotation per frame, only while the showroom is open). Cars with a GLB show it; the rest show the stand-in. */
export function VehicleDisplay({ v, selected }: { v: VehicleDef; selected?: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += Math.min(dt, 0.1) * (selected ? 0.8 : 0.35); });
  return <group ref={g} scale={0.88}><PlayerCar def={v} placeholder={<Placeholder v={v} />} /></group>;
}
