import { motion } from 'framer-motion';
import { formatNaira } from '@/core/format';
import { useUiStore } from '@/stores/uiStore';
import { usePropertyStore } from '@/stores/propertyStore';
import type { PropertyDefinition } from '@/types/world';
import { ctaLabel, listingLines } from '@/world/labels';
import { getArea } from '@/world/registry';

const LEVEL: Record<number, string> = { 1: '#9BB3A8', 2: '#9BB3A8', 3: '#4ADE80', 4: '#4ADE80', 5: '#38BDF8', 6: '#38BDF8', 7: '#C084FC', 8: '#C084FC', 9: '#FFC21A', 10: '#FFC21A' };

/** A marketplace listing. Reads only property/area data, so it works for every state. */
export function PropertyCard({ property: p }: { property: PropertyDefinition }) {
  const open = useUiStore((s) => s.openProperty);
  const owned = usePropertyStore((s) => s.ownedIds.includes(p.id));
  const active = usePropertyStore((s) => s.activeId === p.id);
  const area = getArea(p.areaId);
  return (
    <motion.div layout whileTap={{ scale: 0.985 }} className="overflow-hidden rounded-3xl bg-white text-slate-900 shadow-lg" onClick={() => open(p.id)}>
      <div className="h-1.5" style={{ background: LEVEL[p.luxuryLevel] }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="font-display text-lg font-extrabold leading-tight">{p.name}</h3><p className="text-sm font-semibold text-slate-500">{area?.name}</p></div>
          {active ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Your home</span> : owned ? <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-700">Owned</span> : null}
        </div>
        <div className="mt-1 font-display text-2xl font-extrabold text-emerald-700">{formatNaira(p.price)}</div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] font-medium text-slate-600">{listingLines(p).map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="mt-2 text-[13px] leading-snug text-slate-500">{p.description}</p>
        <div className="mt-3 rounded-2xl bg-slate-900 py-2.5 text-center text-sm font-bold tracking-wide text-white">{owned ? (active ? 'VIEW' : 'MOVE BACK IN') : ctaLabel(p)}</div>
      </div>
    </motion.div>
  );
}
