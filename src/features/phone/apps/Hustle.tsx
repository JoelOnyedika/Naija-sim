import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { useAppsStore } from '@/stores/appsStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row, Title } from '../ui';

/** Player-to-player gig marketplace (mock). Other players are NPCs until multiplayer exists. */
export function HustleApp() {
  const gigs = useAppsStore((s) => s.gigs);
  const [title, setTitle] = useState('');
  const [pay, setPay] = useState('5000');
  const take = (id: string, t: string, p: number) => {
    const ok = useStatsStore.getState().start({ label: t, seconds: 15, effects: { energy: -12, hunger: -4, charisma: 0.3 }, pose: 'stand', kind: 'job', payout: p, event: 'job:shift' });
    if (!ok) { sfx.error(); return toast('Finish what you are doing first', 'bad'); }
    useAppsStore.getState().takeGig(id); sfx.click(); toast('Gig accepted. Go and hustle.');
  };
  const post = () => {
    const p = Math.floor(Number(pay) || 0);
    if (!title.trim() || p <= 0) return toast('Add a title and a pay amount.', 'bad');
    if (!useEconomyStore.getState().debit(p, `Posted gig: ${title.trim()}`, 'purchase')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    useAppsStore.getState().postGig(title.trim(), p); setTitle(''); sfx.pop(); toast('Gig posted. A hustler will pick it up.', 'good');
  };
  return (
    <div className="p-3">
      <Title>Find work</Title>
      <div className="space-y-2">{gigs.filter((g) => !g.mine).map((g) => <Card key={g.id}><Row glyph="⚡" title={g.title} sub={`Posted by ${g.poster}`} right={g.taken ? <span className="text-xs font-bold text-slate-400">Taken</span> : <Btn tone="green" onClick={() => take(g.id, g.title, g.pay)}>{formatNaira(g.pay)}</Btn>} /></Card>)}</div>
      <Title>Post a gig</Title>
      <Card><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need done?" className="mb-2 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] outline-none" />
        <input inputMode="numeric" value={pay} onChange={(e) => setPay(e.target.value.replace(/\D/g, ''))} placeholder="Pay (₦)" className="mb-2 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] outline-none" /><Btn className="w-full" onClick={post}>Post gig</Btn></Card>
      {gigs.some((g) => g.mine) && (<><Title>Your gigs</Title><div className="space-y-2">{gigs.filter((g) => g.mine).map((g) => <Card key={g.id}><Row glyph="📌" title={g.title} sub="Waiting for a hustler" right={<b>{formatNaira(g.pay)}</b>} /></Card>)}</div></>)}
    </div>
  );
}
