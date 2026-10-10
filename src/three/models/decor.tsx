import { B, Cyl, Sph } from './primitives';

export function Rug() {
  return (
    <group>
      <B size={[2.0, 0.02, 1.4]} pos={[0, 0.01, 0]} color="#C4552D" rough={1} radius={0.008} />
      <B size={[1.82, 0.022, 1.22]} pos={[0, 0.011, 0]} color="#EBC77F" rough={1} radius={0.006} />
      <B size={[1.64, 0.024, 1.04]} pos={[0, 0.012, 0]} color="#1F4E47" rough={1} radius={0.006} />
      <B size={[1.1, 0.026, 0.5]} pos={[0, 0.013, 0]} color="#E4572E" rough={1} radius={0.006} />
      <B size={[0.5, 0.028, 0.18]} pos={[0, 0.014, 0]} color="#FFC21A" rough={1} radius={0.006} />
    </group>
  );
}

/** Wall-mounted: origin is the centre of the frame. */
export function WallFrame() {
  return (
    <group>
      <B size={[0.8, 0.6, 0.05]} pos={[0, 0, 0]} color="#3F2A1B" rough={0.5} radius={0.012} />
      <B size={[0.7, 0.5, 0.02]} pos={[0, 0, 0.022]} color="#F6D58E" rough={0.9} radius={0.004} />
      <B size={[0.7, 0.2, 0.021]} pos={[0, -0.15, 0.024]} color="#2B6A60" rough={0.9} radius={0.004} />
      <B size={[0.7, 0.08, 0.022]} pos={[0, -0.04, 0.026]} color="#E4572E" rough={0.9} radius={0.004} />
      <Cyl r={0.09} h={0.01} pos={[0.12, 0.08, 0.034]} rot={[Math.PI / 2, 0, 0]} color="#FFC21A" rough={0.8} />
    </group>
  );
}

export function Bucket() {
  return (
    <group>
      <Cyl r={0.2} r2={0.16} h={0.36} pos={[0, 0.18, 0]} color="#2D7DD2" rough={0.35} />
      <Cyl r={0.185} h={0.01} pos={[0, 0.34, 0]} color="#8FD3F4" rough={0.05} />
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.19, 0.008, 6, 24, Math.PI]} />
        <meshStandardMaterial color="#C9CED1" metalness={0.7} roughness={0.3} />
      </mesh>
      <Cyl r={0.05} h={0.12} pos={[0.26, 0.06, 0.1]} color="#F4F1EA" rough={0.5} />
    </group>
  );
}

export function Shower() {
  return (
    <group>
      <B size={[0.9, 0.06, 0.9]} pos={[0, 0.03, 0]} color="#E8ECEE" rough={0.3} radius={0.02} />
      <B size={[0.9, 2.1, 0.03]} pos={[0, 1.11, -0.435]} color="#BFE3EE" opacity={0.28} rough={0.05} shadow={false} />
      <B size={[0.03, 2.1, 0.9]} pos={[-0.435, 1.11, 0]} color="#BFE3EE" opacity={0.28} rough={0.05} shadow={false} />
      <B size={[0.03, 2.1, 0.9]} pos={[0.435, 1.11, 0]} color="#BFE3EE" opacity={0.28} rough={0.05} shadow={false} />
      <B size={[0.9, 0.04, 0.04]} pos={[0, 2.17, -0.43]} color="#9AA3A8" metal={0.8} rough={0.2} />
      <B size={[0.04, 0.04, 0.9]} pos={[-0.43, 2.17, 0]} color="#9AA3A8" metal={0.8} rough={0.2} />
      <B size={[0.04, 0.04, 0.9]} pos={[0.43, 2.17, 0]} color="#9AA3A8" metal={0.8} rough={0.2} />
      <Cyl r={0.018} h={2.0} pos={[0.25, 1.06, -0.38]} color="#C9CED1" metal={0.9} rough={0.15} seg={10} />
      <Cyl r={0.025} h={0.3} pos={[0.25, 2.03, -0.25]} rot={[Math.PI / 2, 0, 0]} color="#C9CED1" metal={0.9} rough={0.15} seg={10} />
      <Cyl r={0.1} h={0.025} pos={[0.25, 2.0, -0.1]} color="#C9CED1" metal={0.9} rough={0.15} />
    </group>
  );
}

export function Plant() {
  const leaves: [number, number, number, number][] = [
    [0, 0.8, 0, 0], [0.12, 0.65, 0.05, 0.5], [-0.12, 0.7, -0.04, -0.5], [0.05, 0.55, -0.12, 0.2], [-0.08, 0.55, 0.12, -0.3],
  ];
  return (
    <group>
      <Cyl r={0.2} r2={0.14} h={0.34} pos={[0, 0.17, 0]} color="#B5532F" rough={0.85} />
      <Cyl r={0.19} h={0.02} pos={[0, 0.34, 0]} color="#3A2A1E" rough={1} />
      <Cyl r={0.012} h={0.5} pos={[0, 0.58, 0]} color="#3C7A3D" seg={8} />
      {leaves.map(([x, y, z], i) => (
        <Sph key={i} r={0.17} pos={[x, y, z]} scale={[1, 0.28, 0.55]} color={i % 2 ? '#3F9A4A' : '#2F7F3D'} rough={0.8} />
      ))}
      {leaves.map(([x, y, z, r], i) => (
        <group key={`g${i}`} rotation={[0, r, 0]}>
          <Sph r={0.14} pos={[x * 1.3, y - 0.05, z * 1.3]} scale={[0.9, 0.25, 0.5]} color="#4BAE55" rough={0.8} />
        </group>
      ))}
    </group>
  );
}
