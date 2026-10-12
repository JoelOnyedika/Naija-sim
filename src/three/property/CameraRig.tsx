import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_AZ, DEFAULT_POLAR, targetAzimuth, useCameraStore } from '@/stores/cameraStore';
import { useEditorStore } from '@/stores/editorStore';
import type { PropertyLayout } from '@/types/world';
import { carportBounds, houseBounds } from '@/world/layoutGeometry';

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
  // MVP framing, applied to every home: distance grows with the house side, tighter on big houses, pulled back a little on
  // portrait screens. Only the house (plus a sliver of the carport beside it) is framed, never the whole plot.
  const { tx, ty, tz, fit } = useMemo(() => {
    const h = houseBounds(layout), c = carportBounds(layout);
    const span = Math.max(h.w, h.d) + (c ? (c.x1 - c.x0) * 0.7 : 0);
    // aim a little toward the carport so the pad stays on screen; the turn still pivots around this one fixed point
    const bx = c ? ((c.x0 + c.x1) / 2 - h.cx) * 0.4 : 0, bz = c ? ((c.z0 + c.z1) / 2 - h.cz) * 0.4 : 0;
    return { tx: h.cx + bx, ty: layout.wallHeight * 0.3, tz: h.cz + bz, fit: (span * 1.15 + 3.2) * (aspect < 1 ? 1 + (1 - aspect) * 1.5 : 1) };
  }, [layout, aspect]);

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
    camera.position.set(tx + r * sp * Math.sin(a), ty + r * Math.cos(DEFAULT_POLAR), tz + r * sp * Math.cos(a));
    camera.lookAt(tx, ty, tz);
    const ed = useEditorStore.getState(), na = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(ed.cameraAzimuth - na) > 1e-3) ed.setCameraAzimuth(na);
  });
  return null;
}
