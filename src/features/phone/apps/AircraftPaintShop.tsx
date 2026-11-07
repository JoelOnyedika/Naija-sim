import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { LIVERY_COLORS, LIVERY_PARTS, NAME_MAX, STRIPE_STYLES, cleanName, type AircraftDef, type Livery, type LiveryPart } from '@/data/aircraft';

const Preview = lazy(() => import('./AircraftPreview3D'));

/**
 * The paint shop. Opens when the player taps Buy (and from Repaint on an aircraft they own): a live 3D preview they can turn with
 * a finger, the name on the body, a colour for each part (body, wings and tail, engine, stripe, name) and a stripe style.
 * Nothing is charged until they press the button at the bottom.
 */
export function AircraftPaintShop({ def, initial, price, confirmLabel, onConfirm, onClose }: { def: AircraftDef; initial: Livery; price?: number; confirmLabel: string; onConfirm: (lv: Livery) => void; onClose: () => void }) {
  const [lv, setLv] = useState<Livery>(initial), [part, setPart] = useState<LiveryPart>('body');
  const set = (patch: Partial<Livery>) => setLv((x) => ({ ...x, ...patch }));
  const partLabel = (p: (typeof LIVERY_PARTS)[number]) => p.engineLabel?.[def.kind] ?? p.label;
  const current = lv[part];
  return createPortal(
    <AnimatePresence>
      <motion.div key="paint" className="fixed inset-0 z-[220] flex items-end justify-center bg-black/70 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div role="dialog" aria-label={`Paint your ${def.name}`} onClick={(e) => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0F141C] text-white shadow-2xl sm:rounded-3xl">
          <div className="flex items-start justify-between px-4 pb-1 pt-4">
            <div className="min-w-0 pr-2"><div className="font-display text-[17px] font-extrabold leading-tight">Paint shop</div><div className="truncate text-[12px] text-white/55">{def.name}</div></div>
            <button onClick={onClose} aria-label="Close paint shop" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><X size={18} /></button>
          </div>
          <div className="relative mx-3 h-[38vh] min-h-[200px] max-h-[300px] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-300/30 to-sky-100/10">
            <Suspense fallback={<div className="flex h-full items-center justify-center text-[12px] text-white/50">Rolling it out of the hangar…</div>}><Preview def={def} livery={lv} /></Suspense>
            <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10.5px] font-medium text-white/45">Drag to turn it</span>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Name on the body</span>
              <input value={lv.name} maxLength={NAME_MAX} onChange={(e) => set({ name: cleanName(e.target.value.slice(0, NAME_MAX + 4)) })} onBlur={() => set({ name: cleanName(lv.name) })} placeholder="Your name" aria-label="Name written on the aircraft"
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3 text-[15px] font-bold tracking-wide outline-none placeholder:text-white/30 focus:border-accent" />
            </label>
            <div>
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Part to colour">
                {LIVERY_PARTS.map((p) => (
                  <button key={p.id} role="tab" aria-selected={part === p.id} onClick={() => { sfx.click(); setPart(p.id); }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold ${part === p.id ? 'border-accent bg-accent/25' : 'border-white/10 bg-white/[0.06] text-white/75'}`}>
                    <span className="h-3.5 w-3.5 rounded-full border border-white/40" style={{ background: lv[p.id] }} />{partLabel(p)}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {LIVERY_COLORS.map((c) => (
                  <button key={c} onClick={() => { sfx.click(); set({ [part]: c } as Partial<Livery>); }} aria-label={`Colour ${c}`} aria-pressed={current.toUpperCase() === c}
                    className={`relative flex h-9 items-center justify-center rounded-xl border-2 ${current.toUpperCase() === c ? 'border-white' : 'border-white/10'}`} style={{ background: c }}>
                    {current.toUpperCase() === c && <Check size={15} className={c === '#FFFFFF' || c === '#F4F1EA' || c === '#F5C518' || c === '#C9CED1' ? 'text-black' : 'text-white'} />}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-white/75">Any other colour
                <input type="color" value={current} onChange={(e) => set({ [part]: e.target.value.toUpperCase() } as Partial<Livery>)} aria-label="Pick any colour" className="h-8 w-12 cursor-pointer rounded-md border-0 bg-transparent" />
              </label>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-white/50">Stripe</div>
              <div className="mt-1 grid grid-cols-5 gap-1.5">
                {STRIPE_STYLES.map((s) => (
                  <button key={s.id} onClick={() => { sfx.click(); set({ style: s.id }); }} aria-pressed={lv.style === s.id} className={`h-10 rounded-xl border text-[11.5px] font-bold ${lv.style === s.id ? 'border-accent bg-accent/25' : 'border-white/10 bg-white/[0.06] text-white/75'}`}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="pb-safe border-t border-white/10 bg-[#0F141C] px-4 pt-3">
            <button onClick={() => { sfx.purchase(); onConfirm({ ...lv, name: cleanName(lv.name) }); }} className="h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold active:brightness-110">{confirmLabel}{price !== undefined ? ` · ${formatNaira(price)}` : ''}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
