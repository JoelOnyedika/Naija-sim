import { formatNaira } from '@/core/format';
import { nowMinutes } from '@/core/gameTime';
import { GROCERY, getProduct } from '@/data/grocery';
import { useEconomyStore } from '@/stores/economyStore';
import { useGroceryStore, type GroceryOrder } from '@/stores/groceryStore';
import { guarded } from './guard';
import { notify } from './notify';

/**
 * Grocery rules. The cart is saved. Checkout is all-or-nothing: validate, then one ledger payment for exactly the order total,
 * then the order record. A failed checkout charges nothing and keeps the cart. Delivery is simulated on the game clock
 * (preparing, on the way, delivered); a delivered order is added to the pantry record, not to the 3D house.
 */
export type Result = { ok: true; id?: string } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const g = () => useGroceryStore.getState();

export function setQty(productId: string, qty: number): Result {
  if (!getProduct(productId)) return no('That product does not exist.');
  const q = Math.floor(qty);
  if (!Number.isFinite(q) || q < 0) return no('Choose a quantity.');
  if (q > GROCERY.maxPerLine) return no(`You can order up to ${GROCERY.maxPerLine} of one item.`);
  useGroceryStore.setState((s) => { const cart = { ...s.cart }; if (q === 0) delete cart[productId]; else cart[productId] = q; return { cart }; });
  return { ok: true };
}
export const addToCart = (id: string) => setQty(id, (g().cart[id] ?? 0) + 1);
export const clearCart = () => useGroceryStore.setState({ cart: {} });

export interface Totals { lines: { productId: string; name: string; glyph: string; qty: number; unitPrice: number; lineTotal: number }[]; subtotal: number; delivery: number; total: number; count: number }
export function cartTotals(cart = g().cart): Totals {
  const lines = Object.entries(cart).flatMap(([id, qty]) => { const p = getProduct(id); return p && qty > 0 ? [{ productId: id, name: p.name, glyph: p.glyph, qty, unitPrice: p.price, lineTotal: p.price * qty }] : []; });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const delivery = subtotal === 0 || subtotal >= GROCERY.freeDeliveryFrom ? 0 : GROCERY.deliveryFee;
  return { lines, subtotal, delivery, total: subtotal + delivery, count: lines.reduce((s, l) => s + l.qty, 0) };
}

export function checkout(): Result {
  const t = cartTotals();
  if (t.lines.length === 0) return no('Your cart is empty.');
  if (t.total > useEconomyStore.getState().money) return no(`The total is ${formatNaira(t.total)}. You do not have enough.`);
  return guarded(`grocery|${JSON.stringify(g().cart)}`, () => {
    const n = g().seq + 1, id = `GRO-${String(n).padStart(4, '0')}`, now = nowMinutes();
    const r = useEconomyStore.getState().post({ direction: 'expense', amount: t.total, label: `Grocery order ${id}`, kind: 'food', meta: { opKey: `grocery:${id}`, description: `${t.count} item${t.count === 1 ? '' : 's'}${t.delivery ? ` + delivery ${formatNaira(t.delivery)}` : ', free delivery'}`, ref: { type: 'order', id } } });
    if (!r.ok) return no('The payment could not be made. Nothing was charged.');
    const order: GroceryOrder = { id, lines: t.lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice })), subtotal: t.subtotal, delivery: t.delivery, total: t.total, status: 'preparing', placedAt: now, deliverAt: now + GROCERY.deliveryMinutes, txId: r.tx.id };
    useGroceryStore.setState((s) => ({ orders: [order, ...s.orders].slice(0, 60), seq: n, cart: {} }));
    return { ok: true, id } as Result;
  }, no('That order was already placed.'));
}

/** Moves orders along on the game clock. Each order is delivered (and added to the pantry) exactly once. */
export function runGrocery(now = nowMinutes()) {
  for (const o of g().orders) {
    if (o.status === 'preparing' && now >= o.placedAt + GROCERY.preparingMinutes) useGroceryStore.setState((s) => ({ orders: s.orders.map((x) => (x.id === o.id && x.status === 'preparing' ? { ...x, status: 'on_the_way' as const } : x)) }));
    if (now >= o.deliverAt && g().orders.find((x) => x.id === o.id)!.status !== 'delivered') {
      useGroceryStore.setState((s) => ({
        orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: 'delivered' as const } : x)),
        pantry: o.lines.reduce((p, l) => ({ ...p, [l.productId]: (p[l.productId] ?? 0) + l.qty }), s.pantry),
      }));
      notify({ title: 'Groceries delivered', body: `${o.id}: ${o.lines.length} item${o.lines.length === 1 ? '' : 's'} added to your pantry.`, icon: '🛒', appId: 'grocery' });
    }
  }
}
