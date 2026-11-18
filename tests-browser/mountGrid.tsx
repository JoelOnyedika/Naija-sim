// TEST-ONLY helper: a grid of heads/bodies for overlap checks.
import { Canvas } from '@react-three/fiber';
import { createRoot, type Root } from 'react-dom/client';
import type { Appearance } from '@/types/game';
import { Avatar } from '@/three/avatar/Avatar';
let root: Root | null = null;
export function mountGrid(looks: Appearance[], cols: number, w = 1200, h = 700, y = 1.55, spacing = 0.5, dist = 3.2, ry = -0.5) {
  let d = document.getElementById('av'); if (!d) { d = document.createElement('div'); d.id = 'av'; document.body.appendChild(d); }
  d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:#3a3748`;
  root?.unmount(); root = createRoot(d);
  const rows = Math.ceil(looks.length / cols);
  root.render(
    <Canvas camera={{ position: [0, y, dist], fov: 30, near: 0.05, far: 50 }} onCreated={({ camera }) => camera.lookAt(0, y, 0)} gl={{ preserveDrawingBuffer: true }}>
      <hemisphereLight args={['#fff4dc', '#8a7d88', 0.9]} /><directionalLight position={[2, 4, 4]} intensity={2.0} /><ambientLight intensity={0.3} />
      {looks.map((l, i) => <group key={i} position={[((i % cols) - (cols - 1) / 2) * spacing, (-Math.floor(i / cols) + (rows - 1) / 2) * (spacing * 1.1), 0]} rotation={[0, ry, 0]}><Avatar appearance={l} /></group>)}
    </Canvas>,
  );
}
