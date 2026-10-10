import { useMapStore, useStateId } from '@/stores/mapStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useUiStore } from '@/stores/uiStore';
import { listStates } from '@/world/registry';
import { Btn, Card, Row } from '../ui';

const CATS = ['market', 'food', 'tech', 'bank', 'club'];

/** Browses the current state's landmarks that are shops or businesses. */
export function ShopsApp() {
  const stateId = useStateId();
  const state = listStates().find((s) => s.id === stateId);
  const shops = state?.mapData.landmarks.filter((l) => CATS.includes(l.category)) ?? [];
  return (
    <div className="space-y-2 p-3">
      {shops.map((l) => (
        <Card key={l.id}><Row glyph={l.icon} title={l.name} sub={l.tagline} right={<Btn onClick={() => { usePhoneStore.getState().closePhone(); useUiStore.getState().setMode('map'); useMapStore.getState().selectLandmark(l.id); }}>Show on map</Btn>} /></Card>
      ))}
    </div>
  );
}
