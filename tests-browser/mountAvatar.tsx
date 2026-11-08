// TEST-ONLY helper (the game never imports this): shows characters in a bare 3D view for screenshots.
import { Canvas } from '@react-three/fiber';
import { createRoot, type Root } from 'react-dom/client';
import type { Appearance } from '@/types/game';
import { Avatar } from '@/three/avatar/Avatar';

let root: Root | null = null;
export function mountAvatars(looks: Appearance[], focus: 'full' | 'head' = 'full', w = 760, h = 420) {
  let d = document.getElementById('av'); if (!d) { d = document.createElement('div'); d.id = 'av'; document.body.appendChild(d); }
  d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:linear-gradient(135deg,#4a4660,#2a2535 60%,#5a3a28)`;
  root?.unmount(); root = createRoot(d);
  const n = looks.length, camY = focus === 'head' ? 1.55 : 0.95, dist = focus === 'head' ? 1.0 : 3.6;
  root.render(
    <Canvas camera={{ position: [0, camY + 0.1, dist], fov: 30, near: 0.05, far: 50 }} onCreated={({ camera }) => camera.lookAt(0, camY, 0)} gl={{ preserveDrawingBuffer: true }}>
      <hemisphereLight args={['#fff4dc', '#8a7d88', 0.8]} /><directionalLight position={[2, 4, 4]} intensity={2.0} /><directionalLight position={[-3, 2, 2]} intensity={0.6} color="#9fb4ff" /><ambientLight intensity={0.2} />
      {looks.map((l, i) => <group key={i} position={[(i - (n - 1) / 2) * (focus === 'head' ? 0 : 0.95), 0, 0]} rotation={[0, focus === 'head' ? 0.25 : -0.25 + i * 0.12, 0]}><Avatar appearance={l} /></group>)}
    </Canvas>,
  );
}
