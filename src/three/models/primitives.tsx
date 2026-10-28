import { RoundedBox } from '@react-three/drei';
import { createContext, useContext } from 'react';

/** Set by the edit-mode ghost to tint a whole model green (valid) or red (invalid). */
export type Tint = 'valid' | 'invalid' | null;
export const TintContext = createContext<Tint>(null);

type V3 = [number, number, number];

interface MatProps {
  color: string;
  rough?: number;
  metal?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}

export function Mat({ color, rough = 0.7, metal = 0, emissive, emissiveIntensity = 1, opacity = 1 }: MatProps) {
  const tint = useContext(TintContext);
  if (tint) {
    return (
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        emissive={tint === 'valid' ? '#22c55e' : '#ef4444'}
        emissiveIntensity={0.6}
        transparent
        opacity={0.82}
      />
    );
  }
  return (
    <meshStandardMaterial
      color={color}
      roughness={rough}
      metalness={metal}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
      transparent={opacity < 1}
      opacity={opacity}
    />
  );
}

interface BoxProps extends MatProps {
  size: V3;
  pos?: V3;
  rot?: V3;
  radius?: number;
  shadow?: boolean;
}

/** Rounded box: the workhorse of every furniture model. */
export function B({ size, pos = [0, 0, 0], rot, radius = 0.02, shadow = true, ...mat }: BoxProps) {
  const r = Math.min(radius, Math.min(...size) / 2 - 0.001);
  // Thin or nearly square-edged parts are plain boxes (a rounded box has hundreds of triangles), and tiny parts do not cast
  // shadows (they cost a second draw call each and nobody can see their shadow). Big bodies keep their soft rounded look.
  const plain = Math.min(...size) < 0.1 || radius <= 0.012, cast = shadow && Math.max(...size) >= 0.45;
  if (plain) return <mesh position={pos} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={size} /><Mat {...mat} /></mesh>;
  return (
    <RoundedBox args={size} radius={Math.max(r, 0.002)} smoothness={2} position={pos} rotation={rot} castShadow={cast} receiveShadow>
      <Mat {...mat} />
    </RoundedBox>
  );
}

interface CylProps extends MatProps {
  r: number;
  r2?: number;
  h: number;
  pos?: V3;
  rot?: V3;
  seg?: number;
}

export function Cyl({ r, r2, h, pos = [0, 0, 0], rot, seg = 24, ...mat }: CylProps) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
      <Mat {...mat} />
    </mesh>
  );
}

interface SphProps extends MatProps {
  r: number;
  pos?: V3;
  scale?: V3;
}

export function Sph({ r, pos = [0, 0, 0], scale, ...mat }: SphProps) {
  return (
    <mesh position={pos} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[r, 20, 16]} />
      <Mat {...mat} />
    </mesh>
  );
}
