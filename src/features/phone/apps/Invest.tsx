import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { ASSETS, useAppsStore } from '@/stores/appsStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row, Title } from '../ui';

export function InvestApp() {
  const { prices, holdings, trade } = useAppsStore();
  const value = ASSETS.reduce((s, a) => s + (holdings[a.id] ?? 0) * prices[a.id], 0);
  const buy = (id: string, name: string) => {
    const p = Math.round(prices[id]);
    if (!useEconomyStore.getState().debit(p, `Bought ${name}`, 'invest')) { sfx.error(); return toast('Not enough money.', 'bad'); }
    trade(id, 1); sfx.coin();
  };
  const sell = (id: string, name: string) => {
    if (!(holdings[id] > 0)) return;
    useEconomyStore.getState().credit(Math.round(prices[id]), `Sold ${name}`, 'invest'); trade(id, -1); sfx.coin();
  };
  return (
    <div className="p-3">
      <Card className="bg-emerald-50"><p className="text-xs text-slate-500">Portfolio value</p><p className="font-display text-2xl font-extrabold text-emerald-700">{formatNaira(value)}</p></Card>
      <Title>Markets (mock, moves live)</Title>
      <div className="space-y-2">{ASSETS.map((a) => { const up = prices[a.id] >= a.price; return (
        <Card key={a.id}><Row glyph={a.glyph} title={a.name} sub={`You hold ${holdings[a.id] ?? 0}`} right={<span className={`font-display font-extrabold tabular-nums ${up ? 'text-emerald-600' : 'text-rose-600'}`}>{formatNaira(prices[a.id])}</span>} />
          <div className="mt-2 flex gap-2"><Btn tone="green" className="flex-1" onClick={() => buy(a.id, a.name)}>Buy 1</Btn><Btn tone="light" className="flex-1" disabled={!(holdings[a.id] > 0)} onClick={() => sell(a.id, a.name)}>Sell 1</Btn></div></Card>
      ); })}</div>
      <p className="mt-3 text-center text-xs text-slate-400">Prototype prices. Higher risk means bigger swings.</p>
    </div>
  );
}
