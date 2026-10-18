import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrderLine { productId: string; name: string; qty: number; unitPrice: number }
export interface GroceryOrder { id: string; lines: OrderLine[]; subtotal: number; delivery: number; total: number; status: 'preparing' | 'on_the_way' | 'delivered'; placedAt: number; deliverAt: number; txId?: string }
/** `pantry` is what delivered orders added up to. It is a record only: groceries are not placed in the 3D house yet. */
interface GroceryState { cart: Record<string, number>; orders: GroceryOrder[]; pantry: Record<string, number>; seq: number; reset: () => void }
const fresh = () => ({ cart: {}, orders: [], pantry: {}, seq: 0 });
export const useGroceryStore = create<GroceryState>()(persist((set) => ({ ...fresh(), reset: () => set(fresh()) }), { name: 'nigerialife.grocery', version: 1 }));
