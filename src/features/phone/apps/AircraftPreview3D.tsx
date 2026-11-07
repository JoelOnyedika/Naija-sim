import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { AircraftDef, Livery } from '@/data/aircraft';
import { AircraftModel } from '@/three/models/aircraft';

/** The paint shop's 3D view: the aircraft on a slow turntable that stops when you drag it. Its own small canvas. */
export default function AircraftPreview3D({ def, livery }: { def: AircraftDef; livery: Livery }) {
  const big = def.kind === 'jet';
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [7.5, 4.2, 8.5], fov: 34, near: 0.1, far: 80 }} gl={{ antialias: true }}>
      <hemisphereLight args={['#fff4dc', '#8a8f9a', 0.95]} /><directionalLight position={[6, 10, 7]} intensity={1.7} /><directionalLight position={[-6, 4, -5]} intensity={0.5} color="#bcd4ff" /><ambientLight intensity={0.2} />
      <group position={[0, -0.9, 0]} scale={big ? 0.86 : 1}><AircraftModel def={def} livery={livery} /></group>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={2.2} target={[0, 1.1, 0]} minPolarAngle={0.5} maxPolarAngle={1.55} />
    </Canvas>
  );
}
