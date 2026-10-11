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
  /** Camera azimuth (radians), written by the camera rig so nudge controls can be screen-relative. */
  cameraAzimuth: number;
  /** Camera polar angle (0 = straight down), written by the camera rig; roofs hide when looking steeply down. */
  cameraPolar: number;
  setDraft: (d: Draft | null) => void;
  setDragging: (v: boolean) => void;
  setCameraAzimuth: (a: number) => void;
  setCameraPolar: (a: number) => void;
}
export const useEditorStore = create<EditorState>((set) => ({
  draft: null, dragging: false, cameraAzimuth: 0.55, cameraPolar: 0.95,
  setDraft: (draft) => set({ draft }),
  setDragging: (dragging) => set({ dragging }),
  setCameraAzimuth: (cameraAzimuth) => set({ cameraAzimuth }),
  setCameraPolar: (cameraPolar) => set({ cameraPolar }),
}));
