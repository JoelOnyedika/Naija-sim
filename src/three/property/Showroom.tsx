import { useEffect } from 'react';
import { slotVehicle, podiumIndexOf } from '@/data/showroom';
import { useInteriorStore } from '@/stores/interiorStore';
import { useUiStore } from '@/stores/uiStore';
import type { PlacedItem } from '@/types/game';
import { VehicleDisplay } from '../models/VehicleDisplay';

/** The cars on the showroom podiums. Tapping a car (or its podium) opens its purchase sheet. Renders nothing anywhere else. */
export function ShowroomLayer({ items }: { items: PlacedItem[] }) {
  const here = useInteriorStore((s) => s.current);
  const picked = useUiStore((s) => s.showroomVehicle);
  // a car chosen on the phone opens its sheet as soon as you walk in
  useEffect(() => { if (here?.kind === 'showroom' && here.vehicleId) { useUiStore.getState().setShowroomVehicle(here.vehicleId); useInteriorStore.getState().setVehicle(undefined); } }, [here?.kind, here?.vehicleId]);
  if (here?.kind !== 'showroom') return null;
  return (
    <group>
      {items.filter((i) => i.defId === 'v_podium').map((p) => {
        const v = slotVehicle(podiumIndexOf(p.uid)); if (!v) return null;
        return (
          <group key={p.uid} position={[p.x, 0.22, p.z]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); useUiStore.getState().setShowroomVehicle(v.id); }}>
            <VehicleDisplay v={v} selected={picked === v.id} />
          </group>
        );
      })}
    </group>
  );
}
