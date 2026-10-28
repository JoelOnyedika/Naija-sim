import type { UseDef } from './items';

export type Spec = { pose: 'stand' | 'sit'; action: 'idle' | 'drink' | 'read' | 'dance' | 'piano' | 'pushup'; mode: 'front' | 'on' | 'mat'; top?: number };
export interface Kit { id: string; name: string; glyph: string; w: number; d: number; h: number; solid?: boolean; spec?: Spec; uses?: UseDef[];
  /** Built by the shared booth factory (three/models/booths.tsx) instead of a hand-made model: a counter, stall, board, desk, cart, machine, shelf, mat, seats, table or statue in these colours with this sign. */
  look?: { v: 'counter' | 'stall' | 'board' | 'desk' | 'cart' | 'machine' | 'shelf' | 'mat' | 'seats' | 'table' | 'statue'; c1: string; c2: string; c3: string; sign?: string } }

export const stand: Spec = { pose: 'stand', action: 'idle', mode: 'front' };
export const seat = (top = 0.46): Spec => ({ pose: 'sit', action: 'idle', mode: 'on', top });
export const U = (id: string, glyph: string, label: string, seconds: number, effects: UseDef['effects'], extra: Partial<UseDef> = {}): UseDef => ({ id, glyph, label, seconds, effects, pose: 'stand', ...extra });

