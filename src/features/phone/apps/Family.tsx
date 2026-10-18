import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Note, Progress, Row, Title } from '../ui';

const FAMILY = [{ id: 'mama', n: 'Mama', g: '👩🏾', r: 'Mother' }, { id: 'daddy', n: 'Daddy', g: '👨🏾‍🦳', r: 'Father' }, { id: 'ada', n: 'Ada', g: '👧🏾', r: 'Younger sister' }, { id: 'baba', n: 'Baba Ade', g: '👴🏾', r: 'Grandfather' }];
const GIFT = 5000;

/** Relationship status plus the scripted family. Marriage is NOT available: only the data model for it exists (stores/familyStore.ts). */
export function FamilyApp() {
  const bonds = useFamilyStore((s) => s.bonds), status = useFamilyStore((s) => s.status), showRel = useSettingsStore((s) => s.showRelationship);
  const call = (id: string) => { sfx.pop(); useStatsStore.getState().apply({ social: 6, happiness: 4 }); useFamilyStore.getState().bump(id, 3); toast('Nice catch-up.', 'good'); };
  const gift = (id: string) => {
    if (!useEconomyStore.getState().debit(GIFT, `Gift to ${FAMILY.find((f) => f.id === id)?.n}`, 'transfer')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    sfx.coin(); useFamilyStore.getState().bump(id, 6); useStatsStore.getState().apply({ happiness: 5 }); toast('They loved it.', 'good');
  };
  return (
    <div className="space-y-2 p-3">
      <Card><Row glyph="💍" title="Relationship status" sub={showRel ? 'Visible on your profile' : 'Hidden from your profile (change in Settings)'} right={<span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700">{status === 'single' ? 'Single' : status}</span>} />
        <Btn tone="light" className="mt-2 w-full" disabled>Marriage: coming later</Btn></Card>
      <Title>Family</Title>
      {FAMILY.map((f) => (
        <Card key={f.id}><Row glyph={f.g} title={f.n} sub={f.r} right={<span className="text-sm font-bold text-rose-500">❤ {bonds[f.id] ?? 50}</span>} />
          <div className="mt-2"><Progress label={`Bond with ${f.n}`} value={bonds[f.id] ?? 50} max={100} /></div>
          <div className="mt-2 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => call(f.id)}>Call</Btn><Btn tone="green" className="flex-1" onClick={() => gift(f.id)}>Send {formatNaira(GIFT)}</Btn></div></Card>
      ))}
      <Note>Family characters are scripted. Your bond with each one is saved with your game.</Note>
    </div>
  );
}
