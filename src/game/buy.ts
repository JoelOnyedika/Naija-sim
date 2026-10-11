import { sfx } from '@/audio/sfx';
import { CONFIG } from '@/data/config';
import { copy } from '@/data/copy';
import { getFurniture } from '@/data/items';
import { uid } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';
import { useEditorStore, type Draft } from '@/stores/editorStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { findFreeSpot, fixturesOf, resolvePlacement, validatePlacement, type Pose } from '@/world/placement';
import { getActiveHome, setPlaced } from './active';
import { fireTask } from './tasks';

/** Buy-mode actions. All of them operate on the active home, whichever state it is in. */

function revalidate(draft: Draft, pose: Pose): Draft {
  const home = getActiveHome();
  const def = getFurniture(draft.defId);
  if (!home || !def) return { ...draft, pose, valid: false };
  const others = [...home.fixtures, ...home.placed.filter((p) => p.uid !== draft.uid)];
  return { ...draft, pose, valid: validatePlacement(def, home.layout, pose, others) };
}

/** Pick something from the catalog (or inventory): show the ghost. */
export function beginPlace(defId: string): boolean {
  const home = getActiveHome(); const def = getFurniture(defId);
  if (!home || !def) return false;
  const owned = useInventoryStore.getState().count(defId) > 0;
  const pose = findFreeSpot(def, home.layout, home.placed) ?? resolvePlacement(def, home.layout, 0, 0, 0);
  useEditorStore.getState().setDraft(revalidate({ defId, pose, valid: true, purchase: !owned }, pose));
  sfx.pop();
  return true;
}

export function beginMove(uidToMove: string) {
  const home = getActiveHome();
  const item = home?.placed.find((p) => p.uid === uidToMove);
  if (!home || !item) return;
  const pose: Pose = { x: item.x, z: item.z, rotation: item.rotation, wall: item.wall, along: item.along, wallC: item.wallC };
  useEditorStore.getState().setDraft(revalidate({ defId: item.defId, uid: item.uid, pose, valid: true, purchase: false }, pose));
  sfx.pop();
}

export function moveDraft(rawX: number, rawZ: number) {
  const d = useEditorStore.getState().draft; const home = getActiveHome(); const def = d && getFurniture(d.defId);
  if (!d || !home || !def) return;
  useEditorStore.getState().setDraft(revalidate(d, resolvePlacement(def, home.layout, rawX, rawZ, d.pose.rotation)));
}

/** Rotate the ghost a quarter turn: +1 clockwise, -1 counter-clockwise. Four turns return to the start, so it can never get stuck. */
export function rotateDraft(dir: 1 | -1 = 1) {
  const d = useEditorStore.getState().draft; const home = getActiveHome(); const def = d && getFurniture(d.defId);
  if (!d || !home || !def?.placement.rotatable) return;
  const rotation = (((d.pose.rotation + dir) % 4) + 4) % 4;
  useEditorStore.getState().setDraft(revalidate(d, resolvePlacement(def, home.layout, d.pose.x, d.pose.z, rotation)));
  sfx.click();
}

/**
 * Nudge the ghost one step in a screen-relative direction. "Forward" points away from the camera on the ground
 * plane, so the pad always matches what the player sees, whichever way they have rotated the view.
 */
export function nudgeDraft(dir: 'forward' | 'back' | 'left' | 'right', step = 0.25) {
  const { draft, cameraAzimuth: az } = useEditorStore.getState();
  if (!draft) return;
  const fx = -Math.sin(az), fz = -Math.cos(az); // away from the camera
  const rx = Math.cos(az), rz = -Math.sin(az);  // towards screen-right
  const [dx, dz] = dir === 'forward' ? [fx, fz] : dir === 'back' ? [-fx, -fz] : dir === 'right' ? [rx, rz] : [-rx, -rz];
  moveDraft(draft.pose.x + dx * step, draft.pose.z + dz * step);
}

export function cancelDraft() {
  useEditorStore.getState().setDraft(null);
  useEditorStore.getState().setDragging(false);
  sfx.close();
}

/** Leave Buy mode: discard any unconfirmed preview (never charged, never saved) and hand control back to the home camera. */
export function exitBuild() {
  useEditorStore.setState({ draft: null, dragging: false });
  useUiStore.getState().setMode('home');
  sfx.close();
}

/** Confirm: charge if new, then place. */
export function confirmDraft(): boolean {
  const { draft } = useEditorStore.getState(); const home = getActiveHome(); const def = draft && getFurniture(draft.defId);
  if (!draft || !home || !def) return false;
  if (!draft.valid) { sfx.error(); toast('That spot does not work. Try another.', 'bad'); return false; }
  if (draft.uid) {
    setPlaced(home.property.id, home.placed.map((p) => (p.uid === draft.uid ? { ...p, ...draft.pose } : p)));
  } else {
    if (draft.purchase) {
      if (!useEconomyStore.getState().debit(def.price, def.name, 'purchase')) { sfx.error(); toast(copy.broke(), 'bad'); return false; }
      useUiStore.getState().addSpent(def.price);
      fireTask('buy:furniture');
      sfx.purchase();
    } else {
      useInventoryStore.getState().remove(def.id, 1);
      sfx.pop();
    }
    setPlaced(home.property.id, [...home.placed, { uid: uid(), defId: def.id, ...draft.pose }]);
  }
  useEditorStore.getState().setDraft(null);
  return true;
}

/** Take a placed item back into the inventory. */
export function storeItem(itemUid: string) {
  const home = getActiveHome(); const item = home?.placed.find((p) => p.uid === itemUid);
  if (!home || !item) return;
  useInventoryStore.getState().add(item.defId);
  setPlaced(home.property.id, home.placed.filter((p) => p.uid !== itemUid));
  useEditorStore.getState().setDraft(null);
  toast('Moved to your inventory');
  sfx.close();
}

/** Sell a placed item for a partial refund. */
export function sellItem(itemUid: string) {
  const home = getActiveHome(); const item = home?.placed.find((p) => p.uid === itemUid); const def = item && getFurniture(item.defId);
  if (!home || !item || !def) return;
  const refund = Math.round(def.price * CONFIG.sellRefund);
  useEconomyStore.getState().credit(refund, `Sold ${def.name}`, 'income');
  useUiStore.getState().addSpent(-refund);
  setPlaced(home.property.id, home.placed.filter((p) => p.uid !== itemUid));
  useEditorStore.getState().setDraft(null);
  toast(`Sold ${def.name}`, 'good');
  sfx.coin();
}

export const fixturesFor = () => { const h = getActiveHome(); return h ? fixturesOf(h.layout) : []; };
