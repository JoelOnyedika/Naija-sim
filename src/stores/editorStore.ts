import { create } from 'zustand';
import type { Pose } from '@/world/placement';

/** Transient Buy-mode state: the ghost being placed/moved. Not persisted. */
export interface Draft {
  defId: string;
  /** Present when moving an existing item; absent for a new purchase. */
  uid?: string;
  pose: Pose;
  valid: boolean;
  /** Not owned yet: confirming will charge the price. */
  purchase: boolean;
}
interface EditorState {
  draft: Draft | null;
  dragging: boolean;
  setDraft: (d: Draft | null) => void;
  setDragging: (v: boolean) => void;
}
export const useEditorStore = create<EditorState>((set) => ({
  draft: null, dragging: false,
  setDraft: (draft) => set({ draft }),
  setDragging: (dragging) => set({ dragging }),
}));
