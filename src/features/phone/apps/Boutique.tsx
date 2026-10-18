import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { OCCASIONS, SHOP_CATEGORIES, canPreview, occasionsOf, type Occasion } from '@/data/boutiqueMeta';
import { applyItem, BOUTIQUE, type BoutiqueItem, type BoutiqueSlot } from '@/data/clothing';
import { buyAndWear, isOwned as ownedItem } from '@/game/boutique';
import { useBoutiqueNav } from '@/stores/boutiqueNavStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { AvatarPreview, type PreviewFocus } from '@/three/avatar/AvatarPreview';
import type { Appearance } from '@/types/game';
import { Chip, EmptyState, SearchField } from '../ui';

const FOCUS: Record<BoutiqueSlot, PreviewFocus> = { top: 'upper', bottom: 'full', shoes: 'lower', hair: 'head', extra: 'head', bag: 'full' };

/** Is this item what the character currently has on? */
function worn(a: Appearance, it: BoutiqueItem): boolean {
  switch (it.slot) {
    case 'top': return a.bottom !== 'dress' && a.top === it.style && a.topColor === it.color;
    case 'bottom': return it.style === 'dress' ? a.bottom === 'dress' && a.topColor === it.color : a.bottom === it.style && a.bottomColor === it.color;
    case 'shoes': return a.shoes === it.style && a.shoeColor === it.color;
    case 'hair': return a.hairStyle === it.style;
    case 'extra': return a.accessory === it.style;
    case 'bag': return false;
  }
}

/**
 * Boutique: a full-screen shop (see PhoneOverlay). Phone: preview on top, catalogue below. Wide screens: preview on the left,
 * shop on the right. Tap an item to try it on (free); the action bar buys-and-wears, wears or cancels. The wardrobe in the
 * house opens this same catalogue showing only what you own. Purchases go through game/boutique.ts.
 */
export function BoutiqueApp() {
  const appearance = useCharacterStore((s) => s.appearance), owned = useCharacterStore((s) => s.ownedClothes), money = useEconomyStore((s) => s.money);
  const navOwned = useBoutiqueNav((s) => s.ownedOnly);
  const [cat, setCat] = useState(SHOP_CATEGORIES[0].id), [occ, setOcc] = useState<Occasion | 'All'>('All'), [q, setQ] = useState(''), [ownedOnly, setOwnedOnly] = useState(navOwned), [previewId, setPreviewId] = useState<string | null>(null);
  const isOwned = (it: BoutiqueItem) => ownedItem(it) || owned.includes(it.id);

  const preview = previewId ? BOUTIQUE.find((b) => b.id === previewId) ?? null : null;
  const shown = useMemo(() => (preview && canPreview(preview) ? applyItem(appearance, preview) : appearance), [appearance, preview]);
  const category = SHOP_CATEGORIES.find((c) => c.id === cat)!;
  const focus = preview ? FOCUS[preview.slot] : FOCUS[category.slots[0]];
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return BOUTIQUE.filter((b) => category.slots.includes(b.slot) && (occ === 'All' || occasionsOf(b).includes(occ)) && (!ownedOnly || isOwned(b)) && (!n || b.name.toLowerCase().includes(n)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, occ, q, ownedOnly, owned]);

  const confirm = () => {
    if (!preview) return;
    const r = buyAndWear(preview.id);
    if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; }
    if (r.bought) sfx.purchase(); else sfx.pop();
    toast(r.bought ? (r.worn ? `Bought and wearing ${preview.name}` : `Bought ${preview.name}. It is in your wardrobe`) : `Wearing ${preview.name}`, 'good');
    setPreviewId(null);
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="relative h-[38%] min-h-[11rem] shrink-0 bg-gradient-to-b from-rose-100 to-rose-200 md:h-full md:w-[42%] md:max-w-xl">
        <AvatarPreview appearance={shown} focus={focus} />
        {preview && <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-1 text-[11px] font-bold text-white">{canPreview(preview) ? 'Trying on' : 'Preview not available for bags'}</span>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 space-y-2 bg-slate-100 px-3 pt-2">
          <SearchField label="Search the boutique" value={q} onChange={setQ} placeholder="Search clothes, shoes, bags..." />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Category">{SHOP_CATEGORIES.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => { setCat(c.id); setPreviewId(null); }}>{c.icon} {c.label}</Chip>)}</div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Occasion">
            <Chip active={occ === 'All'} onClick={() => setOcc('All')}>All</Chip>{OCCASIONS.map((o) => <Chip key={o.id} active={occ === o.id} onClick={() => setOcc(o.id)}>{o.icon} {o.id}</Chip>)}
            <Chip active={ownedOnly} onClick={() => setOwnedOnly(!ownedOnly)}>{ownedOnly ? '✓ ' : ''}Owned only</Chip>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-1">
          {list.length === 0 ? <EmptyState glyph="👗" title={ownedOnly ? 'Nothing owned here yet' : 'Nothing matches'}>{ownedOnly ? 'Turn off "Owned only" to browse the shop.' : 'Try another occasion or search.'}</EmptyState> : (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {list.map((b) => {
                const on = worn(appearance, b), sel = previewId === b.id, have = isOwned(b);
                return (
                  <button key={b.id} onClick={() => { sfx.click(); setPreviewId(sel ? null : b.id); }} aria-pressed={sel} aria-label={`${b.name}, ${on ? 'wearing' : have ? 'owned' : formatNaira(b.price)}`}
                    className={`flex flex-col rounded-2xl bg-white p-2.5 text-left shadow-sm ring-2 transition ${sel ? 'ring-accent' : 'ring-transparent'}`}>
                    <span className="flex h-20 items-center justify-center rounded-xl text-5xl" style={{ background: `${b.color ?? '#CBD5E1'}33` }} aria-hidden>{b.glyph}</span>
                    <span className="mt-2 block text-[13px] font-bold leading-tight text-slate-900">{b.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">{b.color && <i className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ background: b.color }} />}{occasionsOf(b).slice(0, 2).join(' · ')}</span>
                    <span className="mt-1.5 flex items-center justify-between">{on ? <span className="flex items-center gap-1 text-[12px] font-bold text-accent"><Check size={14} strokeWidth={3} />Wearing</span> : have ? <span className="text-[12px] font-bold text-emerald-600">Owned</span> : <b className="font-display text-[13px] tabular-nums">{formatNaira(b.price)}</b>}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {preview && (
          <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white p-2.5">
            <button onClick={() => { sfx.close(); setPreviewId(null); }} className="h-11 rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-700">Cancel</button>
            <button onClick={confirm} disabled={!isOwned(preview) && money < preview.price || (isOwned(preview) && !canPreview(preview))} className="h-11 flex-1 rounded-lg bg-accent text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400">
              {isOwned(preview) ? (canPreview(preview) ? 'Wear' : 'Already in your wardrobe') : canPreview(preview) ? `Buy and wear · ${formatNaira(preview.price)}` : `Buy · ${formatNaira(preview.price)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
