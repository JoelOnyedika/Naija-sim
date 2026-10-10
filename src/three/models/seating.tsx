import { B, Cyl } from './primitives';

export function Chair() {
  return (
    <group>
      <B size={[0.46, 0.06, 0.46]} pos={[0, 0.45, 0]} color="#F4F1EA" rough={0.4} radius={0.025} />
      <B size={[0.44, 0.5, 0.05]} pos={[0, 0.74, -0.2]} color="#F4F1EA" rough={0.4} radius={0.025} rot={[-0.08, 0, 0]} />
      {[-0.19, 0.19].map((x) => [-0.19, 0.19].map((z) => <Cyl key={`${x}${z}`} r={0.022} h={0.45} pos={[x, 0.225, z]} color="#E5E1D6" rough={0.4} seg={10} />))}
    </group>
  );
}

export function Sofa() {
  return (
    <group>
      <B size={[1.9, 0.3, 0.85]} pos={[0, 0.2, 0]} color="#22403B" rough={0.85} radius={0.05} />
      <B size={[1.9, 0.55, 0.22]} pos={[0, 0.62, -0.31]} color="#2B544D" rough={0.9} radius={0.08} />
      <B size={[0.22, 0.5, 0.85]} pos={[-0.84, 0.45, 0]} color="#2B544D" rough={0.9} radius={0.08} />
      <B size={[0.22, 0.5, 0.85]} pos={[0.84, 0.45, 0]} color="#2B544D" rough={0.9} radius={0.08} />
      <B size={[0.7, 0.16, 0.6]} pos={[-0.4, 0.42, 0.08]} color="#34665D" rough={0.95} radius={0.07} />
      <B size={[0.7, 0.16, 0.6]} pos={[0.4, 0.42, 0.08]} color="#34665D" rough={0.95} radius={0.07} />
      <B size={[0.3, 0.3, 0.1]} pos={[-0.6, 0.62, -0.12]} color="#FFC21A" rough={0.95} radius={0.04} rot={[0.2, 0.2, 0.1]} />
      {[-0.8, 0.8].map((x) => <B key={x} size={[0.08, 0.1, 0.08]} pos={[x, 0.04, 0.3]} color="#1A1A1A" />)}
    </group>
  );
}

export function Table() {
  return (
    <group>
      <B size={[1.2, 0.05, 0.7]} pos={[0, 0.755, 0]} color="#8B5E3C" rough={0.5} radius={0.015} />
      {[-0.55, 0.55].map((x) => [-0.3, 0.3].map((z) => <B key={`${x}${z}`} size={[0.06, 0.73, 0.06]} pos={[x, 0.365, z]} color="#6B4A32" rough={0.6} radius={0.01} />))}
      <Cyl r={0.12} h={0.14} pos={[0.2, 0.85, 0]} color="#3AA8C1" rough={0.2} />
    </group>
  );
}
