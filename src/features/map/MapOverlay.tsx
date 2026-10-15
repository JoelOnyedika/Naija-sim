import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { copy } from '@/data/copy';
import { useEconomyStore } from '@/stores/economyStore';
import { useMapStore, useStateId } from '@/stores/mapStore';
import { useAdsUiStore } from '@/stores/adsUiStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { billboardSlots } from '@/game/ads/slots';
import { WorldView } from '@/three/world/WorldView';
import { Button } from '@/ui/Button';
import { POSITIONING_LABEL } from '@/world/labels';
import { getArea, getLandmark, getState, propertiesOfState } from '@/world/registry';
import { AdSheet } from './ads/AdSheet';
import { AdWizard } from './ads/AdWizard';
import { MapTopBar } from './MapTopBar';
import { CategorySheet } from './CategorySheet';

const EFFECT_LABEL: Record<string, string> = { hunger: 'Hunger', thirst: 'Thirst', happiness: 'Happiness', social: 'Social', energy: 'Energy', hygiene: 'Hygiene', charisma: 'Charisma' };

/** Full-screen state map. Reads everything from the state's data: landmarks, areas, properties. */
export function MapOverlay() {
  const mode = useUiStore((s) => s.mode);
  const { selectedAreaId, selectedLandmarkId, selectLandmark, selectArea } = useMapStore();
  const ui = useAdsUiStore();
  const stateId = useStateId();
  const [travel, setTravel] = useState<string | null>(null);
  const state = getState(stateId);
  const landmark = selectedLandmarkId ? getLandmark(selectedLandmarkId) : null;
  const area = selectedAreaId ? getArea(selectedAreaId) : null;
  const selected = landmark ? { type: 'landmark' as const, id: landmark.id } : area ? { type: 'area' as const, id: area.id } : ui.focus ? { type: 'point' as const, x: ui.focus[0], z: ui.focus[1] } : null;

  // leaving the map (or changing city) closes every advertising panel; opening a billboard flies the camera to it
  useEffect(() => { if (mode !== 'map') useAdsUiStore.getState().reset(); }, [mode]);
  useEffect(() => {
    if (ui.sheet?.type === 'billboard' && state) { const b = billboardSlots(state).find((x) => x.id === (ui.sheet as { slotId: string }).slotId); if (b) useAdsUiStore.getState().setFocus(b.position); }
  }, [ui.sheet, state]);
  const panelVisible = !!ui.category && !landmark && !area && !ui.sheet && !ui.wizard;

  const visit = () => {
    if (!landmark) return;
    const v = landmark.visit;
    if (useStatsStore.getState().activity) { sfx.error(); return toast('Finish what you are doing first', 'bad'); }
    if (v.cost > 0 && !useEconomyStore.getState().debit(v.cost, `Visit: ${landmark.name}`, 'visit')) { sfx.error(); return toast(copy.broke(), 'bad'); }
    sfx.open(); setTravel(landmark.name);
    useMapStore.getState().recordVisit(landmark.id);
    useStatsStore.getState().start({ label: `At ${landmark.name}`, seconds: v.seconds, effects: v.effects, pose: 'stand', kind: 'visit', event: v.taskEvent ? `visit:${v.taskEvent}` : undefined, doneMessage: `Good time at ${landmark.name}.` });
    setTimeout(() => setTravel(null), 1500);
  };

  return (
    <AnimatePresence>
      {mode === 'map' && state && (
        <motion.div key="map" className="absolute inset-0 z-[40] bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <WorldView stateId={stateId} mode="map" showNames={ui.names} selected={selected} onSelectLandmark={(id) => { sfx.pop(); selectLandmark(id); }} onSelectArea={(id) => { sfx.pop(); selectArea(id); }} />
          <MapTopBar />

          <AnimatePresence mode="wait">
            {(landmark || area) && (
              <motion.div key={landmark?.id ?? area?.id} className="absolute inset-x-0 bottom-[6rem] z-[60] flex justify-center px-3" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
                <div className="glass-dark w-full max-w-md rounded-[1.75rem] p-4">
                  {landmark && (<>
                    <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danfo/20 text-2xl">{landmark.icon}</span>
                      <div className="min-w-0 flex-1"><div className="font-display text-xl font-bold leading-tight">{landmark.name}</div><div className="text-sm font-semibold text-danfo">{landmark.tagline}</div></div>
                      <button onClick={() => selectLandmark(null)} aria-label="Close" className="text-white/60">✕</button></div>
                    <p className="mt-2 text-sm text-white/80">{landmark.description}</p>
                    {landmark.activities?.length ? <p className="mt-1.5 text-xs font-semibold text-white/60">{landmark.activities.join(' · ')}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(landmark.visit.effects).map(([k, v]) => <span key={k} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${(v as number) >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{(v as number) > 0 ? '+' : ''}{v} {EFFECT_LABEL[k] ?? k}</span>)}</div>
                    <Button className="mt-3 w-full" onClick={visit}>Visit{landmark.visit.cost ? ` · ${formatNaira(landmark.visit.cost)}` : ' · Free'}</Button>
                  </>)}
                  {area && (() => {
                    const props = propertiesOfState(stateId).filter((p) => p.areaId === area.id);
                    const lo = Math.min(...props.map((p) => p.price)), hi = Math.max(...props.map((p) => p.price));
                    return (<>
                      <div className="flex items-start gap-3"><span className="h-12 w-3 shrink-0 rounded-full" style={{ background: area.mapData.color }} />
                        <div className="min-w-0 flex-1"><div className="font-display text-xl font-bold leading-tight">{area.name}</div><div className="text-sm font-semibold text-danfo">{area.tagline} · {POSITIONING_LABEL[area.positioning]}</div></div>
                        <button onClick={() => selectArea(null)} aria-label="Close" className="text-white/60">✕</button></div>
                      <p className="mt-2 text-sm text-white/80">{area.description}</p>
                      {props.length > 0 && <p className="mt-2 text-sm font-semibold">{props.length} home{props.length > 1 ? 's' : ''} · {formatNaira(lo)}{hi > lo ? ` – ${formatNaira(hi)}` : ''}</p>}
                      <Button className="mt-3 w-full" disabled={!props.length} onClick={() => { useUiStore.getState().setHousesArea(area.id); usePhoneStore.getState().openPhone(); usePhoneStore.getState().openApp('houses'); sfx.phoneOpen(); }}>Browse homes in {area.name}</Button>
                    </>);
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>{panelVisible && <CategorySheet key={`cat-${stateId}`} state={state} />}</AnimatePresence>
          <AnimatePresence>{ui.sheet && state.ads && <AdSheet key="sheet" state={state} sheet={ui.sheet} />}</AnimatePresence>
          <AnimatePresence>{ui.wizard && state.ads && <AdWizard key={`wiz-${ui.wizard.kind}-${ui.wizard.slotId}`} state={state} wizard={ui.wizard} />}</AnimatePresence>

          <AnimatePresence>
            {travel && (
              <motion.div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-night/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div animate={{ x: [-120, 120] }} transition={{ duration: 1.3, ease: 'easeInOut' }} className="text-6xl">🚌</motion.div>
                <p className="mt-4 font-display text-xl font-bold">Heading to {travel}…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
