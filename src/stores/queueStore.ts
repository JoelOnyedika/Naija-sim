import { create } from 'zustand';

/** One activity waiting its turn (tapped while another was running). Cleared whenever the player walks somewhere else. */
export interface QueuedUse { uid: string; activityId?: string; label: string; glyph?: string }
export const QUEUE_LIMIT = 5;

interface QueueState {
  queue: QueuedUse[];
  push: (q: QueuedUse) => boolean;
  shift: () => QueuedUse | undefined;
  removeAt: (i: number) => void;
  clear: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],
  push: (q) => { if (get().queue.length >= QUEUE_LIMIT) return false; set((s) => ({ queue: [...s.queue, q] })); return true; },
  shift: () => { const [first, ...rest] = get().queue; if (first) set({ queue: rest }); return first; },
  removeAt: (i) => set((s) => ({ queue: s.queue.filter((_, k) => k !== i) })),
  clear: () => { if (get().queue.length) set({ queue: [] }); },
}));
