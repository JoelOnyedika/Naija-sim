import { AnimatePresence, motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { copy } from '@/data/copy';
import { useEconomyStore } from '@/stores/economyStore';
import { useMapStore, useStateId } from '@/stores/mapStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { WorldView } from '@/three/world/WorldView';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Button } from '@/ui/Button';
import { POSITIONING_LABEL } from '@/world/labels';
import { getArea, getLandmark, getState, listStates, propertiesOfState } from '@/world/registry';

const EFFECT_LABEL: Record<string, string> = { hunger: 'Hunger', thirst: 'Thirst', happiness: 'Happiness', social: 'Social', energy: 'Energy', hygiene: 'Hygiene', charisma: 'Charisma' };

/** Full-screen state map. Reads everything from the state's data: landmarks, areas, properties. */
export function MapOverlay() {
  const mode = useUiStore((s) => s.mode);
  const { selectedAreaId, selectedLandmarkId, selectLandmark, selectArea, setState } = useMapStore();
  const stateId = useStateId();
  const money = useEconomyStore((s) => s.money);
  const [travel, setTravel] = useState<string | null>(null);
  const state = getState(stateId);
  const landmark = selectedLandmarkId ? getLandmark(selectedLandmarkId) : null;
  const area = selectedAreaId ? getArea(selectedAreaId) : null;
  const selected = landmark ? { type: 'landmark' as const, id: landmark.id } : area ? { type: 'area' as const, id: area.id } : null;
  const states = listStates();

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
          <WorldView stateId={stateId} mode="map" selected={selected} onSelectLandmark={(id) => { sfx.pop(); selectLandmark(id); }} onSelectArea={(id) => { sfx.pop(); selectArea(id); }} />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[55] flex items-start justify-between gap-2 px-3 pt-safe">
            <div className="glass-dark pointer-events-auto rounded-2xl px-4 py-2.5"><div className="font-display text-lg font-extrabold leading-tight">{state.name}</div><div className="text-xs text-white/60">{state.areas.length} areas · {propertiesOfState(stateId).length} homes</div></div>
            <div className="flex flex-col items-end gap-2">
              <div className="glass-dark pointer-events-auto rounded-2xl px-3 py-2 font-display font-extrabold text-danfo"><AnimatedNumber value={money} /></div>
              {states.length > 1 && <select value={stateId} onChange={(e) => setState(e.target.value)} className="glass-dark pointer-events-auto rounded-xl px-2 py-1.5 text-xs">{states.map((s) => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}</select>}
            </div>
          </div>
          <button onClick={() => useUiStore.getState().setMode('home')} className="glass-dark pointer-events-auto absolute left-3 top-[5.2rem] z-[55] flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold"><Home size={15} />Back home</button>

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
