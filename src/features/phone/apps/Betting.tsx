import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, Title } from '../ui';

const MATCHES = [
  { id: 1, a: 'Super Eagles', b: 'Ghana', odds: [2.05, 3.3, 3.6] },
  { id: 2, a: 'Rivers United', b: 'Enyimba', odds: [2.4, 3.0, 2.9] },
  { id: 3, a: 'Naija Lions', b: 'Kano Pillars', odds: [1.6, 3.8, 5.2] },
];

export function BettingApp() {
  const [pick, setPick] = useState<{ m: number; o: number } | null>(null);
  const [stake, setStake] = useState('1000');
  const [last, setLast] = useState<string | null>(null);
  const place = () => {
    if (!pick) return toast('Pick an outcome first.', 'bad');
    const s = Math.floor(Number(stake) || 0), m = MATCHES.find((x) => x.id === pick.m)!, odds = m.odds[pick.o];
    if (s <= 0 || !useEconomyStore.getState().debit(s, `Bet: ${m.a} v ${m.b}`, 'bet')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    const probs = m.odds.map((o) => 1 / o), sum = probs.reduce((x, y) => x + y, 0);
    let r = Math.random() * sum, win = 0; for (let i = 0; i < probs.length; i++) { r -= probs[i]; if (r <= 0) { win = i; break; } }
    if (win === pick.o) { const pay = Math.round(s * odds); useEconomyStore.getState().credit(pay, `Bet won: ${m.a} v ${m.b}`, 'bet'); sfx.win(); setLast(`You won ${formatNaira(pay)}!`); }
    else { sfx.lose(); setLast('Omo, you lost this one.'); }
    setPick(null);
  };
  return (
    <div className="p-3">
      <Card className="mb-2 bg-violet-50 text-xs text-slate-600">Mock betting for the prototype. The house always has an edge. Bet small, bet wise.</Card>
      {MATCHES.map((m) => (
        <Card key={m.id} className="mb-2"><p className="mb-2 text-sm font-bold">{m.a} vs {m.b}</p>
          <div className="grid grid-cols-3 gap-2">{['1', 'X', '2'].map((l, i) => (
            <button key={l} onClick={() => { sfx.click(); setPick({ m: m.id, o: i }); }} className={`rounded-xl py-2 text-sm font-bold ${pick?.m === m.id && pick.o === i ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>{l}<span className="block text-xs font-medium opacity-70">{m.odds[i]}</span></button>
          ))}</div></Card>
      ))}
      <Title>Stake</Title>
      <Card><div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">{['500', '1000', '5000', '20000'].map((v) => <Chip key={v} active={stake === v} onClick={() => setStake(v)}>{formatNaira(+v)}</Chip>)}</div>
        <Btn className="w-full" onClick={place}>Place bet</Btn>{last && <p className="mt-2 text-center text-sm font-bold">{last}</p>}</Card>
    </div>
  );
}
