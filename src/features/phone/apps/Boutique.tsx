import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { applyItem, BOUTIQUE, type BoutiqueItem, type BoutiqueSlot } from '@/data/clothing';
import { copy } from '@/data/copy';
import { useCharacterStore } from '@/stores/characterStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { AvatarPreview, type PreviewFocus } from '@/three/avatar/AvatarPreview';
import type { Appearance } from '@/types/game';
import { Chip } from '../ui';

const CATS: { id: BoutiqueSlot; label: string; focus: PreviewFocus }[] = [
  { id: 'top', label: 'Tops', focus: 'upper' }, { id: 'bottom', label: 'Bottoms', focus: 'full' }, { id: 'shoes', label: 'Shoes', focus: 'lower' },
  { id: 'hair', label: 'Hair', focus: 'head' }, { id: 'extra', label: 'Extras', focus: 'head' },
];

/** Is this item what the character currently has on? */
function worn(a: Appearance, it: BoutiqueItem): boolean {
  switch (it.slot) {
    case 'top': return a.bottom !== 'dress' && a.top === it.style && a.topColor === it.color;
    case 'bottom': return it.style === 'dress' ? a.bottom === 'dress' && a.topColor === it.color : a.bottom === it.style && a.bottomColor === it.color;
    case 'shoes': return a.shoes === it.style && a.shoeColor === it.color;
    case 'hair': return a.hairStyle === it.style;
    case 'extra': return a.accessory === it.style;
  }
}

/** Tap an item to try it on (free); the action bar then buys-and-wears, wears, or cancels. Nothing is charged for previewing. */
export function BoutiqueApp() {
  const appearance = useCharacterStore((s) => s.appearance);
  const ownedClothes = useCharacterStore((s) => s.ownedClothes);
  const money = useEconomyStore((s) => s.money);
  const [cat, setCat] = useState<BoutiqueSlot>('top');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const preview = previewId ? BOUTIQUE.find((b) => b.id === previewId) ?? null : null;
  const shown = useMemo(() => (preview ? applyItem(appearance, preview) : appearance), [appearance, preview]);
  const focus = preview ? (CATS.find((c) => c.id === preview.slot)?.focus ?? 'full') : (CATS.find((c) => c.id === cat)?.focus ?? 'full');
  const isOwned = (it: BoutiqueItem) => it.price === 0 || ownedClothes.includes(it.id);

  const confirm = () => {
    if (!preview) return;
    const state = useCharacterStore.getState();
    if (!state.ownedClothes.includes(preview.id)) {
      if (!useEconomyStore.getState().debit(preview.price, preview.name, 'purchase')) { sfx.error(); toast(copy.broke(), 'bad'); return; }
      state.own(preview.id); sfx.purchase();
    }
    useCharacterStore.getState().equip(preview); sfx.pop(); toast(`Wearing ${preview.name}`, 'good');
    setPreviewId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[46%] min-h-[11rem] shrink-0 bg-gradient-to-b from-rose-100 to-rose-200">
        <AvatarPreview appearance={shown} focus={focus} />
        {preview && <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-1 text-[11px] font-bold text-white">Trying on</span>}
      </div>
      <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto bg-slate-100 px-3 py-2">
        {CATS.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => { setCat(c.id); setPreviewId(null); }}>{c.label}</Chip>)}
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 pb-2">
        {BOUTIQUE.filter((b) => b.slot === cat).map((b) => {
          const on = worn(appearance, b), sel = previewId === b.id;
          return (
            <button key={b.id} onClick={() => { sfx.click(); setPreviewId(sel ? null : b.id); }} aria-pressed={sel}
              className={`flex w-full items-center gap-3 rounded-lg bg-white p-2.5 text-left shadow-sm ring-2 transition ${sel ? 'ring-accent' : 'ring-transparent'}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xl">{b.glyph}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold leading-tight text-slate-900">{b.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">{b.color && <i className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ background: b.color }} />}{on ? 'Wearing' : isOwned(b) ? 'Owned' : formatNaira(b.price)}</span>
              </span>
              {on && <Check size={18} className="text-accent" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      {preview && (
        <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white p-2.5">
          <button onClick={() => { sfx.close(); setPreviewId(null); }} className="h-11 rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-700">Cancel</button>
          <button onClick={confirm} disabled={!isOwned(preview) && money < preview.price} className="h-11 flex-1 rounded-lg bg-accent text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400">
            {isOwned(preview) ? 'Wear' : `Buy and wear · ${formatNaira(preview.price)}`}
          </button>
        </div>
      )}
    </div>
  );
}
