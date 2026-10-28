import { AnimatePresence, motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { blockedReason, usesOf } from '@/data/activities';
import { getFurniture } from '@/data/items';
import { useActiveHome } from '@/game/active';
import { chooseActivity } from '@/game/interactions';
import { describeUse } from '@/game/itemInfo';
import { useEconomyStore } from '@/stores/economyStore';
import { MOOD_LABEL, petBlockedReason, petMood } from '@/game/petCare';
import { usePetStore } from '@/stores/petStore';
import { useSkillStore } from '@/stores/skillStore';
import { useUiStore } from '@/stores/uiStore';
import { TaskCard } from '@/ui/TaskCard';

const CARD_W = 232; // px; the next card peeks in from the right so it is obvious the row scrolls

/**
 * The action menu for objects with several activities. A short bottom sheet with a swipeable row of cards: swipe sideways
 * to browse, tap Start on the one you want. Each card shows what it costs, needs, changes and pays BEFORE you start, and a
 * locked card says what is missing. Nothing is charged here: the cost is taken, and effects applied, only once the character
 * has walked over and the activity really starts.
 */
export function ActionMenu() {
  const uid = useUiStore((s) => s.actionMenuUid);
  const close = () => useUiStore.getState().setActionMenu(null);
  const home = useActiveHome();
  const money = useEconomyStore((s) => s.money);
  useSkillStore((s) => s.xp); // re-render when XP changes (level gates)
  const item = uid ? home?.placed.find((p) => p.uid === uid) : undefined;
  const def = item ? getFurniture(item.defId) : undefined;
  const uses = usesOf(def);
  const pet = usePetStore((s) => (uid ? s.pets[uid] : undefined));
  const row = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [uid]);
  useEffect(() => {
    if (!uid) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [uid]);
  // the menu must go away if the object was sold, moved to storage or the player left the home
  useEffect(() => { if (uid && !item) close(); }, [uid, item]);

  const onScroll = () => { const r = row.current; if (r) setPage(Math.min(uses.length - 1, Math.round(r.scrollLeft / (CARD_W + 12)))); };
  // Touch scrolls the row natively. On desktop, drag with the mouse and turn the wheel into sideways scrolling as well.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && row.current) drag.current = { x: e.clientX, left: row.current.scrollLeft, moved: false }; };
  const onPointerMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || !row.current) return; if (Math.abs(e.clientX - d.x) > 4) d.moved = true; if (d.moved) { row.current.style.scrollSnapType = 'none'; row.current.style.scrollBehavior = 'auto'; row.current.scrollLeft = d.left - (e.clientX - d.x); } };
  const endDrag = () => { if (row.current) { row.current.style.scrollSnapType = ''; row.current.style.scrollBehavior = ''; } drag.current = null; };
  const onWheel = (e: React.WheelEvent) => { if (row.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) row.current.scrollLeft += e.deltaY; };
  const goTo = (i: number) => row.current?.scrollTo({ left: i * (CARD_W + 12), behavior: 'smooth' });

  return (
    <AnimatePresence>
      {item && def && (
        <motion.div key="menu" className="pointer-events-auto absolute inset-0 z-[88] flex items-end justify-center bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div role="dialog" aria-label={`${def.name} actions`} onClick={(e) => e.stopPropagation()} className="pb-safe mb-[5.4rem] w-full max-w-md rounded-2xl border border-white/10 bg-night/95 pb-3 pt-3 shadow-glass backdrop-blur" initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
            <div className="flex items-center gap-2.5 px-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xl">{def.glyph}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[16px] font-extrabold leading-tight">{def.name}</div>
                <div className="text-[12px] text-white/55">{uses.length} things to do · swipe to browse</div>
              </div>
              <button onClick={close} aria-label="Close actions" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><X size={18} /></button>
            </div>

            {pet && (
              <div className="mx-4 mt-2.5 rounded-xl bg-white/[0.06] px-3 py-2" aria-label="Pet status">
                <div className="flex items-center justify-between text-[13px] font-bold"><span>{pet.name}</span><span className="text-[12px] font-semibold text-white/70">{MOOD_LABEL[petMood(pet)].glyph} {MOOD_LABEL[petMood(pet)].label}</span></div>
                <div className="mt-1.5 grid grid-cols-2 gap-3 text-[11.5px] text-white/65">
                  <div>Bond <span className="font-semibold text-pink-300">{Math.round(pet.bond)}</span><div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-pink-400" style={{ width: `${pet.bond}%` }} /></div></div>
                  <div>Hunger <span className="font-semibold text-amber-300">{Math.round(pet.hunger)}</span><div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${pet.hunger}%` }} /></div></div>
                </div>
              </div>
            )}
            <div ref={row} onScroll={onScroll} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag} onWheel={onWheel} className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollPaddingLeft: 16 }}>
              {uses.map((u) => {
                const d = describeUse(u);
                const why = blockedReason(u, home?.placed ?? [], (id) => useSkillStore.getState().level(id)) ?? (item ? petBlockedReason(u, item.uid) : null) ?? (u.cost && money < u.cost ? 'You cannot afford this yet.' : null);
                return (
                  <div key={u.id ?? u.label} className="snap-start">
                    <TaskCard width={CARD_W} glyph={d.glyph} title={d.label} seconds={u.seconds} cost={d.cost} risk={u.risk ? { chance: u.risk.winChance } : undefined} winMoney={u.risk?.winMoney} effects={d.effects} skill={d.skill} locked={!!why} footer={why ? (
                      <div className="flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-2.5 py-2 text-[12px] font-semibold leading-snug text-amber-300"><Lock size={14} className="mt-0.5 shrink-0" />{why}</div>
                    ) : (
                      <button onClick={() => chooseActivity(item, u.id ?? '')} className="h-11 w-full rounded-xl bg-accent text-[14px] font-extrabold shadow-lg active:scale-95">Start</button>
                    )} />
                  </div>
                );
              })}
              <div className="w-1 shrink-0" aria-hidden />
            </div>

            <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
              {uses.map((u, i) => <button key={u.id ?? i} tabIndex={-1} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${i === page ? 'w-5 bg-accent' : 'w-1.5 bg-white/25'}`} />)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
