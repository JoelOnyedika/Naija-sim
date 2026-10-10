import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useAppsStore } from '@/stores/appsStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row } from '../ui';

const COMPANIES = [{ id: 'mamaput', n: 'Mama Put franchise', g: '🍛', price: 2_500_000 }, { id: 'dispatch', n: 'Dispatch riders company', g: '🏍️', price: 8_000_000 }, { id: 'tech', n: 'Yaba tech startup', g: '💻', price: 25_000_000 }, { id: 'estate', n: 'Estate agency', g: '🏘️', price: 60_000_000 }];

export function CompaniesApp() {
  const owned = useAppsStore((s) => s.companies);
  const buy = (id: string, n: string, price: number) => {
    if (!useEconomyStore.getState().debit(price, `Bought ${n}`, 'purchase')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    useAppsStore.getState().buyCompany(id); sfx.purchase(); toast(`${n} is yours. Income comes in a later update.`, 'good');
  };
  return (
    <div className="space-y-2 p-3">
      {COMPANIES.map((c) => <Card key={c.id}><Row glyph={c.g} title={c.n} sub="Company income: coming soon" right={owned.includes(c.id) ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Owned</span> : <Btn onClick={() => buy(c.id, c.n, c.price)}>{formatNaira(c.price)}</Btn>} /></Card>)}
    </div>
  );
}
