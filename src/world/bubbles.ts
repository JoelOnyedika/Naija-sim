import type { Action } from './navigation';

/**
 * Thought-bubble emoji shown above the avatar's head while it does something. One row per furniture id (what it is using),
 * with a fallback per animation. Pure data: add a row when you add a usable object.
 */
export const BUBBLE_BY_ITEM: Record<string, string> = {
  bed: '💤', king_bed: '💤', foam_mattress: '💤', tv: '📺', sofa: '😌', chair: '😌', desk: '💻', gaming_setup: '🎮', toilet: '🚽',
  cooker: '🍳', fridge: '😋', dispenser: '💧', bookshelf: '📖', piano: '🎹', speaker: '🎶', disco_light: '🪩', washbasin: '🧼', bucket: '🪣',
  shower: '🚿', bathtub: '🛁', jacuzzi: '🛁', gym_rug: '💪',
};
const BUBBLE_BY_ACTION: Partial<Record<Action, string>> = { eat: '😋', cook: '🍳', type: '💻', dance: '🎶', shower: '🚿', pushup: '💪', tv: '📺', read: '📖', piano: '🎹', drink: '💧', wash: '🧼' };

export function bubbleFor(defId: string | undefined, action: Action | undefined, pose: 'stand' | 'sit' | 'sleep' | undefined): string | null {
  if (defId && BUBBLE_BY_ITEM[defId]) return BUBBLE_BY_ITEM[defId];
  if (action && BUBBLE_BY_ACTION[action]) return BUBBLE_BY_ACTION[action]!;
  if (pose === 'sleep') return '💤';
  if (pose === 'sit') return '😌';
  return null;
}
