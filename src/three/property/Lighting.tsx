import { useMemo } from 'react';
import { Color } from 'three';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { QUALITY_TIERS, useQualityStore } from '@/stores/qualityStore';
import type { PropertyLayout } from '@/types/world';

/** Day/night lighting driven by the in-game clock, plus warm interior lights after dark. */
export function Lighting({ layout }: { layout: PropertyLayout }) {
  const q = useQualityStore((s) => QUALITY_TIERS[s.tier]);
  const minutes = useClockStore((s) => s.minutes);
  const anchor = useClockStore((s) => s.anchor);
  const hour = clockParts(minutes, anchor).hour + (minutes % 60) / 60;
  const day = Math.max(0, Math.min(1, Math.sin(((hour - 6) / 12) * Math.PI) * 1.4));
  const dusk = hour > 17 && hour < 19.5 ? 1 - Math.abs(hour - 18.25) / 1.25 : hour > 5.5 && hour < 7 ? 1 - Math.abs(hour - 6.25) / 0.75 : 0;
  const bg = useMemo(() => new Color('#0E1D2E').lerp(new Color('#BFD9E0'), day).lerp(new Color('#F2B97A'), Math.max(0, dusk) * 0.6), [day, dusk]);
  const lamps = useMemo(() => layout.zones.filter((z) => z.indoor && z.furnishable).slice(0, 5), [layout]);
  const night = 1 - day;
  return (
    <>
      <color attach="background" args={[bg.getStyle()]} />
      <hemisphereLight args={['#FFF4DC', '#9A8D78', 0.3 + day * 0.65]} />
      <ambientLight intensity={0.1 + day * 0.15} />
      <directionalLight
        position={[8, 12, 9]} intensity={0.25 + day * 1.7} color={dusk > 0.2 ? '#FFB06B' : '#FFF1D6'} castShadow={q.shadows}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={50}
      />
      {night > 0.15 && q.nightLights && lamps.map((z) => <pointLight key={z.id} position={[(z.x0 + z.x1) / 2, 2.3, (z.z0 + z.z1) / 2]} intensity={night * 14} distance={7} decay={1.6} color="#FFC987" />)}
    </>
  );
}
