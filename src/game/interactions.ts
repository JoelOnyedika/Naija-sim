import { useBoutiqueNav } from '@/stores/boutiqueNavStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { sfx } from '@/audio/sfx';
import { copy } from '@/data/copy';
import { getFood } from '@/data/foods';
import { getFurniture } from '@/data/items';
import type { PlacedItem } from '@/types/game';
import { useActorStore } from '@/stores/actorStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { FOODS } from '@/data/foods';
import { getActiveHome } from './active';
import { usePowerStore } from '@/stores/powerStore';

/** Sum of comfort bonuses (fan, AC...) in the active home. */
const comfort = () => {
  const h = getActiveHome();
  return h ? h.placed.reduce((s, p) => s + (getFurniture(p.defId)?.comfort ?? 0), 0) : 0;
};

/** Foods the player is carrying. */
export const carriedFood = () => FOODS.filter((f) => useInventoryStore.getState().count(f.id) > 0);

/**
 * Tap furniture (outside Buy mode). Cheap checks run now so the player gets instant feedback; the avatar then walks to the
 * object and `startUse` runs when it has ARRIVED and is facing it (see AvatarWalker). Nothing is charged before that.
 */
export function interactWith(item: PlacedItem) {
  const def = getFurniture(item.defId);
  if (def?.opensApp) { useBoutiqueNav.getState().setOwnedOnly(true); usePhoneStore.getState().openPhone(); usePhoneStore.getState().openApp(def.opensApp); sfx.click(); return; }
  if (def?.power) { tapBackupPower(def.power, def.name); return; }
  if (!def?.use) { toast(def?.name ?? 'Nothing to do here'); return; }
  const stats = useStatsStore.getState();
  if (stats.activity) { sfx.error(); toast('Finish what you are doing first', 'bad'); return; }
  const u = def.use;
  if (u.needsFood && !carriedFood().length) { sfx.error(); toast('Nothing to eat. Order food on your phone.', 'bad'); return; }
  if (u.sleep && 100 - stats.stats.energy < 8) { toast('You are not tired yet.'); return; }
  if (u.cost && useEconomyStore.getState().money < u.cost) { sfx.error(); toast(copy.broke(), 'bad'); return; }
  useActorStore.getState().useItem(item.uid);
  sfx.click();
}

/** Player tapped the floor: stop whatever is running (cleanly) and walk there. */
export function walkTo(x: number, z: number) {
  if (useStatsStore.getState().activity) useStatsStore.getState().stop();
  useActorStore.getState().walkTo(x, z);
}

/** Called by the scene once the avatar has arrived at the object and faces it. Runs the original use logic. */
export function startUse(item: PlacedItem) {
  const def = getFurniture(item.defId);
  if (!def?.use) return;
  const stats = useStatsStore.getState();
  if (stats.activity) return;
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
}

export function eatFood(foodId: string, targetUid?: string): boolean {
  const food = getFood(foodId);
  if (!food || !useInventoryStore.getState().remove(foodId, 1)) return false;
  const ok = useStatsStore.getState().start({ label: `Eating ${food.name.toLowerCase()}`, seconds: 4, effects: food.effects, pose: 'stand', targetUid, kind: 'use', doneMessage: `${food.name} hit the spot.` });
  if (!ok) useInventoryStore.getState().add(foodId);
  return ok;
}

/** Tapping a backup power item. Only the manual set (Ibeta) does anything, and only while NEPA is out. */
function tapBackupPower(kind: 'manual' | 'auto' | 'solar', name: string) {
  const ps = usePowerStore.getState();
  if (kind === 'solar') { toast('Solar dey work by itself. Nothing to switch.'); return; }
  if (kind === 'auto') { toast(ps.outage ? 'The generator don start by itself.' : 'It starts by itself when NEPA takes light.'); return; }
  if (!ps.outage) { toast('NEPA dey around. Tap it when they take light.'); return; }
  if (ps.ibetaOn) { toast(`${name} is already running.`); return; }
  if (ps.switchIbetaOn()) { sfx.pop(); toast(`${name} don start. Light is back.`, 'good'); }
}
