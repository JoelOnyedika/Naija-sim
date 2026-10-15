import type { ComponentType } from 'react';
import { B, Cyl } from '@/three/models/primitives';

/** Government, aviation and port landmarks added with the expanded map. Same conventions as landmarks.tsx: ~3 world units wide. */

function Flag({ pos, color = '#0B8F4D' }: { pos: [number, number, number]; color?: string }) {
  return (<group position={pos}><Cyl r={0.015} h={0.9} pos={[0, 0.45, 0]} color="#D8D8D8" seg={6} /><B size={[0.4, 0.22, 0.015]} pos={[0.2, 0.82, 0]} color={color} shadow={false} /></group>);
}

function Secretariat() { // Lagos State Secretariat, Alausa: a tall slab block with a lower wing
  return (
    <group>
      <B size={[1.2, 2.3, 0.7]} pos={[-0.2, 1.15, 0]} color="#D9D4C6" rough={0.8} radius={0.03} />
      {[0.3, 0.8, 1.3, 1.8].map((y) => <B key={y} size={[1.22, 0.1, 0.72]} pos={[-0.2, y, 0]} color="#5E7A8C" rough={0.3} metal={0.3} shadow={false} />)}
      <B size={[1.6, 0.8, 0.9]} pos={[0.6, 0.4, 0.5]} color="#C9C3B2" rough={0.8} radius={0.03} />
      <B size={[0.9, 0.06, 0.5]} pos={[0.6, 0.83, 0.5]} color="#8C8576" shadow={false} />
      <Flag pos={[-0.2, 2.3, 0]} />
    </group>
  );
}
function TafawaBalewa() { // Tafawa Balewa Square: a wide oval arena with a ring of arches
  return (
    <group>
      <Cyl r={1.3} h={0.35} pos={[0, 0.17, 0]} color="#CFC9B8" seg={36} />
      <Cyl r={1.1} h={0.1} pos={[0, 0.4, 0]} color="#7FA06A" seg={36} />
      {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <B key={i} size={[0.1, 0.55, 0.1]} pos={[Math.sin(a) * 1.25, 0.62, Math.cos(a) * 1.25]} color="#E7E1D2" />; })}
      <B size={[0.8, 0.5, 0.3]} pos={[0, 0.65, -1.25]} color="#DAD3C0" />
      <Flag pos={[0, 0.4, 0.9]} />
    </group>
  );
}
function LagosHouse() { // Lagos State House, Marina: white colonial house with a portico
  return (
    <group>
      <B size={[2.0, 0.8, 1.0]} pos={[0, 0.4, 0]} color="#F3EFE6" rough={0.8} radius={0.03} />
      <B size={[2.1, 0.12, 1.1]} pos={[0, 0.86, 0]} color="#9A5A3A" rough={0.8} />
      {[-0.4, -0.13, 0.13, 0.4].map((x) => <Cyl key={x} r={0.05} h={0.7} pos={[x, 0.35, 0.62]} color="#FFFFFF" seg={10} />)}
      <B size={[1.1, 0.1, 0.35]} pos={[0, 0.75, 0.62]} color="#F3EFE6" />
      <Flag pos={[0, 0.92, 0]} />
    </group>
  );
}
function FederalSecretariat() { // Federal Secretariat, Ikoyi: twin blocks joined by a podium
  return (
    <group>
      <B size={[2.0, 0.3, 1.0]} pos={[0, 0.15, 0]} color="#C3BBA9" />
      <B size={[0.7, 1.6, 0.7]} pos={[-0.6, 1.0, 0]} color="#D6D0C0" rough={0.8} />
      <B size={[0.7, 1.9, 0.7]} pos={[0.6, 1.15, 0]} color="#D6D0C0" rough={0.8} />
      {[0.5, 0.9, 1.3, 1.7].map((y) => <B key={y} size={[0.72, 0.07, 0.72]} pos={[0.6, y, 0]} color="#6B8497" shadow={false} />)}
      <Flag pos={[0.6, 2.1, 0]} />
    </group>
  );
}
function EkoHotel() { // Eko Hotel and Suites: a tall pale tower on a wide podium
  return (
    <group>
      <B size={[2.2, 0.4, 1.3]} pos={[0, 0.2, 0]} color="#E9E3D2" radius={0.05} />
      <B size={[0.9, 2.4, 0.8]} pos={[-0.2, 1.6, 0]} color="#F2EEE4" rough={0.5} radius={0.05} />
      {[0.8, 1.2, 1.6, 2.0, 2.4].map((y) => <B key={y} size={[0.92, 0.12, 0.82]} pos={[-0.2, y, 0]} color="#3F7CAC" rough={0.2} metal={0.3} shadow={false} />)}
      <B size={[0.5, 0.2, 0.5]} pos={[-0.2, 2.9, 0]} color="#1D4ED8" emissive="#1D4ED8" emissiveIntensity={0.6} />
      <B size={[0.9, 0.5, 0.8]} pos={[0.7, 0.65, 0.1]} color="#D8D0BC" />
    </group>
  );
}
function AirportTerminal() { // Murtala Muhammed terminal: long low hall, glass canopy, control tower
  return (
    <group>
      <B size={[3.0, 0.5, 1.1]} pos={[0, 0.25, 0]} color="#E3E7EA" rough={0.4} radius={0.05} />
      <B size={[3.1, 0.07, 1.25]} pos={[0, 0.58, 0]} color="#2F6BFF" rough={0.4} />
      <B size={[2.8, 0.22, 0.04]} pos={[0, 0.3, 0.57]} color="#8FC4E8" rough={0.1} metal={0.4} shadow={false} />
      <Cyl r={0.12} h={1.5} pos={[1.7, 0.75, -0.3]} color="#D9DCDF" seg={12} />
      <Cyl r={0.26} r2={0.2} h={0.35} pos={[1.7, 1.62, -0.3]} color="#37576B" seg={12} />
      <B size={[0.03, 0.4, 0.03]} pos={[1.7, 2.0, -0.3]} color="#E5484D" emissive="#E5484D" emissiveIntensity={1.2} shadow={false} />
    </group>
  );
}
export function PortCrane() { // Apapa quay: a container gantry crane
  return (
    <group>
      {[-0.55, 0.55].map((x) => [-0.4, 0.4].map((z) => <B key={`${x}${z}`} size={[0.07, 1.6, 0.07]} pos={[x, 0.8, z]} color="#E5792F" />))}
      <B size={[1.4, 0.1, 1.0]} pos={[0, 1.6, 0]} color="#E5792F" />
      <B size={[0.12, 0.12, 2.6]} pos={[0, 1.75, 0.5]} color="#D96A1F" />
      <B size={[0.5, 0.25, 0.25]} pos={[0, 1.4, 1.3]} color="#2F6BFF" />
    </group>
  );
}

export const LANDMARK_MODELS_3: Record<string, ComponentType> = {
  secretariat: Secretariat, tafawaBalewa: TafawaBalewa, lagosHouse: LagosHouse, federalSecretariat: FederalSecretariat,
  ekoHotel: EkoHotel, airportTerminal: AirportTerminal, portCrane: PortCrane,
};
