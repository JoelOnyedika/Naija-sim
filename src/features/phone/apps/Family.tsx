import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row } from '../ui';

const FAMILY = [{ id: 'mama', n: 'Mama', g: '👩🏾', r: 'Mother' }, { id: 'daddy', n: 'Daddy', g: '👨🏾‍🦳', r: 'Father' }, { id: 'ada', n: 'Ada', g: '👧🏾', r: 'Younger sister' }, { id: 'baba', n: 'Baba Tunde', g: '👴🏾', r: 'Grandfather' }];

/** Mock relationships (kept in this screen only). Persist in a store when the family system is built. */
export function FamilyApp() {
  const [bond, setBond] = useState<Record<string, number>>({ mama: 80, daddy: 65, ada: 70, baba: 55 });
  const bump = (id: string, n: number) => setBond((b) => ({ ...b, [id]: Math.min(100, b[id] + n) }));
  const call = (id: string) => { sfx.pop(); useStatsStore.getState().apply({ social: 6, happiness: 4 }); bump(id, 3); toast('Nice catch-up.', 'good'); };
  const gift = (id: string) => { if (!useEconomyStore.getState().debit(5000, `Gift to ${FAMILY.find((f) => f.id === id)?.n}`, 'transfer')) { sfx.error(); return toast('Not enough money.', 'bad'); } sfx.coin(); useStatsStore.getState().apply({ happiness: 5 }); bump(id, 8); toast(`${formatNaira(5000)} sent. They are proud of you.`, 'good'); };
  return (
    <div className="space-y-2 p-3">
      {FAMILY.map((f) => (
        <Card key={f.id}><Row glyph={f.g} title={f.n} sub={f.r} right={<span className="text-sm font-bold text-rose-500">❤ {bond[f.id]}</span>} />
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-rose-400 transition-all" style={{ width: `${bond[f.id]}%` }} /></div>
          <div className="mt-2 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => call(f.id)}>Call</Btn><Btn tone="green" className="flex-1" onClick={() => gift(f.id)}>Send {formatNaira(5000)}</Btn></div></Card>
      ))}
    </div>
  );
}
