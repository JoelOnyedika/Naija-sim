import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useEditorStore } from '@/stores/editorStore';
import type { PropertyLayout } from '@/types/world';
import { plotCenter } from '@/world/layoutGeometry';

const AZ = 0.55;

/**
 * Orbit camera around the plot. Full 360° rotation, a polar range that never goes under the floor or edge-on,
 * zoom limits relative to the plot size, and pan clamped to the plot so the house can't be lost off-screen.
 */
export function CameraRig({ layout, ready = true }: { layout: PropertyLayout; ready?: boolean }) {
  const dragging = useEditorStore((s) => s.dragging);
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const c = plotCenter(layout);
  const aspect = size.width / Math.max(size.height, 1);
  const span = Math.max(c.w, c.d);
  // Fit the plot's bounding circle (so any orbit angle still shows all of it) into the narrower of the two view angles.
  const vHalf = ((camera as PerspectiveCamera).fov * Math.PI) / 360;
  const half = Math.min(vHalf, Math.atan(Math.tan(vHalf) * aspect));
  const radius = Math.hypot(c.w, c.d) / 2;
  const fit = (radius * 1.08) / Math.tan(half) + 1;
  const tx = c.x, tz = c.z + 0.4, ty = 0.5;

  const POLAR = aspect < 0.8 ? 0.72 : 0.95; // portrait phones: look more from above to use the height
  useEffect(() => {
    camera.position.set(tx + fit * Math.sin(POLAR) * Math.sin(AZ), ty + fit * Math.cos(POLAR), tz + fit * Math.sin(POLAR) * Math.cos(AZ));
    controls.current?.target.set(tx, ty, tz);
    controls.current?.update();
    useEditorStore.getState().setCameraAzimuth(AZ);
    useEditorStore.getState().setCameraPolar(POLAR);
  }, [camera, fit, tx, tz, POLAR]);

  const onChange = useCallback(() => {
    const ctl = controls.current; if (!ctl) return;
    const lim = span * 0.5;
    ctl.target.x = Math.min(tx + lim, Math.max(tx - lim, ctl.target.x));
    ctl.target.z = Math.min(tz + lim, Math.max(tz - lim, ctl.target.z));
    ctl.target.y = ty;
    useEditorStore.getState().setCameraAzimuth(ctl.getAzimuthalAngle());
    useEditorStore.getState().setCameraPolar(ctl.getPolarAngle());
  }, [span, tx, tz]);

  return (
    <OrbitControls
      ref={controls} enabled={ready && !dragging} enablePan screenSpacePanning enableDamping dampingFactor={0.12} onChange={onChange}
      rotateSpeed={0.7} minPolarAngle={0.35} maxPolarAngle={1.3}
      minDistance={Math.max(4, fit * 0.3)} maxDistance={fit * 1.25}
    />
  );
}
