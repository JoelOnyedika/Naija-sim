import { useMemo } from 'react';
import { B } from '@/three/models/primitives';
import { Billboards } from '@/three/world/Billboards';
import { SeaAds } from '@/three/world/SeaAds';
import { Water } from '@/three/world/Water';
import type { StateDefinition } from '@/types/world';
import { SPREAD } from '../spread';
import { LAGOS_LAYOUT } from '../map/layout';
import { Airport } from './airport';
import { Buildings, Land } from './districts';
import { LANDMARK_MODELS } from './landmarks';
import { Port } from './port';
import { Roads } from './roads';

/**
 * Lagos 3D world. Everything structural comes from the state's data: land, districts, roads and bridges from
 * `mapData.layout` (content/lagos/map/layout.ts), areas, landmarks and billboards from the state definition. This
 * component only knows how to DRAW them (and holds the Lagos-specific airport and port scenery).
 */
export function LagosWorld({ state }: { state: StateDefinition }) {
  const layout = state.mapData.layout!;
  const landmarks = state.mapData.landmarks;
  const avoid = useMemo(() => landmarks.map((l) => l.position), [landmarks]);
  const sea = layout.sea;
  return (
    <group>
      <Water size={[sea.x1 - sea.x0 + 120, sea.z1 - sea.z0 + 120]} position={[(sea.x0 + sea.x1) / 2, -0.25, (sea.z0 + sea.z1) / 2]} />
      <Land layout={layout} />
      <Roads layout={layout} />
      <Buildings layout={layout} avoid={avoid} />
      {/* the airport and port scenery is drawn at the old coordinates, stretched in x and z to match the spread land */}
      <group scale={[SPREAD, 1, SPREAD]}><Airport /><Port layout={LAGOS_LAYOUT} /></group>
      {state.areas.map((a) => (
        <mesh key={a.id} rotation={[-Math.PI / 2, 0, 0]} position={[a.mapData.position[0], 0.09, a.mapData.position[1]]}>
          <circleGeometry args={[a.mapData.radius, 40]} /><meshBasicMaterial color={a.mapData.color} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      <Billboards list={state.mapData.billboards ?? []} />
      <SeaAds stateId={state.id} />
      {landmarks.map((l) => {
        const Model = LANDMARK_MODELS[l.modelId];
        return (
          <group key={l.id} position={[l.position[0], 0.07, l.position[1]]}>
            {Model ? <Model /> : <B size={[1.4, 1.2, 1.4]} pos={[0, 0.6, 0]} color="#C9C4B6" />}
          </group>
        );
      })}
    </group>
  );
}
