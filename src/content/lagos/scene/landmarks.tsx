import { useFrame } from '@react-three/fiber';
import { useRef, type ComponentType } from 'react';
import type { Group } from 'three';
import { AdditiveBlending } from 'three';
import { B, Cyl, Sph } from '@/three/models/primitives';
import { DecorItem } from '@/three/property/Decor';

/** Lagos landmark models, keyed by LandmarkDefinition.modelId. ~3 world units wide. */

function Quilox() {
  const beams = useRef<Group>(null);
  useFrame((_, dt) => { if (beams.current) beams.current.rotation.y += dt * 0.9; });
  return (
    <group>
      <B size={[2.4, 1.3, 1.9]} pos={[0, 0.65, 0]} color="#16181F" rough={0.4} metal={0.3} radius={0.1} />
      <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#19C3A6" emissive="#19C3A6" emissiveIntensity={0.5} transparent opacity={0.7} roughness={0.1} /></mesh>
      <B size={[1.6, 0.34, 0.06]} pos={[0, 1.05, 0.98]} color="#FF4D6D" emissive="#FF2D75" emissiveIntensity={1.8} radius={0.03} shadow={false} />
      <B size={[2.5, 0.05, 0.05]} pos={[0, 0.25, 0.98]} color="#19C3A6" emissive="#19C3A6" emissiveIntensity={1.6} shadow={false} />
      {[-0.8, 0, 0.8].map((x) => <B key={x} size={[0.5, 0.55, 0.04]} pos={[x, 0.55, 0.96]} color="#2B4C7E" emissive="#7FB5FF" emissiveIntensity={0.35} shadow={false} />)}
      <group ref={beams} position={[0, 1.6, 0]}>
        {[0, Math.PI].map((r) => (
          <mesh key={r} position={[Math.sin(r) * 0.7, 0.7, Math.cos(r) * 0.7]} rotation={[0.5 * Math.cos(r), 0, -0.5 * Math.sin(r)]}>
            <coneGeometry args={[0.35, 2.2, 12, 1, true]} /><meshBasicMaterial color="#FFEFA8" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Balogun() {
  const cols = ['#E4572E', '#FFC21A', '#2B8FD2', '#0B8F4D', '#FF4D6D', '#8A63D2'];
  return (
    <group>
      <B size={[3.2, 0.1, 3.0]} pos={[0, 0.05, 0]} color="#8D8576" rough={1} radius={0.02} />
      {Array.from({ length: 9 }, (_, i) => {
        const x = (i % 3 - 1) * 0.95, z = (Math.floor(i / 3) - 1) * 0.9;
        return (
          <group key={i} position={[x, 0, z]}>
            <B size={[0.7, 0.4, 0.55]} pos={[0, 0.3, 0]} color="#D9D3C4" rough={0.9} radius={0.02} />
            <B size={[0.85, 0.07, 0.7]} pos={[0, 0.78, 0]} rot={[0.15, 0, 0]} color={cols[i % cols.length]} rough={0.9} radius={0.01} />
            <B size={[0.04, 0.55, 0.04]} pos={[-0.38, 0.5, 0.28]} color="#5A4A38" shadow={false} /><B size={[0.04, 0.55, 0.04]} pos={[0.38, 0.5, 0.28]} color="#5A4A38" shadow={false} />
          </group>
        );
      })}
      {Array.from({ length: 14 }, (_, i) => <Sph key={i} r={0.06} pos={[Math.sin(i * 2.4) * 1.3, 0.15, Math.cos(i * 1.9) * 1.2]} color={cols[(i * 3) % cols.length]} />)}
      <B size={[3.2, 0.03, 0.03]} pos={[0, 1.15, 0]} color="#FFFFFF" shadow={false} />
    </group>
  );
}

function FreedomPark() {
  return (
    <group>
      <Cyl r={2.1} h={0.1} pos={[0, 0.05, 0]} color="#5E9A52" rough={1} seg={32} />
      {[-0.9, 0, 0.9].map((x) => (
        <group key={x} position={[x, 0, -1.2]}>
          <B size={[0.18, 1.1, 0.18]} pos={[-0.35, 0.65, 0]} color="#F2EDE0" rough={0.8} /><B size={[0.18, 1.1, 0.18]} pos={[0.35, 0.65, 0]} color="#F2EDE0" rough={0.8} />
          <B size={[0.9, 0.18, 0.22]} pos={[0, 1.25, 0]} color="#F2EDE0" rough={0.8} radius={0.05} />
        </group>
      ))}
      <group position={[0.6, 0, 0.5]}>
        <Cyl r={0.04} h={1.3} pos={[0, 0.7, 0]} color="#FFC21A" metal={0.6} seg={8} />
        <Sph r={0.22} pos={[0, 1.45, 0]} color="#FF4D6D" metal={0.4} rough={0.3} />
        <Sph r={0.14} pos={[0.2, 1.1, 0.1]} color="#19C3A6" metal={0.4} rough={0.3} />
        <Sph r={0.12} pos={[-0.2, 0.9, -0.1]} color="#8A63D2" metal={0.4} rough={0.3} />
      </group>
      {[[-1.4, 0.6], [1.5, 0.9], [-0.8, 1.4]].map(([x, z], i) => <DecorItem key={i} d={{ kind: 'tree', x, z, scale: 0.55 }} />)}
    </group>
  );
}

function NationalTheatre() {
  return (
    <group>
      <Cyl r={1.1} r2={1.0} h={0.9} pos={[0, 0.45, 0]} color="#C9C4B6" rough={0.9} seg={32} />
      <Cyl r={0.8} r2={1.9} h={0.9} pos={[0, 1.35, 0]} color="#E7E1D2" rough={0.8} seg={32} />
      <Cyl r={1.9} r2={1.5} h={0.15} pos={[0, 1.88, 0]} color="#D8D2C2" rough={0.8} seg={32} />
      <B size={[2.8, 0.5, 0.9]} pos={[0, 0.25, 1.4]} color="#B9B2A2" rough={0.9} radius={0.05} />
      <Sph r={0.6} pos={[0, 2.05, 0]} scale={[1, 0.4, 1]} color="#8FA6A0" rough={0.7} />
    </group>
  );
}

function EkoAtlantic() {
  const towers: [number, number, number, number, number][] = [[-1.2, 0.4, 0.8, 3.4, 0.8], [-0.2, -0.3, 0.9, 4.6, 0.9], [0.9, 0.2, 0.8, 3.8, 0.8], [1.8, -0.4, 0.7, 2.8, 0.7], [-1.9, -0.5, 0.6, 2.2, 0.6]];
  return (
    <group>
      {towers.map(([x, z, w, h, d], i) => (
        <group key={i} position={[x, 0, z]}>
          <B size={[w, h, d]} pos={[0, h / 2, 0]} color="#7FC6D9" metal={0.7} rough={0.1} radius={0.04} emissive="#3AA8C1" emissiveIntensity={0.18} />
          <B size={[w + 0.04, 0.05, d + 0.04]} pos={[0, h + 0.03, 0]} color="#E7F3F6" rough={0.4} />
          {i === 1 && <Cyl r={0.025} h={0.8} pos={[0, h + 0.4, 0]} color="#FF4D6D" emissive="#FF4D6D" emissiveIntensity={1.2} seg={6} />}
        </group>
      ))}
    </group>
  );
}

function ComputerVillage() {
  const cols = ['#2B8FD2', '#FF4D6D', '#FFC21A', '#19C3A6', '#8A63D2'];
  return (
    <group>
      <B size={[3.0, 0.08, 2.6]} pos={[0, 0.04, 0]} color="#8D8576" rough={1} radius={0.02} />
      {Array.from({ length: 8 }, (_, i) => {
        const x = (i % 4 - 1.5) * 0.72, z = (Math.floor(i / 4) - 0.5) * 1.2;
        return (
          <group key={i} position={[x, 0, z]}>
            <B size={[0.62, 0.6 + (i % 3) * 0.15, 0.8]} pos={[0, 0.35, 0]} color="#E7E1D2" rough={0.9} radius={0.02} />
            <B size={[0.62, 0.14, 0.04]} pos={[0, 0.7 + (i % 3) * 0.15, 0.42]} color={cols[i % 5]} emissive={cols[i % 5]} emissiveIntensity={0.6} shadow={false} />
            <Cyl r={0.22} r2={0.01} h={0.18} pos={[0.1, 0.45, 0.65]} color={cols[(i + 2) % 5]} rough={0.9} seg={10} />
          </group>
        );
      })}
    </group>
  );
}

function MamaPut() {
  return (
    <group>
      <B size={[1.5, 0.8, 1.1]} pos={[0, 0.4, -0.3]} color="#D9C79A" rough={0.9} radius={0.03} />
      <B size={[1.8, 0.06, 1.5]} pos={[0, 0.9, -0.15]} rot={[0.12, 0, 0]} color="#9CA3A5" metal={0.5} rough={0.5} radius={0.01} />
      <B size={[0.9, 0.2, 0.04]} pos={[0, 0.7, 0.28]} color="#E4572E" emissive="#E4572E" emissiveIntensity={0.4} shadow={false} />
      {[[-0.7, 0.9], [0, 1.1], [0.7, 0.9]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Cyl r={0.2} h={0.03} pos={[0, 0.42, 0]} color="#FFC21A" seg={14} /><Cyl r={0.02} h={0.4} pos={[0, 0.2, 0]} color="#555" seg={6} />
          {[-0.28, 0.28].map((cx) => <B key={cx} size={[0.16, 0.2, 0.16]} pos={[cx, 0.15, 0]} color="#F4F1EA" rough={0.4} radius={0.03} />)}
        </group>
      ))}
    </group>
  );
}

function Bank() {
  return (
    <group>
      <B size={[2.4, 0.18, 1.7]} pos={[0, 0.09, 0]} color="#E7E1D2" rough={0.8} radius={0.02} />
      <B size={[2.0, 1.0, 1.2]} pos={[0, 0.68, -0.15]} color="#F2EDE0" rough={0.7} radius={0.02} />
      {[-0.75, -0.25, 0.25, 0.75].map((x) => <Cyl key={x} r={0.09} h={1.0} pos={[x, 0.68, 0.55]} color="#FFFFFF" rough={0.6} seg={14} />)}
      <B size={[2.2, 0.14, 1.4]} pos={[0, 1.25, 0.0]} color="#0B8F4D" rough={0.6} radius={0.02} />
      <mesh position={[0, 1.5, 0.3]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.7, 0.4, 3]} /><meshStandardMaterial color="#0B8F4D" roughness={0.6} /></mesh>
    </group>
  );
}

function Beach() {
  return (
    <group>
      <Cyl r={2.3} h={0.1} pos={[0, 0.05, 0]} color="#EAD7A6" rough={1} seg={32} />
      <DecorItem d={{ kind: 'palm', x: -1.0, z: -0.4, scale: 0.55 }} />
      <DecorItem d={{ kind: 'palm', x: 0.9, z: 0.2, scale: 0.5 }} />
      {[[-0.3, 0.9, '#FF4D6D'], [0.6, 1.1, '#FFC21A'], [1.3, 0.7, '#19C3A6']].map(([x, z, c], i) => (
        <group key={i} position={[x as number, 0, z as number]}>
          <Cyl r={0.015} h={0.7} pos={[0, 0.35, 0]} color="#F4F1EA" seg={6} />
          <mesh position={[0, 0.72, 0]}><coneGeometry args={[0.36, 0.2, 8]} /><meshStandardMaterial color={c as string} roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
}

import { LANDMARK_MODELS_2 } from './landmarks2';

export const LANDMARK_MODELS: Record<string, ComponentType> = {
  ...LANDMARK_MODELS_2,
  quilox: Quilox, balogun: Balogun, freedomPark: FreedomPark, nationalTheatre: NationalTheatre, ekoAtlantic: EkoAtlantic,
  computerVillage: ComputerVillage, mamaPut: MamaPut, bank: Bank, beach: Beach,
};
