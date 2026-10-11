import { sfx } from '@/audio/sfx';
import { copy } from '@/data/copy';
import { getFood } from '@/data/foods';
import { getFurniture } from '@/data/items';
import type { PlacedItem } from '@/types/game';
import { useEconomyStore } from '@/stores/economyStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { FOODS } from '@/data/foods';
import { getActiveHome } from './active';

/** Sum of comfort bonuses (fan, AC...) in the active home. */
const comfort = () => {
  const h = getActiveHome();
  return h ? h.placed.reduce((s, p) => s + (getFurniture(p.defId)?.comfort ?? 0), 0) : 0;
};

/** Foods the player is carrying. */
export const carriedFood = () => FOODS.filter((f) => useInventoryStore.getState().count(f.id) > 0);

/** Tap furniture (outside Buy mode): run its `use` definition as a timed activity. */
export function interactWith(item: PlacedItem) {
  const def = getFurniture(item.defId);
  if (!def?.use) { toast(def?.name ?? 'Nothing to do here'); return; }
  const stats = useStatsStore.getState();
  if (stats.activity) { sfx.error(); toast('Finish what you are doing first', 'bad'); return; }
  const u = def.use;

  if (u.needsFood) {
    if (!carriedFood().length) { sfx.error(); toast('Nothing to eat. Order food on your phone.', 'bad'); return; }
    useUiStore.getState().setFoodPicker(item.uid);
    return;
  }
  let seconds = u.seconds;
  let effects = u.effects;
  if (u.sleep) {
    const gain = 100 - stats.stats.energy;
    if (gain < 8) { toast('You are not tired yet.'); return; }
    seconds = Math.max(6, (gain * 0.5) / ((def.sleepRate ?? 0.6) + comfort()));
    effects = { energy: gain, hunger: -6, thirst: -6, bladder: -8 };
  }
  if (u.cost && !useEconomyStore.getState().debit(u.cost, def.name, 'purchase')) { sfx.error(); toast(copy.broke(), 'bad'); return; }
  stats.start({ label: u.label.replace(/ \(₦\d+\)/, ''), seconds, effects, pose: u.pose, targetUid: item.uid, kind: 'use', event: u.event, slept: u.sleep, skill: u.skill, party: u.party });
  sfx.click();
}

export function eatFood(foodId: string, targetUid?: string): boolean {
  const food = getFood(foodId);
  if (!food || !useInventoryStore.getState().remove(foodId, 1)) return false;
  const ok = useStatsStore.getState().start({ label: `Eating ${food.name.toLowerCase()}`, seconds: 4, effects: food.effects, pose: 'stand', targetUid, kind: 'use', doneMessage: `${food.name} hit the spot.` });
  if (!ok) useInventoryStore.getState().add(foodId);
  return ok;
}
