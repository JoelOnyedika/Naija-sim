import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Appearance } from '@/types/game';
import { Avatar } from './Avatar';

/** What part of the body the camera should frame. Customisation screens switch this as the player changes category. */
export type PreviewFocus = 'full' | 'upper' | 'head' | 'lower';
const FOCUS: Record<PreviewFocus, { y: number; h: number; w: number }> = {
  full: { y: 0.86, h: 1.95, w: 0.95 }, upper: { y: 1.15, h: 1.2, w: 0.9 }, head: { y: 1.5, h: 0.66, w: 0.66 }, lower: { y: 0.5, h: 1.1, w: 0.8 },
};
const FOV = 30;

/**
 * Frames the avatar from the container's real size, so the figure is centred and fully visible at any aspect ratio.
 * Drag to rotate, pinch/scroll to zoom. The first touch stops the idle spin and the automatic reframing.
 */
function Rig({ focus, spin }: { focus: PreviewFocus; spin: boolean }) {
  const { camera, size } = useThree();
  const ctl = useRef<OrbitControlsImpl>(null);
  const touched = useRef(false);
  const snap = useRef(true);
  useEffect(() => { touched.current = false; }, [focus]);
  // Easing is time-based (not per-frame), so a slow device still lands on the framing instead of crawling towards it.
  useFrame(({ clock }, dt) => {
    const c = ctl.current; if (!c) return;
    const k = snap.current ? 1 : 1 - Math.exp(-Math.min(dt, 0.5) * 9);
    const f = FOCUS[focus], aspect = size.width / Math.max(1, size.height), t = Math.tan(MathUtils.degToRad(FOV / 2));
    const want = Math.max(f.h / 2 / t, f.w / aspect / 2 / t);
    c.target.y += (f.y - c.target.y) * k;
    // Idle: a gentle sway around the front so the outfit is shown off without ever turning its back on the player.
    if (spin && !touched.current) c.setAzimuthalAngle(Math.sin(clock.getElapsedTime() * 0.7) * 0.55);
    if (!touched.current) {
      const off = camera.position.clone().sub(c.target), len = off.length();
      off.setLength(len + (want - len) * k);
      camera.position.copy(c.target).add(off);
    }
    c.minDistance = want * 0.55; c.maxDistance = want * 1.5;
    c.update();
    snap.current = false;
  });
  return (
    <OrbitControls ref={ctl} enablePan={false} enableDamping dampingFactor={0.1} rotateSpeed={0.8} zoomSpeed={0.7}
      minPolarAngle={1.2} maxPolarAngle={1.85} onStart={() => { touched.current = true; }} />
  );
}

/** Self-contained canvas with an orbitable avatar. */
export function AvatarPreview({ appearance, focus = 'full', spin = true }: { appearance: Appearance; focus?: PreviewFocus; spin?: boolean; speed?: number; zoom?: number }) {
  return (
    /* offsetSize: measure the layout box, not getBoundingClientRect, which includes ancestor transforms (the phone's open animation scales the app from 0.12x and left the canvas tiny in a corner). */
    <Canvas resize={{ scroll: false, offsetSize: true }} dpr={[1, 2]} camera={{ position: [0, 1.0, 4.2], fov: FOV, near: 0.1, far: 30 }} gl={{ alpha: true, antialias: true }} style={{ touchAction: 'none' }}>
      <hemisphereLight args={['#FFFFFF', '#8C8780', 1.5]} />
      <directionalLight position={[2, 3.5, 5]} intensity={2.0} color="#FFF4E0" />
      <directionalLight position={[-3, 1.5, 4]} intensity={1.1} color="#E6EEFF" />
      <directionalLight position={[-2, 3, -4]} intensity={0.8} color="#8FB4FF" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}><circleGeometry args={[0.42, 24]} /><meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} /></mesh>
      <Avatar appearance={appearance} />
      <Rig focus={focus} spin={spin} />
    </Canvas>
  );
}
