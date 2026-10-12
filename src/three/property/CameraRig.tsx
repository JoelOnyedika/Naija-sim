import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { DEFAULT_AZ, DEFAULT_POLAR, targetAzimuth, useCameraStore } from '@/stores/cameraStore';
import { useEditorStore } from '@/stores/editorStore';
import type { PropertyLayout } from '@/types/world';
import { houseBounds } from '@/world/layoutGeometry';

const SWIPE_RAD_PER_PX = 0.006;

/**
 * Fixed-elevation three-quarter camera around the house centre. Same direction and elevation for every home; only the
 * distance adapts (to the house plus its carport, and to the viewport). Horizontal swipe/drag rotates within +-90 degrees of
 * the button-selected orientation; vertical input does nothing. Orientation lives in cameraStore; this component only follows it.
 */
export function CameraRig({ layout, ready = true }: { layout: PropertyLayout; ready?: boolean }) {
  const { camera, size, gl } = useThree();
  const cur = useRef(DEFAULT_AZ);
  const aspect = size.width / Math.max(size.height, 1);
  const { tx, tz, fit } = useMemo(() => {
    const h = houseBounds(layout), p = layout.plot;
    // bounding circle around the house centre that contains the whole plot (house + carport), so every angle stays in frame
    const radius = Math.max(...[[p.x0, p.z0], [p.x1, p.z0], [p.x0, p.z1], [p.x1, p.z1]].map(([x, z]) => Math.hypot(x - h.cx, z - h.cz)));
    const vHalf = ((camera as PerspectiveCamera).fov * Math.PI) / 360;
    const half = Math.min(vHalf, Math.atan(Math.tan(vHalf) * aspect));
    return { tx: h.cx, tz: h.cz, fit: (radius * 1.12) / Math.tan(half) + 1 };
  }, [layout, aspect, camera]);

  // New home: back to the default orientation, instantly.
  useEffect(() => {
    useCameraStore.getState().reset();
    cur.current = DEFAULT_AZ;
    useEditorStore.getState().setCameraPolar(DEFAULT_POLAR);
  }, [layout.id]);

  // Horizontal drag / swipe (one pointer) and pinch / wheel zoom. Vertical movement is ignored on purpose.
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinch = dist(); };
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY;
      if (!ready || useEditorStore.getState().dragging) return;
      if (pts.size === 1) useCameraStore.getState().swipe(-dx * SWIPE_RAD_PER_PX);
      else if (pts.size === 2) { const d = dist(); useCameraStore.getState().setZoom(useCameraStore.getState().zoom * (pinch / d)); pinch = d; }
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; };
    const wheel = (e: WheelEvent) => { if (!ready) return; e.preventDefault(); useCameraStore.getState().setZoom(useCameraStore.getState().zoom * (1 + e.deltaY * 0.001)); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }, [gl, ready]);

  useFrame((_, dt) => {
    const st = useCameraStore.getState(), goal = targetAzimuth(st);
    const diff = goal - cur.current;
    // short eased turn; snaps exactly onto the goal so a button press always ends precisely on a 90-degree side
    cur.current = Math.abs(diff) < 1e-4 ? goal : cur.current + diff * (1 - Math.exp(-Math.min(dt, 0.1) * 10));
    const r = fit * st.zoom, sp = Math.sin(DEFAULT_POLAR), a = cur.current;
    camera.position.set(tx + r * sp * Math.sin(a), 0.5 + r * Math.cos(DEFAULT_POLAR), tz + r * sp * Math.cos(a));
    camera.lookAt(tx, 0.5, tz);
    const ed = useEditorStore.getState(), na = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(ed.cameraAzimuth - na) > 1e-3) ed.setCameraAzimuth(na);
  });
  return null;
}
