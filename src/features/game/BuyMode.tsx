import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Eye, RotateCcw, RotateCw, Trash2, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CONFIG } from '@/data/config';
import { FURNITURE, ITEM_CATEGORIES, RARITY_COLOR, getFurniture, type ItemCategory } from '@/data/items';
import { FLOORS, WALLS, WALL_CATEGORIES, getFinish, type FinishDef, type WallCategory } from '@/data/finishes';
import { wallThumb } from '@/three/textures';
import { useFinishStore } from '@/stores/finishStore';
import { applyFinish, cancelFinishPreview, finishCost, previewFinish } from '@/game/finishes';
import { roomsOf } from '@/world/layoutGeometry';
import { getActiveHome } from '@/game/active';
import { beginPlace, cancelDraft, confirmDraft, exitBuild, nudgeDraft, rotateDraft, sellItem, storeItem } from '@/game/buy';
import { useEconomyStore } from '@/stores/economyStore';
import { useEditorStore, type Draft } from '@/stores/editorStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useUiStore } from '@/stores/uiStore';
import { priceOf } from '@/game/pricing';
import { describeItem } from '@/game/itemInfo';
import { useCameraStore } from '@/stores/cameraStore';

type Tab = ItemCategory | 'owned' | 'floors' | 'walls';
type Dir = 'forward' | 'back' | 'left' | 'right';

/** Press-and-hold repeats the action; always cleans its timers up on release, leave, cancel and unmount. */
function useHoldRepeat(action: () => void) {
  const timers = useRef<{ start?: number; rep?: number }>({});
  const act = useRef(action); act.current = action;
  const stop = () => { window.clearTimeout(timers.current.start); window.clearInterval(timers.current.rep); timers.current = {}; };
  useEffect(() => stop, []);
  return {
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); act.current(); stop(); timers.current.start = window.setTimeout(() => { timers.current.rep = window.setInterval(() => act.current(), 90); }, 380); },
    onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop,
  };
}

function PadButton({ dir, Icon, label }: { dir: Dir; Icon: typeof ArrowUp; label: string }) {
  const hold = useHoldRepeat(() => nudgeDraft(dir));
  return <button {...hold} aria-label={label} className="flex h-10 w-10 touch-none items-center justify-center rounded-lg bg-white/[0.08] text-white ring-1 ring-white/10 active:bg-accent"><Icon size={18} /></button>;
}

/** The top-right Build/Buy exit. Always visible (even while an item is selected) and independent of the catalogue. */
function ExitBar() {
  return (
    <motion.div className="pointer-events-auto absolute right-2 top-[calc(env(safe-area-inset-top,0px)+4.4rem)] z-[66]" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="panel flex items-center gap-2 rounded-lg py-1 pl-3 pr-1">
        <span className="flex items-center gap-1.5 text-[12px] font-bold"><span className="h-2 w-2 rounded-full bg-accent-glow" />Build / Buy</span>
        <button onClick={exitBuild} aria-label="Exit Build mode" className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"><X size={18} /></button>
      </div>
    </motion.div>
  );
}

/**
 * Placement controls for the selected item. It receives the draft as a prop on purpose: while the bar animates out
 * (after Place/Cancel clears the draft) the exiting copy keeps rendering the last draft instead of reading a now-null store.
 */
function PlacementBar({ draft }: { draft: Draft }) {
  const def = getFurniture(draft.defId);
  const money = useEconomyStore((s) => s.money);
  if (!def) return null;
  const cost = draft.purchase ? priceOf(def.price) : 0;
  const moving = !!draft.uid;
  const afford = money >= cost;
  return (
    <motion.div className="pb-safe absolute inset-x-0 bottom-0 z-[65] px-2" initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="panel mx-auto max-w-md rounded-xl p-3">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">{def.glyph}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-bold leading-tight">{def.name}</div>
            <div className={`text-[11.5px] font-semibold ${draft.valid ? 'text-emerald-300' : 'text-rose-300'}`}>{draft.valid ? 'Fits here. Drag it, or use the pad.' : 'Does not fit here.'}</div>
          </div>
          {draft.purchase && <div className={`font-display text-[15px] font-extrabold ${afford ? 'text-danfo' : 'text-rose-300'}`}>{formatNaira(cost)}</div>}
        </div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="grid grid-cols-3 gap-1" aria-label="Move item">
            <span /><PadButton dir="forward" Icon={ArrowUp} label="Move forward" /><span />
            <PadButton dir="left" Icon={ArrowLeft} label="Move left" /><PadButton dir="back" Icon={ArrowDown} label="Move back" /><PadButton dir="right" Icon={ArrowRight} label="Move right" />
          </div>
          {def.placement.rotatable && (
            <div className="flex flex-col gap-1">
              <button onClick={() => rotateDraft(-1)} aria-label="Rotate counter-clockwise" className="flex h-10 items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 text-[13px] font-semibold ring-1 ring-white/10 active:bg-accent"><RotateCcw size={16} />90°</button>
              <button onClick={() => rotateDraft(1)} aria-label="Rotate clockwise" className="flex h-10 items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 text-[13px] font-semibold ring-1 ring-white/10 active:bg-accent"><RotateCw size={16} />90°</button>
            </div>
          )}
          {moving && (
            <div className="flex flex-col gap-1">
              <button onClick={() => storeItem(draft.uid!)} aria-label="Store" className="flex h-10 items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 text-[13px] font-semibold ring-1 ring-white/10"><Undo2 size={16} />Store</button>
              <button onClick={() => sellItem(draft.uid!)} aria-label="Sell" className="flex h-10 items-center gap-1.5 rounded-lg bg-hibiscus/90 px-3 text-[13px] font-semibold"><Trash2 size={16} />+{formatNaira(Math.round(priceOf(def.price) * CONFIG.sellRefund))}</button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={cancelDraft} aria-label="Cancel" className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] px-4 text-sm font-semibold ring-1 ring-white/10"><X size={17} />Cancel</button>
          <button disabled={!draft.valid || !afford} onClick={() => confirmDraft()} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-[15px] font-bold text-white disabled:bg-white/10 disabled:text-white/35">
            <Check size={18} />{moving ? 'Done' : draft.purchase ? `Buy ${formatNaira(cost)}` : 'Place'}
          </button>
        </div>
        {!afford && <p className="mt-1.5 text-center text-xs text-rose-300">Omo, your money no reach. Hustle harder.</p>}
      </div>
    </motion.div>
  );
}

function FinishGrid({ tab }: { tab: 'floors' | 'walls' }) {
  const owned = useFinishStore((s) => s.owned);
  const applied = useFinishStore((s) => s.byProperty);
  const preview = useFinishStore((s) => s.preview);
  const money = useEconomyStore((s) => s.money);
  const home = getActiveHome();
  const kind = tab === 'floors' ? 'floor' : 'wall';
  const room = useFinishStore((s) => s.floorRoom);
  const rooms = home ? roomsOf(home.layout) : [];
  const ap = home ? applied[home.property.id] : undefined;
  const current = tab === 'floors' ? (room === 'all' ? ap?.floor : ap?.rooms?.[room]) : ap?.wall;
  const [cat, setCat] = useState<'all' | WallCategory>('all');
  const items: FinishDef[] = tab === 'floors' ? FLOORS : cat === 'all' ? WALLS : WALLS.filter((w) => w.category === cat);
  const setTab = useUiStore((s) => s.setCatalogTab);
  const seg = (id: 'floors' | 'walls', label: string) => (
    <button key={id} onClick={() => { sfx.click(); setTab(id); }} aria-pressed={tab === id} className={`flex-1 rounded-md py-1.5 text-[13px] font-bold ${tab === id ? 'bg-accent text-white' : 'text-white/65'}`}>{label}</button>
  );
  const catChip = (id: 'all' | WallCategory, label: string, n: number) => (
    <button key={id} onClick={() => setCat(id)} aria-pressed={cat === id} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${cat === id ? 'bg-accent text-white ring-accent' : 'bg-white/[0.08] text-white/75 ring-white/10'}`}>{label} <span className="opacity-60">{n}</span></button>
  );
  const chip = (id: string, label: string) => (
    <button key={id} onClick={() => useFinishStore.getState().setFloorRoom(id)} aria-pressed={room === id} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${room === id ? 'bg-accent text-white ring-accent' : 'bg-white/[0.08] text-white/80 ring-white/10'}`}>{label}</button>
  );
  return (
    <>
      <div className="col-span-full flex gap-1 rounded-lg bg-white/[0.06] p-1">{seg('floors', 'Floors')}{seg('walls', 'Walls')}</div>
      {tab === 'walls' && (
        <div className="no-scrollbar col-span-full -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {catChip('all', 'All', WALLS.length)}
          {WALL_CATEGORIES.map((c) => catChip(c.id, c.label, WALLS.filter((w) => w.category === c.id).length))}
        </div>
      )}
      {tab === 'floors' && (
        <div className="col-span-full -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {chip('all', 'Living & bedrooms')}
          {rooms.map((r) => chip(r.id, r.label + (rooms.filter((q) => q.label === r.label).length > 1 ? ` ${rooms.filter((q) => q.label === r.label).indexOf(r) + 1}` : '')))}
        </div>
      )}
      <p className="col-span-full -mb-0.5 text-[11.5px] text-white/55">{tab === 'floors' ? (room === 'all' ? 'Applies to the living areas and bedrooms. Kitchen and bathroom floors stay as they are.' : 'Applies to the chosen room only.') : 'Applies to every interior wall in this home. Outside walls stay as they are.'}</p>
      {items.map((f) => {
        const isOwned = owned.includes(f.id) || f.price === 0, on = preview[kind] === f.id, worn = current === f.id;
        return (
          <button key={f.id} onClick={() => previewFinish(f.id)} aria-pressed={on} className={`panel-solid relative flex flex-col items-center rounded-lg border-t-2 p-2 text-center active:scale-95 ${on ? 'border-accent ring-2 ring-accent' : 'border-white/10'}`}>
            <span className="h-11 w-full rounded-md ring-1 ring-white/15" style={f.kind === 'wall' && f.pattern ? { backgroundColor: f.swatch, backgroundImage: `url(${wallThumb(f.color, f.accent ?? '#999999', f.pattern)})`, backgroundSize: 'cover' } : { background: f.swatch }} />
            <span className="mt-1 line-clamp-2 min-h-[2rem] text-[11.5px] font-semibold leading-tight">{f.name}</span>
            <span className={`text-[12px] font-bold tabular-nums ${isOwned ? 'text-accent-glow' : money >= f.price ? 'text-white' : 'text-rose-300'}`}>{isOwned ? (f.price === 0 ? 'Included' : 'Owned') : formatNaira(f.price)}</span>
            {worn && <span className="absolute right-1 top-1.5 rounded bg-accent px-1.5 text-[10px] font-bold">In use</span>}
          </button>
        );
      })}
    </>
  );
}

/** Shown while a floor or wall is being tried on. Trying costs nothing; only Buy/Apply charges, once. */
function FinishBar({ id }: { id: string }) {
  const def = getFinish(id);
  const money = useEconomyStore((s) => s.money);
  const home = getActiveHome(), homeName = home?.property.name ?? 'this home';
  const scope = useFinishStore((s) => s.preview.floorRoom ?? 'all');
  const floorScope = scope === 'all' ? 'Living areas & bedrooms' : home ? roomsOf(home.layout).find((r) => r.id === scope)?.label ?? 'One room' : 'One room';
  if (!def) return null;
  const cost = finishCost(id);
  const afford = money >= cost;
  return (
    <motion.div className="pb-safe absolute inset-x-0 bottom-0 z-[65] px-2" initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="panel mx-auto max-w-md rounded-xl p-3">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-white/20" style={def.kind === 'wall' && def.pattern ? { backgroundColor: def.swatch, backgroundImage: `url(${wallThumb(def.color, def.accent ?? '#999999', def.pattern)})`, backgroundSize: 'cover' } : { background: def.swatch }} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-bold leading-tight">{def.name}</div>
            <div className="text-[11.5px] text-white/60">{def.kind === 'floor' ? floorScope : 'All interior walls'} · {homeName}</div>
          </div>
          <div className={`font-display text-[15px] font-extrabold ${cost === 0 ? 'text-accent-glow' : afford ? 'text-danfo' : 'text-rose-300'}`}>{cost === 0 ? 'Free' : formatNaira(cost)}</div>
        </div>
        <p className="mb-2 text-[11.5px] text-white/50">This is a preview. Nothing is charged until you confirm.</p>
        <div className="flex gap-2">
          <button onClick={cancelFinishPreview} aria-label="Cancel preview" className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] px-4 text-sm font-semibold ring-1 ring-white/10"><X size={17} />Cancel</button>
          <button disabled={!afford} onClick={() => applyFinish(def.kind)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-[15px] font-bold text-white disabled:bg-white/10 disabled:text-white/35">
            <Check size={18} />{cost === 0 ? 'Apply' : `Buy & apply ${formatNaira(cost)}`}
          </button>
        </div>
        {!afford && <p className="mt-1.5 text-center text-xs text-rose-300">Omo, your money no reach. Hustle harder.</p>}
      </div>
    </motion.div>
  );
}

/** The eye button's panel: what the item is, costs and does. Everything comes from describeItem(); decorative items say so. */
function ItemInfoSheet() {
  const id = useUiStore((s) => s.infoItemId);
  const close = () => useUiStore.getState().setInfoItem(null);
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id]);
  const def = id ? getFurniture(id) : undefined;
  const info = def ? describeItem(def) : null;
  return (
    <AnimatePresence>
      {info && def && (
        <motion.div key="info" className="pointer-events-auto absolute inset-0 z-[70] flex items-end justify-center bg-black/45 px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div role="dialog" aria-label={`${info.name} information`} onClick={(e) => e.stopPropagation()} className="panel pb-safe mb-2 max-h-[78vh] w-full max-w-md overflow-y-auto rounded-xl p-4" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-2xl">{def.glyph}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[17px] font-extrabold leading-tight">{info.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-white/65">
                  <span>{info.category}</span>
                  <span className="font-semibold" style={{ color: info.tierColor }}>{info.tier} tier</span>
                </div>
              </div>
              <button onClick={close} aria-label="Close information" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10"><X size={18} /></button>
            </div>
            <p className="mt-2 text-[13px] text-white/75">{info.description}</p>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2">
              <span className="text-[12px] text-white/60">Price</span>
              <span className="font-display text-[16px] font-extrabold text-danfo">{formatNaira(info.price)}</span>
            </div>
            <div className="mt-2 rounded-lg bg-white/[0.06] px-3 py-2 text-[12.5px]">
              <span className="font-bold">{info.functional ? 'Functional' : 'Decorative'}</span>
              {!info.functional && <span className="text-white/65"> · It looks good and adds to your home's style. It has no gameplay effect.</span>}
            </div>
            {info.activities.map((a) => (
              <div key={a.label} className="mt-2 rounded-lg bg-white/[0.06] px-3 py-2">
                <div className="flex items-center justify-between text-[13px] font-bold"><span>{a.label}</span><span className="text-[12px] font-semibold text-white/60">{a.seconds === null ? 'Time varies' : `${a.seconds}s`}</span></div>
                {a.cost > 0 && <div className="text-[12px] text-rose-300">Costs {formatNaira(a.cost)} each time</div>}
                {a.effects.length > 0 && <div className="mt-1 flex flex-wrap gap-1.5">{a.effects.map((e) => <span key={e.label} className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${e.delta > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{e.delta > 0 ? '+' : ''}{e.delta} {e.label}</span>)}</div>}
                {a.skill && <div className="mt-1 text-[12px] text-sky-300">{a.skill}</div>}
                {a.requires.length > 0 && <div className="mt-1 text-[12px] text-white/60">Needs: {a.requires.join('; ')}</div>}
              </div>
            ))}
            {info.passive.map((p) => <div key={p} className="mt-2 rounded-lg bg-white/[0.06] px-3 py-2 text-[12.5px] text-white/80">{p}</div>)}
            <button onClick={close} className="mt-3 h-11 w-full rounded-lg bg-white/10 text-sm font-semibold">Back to the catalogue</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Catalog() {
  const open = useUiStore((s) => s.catalogOpen);
  const setOpen = useUiStore((s) => s.setCatalogOpen);
  const money = useEconomyStore((s) => s.money);
  const inv = useInventoryStore((s) => s.items);
  const tab = useUiStore((s) => s.catalogTab) as Tab;
  const setTab = useUiStore((s) => s.setCatalogTab);
  const lastHouse = useRef<'floors' | 'walls'>('walls');
  if (tab === 'floors' || tab === 'walls') lastHouse.current = tab;
  const counts = useMemo(() => Object.fromEntries(ITEM_CATEGORIES.map((c) => [c.id, FURNITURE.filter((f) => f.category === c.id && !f.venue).length])) as Record<ItemCategory, number>, []);
  const ownedCount = FURNITURE.reduce((n, f) => n + (inv[f.id] ?? 0), 0);
  const list = tab === 'floors' || tab === 'walls' ? [] : tab === 'owned' ? FURNITURE.filter((f) => (inv[f.id] ?? 0) > 0) : FURNITURE.filter((f) => f.category === tab && !f.venue).sort((a, b) => priceOf(a.price) - priceOf(b.price));
  const catTabs: { id: Tab; label: string; icon: string }[] = ITEM_CATEGORIES.map((c) => ({ id: c.id as Tab, label: `${c.label} ${counts[c.id]}`, icon: c.icon }));
  // House Design (floors and walls) sits right after Storage. Internally it is the 'floors' / 'walls' tab pair, so saved finishes and previews work as before.
  const houseTab: { id: Tab; label: string; icon: string } = { id: lastHouse.current, label: `House Design ${FLOORS.length + WALLS.length}`, icon: '🏠' };
  const si = catTabs.findIndex((c) => c.id === 'storage');
  const tabs: { id: Tab; label: string; icon: string }[] = [...catTabs.slice(0, si + 1), houseTab, ...catTabs.slice(si + 1), { id: 'owned', label: `Owned ${ownedCount}`, icon: '🎒' }];

  return (
    <>
      <motion.div className="absolute inset-x-0 bottom-0 z-[65] flex justify-center px-2" initial={false} animate={{ y: open ? 0 : '104%' }} transition={{ type: 'spring', stiffness: 280, damping: 32 }} aria-hidden={!open}>
        <div className="panel w-full max-w-2xl rounded-t-xl p-2.5 pb-[5.2rem]">
          <div className="mb-2 flex items-center gap-2">
            <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Furniture categories">
              {tabs.map((c) => {
                const on = c.id === houseTab.id ? (tab === 'floors' || tab === 'walls') : tab === c.id;
                return (
                  <button key={c.id} role="tab" aria-selected={on} onClick={() => { sfx.click(); setTab(c.id); }} className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-2 text-[12.5px] font-semibold transition-colors ${on ? 'bg-accent text-white shadow-accent' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'}`}>
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => { sfx.close(); setOpen(false); }} aria-label="Close catalogue" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"><X size={18} /></button>
          </div>
          <div className={`no-scrollbar grid ${tab === 'floors' || tab === 'walls' ? 'max-h-[42vh]' : 'max-h-[30vh]'} grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pb-1 sm:grid-cols-4`}>
            {(tab === 'floors' || tab === 'walls') && <FinishGrid tab={tab} />}
            {tab !== 'floors' && tab !== 'walls' && list.length === 0 && <p className="col-span-full py-8 text-center text-sm text-white/55">Nothing here yet.</p>}
            {tab !== 'floors' && tab !== 'walls' && list.map((f) => {
              const owned = inv[f.id] ?? 0, price = priceOf(f.price), afford = money >= price;
              return (
                <div key={f.id} className="relative">
                  <button onClick={() => beginPlace(f.id)} className="panel-solid relative flex w-full flex-col items-center rounded-lg border-t-2 p-2 text-center active:scale-95 active:border-accent" style={{ borderTopColor: RARITY_COLOR[f.rarity] }}>
                    <span className="text-2xl">{f.glyph}</span>
                    <span className="mt-1 line-clamp-2 min-h-[2rem] text-[11.5px] font-semibold leading-tight">{f.name}</span>
                    <span className={`mt-0.5 text-[12px] font-bold tabular-nums ${tab === 'owned' ? 'text-accent-glow' : afford ? 'text-white' : 'text-rose-300'}`}>{tab === 'owned' ? 'Place' : formatNaira(price)}</span>
                    {owned > 0 && <span className="absolute right-1 top-1.5 rounded bg-accent px-1.5 text-[10px] font-bold">×{owned}</span>}
                  </button>
                  {/* sibling of the buy button (not inside it), so tapping the eye can never place or buy */}
                  <button onClick={() => { sfx.click(); useUiStore.getState().setInfoItem(f.id); }} aria-label={`About ${f.name}`} className="absolute left-1 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/90 ring-1 ring-white/15 active:bg-accent"><Eye size={15} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={() => { sfx.open(); setOpen(true); }} className="panel absolute bottom-[5.4rem] left-1/2 z-[65] flex h-11 -translate-x-1/2 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold">
            <span className="text-accent-glow">▲</span>Catalogue
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

/** Shown while the camera is zoomed on a freshly placed item: one tap returns to the normal view. */
function BackToRoom() {
  const focused = useCameraStore((s) => !!s.focus);
  return (
    <AnimatePresence>
      {focused && (
        <motion.button key="back" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={() => useCameraStore.getState().clearFocus()} className="panel pointer-events-auto absolute bottom-[6.5rem] left-1/2 z-[66] -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-bold">
          Back to room view
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Build/Buy mode. Three independent pieces: the session (ExitBar, shown for as long as the mode is active), the
 * catalogue sheet (open/closed on its own) and the placement bar (only while an item is selected).
 */
export function BuyMode() {
  const mode = useUiStore((s) => s.mode);
  const draft = useEditorStore((s) => s.draft);
  const finishId = useFinishStore((s) => s.preview.floor ?? s.preview.wall);

  // Whatever way Buy mode ends, an unconfirmed preview (furniture or finish) must not outlive it.
  useEffect(() => { if (mode !== 'buy') { useEditorStore.setState({ draft: null, dragging: false }); useFinishStore.getState().clearPreview(); useUiStore.getState().setInfoItem(null); } }, [mode]);
  // starting a placement or a finish try-on always dismisses an open information panel
  useEffect(() => { if (draft || finishId) useUiStore.getState().setInfoItem(null); }, [draft, finishId]);

  return (
    <AnimatePresence>
      {mode === 'buy' && (
        <motion.div key="buy" className="pointer-events-none absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ExitBar />
          <ItemInfoSheet />
          <BackToRoom />
          <div className="pointer-events-auto contents">
            <AnimatePresence mode="wait">
              {draft ? <PlacementBar key="bar" draft={draft} /> : finishId ? <FinishBar key={`fin-${finishId}`} id={finishId} /> : <motion.div key="cat" className="contents"><Catalog /></motion.div>}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
