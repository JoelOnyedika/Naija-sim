import { Archive, Minus, Package, Plus, ShoppingCart, Store } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CATEGORIES, GROCERY, PRODUCTS, getProduct, type GroceryCategory, type Product } from '@/data/grocery';
import { addToCart, cartTotals, checkout, clearCart, setQty } from '@/game/grocery';
import { useEconomyStore } from '@/stores/economyStore';
import { useGroceryStore } from '@/stores/groceryStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, Note, Row, SearchField, Tabs, Title } from '../../ui';

const Stepper = ({ id, qty }: { id: string; qty: number }) => (
  <div className="flex items-center gap-1" role="group" aria-label="Quantity">
    <button aria-label="Decrease" onClick={() => { sfx.click(); setQty(id, qty - 1); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"><Minus size={14} /></button>
    <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{qty}</span>
    <button aria-label="Increase" onClick={() => { sfx.click(); const r = addToCart(id); if (!r.ok) toast(r.error, 'bad'); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"><Plus size={14} /></button>
  </div>
);

function ProductCard({ p }: { p: Product }) {
  const qty = useGroceryStore((s) => s.cart[p.id] ?? 0);
  return (
    <div className="flex flex-col rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex h-20 items-center justify-center rounded-xl bg-emerald-50 text-5xl" aria-hidden>{p.glyph}</div>
      <p className="mt-2 text-[13.5px] font-bold leading-tight">{p.name}</p><p className="text-[11px] text-slate-500">{p.unit} · {p.vendor}</p>
      <div className="mt-2 flex items-center justify-between"><b className="font-display text-sm tabular-nums">{formatNaira(p.price)}</b>{qty > 0 ? <Stepper id={p.id} qty={qty} /> : <button onClick={() => { sfx.pop(); addToCart(p.id); }} className="rounded-full bg-emerald-600 px-3 py-1.5 text-[13px] font-bold text-white" aria-label={`Add ${p.name} to cart`}>Add</button>}</div>
    </div>
  );
}

function Shop() {
  const [cat, setCat] = useState<GroceryCategory | 'All'>('All'), [q, setQ] = useState('');
  const n = q.trim().toLowerCase();
  const list = PRODUCTS.filter((p) => (cat === 'All' || p.category === cat) && (!n || `${p.name} ${p.vendor}`.toLowerCase().includes(n)));
  return (
    <div className="p-3">
      <SearchField label="Search groceries" value={q} onChange={setQ} placeholder="Search rice, yam, eggs..." />
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Category">{(['All', ...CATEGORIES] as const).map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      {list.length === 0 ? <Card className="mt-2"><EmptyState glyph="🔎" title="Nothing found">Try another word or category.</EmptyState></Card> : <div className="mt-2 grid grid-cols-2 gap-2">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      <Note>Free delivery from {formatNaira(GROCERY.freeDeliveryFrom)}, otherwise {formatNaira(GROCERY.deliveryFee)}.</Note>
    </div>
  );
}

function Cart({ shop, orders }: { shop: () => void; orders: () => void }) {
  const cart = useGroceryStore((s) => s.cart), money = useEconomyStore((s) => s.money);
  const t = cartTotals(cart), [review, setReview] = useState(false);
  if (t.lines.length === 0) return <Card className="m-3"><EmptyState glyph="🛒" title="Your cart is empty">Add something from the shop.</EmptyState><Btn className="w-full !bg-emerald-600" onClick={shop}>Start shopping</Btn></Card>;
  const place = () => { const r = checkout(); setReview(false); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; } sfx.purchase(); toast(`Order ${r.id} placed`, 'good'); orders(); };
  return (
    <div className="p-3">
      <div className="space-y-2">{t.lines.map((l) => <Card key={l.productId} className="!p-3"><div className="flex items-center gap-3"><span className="text-3xl" aria-hidden>{l.glyph}</span><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold">{l.name}</p><p className="text-xs text-slate-500">{formatNaira(l.unitPrice)} each · {formatNaira(l.lineTotal)}</p></div><Stepper id={l.productId} qty={l.qty} /></div></Card>)}</div>
      <Title>Summary</Title>
      <Card><div className="space-y-1 text-[13.5px]"><div className="flex justify-between"><span className="text-slate-500">Subtotal ({t.count} items)</span><b>{formatNaira(t.subtotal)}</b></div><div className="flex justify-between"><span className="text-slate-500">Delivery</span><b>{t.delivery ? formatNaira(t.delivery) : 'Free'}</b></div><div className="flex justify-between border-t border-slate-200 pt-1.5 text-base"><b>Total</b><b className="font-display">{formatNaira(t.total)}</b></div></div>
        {t.total > money && <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">You need {formatNaira(t.total - money)} more.</p>}</Card>
      {!review ? <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => clearCart()}>Clear</Btn><Btn className="flex-1 !bg-emerald-600" disabled={t.total > money} onClick={() => setReview(true)}>Review order</Btn></div> : (
        <Card className="mt-3 border-2 border-emerald-600"><p className="text-[13px]">Pay <b>{formatNaira(t.total)}</b> from your wallet for {t.count} items?</p><div className="mt-2 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setReview(false)}>Back</Btn><Btn className="flex-1 !bg-emerald-600" onClick={place}>Confirm and pay</Btn></div></Card>)}
    </div>
  );
}

const STATUS = { preparing: ['Preparing', 'bg-amber-100 text-amber-800'], on_the_way: ['On the way', 'bg-sky-100 text-sky-800'], delivered: ['Delivered', 'bg-emerald-100 text-emerald-800'] } as const;
function Orders() {
  const orders = useGroceryStore((s) => s.orders);
  return (
    <div className="space-y-2 p-3">
      {orders.length === 0 && <Card><EmptyState glyph="📦" title="No orders yet">Orders and their delivery status appear here.</EmptyState></Card>}
      {orders.map((o) => <Card key={o.id}><Row glyph="🧾" title={o.id} sub={`${o.lines.length} item${o.lines.length === 1 ? '' : 's'} · ${o.delivery ? `delivery ${formatNaira(o.delivery)}` : 'free delivery'}`} right={<div className="text-right"><b className="font-display text-sm tabular-nums">{formatNaira(o.total)}</b><span className={`ml-1 block rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span></div>} />
        <p className="mt-1.5 text-xs text-slate-500">{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</p></Card>)}
    </div>
  );
}
function Pantry() {
  const pantry = useGroceryStore((s) => s.pantry), rows = Object.entries(pantry).filter(([, q]) => q > 0);
  return (
    <div className="p-3">{rows.length === 0 ? <Card><EmptyState glyph="🥫" title="Your pantry is empty">Delivered orders are listed here.</EmptyState></Card> : <div className="space-y-2">{rows.map(([id, q]) => { const p = getProduct(id)!; return <Card key={id} className="!p-3"><Row glyph={p.glyph} title={p.name} sub={p.unit} right={<b className="tabular-nums">× {q}</b>} /></Card>; })}</div>}
      <Note>The pantry is a record of what you have bought. Groceries do not appear in your 3D house yet, and cooking with them is not available, so for now eat ready meals from the Food app.</Note></div>
  );
}

/** Grocery: shop, cart, orders and pantry. Rules in game/grocery.ts. */
export function GroceryApp() {
  const [tab, setTab] = useState<'shop' | 'cart' | 'orders' | 'pantry'>('shop');
  const count = useGroceryStore((s) => Object.values(s.cart).reduce((a, b) => a + b, 0));
  return (
    <div className="flex min-h-full flex-col">
      <Tabs label="Grocery sections" tabs={[['shop', 'Shop', Store], ['cart', count ? `Cart (${count})` : 'Cart', ShoppingCart], ['orders', 'Orders', Package], ['pantry', 'Pantry', Archive]] as const} value={tab} onChange={setTab} />
      {tab === 'shop' && <Shop />}{tab === 'cart' && <Cart shop={() => setTab('shop')} orders={() => setTab('orders')} />}{tab === 'orders' && <Orders />}{tab === 'pantry' && <Pantry />}
    </div>
  );
}
