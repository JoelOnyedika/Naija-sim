import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { B, Cyl, Mat } from './primitives';

export function Tv() {
  return (
    <group>
      <B size={[1.2, 0.45, 0.4]} pos={[0, 0.225, 0]} color="#7A5234" rough={0.55} radius={0.02} />
      <B size={[1.1, 0.02, 0.01]} pos={[0, 0.3, 0.2]} color="#3F2A1B" />
      <Cyl r={0.05} h={0.08} pos={[0, 0.49, 0]} color="#1B1B1B" metal={0.6} />
      <B size={[1.0, 0.58, 0.05]} pos={[0, 0.82, 0]} color="#111315" rough={0.3} radius={0.015} />
      <mesh position={[0, 0.82, 0.027]}>
        <planeGeometry args={[0.94, 0.52]} />
        <Mat color="#0E2B3F" emissive="#2A7FB5" emissiveIntensity={0.7} rough={0.15} />
      </mesh>
    </group>
  );
}

export function Fridge() {
  return (
    <group>
      <B size={[0.7, 1.78, 0.7]} pos={[0, 0.91, 0]} color="#E8ECEE" rough={0.3} metal={0.15} radius={0.04} />
      <B size={[0.7, 0.015, 0.02]} pos={[0, 1.28, 0.355]} color="#6D7478" />
      <B size={[0.035, 0.32, 0.04]} pos={[0.26, 1.5, 0.375]} color="#9AA3A8" metal={0.7} rough={0.2} />
      <B size={[0.035, 0.5, 0.04]} pos={[0.26, 0.85, 0.375]} color="#9AA3A8" metal={0.7} rough={0.2} />
      <B size={[0.12, 0.05, 0.01]} pos={[-0.2, 1.7, 0.355]} color="#2B6A60" />
      {[-0.28, 0.28].map((x) => <B key={x} size={[0.08, 0.04, 0.08]} pos={[x, 0.02, 0.28]} color="#2B2F32" />)}
    </group>
  );
}

export function Generator() {
  return (
    <group>
      <B size={[0.8, 0.07, 0.5]} pos={[0, 0.2, 0]} color="#2B2F32" metal={0.5} rough={0.5} />
      <B size={[0.7, 0.4, 0.46]} pos={[0, 0.43, 0]} color="#C93A2B" rough={0.45} radius={0.04} />
      <B size={[0.5, 0.14, 0.36]} pos={[-0.05, 0.69, 0]} color="#F2B01E" rough={0.4} radius={0.05} />
      <Cyl r={0.035} h={0.04} pos={[0.2, 0.77, 0.08]} color="#1B1B1B" />
      <B size={[0.03, 0.36, 0.03]} pos={[0.39, 0.4, -0.2]} color="#B0B6BA" metal={0.7} rough={0.3} />
      <B size={[0.03, 0.36, 0.03]} pos={[0.39, 0.4, 0.2]} color="#B0B6BA" metal={0.7} rough={0.3} />
      <B size={[0.03, 0.03, 0.43]} pos={[0.39, 0.58, 0]} color="#B0B6BA" metal={0.7} rough={0.3} />
      <Cyl r={0.1} h={0.06} pos={[-0.32, 0.1, 0.27]} rot={[Math.PI / 2, 0, Math.PI / 2]} color="#1B1B1B" />
      <Cyl r={0.1} h={0.06} pos={[-0.32, 0.1, -0.27]} rot={[Math.PI / 2, 0, Math.PI / 2]} color="#1B1B1B" />
      <B size={[0.12, 0.1, 0.01]} pos={[-0.1, 0.46, 0.235]} color="#1B1B1B" />
    </group>
  );
}

export function Fan() {
  const blades = useRef<Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 9;
  });
  return (
    <group>
      <Cyl r={0.2} h={0.04} pos={[0, 0.02, 0]} color="#2B2F32" rough={0.5} />
      <Cyl r={0.022} h={0.85} pos={[0, 0.45, 0]} color="#C9CED1" metal={0.6} rough={0.3} seg={12} />
      <Cyl r={0.06} h={0.14} pos={[0, 0.98, -0.02]} rot={[Math.PI / 2, 0, 0]} color="#E8ECEE" rough={0.4} />
      <group position={[0, 0.98, 0.07]}>
        <mesh castShadow>
          <torusGeometry args={[0.2, 0.012, 8, 32]} />
          <Mat color="#B0B6BA" metal={0.7} rough={0.3} />
        </mesh>
        <group ref={blades}>
          {[0, 1, 2].map((i) => (
            <B key={i} size={[0.17, 0.06, 0.008]} pos={[Math.cos((i * 2 * Math.PI) / 3) * 0.1, Math.sin((i * 2 * Math.PI) / 3) * 0.1, 0]} rot={[0, 0, (i * 2 * Math.PI) / 3]} color="#6FB7D6" opacity={0.9} shadow={false} />
          ))}
        </group>
        <Cyl r={0.035} h={0.03} rot={[Math.PI / 2, 0, 0]} color="#2B2F32" />
      </group>
    </group>
  );
}

/** Wall-mounted: origin is the centre of the unit. */
export function Ac() {
  return (
    <group>
      <B size={[1.0, 0.3, 0.25]} pos={[0, 0, 0]} color="#F7F7F5" rough={0.35} radius={0.06} />
      <B size={[0.88, 0.04, 0.02]} pos={[0, -0.07, 0.125]} color="#2B2F32" rough={0.4} />
      <B size={[0.88, 0.025, 0.2]} pos={[0, -0.13, 0.03]} color="#E7E8E6" rough={0.4} radius={0.01} rot={[0.35, 0, 0]} />
      <mesh position={[0.38, 0.06, 0.126]}>
        <circleGeometry args={[0.008, 12]} />
        <Mat color="#2FD27A" emissive="#2FD27A" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}
