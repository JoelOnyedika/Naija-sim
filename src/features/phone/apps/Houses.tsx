import { useEffect, useMemo, useState } from 'react';
import { PropertyCard } from '@/features/houses/PropertyCard';
import { fireTask } from '@/game/tasks';
import { useStateId } from '@/stores/mapStore';
import { useUiStore } from '@/stores/uiStore';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/world/labels';
import { areasOfState, propertiesOfState } from '@/world/registry';
import type { PropertyCategory } from '@/types/world';
import { Chip, Empty } from '../ui';

type Sort = 'price' | 'priceDesc' | 'luxury';

/** Property marketplace. Everything it shows comes from the registry for the current state. */
export function HousesApp() {
  const stateId = useStateId();
  const areaFilter = useUiStore((s) => s.housesAreaFilter);
  const setArea = useUiStore((s) => s.setHousesArea);
  const [cat, setCat] = useState<PropertyCategory | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('price');
  useEffect(() => fireTask('app:houses'), []);

  const areas = areasOfState(stateId);
  // Only areas that currently have a listing get a filter chip (the others are still map districts).
  const listedAreas = areas.filter((a) => a.propertyIds.length > 0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return propertiesOfState(stateId)
      .filter((p) => (!areaFilter || p.areaId === areaFilter) && (!cat || p.category === cat) && (!s || p.name.toLowerCase().includes(s) || areas.find((a) => a.id === p.areaId)?.name.toLowerCase().includes(s)))
      .sort((a, b) => (sort === 'price' ? a.price - b.price : sort === 'priceDesc' ? b.price - a.price : b.luxuryLevel - a.luxuryLevel || a.price - b.price));
  }, [stateId, areaFilter, cat, q, sort, areas]);

  return (
    <div className="p-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search homes or areas" className="mb-2 w-full rounded-xl bg-white px-3.5 py-2.5 text-[16px] text-slate-900 shadow-sm outline-none" />
      <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto"><Chip active={!areaFilter} onClick={() => setArea(null)}>All areas</Chip>{listedAreas.map((a) => <Chip key={a.id} active={areaFilter === a.id} onClick={() => setArea(areaFilter === a.id ? null : a.id)}>{a.name}</Chip>)}</div>
      <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto"><Chip active={!cat} onClick={() => setCat(null)}>Any type</Chip>{CATEGORY_ORDER.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{CATEGORY_LABEL[c]}</Chip>)}
        <span className="mx-1 w-px shrink-0 bg-slate-300" />
        <Chip active={sort === 'price'} onClick={() => setSort('price')}>Cheapest</Chip><Chip active={sort === 'priceDesc'} onClick={() => setSort('priceDesc')}>Priciest</Chip><Chip active={sort === 'luxury'} onClick={() => setSort('luxury')}>Most luxurious</Chip></div>
      <div className="space-y-3">{list.length === 0 && <Empty>No homes match. Try another area.</Empty>}{list.map((p) => <PropertyCard key={p.id} property={p} />)}</div>
    </div>
  );
}
