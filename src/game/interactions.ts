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
import { blockedReason, findUse, needsMenu, usesOf } from '@/data/activities';
import { useSkillStore } from '@/stores/skillStore';
import { bondMultiplier, petBlockedReason } from './petCare';
import { podiumIndexOf, slotVehicle } from '@/data/showroom';
import { useInteriorStore } from '@/stores/interiorStore';
import type { UseDef } from '@/data/items';

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
  if (def?.toy) { toast('Your pets will play with this on their own.'); return; }
  if (def?.power) { tapBackupPower(def.power, def.name); return; }
  if (def?.venueAction === 'club_bar') { if (useInteriorStore.getState().current?.kind === 'club') { sfx.click(); useUiStore.getState().setClubMenu(true); } return; }
  if (def?.venueAction === 'showroom') { const v = slotVehicle(podiumIndexOf(item.uid)); if (v) { sfx.click(); useUiStore.getState().setShowroomVehicle(v.id); } return; }
  const uses = usesOf(def);
  if (!def || !uses.length) { toast(def?.name ?? 'Nothing to do here'); return; }
  if (useStatsStore.getState().activity) { sfx.error(); toast('Finish what you are doing first', 'bad'); return; }
  // Several choices: let the player pick. One choice: go straight there, exactly as before.
  if (needsMenu(def)) { useUiStore.getState().setActionMenu(item.uid); sfx.click(); return; }
  beginUse(item, uses[0]);
}

/** Pre-flight checks that give instant feedback; nothing is charged yet (that happens on arrival in startUse). */
function canBegin(u: UseDef, uid?: string): boolean {
  const stats = useStatsStore.getState();
  if (stats.activity) { sfx.error(); toast('Finish what you are doing first', 'bad'); return false; }
  const placed = getActiveHome()?.placed ?? [];
  const why = blockedReason(u, placed, (id) => useSkillStore.getState().level(id));
  if (why) { sfx.error(); toast(why, 'bad'); return false; }
  const petWhy = uid ? petBlockedReason(u, uid) : null;
  if (petWhy) { sfx.error(); toast(petWhy, 'bad'); return false; }
  if (u.needsFood && !carriedFood().length) { sfx.error(); toast('Nothing to eat. Order food on your phone.', 'bad'); return false; }
  if (u.sleep && 100 - stats.stats.energy < 8) { toast('You are not tired yet.'); return false; }
  if (u.cost && useEconomyStore.getState().money < u.cost) { sfx.error(); toast(copy.broke(), 'bad'); return false; }
  return true;
}

/** Which activity the player picked for each object (read on arrival). */
const chosen = new Map<string, string>();

function beginUse(item: PlacedItem, u: UseDef) {
  if (!canBegin(u, item.uid)) return;
  if (u.id) chosen.set(item.uid, u.id); else chosen.delete(item.uid);
  useActorStore.getState().useItem(item.uid);
  sfx.click();
}

/** The player picked an activity from the action menu. */
export function chooseActivity(item: PlacedItem, activityId: string) {
  const def = getFurniture(item.defId);
  const u = usesOf(def).find((x) => x.id === activityId);
  useUiStore.getState().setActionMenu(null);
  if (u) beginUse(item, u);
}

/** Player tapped the floor: stop whatever is running (cleanly) and walk there. */
export function walkTo(x: number, z: number) {
  if (useStatsStore.getState().activity) useStatsStore.getState().stop();
  useActorStore.getState().walkTo(x, z);
}

/** Called by the scene once the avatar has arrived at the object and faces it. Runs the original use logic. */
export function startUse(item: PlacedItem) {
  const def = getFurniture(item.defId);
  const u = findUse(def, chosen.get(item.uid));
  chosen.delete(item.uid);
  if (!def || !u) return;
  const stats = useStatsStore.getState();
  if (stats.activity) return;
  // Re-check on arrival: the speaker may have been removed, or the skill level may not be enough after all.
  const why = blockedReason(u, getActiveHome()?.placed ?? [], (id) => useSkillStore.getState().level(id));
  if (why) { sfx.error(); toast(why, 'bad'); return; }
  const petWhy = petBlockedReason(u, item.uid);
  if (petWhy) { sfx.error(); toast(petWhy, 'bad'); return; }
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
  // a pet you are bonded with makes time together happier: up to +50% happiness at full bond
  if (u.petAction && effects.happiness) effects = { ...effects, happiness: Math.round(effects.happiness * bondMultiplier(item.uid)) };
  if (u.cost && !useEconomyStore.getState().debit(u.cost, def.name, 'purchase')) { sfx.error(); toast(copy.broke(), 'bad'); return; }
  stats.start({ label: u.label.replace(/ \(₦\d+\)/, ''), seconds, effects, pose: u.pose, targetUid: item.uid, kind: 'use', event: u.event, slept: u.sleep, skill: u.skill, party: u.party, payout: u.payout, petAction: u.petAction, activityKey: u.id ? `${def.id}:${u.id}` : undefined });
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
