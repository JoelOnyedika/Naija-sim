import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useAppsStore } from '@/stores/appsStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row } from '../ui';

const STAFF = [{ id: 'cleaner', n: 'House cleaner', g: '🧹', fee: 40000, perk: 'Keeps the house tidy (effects coming soon)' }, { id: 'cook', n: 'Personal cook', g: '👩🏾‍🍳', fee: 90000, perk: 'Cooks your meals (coming soon)' }, { id: 'driver', n: 'Driver', g: '🧑🏾‍✈️', fee: 120000, perk: 'Drives you around (coming soon)' }, { id: 'guard', n: 'Security guard', g: '💂🏾', fee: 70000, perk: 'Keeps the gate (coming soon)' }, { id: 'gardener', n: 'Gardener', g: '🧑🏾‍🌾', fee: 35000, perk: 'Tends the garden (coming soon)' }];

export function StaffApp() {
  const hired = useAppsStore((s) => s.staff);
  const hire = (id: string, n: string, fee: number) => {
    if (!useEconomyStore.getState().debit(fee, `Hired ${n}`, 'purchase')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    useAppsStore.getState().hire(id); sfx.purchase(); toast(`${n} hired.`, 'good');
  };
  return (
    <div className="space-y-2 p-3">
      {STAFF.map((s) => <Card key={s.id}><Row glyph={s.g} title={s.n} sub={s.perk} right={hired.includes(s.id) ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Hired</span> : <Btn onClick={() => hire(s.id, s.n, s.fee)}>{formatNaira(s.fee)}</Btn>} /></Card>)}
    </div>
  );
}
