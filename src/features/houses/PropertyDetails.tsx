import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { acquireProperty } from '@/game/housing';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { furnishableArea } from '@/world/layoutGeometry';
import { CATEGORY_LABEL, POSITIONING_LABEL, ctaLabel, listingLines } from '@/world/labels';
import { getArea, getLayout, getProperty, getState } from '@/world/registry';
import { PlanPreview } from './PlanPreview';

/** Property details + purchase confirmation. Global overlay so the phone and the map can both open it. */
export function PropertyDetails() {
  const id = useUiStore((s) => s.detailPropertyId);
  const close = () => useUiStore.getState().openProperty(null);
  const money = useEconomyStore((s) => s.money);
  const owned = usePropertyStore((s) => (id ? s.ownedIds.includes(id) : false));
  const active = usePropertyStore((s) => s.activeId === id);
  const p = id ? getProperty(id) : undefined;
  const layout = p ? getLayout(p.layoutId) : undefined;
  const area = p ? getArea(p.areaId) : undefined;
  const state = p ? getState(p.stateId) : undefined;
  const afford = !!p && (owned || money >= p.price);

  const act = () => {
    if (!p) return;
    const r = acquireProperty(p.id);
    if (!r.ok) { sfx.error(); toast(r.error ?? 'Could not complete that.', 'bad'); return; }
    sfx.purchase();
    toast(owned ? `Back home in ${p.name}.` : `Congratulations! ${p.name} is yours.`, 'good');
    close();
    usePhoneStore.getState().closePhone();
    useUiStore.getState().setMode('home');
  };

  return (
    <AnimatePresence>
      {p && layout && (
        <motion.div className="absolute inset-0 z-[88] flex items-end justify-center bg-black/55 px-2 pb-2 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div className="glass-dark max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[2rem] p-5" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wider text-danfo">{CATEGORY_LABEL[p.category]} · {state?.name}</p><h2 className="font-display text-2xl font-extrabold leading-tight">{p.name}</h2><p className="text-sm text-white/65">{area?.name} · {area ? POSITIONING_LABEL[area.positioning] : ''}</p></div>
              <button onClick={close} aria-label="Close" className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">✕</button>
            </div>
            <div className="mt-3"><PlanPreview layout={layout} /></div>
            <div className="mt-3 font-display text-3xl font-extrabold text-danfo">{formatNaira(p.price)}</div>
            <p className="mt-1 text-sm text-white/75">{p.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {listingLines(p).map((l) => <div key={l} className="rounded-xl bg-white/5 px-3 py-2 font-semibold">{l}</div>)}
              <div className="rounded-xl bg-white/5 px-3 py-2 font-semibold">{furnishableArea(getLayout(p.layoutId)!)} m² to furnish</div>
              <div className="col-span-2 rounded-xl bg-white/5 px-3 py-2"><span className="text-white/55">Luxury level </span><span className="font-bold">{p.luxuryLevel}/10</span></div>
            </dl>
            {area && <p className="mt-3 text-[13px] leading-snug text-white/60">{area.description}</p>}
            <Button size="lg" className="mt-4 w-full" disabled={active || !afford} onClick={act}>
              {active ? 'You live here' : !afford ? 'Not enough money' : owned ? 'Move back in' : ctaLabel(p)}
            </Button>
            {!afford && !owned && <p className="mt-2 text-center text-xs text-rose-300">You need {formatNaira(p.price - money)} more.</p>}
            <p className="mt-2 text-center text-[11px] text-white/40">Your furniture moves with you. Fixtures like the toilet stay.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
