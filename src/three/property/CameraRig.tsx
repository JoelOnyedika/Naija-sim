import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useEditorStore } from '@/stores/editorStore';
import type { PropertyLayout } from '@/types/world';
import { plotCenter } from '@/world/layoutGeometry';

const AZ = 0.55, POLAR = 0.95;

/** Fixed isometric-style camera framing the whole plot. Rotate slightly, zoom, and pan on big homes. */
export function CameraRig({ layout, ready = true }: { layout: PropertyLayout; ready?: boolean }) {
  const dragging = useEditorStore((s) => s.dragging);
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const c = plotCenter(layout);
  const aspect = size.width / Math.max(size.height, 1);
  const span = Math.max(c.w, c.d);
  const fit = (span * 1.0 + 2) * (aspect < 1 ? 1 + (1 - aspect) * 0.95 : 0.95);
  const tx = c.x, tz = c.z + 0.4, ty = 0.5;

  useEffect(() => {
    camera.position.set(tx + fit * Math.sin(POLAR) * Math.sin(AZ), ty + fit * Math.cos(POLAR), tz + fit * Math.sin(POLAR) * Math.cos(AZ));
    controls.current?.target.set(tx, ty, tz);
    controls.current?.update();
  }, [camera, fit, tx, tz]);

  return (
    <OrbitControls
      ref={controls} enabled={ready && !dragging} enablePan screenSpacePanning enableDamping dampingFactor={0.12}
      minAzimuthAngle={AZ - 0.3} maxAzimuthAngle={AZ + 0.3} minPolarAngle={POLAR - 0.22} maxPolarAngle={POLAR + 0.15}
      minDistance={fit * 0.35} maxDistance={fit * 1.12}
    />
  );
}
