import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CLOSE, DEFAULT_AZ, DEFAULT_POLAR, targetAzimuth, useCameraStore } from '@/stores/cameraStore';
import { useViewStore } from '@/stores/viewStore';
import { livePlayer } from '@/world/npcLive';
import { clampToBounds } from '@/world/cameraShots';
import { PLACE_FOCUS } from '@/data/balance';
import { useInteriorStore } from '@/stores/interiorStore';
import { useEditorStore } from '@/stores/editorStore';
import type { PropertyLayout } from '@/types/world';
import { houseBounds } from '@/world/layoutGeometry';

const SWIPE_RAD_PER_PX = 0.006;
const TILT_RAD_PER_PX = 0.003; // vertical drag: finger down = look more from above, finger up = lower angle

/**
 * Fixed-elevation three-quarter camera around the house centre. Same default direction and elevation for every home; only the
 * distance adapts (to the house plus its carport, and to the viewport). Horizontal swipe/drag rotates within +-90 degrees of
 * the button-selected orientation; a vertical drag (or the mouse wheel) tilts the camera between POLAR_MIN and POLAR_MAX
 * (cameraStore) around a fixed look-at point: the view never slides. Orientation, tilt, zoom and slide (pan) live in cameraStore; this component only follows them.
 */
export function CameraRig({ layout, ready = true }: { layout: PropertyLayout; ready?: boolean }) {
  const { camera, size, gl } = useThree();
  const cur = useRef(DEFAULT_AZ);
  const curPolar = useRef(DEFAULT_POLAR);
  const lastFocus = useRef<import('@/stores/cameraStore').CameraFocus | null>(null);
  const curPan = useRef<[number, number]>([0, 0]);
  const panLimit = useRef(10);
  const blend = useRef(0); // 0 = normal view, 1 = fully focused on the placed item
  const inVenue = useInteriorStore((st) => !!st.current);
  const closeBlend = useRef(0), cineBlend = useRef(0), baseFov = useRef(38), smLook = useRef<[number, number, number] | null>(null), lastShot = useRef<import('@/world/cameraShots').Shot | null>(null);
  const aspect = size.width / Math.max(size.height, 1);
  // MVP framing, applied to every home: distance grows with the house side, pulled back a little on portrait screens.
  // Only the house is framed and centred; the parking pad is separate and may run off screen.
  const { tx, ty, tz, fit } = useMemo(() => {
    const h = houseBounds(layout), span = Math.max(h.w, h.d) + 3.2; // fixed margin, so every home is framed alike
    // public venues are wider than homes and viewed corner-on, so frame their diagonal as well (homes stay exactly as before)
    const venueSpan = inVenue ? (h.w + h.d) * 0.74 + 3.0 : 0;
    return { tx: h.cx, ty: layout.wallHeight * 0.3, tz: h.cz, fit: (Math.max(span, venueSpan) * 1.15 + 3.2) * (aspect < 1 ? 1 + (1 - aspect) * 2.1 : 1) };
  }, [layout, aspect, inVenue]);

  panLimit.current = fit * 0.75; // how far the view may slide from the house: about three quarters of the framing distance

  // New home: back to the default orientation, instantly.
  useEffect(() => {
    useCameraStore.getState().reset();
    cur.current = DEFAULT_AZ;
    curPolar.current = DEFAULT_POLAR;
    curPan.current = [0, 0];
    useEditorStore.getState().setCameraPolar(DEFAULT_POLAR);
  }, [layout.id]);

  // One finger / left mouse button: horizontal drag rotates, vertical drag tilts.
  // Two fingers: pinch zooms and dragging both slides the view (like moving a zoomed map).
  // Mouse: right button, middle button or Shift + left button slides the view; the wheel zooms (Shift + wheel tilts).
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    type Pt = { x: number; y: number; pan: boolean };
    const pts = new Map<number, Pt>();
    let pinch = 0;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    const mid = () => { const [a, b] = [...pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
    /** Slide the view so the scene follows the finger / cursor by (dx, dy) screen pixels. */
    const slide = (dx: number, dy: number) => {
      const c = camera as import('three').PerspectiveCamera, st = useCameraStore.getState();
      const dist3 = fit * st.zoom, unit = (2 * dist3 * Math.tan((c.fov * Math.PI) / 360)) / Math.max(size.height, 1); // metres per pixel at the look-at point
      const a = cur.current, rx = Math.cos(a), rz = -Math.sin(a), fx = -Math.sin(a), fz = -Math.cos(a), fore = unit / Math.max(0.35, Math.cos(curPolar.current)); // the ground is foreshortened going up the screen
      st.panBy(-dx * unit * rx + dy * fore * fx, -dx * unit * rz + dy * fore * fz, panLimit.current);
    };
    const down = (e: PointerEvent) => {
      useCameraStore.getState().clearFocus();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, pan: e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || e.shiftKey) });
      if (pts.size === 2) pinch = dist();
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const before = pts.size === 2 ? mid() : null;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (!ready || useEditorStore.getState().dragging) return;
      if (pts.size === 1) {
        if (p.pan) slide(dx, dy);
        else { useCameraStore.getState().swipe(-dx * SWIPE_RAD_PER_PX); useCameraStore.getState().tiltBy(-dy * TILT_RAD_PER_PX); }
      } else if (pts.size === 2) {
        const d = dist(); useCameraStore.getState().setZoom(useCameraStore.getState().zoom * Math.pow(pinch / d, 1.35)); pinch = d;
        const after = mid(); if (before) slide(after.x - before.x, after.y - before.y);
      }
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; };
    const wheel = (e: WheelEvent) => {
      if (!ready) return; e.preventDefault(); useCameraStore.getState().clearFocus(); const c = useCameraStore.getState();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // line-based wheels report lines, not pixels
      if (e.shiftKey) c.tiltBy(dy * 0.0008); else c.setZoom(c.zoom * Math.exp(dy * (e.ctrlKey ? 0.01 : 0.0016)));
    };
    const menu = (e: Event) => e.preventDefault(); // right button is for sliding, not for the browser menu
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('contextmenu', menu);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); el.removeEventListener('contextmenu', menu); };
  }, [gl, ready, camera, size.height, fit]);

  useFrame((_, dt) => {
    const st = useCameraStore.getState(), goal = targetAzimuth(st);
    const diff = goal - cur.current;
    // short eased turn; snaps exactly onto the goal so a button press always ends precisely on a 90-degree side
    cur.current = Math.abs(diff) < 1e-4 ? goal : cur.current + diff * (1 - Math.exp(-Math.min(dt, 0.1) * 10));
    // tilt eases like the turn does, so a drag never jerks
    curPolar.current += (st.polar - curPolar.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
    const pol = Math.abs(st.polar - curPolar.current) < 1e-4 ? st.polar : curPolar.current;
    curPolar.current = pol;
    // Placement focus: ease toward the item, hold, then release on its own. Time-based, so slow devices behave the same.
    const fo = st.focus;
    if (fo && (Date.now() - fo.at) / 1000 > PLACE_FOCUS.holdSeconds) useCameraStore.getState().clearFocus();
    const want = useCameraStore.getState().focus ? 1 : 0;
    blend.current += (want - blend.current) * (1 - Math.exp(-Math.min(dt, 0.1) * PLACE_FOCUS.ease));
    if (Math.abs(want - blend.current) < 1e-3) blend.current = want;
    const bl = blend.current, fp = (fo ?? lastFocus.current)?.point;
    if (fo) lastFocus.current = fo;
    // slide: eased like the turn and tilt, and fades out while the camera is looking at a freshly placed item
    curPan.current[0] += (st.pan[0] - curPan.current[0]) * (1 - Math.exp(-Math.min(dt, 0.1) * 14)); curPan.current[1] += (st.pan[1] - curPan.current[1]) * (1 - Math.exp(-Math.min(dt, 0.1) * 14));
    const px = curPan.current[0] * (1 - bl), pz = curPan.current[1] * (1 - bl);
    let lx = (fp ? tx + (fp[0] - tx) * bl : tx) + px, ly = fp ? ty + (fp[1] - ty) * bl : ty, lz = (fp ? tz + (fp[2] - tz) * bl : tz) + pz;
    let r = fit * st.zoom * (1 - (1 - PLACE_FOCUS.zoomFactor) * bl), pol2 = pol;
    // ---- Close View: the same orbit, but around the player and much closer (elevated, never over-the-shoulder). The choice is remembered in viewStore.
    const wantClose = useViewStore.getState().view === 'close' && !useEditorStore.getState().dragging && livePlayer.set ? 1 : 0;
    closeBlend.current += (wantClose - closeBlend.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 4.5));
    if (Math.abs(wantClose - closeBlend.current) < 1e-3) closeBlend.current = wantClose;
    const cb = closeBlend.current;
    if (cb > 0) {
      const hb = houseBounds(layout), narrow = Math.min(hb.x1 - hb.x0, hb.z1 - hb.z0) < CLOSE.narrowBelow;
      const px2 = livePlayer.x, pz2 = livePlayer.z;
      if (!smLook.current) smLook.current = [px2, CLOSE.lookHeight, pz2];
      const k = 1 - Math.exp(-Math.min(dt, 0.1) * CLOSE.follow), sl = smLook.current; // smooth follow: the camera trails the player a little
      sl[0] += (px2 - sl[0]) * k; sl[2] += (pz2 - sl[2]) * k;
      const rc = Math.min(CLOSE.distance * (narrow ? 0.82 : 1), fit * 0.8) * Math.max(0.5, st.zoom);
      const polc = Math.min(CLOSE.polarMax, Math.max(CLOSE.polarMin, pol + (CLOSE.polar - DEFAULT_POLAR)));
      lx += (sl[0] - lx) * cb; ly += (sl[1] - ly) * cb; lz += (sl[2] - lz) * cb; r += (rc - r) * cb; pol2 += (polc - pol2) * cb;
    } else smLook.current = null;
    const sp = Math.sin(pol2), a = cur.current;
    let cx = lx + r * sp * Math.sin(a), cy = ly + r * Math.cos(pol2), cz = lz + r * sp * Math.cos(a);
    if (cb > 0) { const hb = houseBounds(layout); [cx, cy, cz] = clampToBounds([cx, cy, cz], { x0: hb.x0, z0: hb.z0, x1: hb.x1, z1: hb.z1 }, 2.2); } // never end up behind a wall or out in the street
    let fov = baseFov.current;
    // ---- Cinematic: a temporary scripted shot. It flies in, and flies back out when the scene ends (or its deadline passes).
    const cine = st.cinematic;
    if (cine && Date.now() > cine.until) useCameraStore.getState().endCinematic();
    const live = useCameraStore.getState().cinematic;
    if (live) lastShot.current = live.shot;
    const wantCine = live ? 1 : 0;
    cineBlend.current += (wantCine - cineBlend.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 3.2));
    if (Math.abs(wantCine - cineBlend.current) < 1e-3) cineBlend.current = wantCine;
    const cn = cineBlend.current, sh = live?.shot ?? lastShot.current;
    if (cn > 0 && sh) {
      cx += (sh.pos[0] - cx) * cn; cy += (sh.pos[1] - cy) * cn; cz += (sh.pos[2] - cz) * cn;
      lx += (sh.look[0] - lx) * cn; ly += (sh.look[1] - ly) * cn; lz += (sh.look[2] - lz) * cn; fov += (sh.fov - fov) * cn;
    }
    camera.position.set(cx, cy, cz);
    camera.lookAt(lx, ly, lz);
    const pc = camera as import('three').PerspectiveCamera;
    if (Math.abs(pc.fov - fov) > 0.01) { pc.fov = fov; pc.updateProjectionMatrix(); }
    const ed = useEditorStore.getState(), na = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(ed.cameraAzimuth - na) > 1e-3) ed.setCameraAzimuth(na);
    if (Math.abs(ed.cameraPolar - pol) > 1e-3) ed.setCameraPolar(pol);
  });
  return null;
}
