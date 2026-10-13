import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_AZ,
  DEFAULT_POLAR,
  targetAzimuth,
  useCameraStore,
} from "@/stores/cameraStore";
import { useEditorStore } from "@/stores/editorStore";
import type { PropertyLayout } from "@/types/world";
import { houseBounds } from "@/world/layoutGeometry";

const SWIPE_RAD_PER_PX = 0.006;
const TILT_RAD_PER_PX = 0.003; // vertical drag: finger down = look more from above, finger up = lower angle

/**
 * Fixed-elevation three-quarter camera around the house centre. Same default direction and elevation for every home; only the
 * distance adapts (to the house plus its carport, and to the viewport). Horizontal swipe/drag rotates within +-90 degrees of
 * the button-selected orientation; a vertical drag (or the mouse wheel) tilts the camera between POLAR_MIN and POLAR_MAX
 * (cameraStore) around a fixed look-at point: the view never slides. Orientation and tilt live in cameraStore; this component only follows them.
 */
export function CameraRig({
  layout,
  ready = true,
}: {
  layout: PropertyLayout;
  ready?: boolean;
}) {
  const { camera, size, gl } = useThree();
  const cur = useRef(DEFAULT_AZ);
  const curPolar = useRef(DEFAULT_POLAR);
  const aspect = size.width / Math.max(size.height, 1);
  // MVP framing, applied to every home: distance grows with the house side, pulled back a little on portrait screens.
  // Only the house is framed and centred; the parking pad is separate and may run off screen.
  const { tx, ty, tz, fit } = useMemo(() => {
    const h = houseBounds(layout),
      span = Math.max(h.w, h.d) + 3.2; // fixed margin, so every home is framed alike
    return {
      tx: h.cx,
      ty: layout.wallHeight * 0.3,
      tz: h.cz,
      fit: (span * 1.15 + 3.2) * (aspect < 1 ? 1 + (1 - aspect) * 2.1 : 1),
    };
  }, [layout, aspect]);

  // New home: back to the default orientation, instantly.
  useEffect(() => {
    useCameraStore.getState().reset();
    cur.current = DEFAULT_AZ;
    curPolar.current = DEFAULT_POLAR;
    useEditorStore.getState().setCameraPolar(DEFAULT_POLAR);
  }, [layout.id]);

  // Horizontal drag rotates, vertical drag tilts (one pointer); pinch / ctrl+wheel zoom.
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) pinch = dist();
    };
    const dist = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y) || 1;
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!ready || useEditorStore.getState().dragging) return;
      if (pts.size === 1) {
        useCameraStore.getState().swipe(-dx * SWIPE_RAD_PER_PX);
        useCameraStore.getState().tiltBy(-dy * TILT_RAD_PER_PX);
      } else if (pts.size === 2) {
        const d = dist();
        useCameraStore
          .getState()
          .setZoom(useCameraStore.getState().zoom * (pinch / d));
        pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
    };
    
  // Mouse wheel zooms; vertical drag still controls camera tilt.
  const wheel = (e: WheelEvent) => {
    if (!ready || useEditorStore.getState().dragging) return;

    e.preventDefault();

    const c = useCameraStore.getState();

    // Exponential scaling gives smooth, consistent zoom in both directions.
    const factor = Math.exp(e.deltaY * 0.001);
    c.setZoom(c.zoom * factor);
  };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, ready]);

  useFrame((_, dt) => {
    const st = useCameraStore.getState(),
      goal = targetAzimuth(st);
    const diff = goal - cur.current;
    // short eased turn; snaps exactly onto the goal so a button press always ends precisely on a 90-degree side
    cur.current =
      Math.abs(diff) < 1e-4
        ? goal
        : cur.current + diff * (1 - Math.exp(-Math.min(dt, 0.1) * 10));
    // tilt eases like the turn does, so a drag never jerks
    curPolar.current +=
      (st.polar - curPolar.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
    const pol =
      Math.abs(st.polar - curPolar.current) < 1e-4
        ? st.polar
        : curPolar.current;
    curPolar.current = pol;
    const r = fit * st.zoom,
      sp = Math.sin(pol),
      a = cur.current;
    camera.position.set(
      tx + r * sp * Math.sin(a),
      ty + r * Math.cos(pol),
      tz + r * sp * Math.cos(a),
    );
    camera.lookAt(tx, ty, tz);
    const ed = useEditorStore.getState(),
      na = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(ed.cameraAzimuth - na) > 1e-3) ed.setCameraAzimuth(na);
    if (Math.abs(ed.cameraPolar - pol) > 1e-3) ed.setCameraPolar(pol);
  });
  return null;
}
