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

/** TEST-ONLY: poses and walking, side by side. Each item is {look, action?, moving?, speed?, sitting?}; a side-on camera so the gait is readable. */
export interface PoseItem { look: Appearance; action?: string; moving?: boolean; speed?: number; sitting?: boolean; yaw?: number }
export function mountPoses(items: PoseItem[], w = 1100, h = 640, spacing = 1.35, camDist = 4.6) {
  let d = document.getElementById('av'); if (!d) { d = document.createElement('div'); d.id = 'av'; document.body.appendChild(d); }
  d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:linear-gradient(135deg,#4a4660,#2a2535 60%,#5a3a28)`;
  root?.unmount(); root = createRoot(d);
  const n = items.length;
  root.render(
    <Canvas camera={{ position: [0, 1.25, camDist], fov: 30, near: 0.05, far: 50 }} onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)} gl={{ preserveDrawingBuffer: true }}>
      <hemisphereLight args={['#fff4dc', '#8a7d88', 0.8]} /><directionalLight position={[2, 4, 4]} intensity={2.0} /><directionalLight position={[-3, 2, 2]} intensity={0.6} color="#9fb4ff" /><ambientLight intensity={0.25} />
      {items.map((it, i) => (
        <group key={i} position={[(i - (n - 1) / 2) * spacing, 0, 0]} rotation={[0, it.yaw ?? Math.PI / 2 - 0.35, 0]}>
          <Avatar appearance={it.look} motion={{ current: { moving: !!it.moving, lying: false, sitting: !!it.sitting, action: it.action as never, speed: it.speed } }} />
        </group>
      ))}
    </Canvas>,
  );
}

/** TEST-ONLY: one look from several angles with a camera aimed at (0, focusY, 0) from `dist` m: for close-ups of hands, shoes, collars. */
export function mountClose(look: Appearance, yaws: number[], focusY: number, dist: number, w = 1000, h = 520, motion?: { moving?: boolean; speed?: number; action?: string }) {
  let d = document.getElementById('av'); if (!d) { d = document.createElement('div'); d.id = 'av'; document.body.appendChild(d); }
  d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:linear-gradient(135deg,#4a4660,#2a2535 60%,#5a3a28)`;
  root?.unmount(); root = createRoot(d);
  const n = yaws.length, sp = Math.min(dist * 0.62, 0.95 + dist * 0.12);
  root.render(
    <Canvas camera={{ position: [0, focusY + dist * 0.12, dist], fov: 30, near: 0.05, far: 50 }} onCreated={({ camera }) => camera.lookAt(0, focusY, 0)} gl={{ preserveDrawingBuffer: true }}>
      <hemisphereLight args={['#fff4dc', '#8a7d88', 0.9]} /><directionalLight position={[2, 4, 4]} intensity={2.0} /><directionalLight position={[-3, 2, 2]} intensity={0.6} color="#9fb4ff" /><ambientLight intensity={0.25} />
      {yaws.map((y, i) => <group key={i} position={[(i - (n - 1) / 2) * sp, 0, 0]} rotation={[0, y, 0]}><Avatar appearance={look} held={motion?.action === 'rifle' ? 'ak47' : null} cargo={(motion as { cargo?: 'oranges' | 'bread' | 'water' } | undefined)?.cargo ?? null} motion={motion ? { current: { moving: !!motion.moving, lying: false, sitting: false, action: motion.action as never, speed: motion.speed } } : undefined} /></group>)}
    </Canvas>,
  );
}
