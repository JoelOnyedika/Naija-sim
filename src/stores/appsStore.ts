import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';

/** Data for the lighter mock phone apps (food orders, investments, staff...). */
export interface FoodOrder { id: string; foodId: string; dueAt: number }
export interface Asset { id: string; name: string; glyph: string; price: number; risk: number }

export const ASSETS: Asset[] = [
  { id: 'tbills', name: 'Treasury bills', glyph: '🏛️', price: 100000, risk: 0.0004 },
  { id: 'naija-etf', name: 'Naija Top-30 ETF', glyph: '📊', price: 25000, risk: 0.003 },
  { id: 'agric', name: 'Agro Farms Ltd', glyph: '🌾', price: 8000, risk: 0.006 },
  { id: 'crypto', name: 'Naija Coin', glyph: '🪙', price: 52000, risk: 0.015 },
];

interface AppsState {
  orders: FoodOrder[];
  prices: Record<string, number>;
  holdings: Record<string, number>;
  staff: string[];
  placeOrder: (foodId: string, seconds: number) => void;
  removeOrder: (id: string) => void;
  walkPrices: () => void;
  trade: (assetId: string, delta: number) => void;
  hire: (id: string) => void;
  reset: () => void;
}

const startPrices = () => Object.fromEntries(ASSETS.map((a) => [a.id, a.price]));

export const useAppsStore = create<AppsState>()(persist((set) => ({
  orders: [], prices: startPrices(), holdings: {}, staff: [],
  placeOrder: (foodId, seconds) => set((s) => ({ orders: [...s.orders, { id: uid(), foodId, dueAt: Date.now() + seconds * 1000 }] })),
  removeOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
  walkPrices: () => set((s) => ({
    prices: Object.fromEntries(ASSETS.map((a) => [a.id, Math.max(a.price * 0.2, s.prices[a.id] * (1 + (Math.random() - 0.47) * a.risk * 4))])),
  })),
  trade: (assetId, delta) => set((s) => ({ holdings: { ...s.holdings, [assetId]: Math.max(0, (s.holdings[assetId] ?? 0) + delta) } })),
  hire: (id) => set((s) => (s.staff.includes(id) ? s : { staff: [...s.staff, id] })),
  reset: () => set({ orders: [], prices: startPrices(), holdings: {}, staff: [] }),
}), { name: 'nigerialife.apps', version: 1 }));
