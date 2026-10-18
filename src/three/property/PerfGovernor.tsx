import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useQualityStore } from '@/stores/qualityStore';
import { tierFloor, useSettingsStore } from '@/stores/settingsStore';

// Tuning. Drop only after sustained poor frame rate; climb back only after a long stable stretch (hysteresis + cooldowns).
const WARMUP_S = 3;          // shader compile and first-frame spikes are not "performance"
const LOW_FPS = 40, HIGH_FPS = 56;
const DROP_AFTER_S = 4;      // consecutive seconds below LOW_FPS
const RISE_AFTER_S = 20;     // consecutive seconds above HIGH_FPS
const DROP_COOLDOWN_S = 6, RISE_COOLDOWN_S = 20;

/**
 * Watches real frame times inside the Canvas and moves the graphics tier down or up. Also keeps the app alive if the
 * browser drops the WebGL context (common on phones under memory pressure): it asks for the context back instead of
 * leaving a dead canvas.
 */
export function PerfGovernor() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const acc = useRef({ t: 0, frames: 0, elapsed: 0, low: 0, high: 0, since: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); console.warn('[graphics] WebGL context lost, waiting for restore'); };
    const restored = () => { console.info('[graphics] WebGL context restored'); invalidate(); };
    el.addEventListener('webglcontextlost', lost);
    el.addEventListener('webglcontextrestored', restored);
    return () => { el.removeEventListener('webglcontextlost', lost); el.removeEventListener('webglcontextrestored', restored); };
  }, [gl, invalidate]);

  useFrame((_, dt) => {
    const a = acc.current;
    if (document.hidden) { a.frames = 0; a.t = 0; return; } // a background tab says nothing about performance
    a.elapsed += dt; a.since += dt; a.t += dt; a.frames += 1;
    if (a.t < 1) return;
    const fps = a.frames / a.t;
    a.t = 0; a.frames = 0;
    if (a.elapsed < WARMUP_S) return;
    const { tier, setTier } = useQualityStore.getState();
    // Settings first. 'off' pins the lowest tier, 'on' pins the best tier the battery saver allows; both stop the auto logic.
    // Room lights stay on in every tier, so 'off' only lowers resolution and shadows: the game stays playable.
    const prefs = useSettingsStore.getState(), floor = tierFloor(prefs);
    if (prefs.graphics === 'off') { if (tier !== 3) setTier(3); return; }
    if (prefs.graphics === 'on') { if (tier !== floor) setTier(floor); return; }
    if (tier < floor) { setTier(floor); return; }
    if (fps < LOW_FPS) { a.low += 1; a.high = 0; } else if (fps >= HIGH_FPS) { a.high += 1; a.low = 0; } else { a.low = 0; a.high = 0; }
    if (a.low >= DROP_AFTER_S && a.since >= DROP_COOLDOWN_S && tier < 3) { setTier(tier + 1); a.low = 0; a.since = 0; console.info(`[graphics] ${fps.toFixed(0)} fps, tier ${tier} -> ${tier + 1}`); }
    else if (a.high >= RISE_AFTER_S && a.since >= RISE_COOLDOWN_S && tier > floor) { setTier(tier - 1); a.high = 0; a.since = 0; console.info(`[graphics] stable, tier ${tier} -> ${tier - 1}`); }
  });
  return null;
}
