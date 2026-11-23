// TEST-ONLY helper: one character, camera orbit by yaw, for 360-degree contact sheets.
import { Canvas } from '@react-three/fiber';
import { createRoot, type Root } from 'react-dom/client';
import { useState, useEffect } from 'react';
import type { Appearance } from '@/types/game';
import { Avatar } from '@/three/avatar/Avatar';

let root: Root | null = null;
function Scene({ look, focusY, dist, motion, fx }: { look: Appearance; focusY: number; dist: number; fx: number; motion?: { moving?: boolean; speed?: number; action?: string } }) {
  const [yaw, setYaw] = useState(0);
  useEffect(() => { (window as unknown as { setYaw: (y: number) => void }).setYaw = setYaw; }, []);
  return (
    <Canvas camera={{ position: [fx, focusY + dist * 0.08, dist], fov: 30, near: 0.05, far: 50 }} onCreated={({ camera }) => camera.lookAt(fx, focusY, 0)} gl={{ preserveDrawingBuffer: true }}>
      <hemisphereLight args={['#fff4dc', '#8a7d88', 0.9]} /><directionalLight position={[2, 4, 4]} intensity={2.0} /><directionalLight position={[-3, 2, -3]} intensity={1.0} color="#9fb4ff" /><directionalLight position={[0, 2, -4]} intensity={0.8} /><ambientLight intensity={0.3} />
      <group rotation={[0, yaw, 0]}><Avatar appearance={look} motion={motion ? { current: { moving: !!motion.moving, lying: false, sitting: false, action: motion.action as never, speed: motion.speed } } : undefined} /></group>
    </Canvas>
  );
}
export function mountShot(look: Appearance, focusY = 0.9, dist = 3.6, w = 380, h = 560, motion?: { moving?: boolean; speed?: number; action?: string }, fx = 0) {
  let d = document.getElementById('av'); if (!d) { d = document.createElement('div'); d.id = 'av'; document.body.appendChild(d); }
  d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:linear-gradient(135deg,#4a4660,#2a2535 60%,#5a3a28)`;
  root?.unmount(); root = createRoot(d);
  root.render(<Scene look={look} focusY={focusY} dist={dist} motion={motion} fx={fx} />);
}
