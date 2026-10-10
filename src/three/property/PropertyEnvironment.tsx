import { useMemo } from 'react';
import { getVehicle } from '@/data/vehicles';
import { useVehicleStore } from '@/stores/vehicleStore';
import type { FloorKind, PropertyLayout, Zone } from '@/types/world';
import { carSlots } from '@/world/layoutGeometry';
import { Vehicle } from '../models/vehicles';
import { B } from '../models/primitives';
import { floorTexture, skylineTexture } from '../textures';
import { Water } from '../world/Water';
import { DecorItem } from './Decor';
import { Fence } from './Fence';
import { Walls } from './Walls';

const OUTER: Partial<Record<FloorKind, string>> = { dirt: '#8A7A60', paving: '#A9A59A', grass: '#7FA27A', concrete: '#9B9B96' };

function ZoneFloor({ zone }: { zone: Zone }) {
  const w = zone.x1 - zone.x0, d = zone.z1 - zone.z0;
  const tex = useMemo(() => {
    if (zone.floor === 'water') return null;
    const t = floorTexture(zone.floor).clone(); t.repeat.set(w / 2, d / 2); t.needsUpdate = true; return t;
  }, [zone.floor, w, d]);
  const cx = (zone.x0 + zone.x1) / 2, cz = (zone.z0 + zone.z1) / 2;
  if (zone.floor === 'water') return <Water size={[w, d]} position={[cx, -0.12, cz]} />;
  return (
    <group>
      {zone.indoor && <mesh position={[cx, -0.08, cz]} receiveShadow><boxGeometry args={[w, 0.16, d]} /><meshStandardMaterial color="#B9AD94" roughness={1} /></mesh>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.003, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={tex ?? undefined} roughness={zone.floor === 'marble' ? 0.25 : 0.85} metalness={zone.floor === 'marble' ? 0.06 : 0} />
      </mesh>
    </group>
  );
}

function ParkingLines({ zone }: { zone: Zone }) {
  const n = Math.max(1, Math.floor((zone.x1 - zone.x0) / 3));
  const w = (zone.x1 - zone.x0) / n;
  return (
    <group>
      {Array.from({ length: n + 1 }, (_, i) => <B key={i} size={[0.07, 0.01, zone.z1 - zone.z0 - 0.5]} pos={[zone.x0 + i * w, 0.012, (zone.z0 + zone.z1) / 2]} color="#F4F1EA" rough={0.9} radius={0.002} shadow={false} />)}
    </group>
  );
}

function Vehicles({ layout }: { layout: PropertyLayout }) {
  const owned = useVehicleStore((s) => s.owned);
  const slots = useMemo(() => carSlots(layout), [layout]);
  return (
    <group>
      {owned.slice(0, slots.length).map((id, i) => {
        const v = getVehicle(id); const s = slots[i];
        if (!v) return null;
        return <group key={id} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0]}><Vehicle body={v.type} color={v.color} /></group>;
      })}
    </group>
  );
}

/** Renders a whole property from its layout data. Works for any state's layouts. */
export function PropertyEnvironment({ layout }: { layout: PropertyLayout }) {
  const { plot } = layout;
  const w = plot.x1 - plot.x0, d = plot.z1 - plot.z0;
  const groundTex = useMemo(() => { const t = floorTexture(plot.ground === 'water' ? 'concrete' : plot.ground).clone(); t.repeat.set(w / 2, d / 2); t.needsUpdate = true; return t; }, [plot.ground, w, d]);
  const sky = useMemo(() => skylineTexture(), []);
  const cx = (plot.x0 + plot.x1) / 2, cz = (plot.z0 + plot.z1) / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.2, cz]} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial color={OUTER[plot.ground] ?? '#9A9484'} roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial map={groundTex} roughness={0.95} /></mesh>
      {layout.zones.map((z) => <ZoneFloor key={z.id} zone={z} />)}
      {layout.zones.filter((z) => z.kind === 'garage' || z.kind === 'parking').map((z) => <ParkingLines key={`l${z.id}`} zone={z} />)}
      <Walls layout={layout} />
      <Fence layout={layout} />
      {layout.decor.map((dec, i) => <DecorItem key={i} d={dec} />)}
      <Vehicles layout={layout} />
      <mesh position={[cx, 6, plot.z0 - 14]}><planeGeometry args={[110, 34]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
      <mesh position={[plot.x0 - 14, 6, cz]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[110, 34]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
    </group>
  );
}
