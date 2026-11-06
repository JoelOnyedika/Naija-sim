import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useAppsStore } from '@/stores/appsStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { BODYGUARD } from '@/data/bodyguard';
import { dismissBodyguard, hasBodyguard, hireBodyguard } from '@/game/bodyguard';
import { useBodyguardStore } from '@/stores/bodyguardStore';
import { Btn, Card, Row } from '../ui';

const STAFF = [{ id: 'cleaner', n: 'House cleaner', g: '🧹', fee: 40000, perk: 'Keeps the house tidy (effects coming soon)' }, { id: 'cook', n: 'Personal cook', g: '👩🏾‍🍳', fee: 90000, perk: 'Cooks your meals (coming soon)' }, { id: 'driver', n: 'Driver', g: '🧑🏾‍✈️', fee: 120000, perk: 'Drives you around (coming soon)' }, { id: 'guard', n: 'Security guard', g: '💂🏾', fee: 70000, perk: 'Keeps the gate (coming soon)' }, { id: 'gardener', n: 'Gardener', g: '🧑🏾‍🌾', fee: 35000, perk: 'Tends the garden (coming soon)' }];

/** The bodyguard: a hiring fee, a weekly wage in the Bank, and what he has done for you. */
function BodyguardCard() {
  const hired = useBodyguardStore((s) => s.hired), stops = useBodyguardStore((s) => s.stops), active = useBodyguardStore((s) => s.hired && hasBodyguard());
  const hire = () => { const r = hireBodyguard(); if (r.ok) { sfx.purchase(); toast(r.message, 'good'); } else { sfx.error(); toast(r.message, 'bad'); } };
  return (
    <Card>
      <Row glyph={BODYGUARD.glyph} title={BODYGUARD.name} sub={hired ? (active ? `On duty. Stopped ${stops.agbero} Agbero roadblock${stops.agbero === 1 ? '' : 's'}${stops.thieves ? ` and ${stops.thieves} pickpocket${stops.thieves === 1 ? '' : 's'}` : ''}.` : 'Standing down: his wage is overdue. Pay it in the Bank, under Bills.') : BODYGUARD.blurb}
        right={hired ? <Btn onClick={() => { dismissBodyguard(); toast('Bodyguard dismissed.', 'info'); }}>Dismiss</Btn> : <Btn onClick={hire}>{formatNaira(BODYGUARD.hireFee)}</Btn>} />
      {!hired && <div className="px-3 pb-2 text-[11.5px] text-slate-500">Then {formatNaira(BODYGUARD.weekly)} a week, billed in the Bank.</div>}
    </Card>
  );
}

export function StaffApp() {
  const hired = useAppsStore((s) => s.staff);
  const hire = (id: string, n: string, fee: number) => {
    if (!useEconomyStore.getState().debit(fee, `Hired ${n}`, 'purchase')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    useAppsStore.getState().hire(id); sfx.purchase(); toast(`${n} hired.`, 'good');
  };
  return (
    <div className="space-y-2 p-3">
      <BodyguardCard />
      {STAFF.map((s) => <Card key={s.id}><Row glyph={s.g} title={s.n} sub={s.perk} right={hired.includes(s.id) ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Hired</span> : <Btn onClick={() => hire(s.id, s.n, s.fee)}>{formatNaira(s.fee)}</Btn>} /></Card>)}
    </div>
  );
}
