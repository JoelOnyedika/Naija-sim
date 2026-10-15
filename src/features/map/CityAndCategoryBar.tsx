import { Anchor, Building2, Megaphone } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { CITY_CATALOG } from '@/content/cities';
import { useAdsUiStore, type MapCategory } from '@/stores/adsUiStore';
import { useMapStore, useStateId } from '@/stores/mapStore';
import { toast } from '@/stores/uiStore';
import { getState } from '@/world/registry';

/** City chips: registered cities are selectable, the rest are visibly disabled "Coming soon" and cannot be opened. */
export function CitySelector() {
  const current = useStateId();
  return (
    <div className="pointer-events-auto flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="City">
      {CITY_CATALOG.map((c) => {
        const playable = !!getState(c.id), on = playable && c.id === current;
        return (
          <button
            key={c.id} role="tab" aria-selected={on} aria-disabled={!playable}
            onClick={() => { if (!playable) { sfx.error(); toast(`${c.name} is coming soon.`); return; } sfx.pop(); useMapStore.getState().setState(c.id); useAdsUiStore.getState().reset(); }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur ${on ? 'bg-danfo text-night' : playable ? 'glass-dark text-white' : 'glass-dark text-white/40'}`}
          >
            {c.name}
            {!playable && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white/60">Soon</span>}
          </button>
        );
      })}
    </div>
  );
}

const CATS: { id: MapCategory; label: string; icon: typeof Megaphone }[] = [
  { id: 'ads', label: 'Ads', icon: Megaphone }, { id: 'government', label: 'Government', icon: Building2 }, { id: 'sea', label: 'Sea', icon: Anchor },
];
/** Ads (physical billboards) | Government (civic landmarks) | Sea (floating ads on the actual water). */
export function CategoryTabs() {
  const category = useAdsUiStore((s) => s.category);
  return (
    <div className="glass-dark pointer-events-auto grid grid-cols-3 gap-1 rounded-2xl p-1" role="tablist" aria-label="Map category">
      {CATS.map(({ id, label, icon: Icon }) => (
        <button key={id} role="tab" aria-selected={category === id} onClick={() => { sfx.pop(); useAdsUiStore.getState().setCategory(id); }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold ${category === id ? 'bg-accent text-white shadow-accent' : 'text-white/70'}`}>
          <Icon size={15} />{label}
        </button>
      ))}
    </div>
  );
}
