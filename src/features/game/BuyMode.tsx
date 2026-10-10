import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, RotateCw, Trash2, Undo2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CONFIG } from '@/data/config';
import { FURNITURE, ITEM_CATEGORIES, RARITY_COLOR, getFurniture, type ItemCategory } from '@/data/items';
import { beginPlace, cancelDraft, confirmDraft, rotateDraft, sellItem, storeItem } from '@/game/buy';
import { useEconomyStore } from '@/stores/economyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useUiStore } from '@/stores/uiStore';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Button } from '@/ui/Button';

type Tab = ItemCategory | 'owned';

function Budget() {
  const money = useEconomyStore((s) => s.money);
  const spent = useUiStore((s) => s.buySpent);
  return (
    <motion.div className="pointer-events-none absolute left-3 top-[8.4rem] z-30" initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
      <div className="glass-dark rounded-2xl px-3.5 py-2.5">
        <div className="text-[11px] font-semibold text-white/60">Apartment Budget</div>
        <div className="font-display text-lg font-extrabold text-danfo"><AnimatedNumber value={money} /></div>
        <div className="mt-1 text-[11px] font-semibold text-white/60">Spent</div>
        <div className="font-display text-base font-bold text-rose-300"><AnimatedNumber value={Math.max(0, spent)} /></div>
      </div>
    </motion.div>
  );
}

function PlacementBar() {
  const draft = useEditorStore((s) => s.draft)!;
  const def = getFurniture(draft.defId)!;
  const money = useEconomyStore((s) => s.money);
  const cost = draft.purchase ? def.price : 0;
  const moving = !!draft.uid;
  const afford = money >= cost;
  return (
    <motion.div className="pb-safe absolute inset-x-0 bottom-0 z-[65] px-3" initial={{ y: 140 }} animate={{ y: 0 }} exit={{ y: 140 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="glass-dark mx-auto max-w-md rounded-[1.75rem] p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">{def.glyph}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-bold">{def.name}</div>
            <div className={`text-xs font-semibold ${draft.valid ? 'text-emerald-300' : 'text-rose-300'}`}>{draft.valid ? 'Looks good here. Drag or tap the floor to move it.' : 'Does not fit here. Try another spot.'}</div>
          </div>
          {draft.purchase && <div className={`font-display text-lg font-extrabold ${afford ? 'text-danfo' : 'text-rose-300'}`}>{formatNaira(def.price)}</div>}
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={cancelDraft} aria-label="Cancel"><X size={18} /></Button>
          {def.placement.rotatable && <Button variant="glass" size="sm" onClick={rotateDraft}><RotateCw size={16} />Rotate</Button>}
          {moving && <Button variant="glass" size="sm" onClick={() => storeItem(draft.uid!)} aria-label="Store"><Undo2 size={16} />Store</Button>}
          {moving && <Button variant="danger" size="sm" onClick={() => sellItem(draft.uid!)} aria-label="Sell"><Trash2 size={16} />+{formatNaira(Math.round(def.price * CONFIG.sellRefund))}</Button>}
          <Button className="flex-1" size="sm" disabled={!draft.valid || !afford} onClick={() => confirmDraft()}>
            <Check size={18} />{moving ? 'Done' : draft.purchase ? 'Buy' : 'Place'}
          </Button>
        </div>
        {!afford && <p className="mt-2 text-center text-xs text-rose-300">Omo, your money no reach. Hustle harder.</p>}
      </div>
    </motion.div>
  );
}

function Catalog() {
  const open = useUiStore((s) => s.catalogOpen);
  const setOpen = useUiStore((s) => s.setCatalogOpen);
  const money = useEconomyStore((s) => s.money);
  const inv = useInventoryStore((s) => s.items);
  const [tab, setTab] = useState<Tab>('sleep');
  const counts = useMemo(() => Object.fromEntries(ITEM_CATEGORIES.map((c) => [c.id, FURNITURE.filter((f) => f.category === c.id).length])) as Record<ItemCategory, number>, []);
  const ownedCount = FURNITURE.reduce((n, f) => n + (inv[f.id] ?? 0), 0);
  const list = tab === 'owned' ? FURNITURE.filter((f) => (inv[f.id] ?? 0) > 0) : FURNITURE.filter((f) => f.category === tab).sort((a, b) => a.price - b.price);

  return (
    <>
      <motion.div className="absolute inset-x-0 bottom-0 z-[65] flex justify-center px-2" initial={false} animate={{ y: open ? 0 : '104%' }} transition={{ type: 'spring', stiffness: 280, damping: 32 }}>
        <div className="glass-dark w-full max-w-2xl rounded-t-[2rem] p-3 pb-[5.8rem]">
          <div className="mb-2 flex items-center gap-2">
            <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {[...ITEM_CATEGORIES.map((c) => ({ id: c.id as Tab, label: `${c.label} (${counts[c.id]})`, icon: c.icon })), { id: 'owned' as Tab, label: `Owned (${ownedCount})`, icon: '🎒' }].map((c) => (
                <button key={c.id} onClick={() => { sfx.click(); setTab(c.id); }} className="relative shrink-0 rounded-full px-3 py-2 text-[13px] font-semibold">
                  {tab === c.id && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-danfo" />}
                  <span className={`relative ${tab === c.id ? 'text-night' : 'text-white/80'}`}>{c.icon} {c.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { sfx.close(); setOpen(false); }} aria-label="Hide catalog" className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full"><ChevronDown size={18} /></button>
          </div>
          <div className="no-scrollbar grid max-h-[40vh] grid-cols-3 gap-2 overflow-y-auto pb-1 sm:grid-cols-4">
            {list.length === 0 && <p className="col-span-full py-8 text-center text-sm text-white/55">Nothing here yet.</p>}
            {list.map((f) => {
              const owned = inv[f.id] ?? 0, afford = money >= f.price;
              return (
                <motion.button key={f.id} whileTap={{ scale: 0.95 }} onClick={() => beginPlace(f.id)} className="relative flex flex-col items-center rounded-2xl p-2 text-center ring-1" style={{ background: `linear-gradient(160deg, ${RARITY_COLOR[f.rarity]}22, rgba(255,255,255,0.04))`, borderColor: RARITY_COLOR[f.rarity], boxShadow: `inset 0 0 0 1px ${RARITY_COLOR[f.rarity]}55` }}>
                  <span className="text-3xl drop-shadow">{f.glyph}</span>
                  <span className="mt-1 line-clamp-2 min-h-[2rem] text-[12px] font-semibold leading-tight">{f.name}</span>
                  <span className={`mt-0.5 text-[12px] font-bold ${owned && tab === 'owned' ? 'text-emerald-300' : afford ? 'text-danfo' : 'text-rose-300'}`}>{tab === 'owned' ? 'Place' : formatNaira(f.price)}</span>
                  {owned > 0 && <span className="absolute right-1.5 top-1.5 rounded-md bg-night/80 px-1.5 text-[10px] font-bold">×{owned}</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={() => { sfx.open(); setOpen(true); }} className="glass-dark absolute bottom-[5.8rem] left-1/2 z-[65] flex -translate-x-1/2 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold">
            <ChevronUp size={16} />Catalog
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

/** Buy mode: the catalog slides up over the live 3D home; a ghost + action bar handle placement. */
export function BuyMode() {
  const mode = useUiStore((s) => s.mode);
  const draft = useEditorStore((s) => s.draft);
  const catalogOpen = useUiStore((s) => s.catalogOpen);
  return (
    <AnimatePresence>
      {mode === 'buy' && (
        <motion.div key="buy" className="pointer-events-none absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="pointer-events-none contents"><Budget /></div>
          <div className="pointer-events-auto contents">
            <AnimatePresence mode="wait">
              {draft ? <PlacementBar key="bar" /> : <motion.div key="cat" className="contents"><Catalog /></motion.div>}
            </AnimatePresence>
          </div>
          {!draft && catalogOpen && <div />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
