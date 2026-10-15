import { AnimatePresence, motion } from 'framer-motion';
import { Anchor, Building2, ChevronDown, Footprints, Home, Megaphone, MapPin, Tag } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { CITY_CATALOG } from '@/content/cities';
import { useAdsUiStore, type MapCategory } from '@/stores/adsUiStore';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { useMapStore, useStateId } from '@/stores/mapStore';
import { toast } from '@/stores/uiStore';
import { HudPill } from '@/ui/HudPill';
import { getState } from '@/world/registry';

type Menu = 'city' | 'more' | null;

/** Lagos traffic is a mood, not a simulation: rush hours are "serious go-slow". Purely flavour text from the game clock. */
function trafficLine(hour: number) {
  if ((hour >= 7 && hour < 10) || (hour >= 16 && hour < 20)) return { text: 'Serious go-slow', tone: 'bg-rose-400' };
  if (hour >= 10 && hour < 16) return { text: 'Moving, small hold-up', tone: 'bg-amber-300' };
  return { text: 'Roads are free', tone: 'bg-emerald-400' };
}

const MORE: { id: MapCategory | 'walk'; label: string; hint: string; icon: ReactNode; soon?: boolean }[] = [
  { id: 'ads', label: 'Billboards', hint: 'Rent a roadside board', icon: <Megaphone size={18} /> },
  { id: 'neighbours', label: 'Neighbours', hint: 'Areas and homes', icon: <Home size={18} /> },
  { id: 'sea', label: 'Sea Plots', hint: 'Float an ad on the water', icon: <Anchor size={18} /> },
  { id: 'government', label: 'Government', hint: 'Civic landmarks', icon: <Building2 size={18} /> },
  { id: 'walk', label: 'Walk', hint: 'Explore on foot', icon: <Footprints size={18} />, soon: true },
];

/**
 * Map header: the shared HUD capsules, then a row of three controls: a city dropdown, a Names toggle and a More dropdown
 * (Billboards, Neighbours, Sea Plots, Government, Walk). Only one dropdown is open at a time; tapping outside closes it.
 */
export function MapTopBar() {
  const [menu, setMenu] = useState<Menu>(null);
  const stateId = useStateId();
  const state = getState(stateId);
  const category = useAdsUiStore((s) => s.category), names = useAdsUiStore((s) => s.names);
  const minutes = useClockStore((s) => s.minutes), anchor = useClockStore((s) => s.anchor);
  const traffic = trafficLine(clockParts(minutes, anchor).hour);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setMenu(null); };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [menu]);

  const pick = (id: MapCategory | 'walk', soon?: boolean) => {
    if (soon) { sfx.error(); toast('Walking the city is coming soon.'); return; }
    sfx.pop(); useAdsUiStore.getState().setCategory(category === id ? null : (id as MapCategory)); setMenu(null);
  };

  return (
    <div ref={root} className="pointer-events-none absolute inset-x-0 top-0 z-[67] px-2.5 pt-safe">
      <div className="pointer-events-none"><HudPill /></div>
      <div className="mx-auto mt-2 flex max-w-2xl items-center gap-2">
        <div className="relative">
          <button onClick={() => { sfx.pop(); setMenu(menu === 'city' ? null : 'city'); }} aria-expanded={menu === 'city'} aria-haspopup="listbox" className="hud-capsule pointer-events-auto flex items-center gap-2 rounded-2xl py-2 pl-3 pr-2.5 text-sm font-bold">
            <MapPin size={16} className="text-danfo" />{state?.name ?? 'City'}<ChevronDown size={16} className={`text-white/60 transition-transform ${menu === 'city' ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {menu === 'city' && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.16 }} role="listbox" aria-label="City" className="hud-capsule pointer-events-auto absolute left-0 top-[calc(100%+0.5rem)] z-10 w-[min(21rem,calc(100vw-1.5rem))] rounded-[1.6rem] p-2">
                {CITY_CATALOG.map((c) => {
                  const playable = !!getState(c.id), here = playable && c.id === stateId;
                  return (
                    <button key={c.id} role="option" aria-selected={here} aria-disabled={!playable}
                      onClick={() => { if (!playable) { sfx.error(); toast(`${c.name} is coming soon.`); return; } sfx.pop(); useMapStore.getState().setState(c.id); useAdsUiStore.getState().reset(); setMenu(null); }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${here ? 'bg-white/10' : ''} ${playable ? '' : 'opacity-55'}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">{c.id === 'lagos' ? '🌆' : c.id === 'abuja' ? '🏛️' : c.id === 'edo' ? '👑' : '🌊'}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{c.name}</span><span className="block truncate text-[11px] text-white/55">{c.blurb}</span></span>
                      {here ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-300"><MapPin size={12} />You're here</span> : <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white/70">Coming soon</span>}
                    </button>
                  );
                })}
                <div className="mt-1 flex items-center gap-2 border-t border-white/10 px-3 pb-1 pt-2.5 text-xs text-white/70"><i className={`h-2 w-2 rounded-full ${traffic.tone}`} />Traffic in {state?.name}: <b className="text-white/90">{traffic.text}</b></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={() => { sfx.pop(); useAdsUiStore.getState().toggleNames(); }} aria-pressed={names} className={`pointer-events-auto flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-bold ${names ? 'bg-danfo text-night shadow-[0_6px_18px_rgba(255,194,26,0.35)]' : 'hud-capsule text-white/80'}`}>
          <Tag size={15} />Names
        </button>

        <div className="relative ml-auto">
          <button onClick={() => { sfx.pop(); setMenu(menu === 'more' ? null : 'more'); }} aria-expanded={menu === 'more'} aria-haspopup="menu" className={`pointer-events-auto flex items-center gap-1.5 rounded-2xl py-2 pl-3 pr-2.5 text-sm font-bold ${category ? 'bg-accent text-white shadow-accent' : 'hud-capsule'}`}>
            {category ? MORE.find((m) => m.id === category)?.label : 'More'}<ChevronDown size={16} className={`transition-transform ${menu === 'more' ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {menu === 'more' && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.16 }} role="menu" aria-label="More" className="hud-capsule pointer-events-auto absolute right-0 top-[calc(100%+0.5rem)] z-10 w-[min(19rem,calc(100vw-1.5rem))] rounded-[1.6rem] p-2">
                {MORE.map((m) => (
                  <button key={m.id} role="menuitem" aria-disabled={!!m.soon} onClick={() => pick(m.id, m.soon)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${category === m.id ? 'bg-white/12' : ''} ${m.soon ? 'opacity-55' : ''}`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danfo/15 text-danfo">{m.icon}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{m.label}</span><span className="block truncate text-[11px] text-white/55">{m.hint}</span></span>
                    {m.soon && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white/70">Soon</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
