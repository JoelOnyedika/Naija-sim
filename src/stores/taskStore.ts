import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TASKS, type TaskDef } from '@/data/tasks';

const SLOTS = 3;
interface TaskState {
  active: string[];
  done: string[];
  /** Latest completion, for the reward popup. */
  lastDone: TaskDef | null;
  /** Pure bookkeeping: returns the tasks completed by this event so the caller can pay rewards. */
  fire: (event: string) => TaskDef[];
  clearLast: () => void;
  reset: () => void;
}
const initial = () => TASKS.slice(0, SLOTS).map((t) => t.id);

export const useTaskStore = create<TaskState>()(persist((set, get) => ({
  active: initial(), done: [], lastDone: null,
  fire: (event) => {
    const hits = TASKS.filter((t) => get().active.includes(t.id) && t.event === event);
    if (!hits.length) return [];
    const done = [...get().done, ...hits.map((t) => t.id)];
    const remaining = get().active.filter((id) => !hits.some((h) => h.id === id));
    for (const t of TASKS) { if (remaining.length >= SLOTS) break; if (!done.includes(t.id) && !remaining.includes(t.id)) remaining.push(t.id); }
    set({ active: remaining, done, lastDone: hits[0] });
    return hits;
  },
  clearLast: () => set({ lastDone: null }),
  reset: () => set({ active: initial(), done: [], lastDone: null }),
}), { name: 'nigerialife.tasks', version: 1 }));
