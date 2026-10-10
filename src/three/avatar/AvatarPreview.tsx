import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { Appearance } from '@/types/game';
import { Avatar } from './Avatar';

function Turntable({ a, speed = 0.5 }: { a: Appearance; speed?: number }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * speed; });
  return <group ref={g} position={[0, -0.9, 0]} scale={1.15}><Avatar appearance={a} /></group>;
}

/** Small self-contained canvas with a slowly rotating avatar. */
export function AvatarPreview({ appearance, speed, zoom = 1 }: { appearance: Appearance; speed?: number; zoom?: number }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.25, 3.1 / zoom], fov: 32 }} gl={{ alpha: true, antialias: true }}>
      <hemisphereLight args={['#FFF4DC', '#7A6A55', 1.0]} />
      <directionalLight position={[3, 5, 4]} intensity={2} color="#FFF1D6" />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#7FE3B0" />
      <Turntable a={appearance} speed={speed} />
    </Canvas>
  );
}
