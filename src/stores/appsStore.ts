import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';

/** Data for the lighter mock phone apps (food orders, investments, hustle gigs, staff...). */
export interface FoodOrder { id: string; foodId: string; dueAt: number }
export interface Gig { id: string; title: string; pay: number; poster: string; mine?: boolean; taken?: boolean }
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
  gigs: Gig[];
  staff: string[];
  companies: string[];
  placeOrder: (foodId: string, seconds: number) => void;
  removeOrder: (id: string) => void;
  walkPrices: () => void;
  trade: (assetId: string, delta: number) => void;
  postGig: (title: string, pay: number) => void;
  takeGig: (id: string) => void;
  hire: (id: string) => void;
  buyCompany: (id: string) => void;
  reset: () => void;
}

const startPrices = () => Object.fromEntries(ASSETS.map((a) => [a.id, a.price]));
const startGigs = (): Gig[] => [
  { id: 'g1', title: 'Pack boxes for Balogun trader', pay: 6000, poster: 'Madam Ngozi' },
  { id: 'g2', title: 'Design a logo for a suya brand', pay: 15000, poster: 'Bashir' },
  { id: 'g3', title: 'Deliver wedding aso-ebi to Surulere', pay: 9000, poster: 'Tailor Kunle' },
  { id: 'g4', title: 'Fix a laptop at Computer Village', pay: 12000, poster: 'Emeka Tech' },
];

export const useAppsStore = create<AppsState>()(persist((set) => ({
  orders: [], prices: startPrices(), holdings: {}, gigs: startGigs(), staff: [], companies: [],
  placeOrder: (foodId, seconds) => set((s) => ({ orders: [...s.orders, { id: uid(), foodId, dueAt: Date.now() + seconds * 1000 }] })),
  removeOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
  walkPrices: () => set((s) => ({
    prices: Object.fromEntries(ASSETS.map((a) => [a.id, Math.max(a.price * 0.2, s.prices[a.id] * (1 + (Math.random() - 0.47) * a.risk * 4))])),
  })),
  trade: (assetId, delta) => set((s) => ({ holdings: { ...s.holdings, [assetId]: Math.max(0, (s.holdings[assetId] ?? 0) + delta) } })),
  postGig: (title, pay) => set((s) => ({ gigs: [{ id: uid(), title, pay, poster: 'You', mine: true }, ...s.gigs] })),
  takeGig: (id) => set((s) => ({ gigs: s.gigs.map((g) => (g.id === id ? { ...g, taken: true } : g)) })),
  hire: (id) => set((s) => (s.staff.includes(id) ? s : { staff: [...s.staff, id] })),
  buyCompany: (id) => set((s) => (s.companies.includes(id) ? s : { companies: [...s.companies, id] })),
  reset: () => set({ orders: [], prices: startPrices(), holdings: {}, gigs: startGigs(), staff: [], companies: [] }),
}), { name: 'nigerialife.apps', version: 1 }));
