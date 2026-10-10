import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { copy } from '@/data/copy';
import { FOODS, getFood } from '@/data/foods';
import { fireTask } from '@/game/tasks';
import { useAppsStore } from '@/stores/appsStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row, Title } from '../ui';

export function FoodApp() {
  const orders = useAppsStore((s) => s.orders);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const order = (id: string) => {
    const f = getFood(id)!;
    if (!useEconomyStore.getState().debit(f.price, `${f.name} (${f.vendor})`, 'food')) { sfx.error(); return toast(copy.broke(), 'bad'); }
    useAppsStore.getState().placeOrder(id, 12);
    sfx.purchase(); toast(`Order placed. ${f.vendor} dey cook.`, 'good'); fireTask('phone:food');
  };
  return (
    <div className="p-3">
      {orders.length > 0 && (<><Title>On the way</Title><div className="space-y-2">{orders.map((o) => <Card key={o.id} className="bg-amber-50"><Row glyph={getFood(o.foodId)?.glyph} title={getFood(o.foodId)?.name} sub={`Rider arrives in ${Math.max(0, Math.ceil((o.dueAt - Date.now()) / 1000))}s`} right={<span className="animate-pulse text-xl">🛵</span>} /></Card>)}</div></>)}
      <Title>Order now</Title>
      <div className="space-y-2">{FOODS.map((f) => <Card key={f.id}><Row glyph={f.glyph} title={f.name} sub={`${f.vendor} · ${f.blurb}`} right={<Btn tone="green" onClick={() => order(f.id)}>{formatNaira(f.price)}</Btn>} /></Card>)}</div>
      <p className="mt-3 text-center text-xs text-slate-400">Delivered food goes to your inventory. Eat it at the fridge.</p>
    </div>
  );
}
