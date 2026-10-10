import { B } from './primitives';

export function Bed() {
  return (
    <group>
      <B size={[1.6, 0.3, 2.0]} pos={[0, 0.25, 0]} color="#6B4A32" rough={0.6} />
      <B size={[1.6, 0.9, 0.1]} pos={[0, 0.6, -0.95]} color="#5A3D28" rough={0.6} radius={0.03} />
      <B size={[1.5, 0.22, 1.85]} pos={[0, 0.51, 0.04]} color="#F2EEE6" rough={0.9} radius={0.06} />
      <B size={[1.52, 0.06, 1.15]} pos={[0, 0.64, 0.38]} color="#2B6A60" rough={0.95} radius={0.03} />
      <B size={[1.52, 0.07, 0.2]} pos={[0, 0.655, -0.2]} color="#FFC21A" rough={0.95} radius={0.02} />
      <B size={[0.58, 0.13, 0.38]} pos={[-0.4, 0.68, -0.72]} color="#FFFFFF" rough={0.95} radius={0.06} />
      <B size={[0.58, 0.13, 0.38]} pos={[0.4, 0.68, -0.72]} color="#FFFFFF" rough={0.95} radius={0.06} />
      {[-0.75, 0.75].map((x) => [-0.95, 0.95].map((z) => <B key={`${x}${z}`} size={[0.08, 0.12, 0.08]} pos={[x, 0.06, z]} color="#3F2A1B" />))}
    </group>
  );
}

export function FoamMattress() {
  return (
    <group>
      <B size={[1.0, 0.18, 1.9]} pos={[0, 0.09, 0]} color="#E9C46A" rough={0.95} radius={0.06} />
      <B size={[0.98, 0.03, 1.2]} pos={[0, 0.195, 0.3]} color="#E4572E" rough={0.95} radius={0.02} />
      <B size={[0.55, 0.1, 0.35]} pos={[0, 0.23, -0.7]} color="#F7F3EA" rough={0.95} radius={0.05} />
    </group>
  );
}
