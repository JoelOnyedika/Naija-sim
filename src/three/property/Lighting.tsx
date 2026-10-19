import { useMemo } from 'react';
import { Color } from 'three';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { QUALITY_TIERS, useQualityStore } from '@/stores/qualityStore';
import type { PropertyLayout } from '@/types/world';
import { usePower } from '@/game/powerHooks';

const MAX_ROOM_LIGHTS = 5;

/** Day/night lighting driven by the in-game clock, plus warm interior lights after dark. */
export function Lighting({ layout }: { layout: PropertyLayout }) {
  const q = useQualityStore((s) => QUALITY_TIERS[s.tier]);
  const minutes = useClockStore((s) => s.minutes);
  const anchor = useClockStore((s) => s.anchor);
  const hour = clockParts(minutes, anchor).hour + (minutes % 60) / 60;
  const day = Math.max(0, Math.min(1, Math.sin(((hour - 6) / 12) * Math.PI) * 1.4));
  const dusk = hour > 17 && hour < 19.5 ? 1 - Math.abs(hour - 18.25) / 1.25 : hour > 5.5 && hour < 7 ? 1 - Math.abs(hour - 6.25) / 0.75 : 0;
  const bg = useMemo(() => new Color('#0E1D2E').lerp(new Color('#BFD9E0'), day).lerp(new Color('#F2B97A'), Math.max(0, dusk) * 0.6), [day, dusk]);
  // One ceiling light per room. GPUs only take a handful of point lights per shader, so when a home has more than
  // MAX_ROOM_LIGHTS rooms the two smallest neighbours (e.g. WC and kitchen) share one light between them.
  const lamps = useMemo(() => {
    let ls = layout.zones.filter((z) => z.indoor).map((z) => ({ id: z.id, x0: z.x0, x1: z.x1, z0: z.z0, z1: z.z1 }));
    while (ls.length > MAX_ROOM_LIGHTS) {
      ls.sort((a, b) => (a.x1 - a.x0) * (a.z1 - a.z0) - (b.x1 - b.x0) * (b.z1 - b.z0));
      const [a, b] = ls;
      ls = [{ id: `${a.id}+${b.id}`, x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) }, ...ls.slice(2)];
    }
    return ls;
  }, [layout]);
  const night = 1 - day;
  // NEPA: room lights scale with the power level (never zero). The sun, hemisphere and ambient light are untouched, so a
  // blackout is dim, not black, and the home stays navigable.
  const { level } = usePower();
  return (
    <>
      <color attach="background" args={[bg.getStyle()]} />
      <hemisphereLight args={[night > 0.4 ? '#FFD9A8' : '#FFF4DC', '#9A8D78', 0.22 + day * 0.73]} />
      <ambientLight intensity={0.1 + day * 0.15} />
      <directionalLight
        position={[8, 12, 9]} intensity={0.25 + day * 1.7} color={dusk > 0.2 ? '#FFB06B' : '#FFF1D6'} castShadow={q.shadows}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-near={1} shadow-camera-far={50}
      />
      {/* every room has its own warm ceiling light: a soft glow by day, a bright pool of light at night */}
      {q.nightLights && lamps.map((z) => {
        const w = z.x1 - z.x0, d = z.z1 - z.z0;
        return <pointLight key={z.id} position={[(z.x0 + z.x1) / 2, 1.9, (z.z0 + z.z1) / 2]} intensity={(4 + night * 24) * level} distance={Math.max(w, d) * 1.5 + 2} decay={1.5} color="#FFC688" />;
      })}
    </>
  );
}
