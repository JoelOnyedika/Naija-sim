import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { useActiveHome } from '@/game/active';
import { QUALITY_TIERS, useQualityStore } from '@/stores/qualityStore';
import { useUiStore } from '@/stores/uiStore';
import { PerfGovernor } from './PerfGovernor';
import { SceneReady } from './SceneReady';
import { AvatarWalker } from './AvatarWalker';
import { CameraRig } from './CameraRig';
import { EditLayer } from './EditLayer';
import { Lighting } from './Lighting';
import { PlacedLayer } from './PlacedLayer';
import { PropertyEnvironment } from './PropertyEnvironment';

/** The active home as a 3D scene. Stays mounted behind every overlay (phone, buy sheet, map). */
export function PropertyScene() {
  const home = useActiveHome();
  const mode = useUiStore((s) => s.mode);
  const dprCap = useQualityStore((s) => QUALITY_TIERS[s.tier].dprCap);
  const all = useMemo(() => (home ? [...home.fixtures, ...home.placed] : []), [home]);
  if (!home) return null;
  return (
    <Canvas shadows dpr={[1, dprCap]} frameloop={mode === 'map' ? 'demand' : 'always'} camera={{ position: [10, 9, 12], fov: 38, near: 0.1, far: 200 }} gl={{ antialias: true }}>
      <PerfGovernor />
      <SceneReady key={home.layout.id} />
      <Lighting layout={home.layout} />
      <Suspense fallback={null}>
        <PropertyEnvironment layout={home.layout} />
        <PlacedLayer items={all} />
        <AvatarWalker layout={home.layout} items={all} />
        <EditLayer />
      </Suspense>
      <CameraRig layout={home.layout} ready={mode !== 'map'} />
    </Canvas>
  );
}
