import { RARITY_COLOR, type FurnitureDef, ITEM_CATEGORIES } from '@/data/items';
import { skillName } from '@/stores/skillStore';
import { priceOf } from './pricing';

const STAT_LABEL: Record<string, string> = {
  hunger: 'Hunger', thirst: 'Thirst', bladder: 'Toilet', happiness: 'Happiness', energy: 'Energy', hygiene: 'Hygiene', health: 'Health', social: 'Social', charisma: 'Charisma', money: 'Money',
};

export interface InfoActivity {
  label: string;
  /** Seconds, or null when the duration depends on the player (sleep, picking food). */
  seconds: number | null;
  cost: number;
  effects: { label: string; delta: number }[];
  skill?: string;
  requires: string[];
}
export interface ItemInfo {
  name: string; category: string; tier: string; tierColor: string; price: number; description: string;
  /** false = purely decorative: the panel says so instead of inventing gameplay. */
  functional: boolean;
  activities: InfoActivity[];
  /** Passive benefits that are not activities (comfort bonus, backup power). */
  passive: string[];
}

/** Everything shown in the shop's information panel, derived from the item's definition: nothing is written by hand per item. */
export function describeItem(def: FurnitureDef): ItemInfo {
  const activities: InfoActivity[] = [];
  const passive: string[] = [];
  const u = def.use;
  if (u) {
    const requires: string[] = [];
    if (u.needsFood) requires.push('Food in your pantry (order it on your phone)');
    if (u.sleep) requires.push('You must be at least a little tired');
    const effects = Object.entries(u.effects).filter(([, v]) => v).map(([k, v]) => ({ label: STAT_LABEL[k] ?? k, delta: v as number }));
    if (u.sleep) effects.push({ label: 'Energy', delta: 100 });
    activities.push({
      label: u.label.replace(/ \(₦[\d,]+\)/, ''), seconds: u.sleep || u.needsFood ? null : u.seconds, cost: u.cost ?? 0, effects,
      skill: u.skill ? `${skillName(u.skill.id)} +${u.skill.xp} XP when finished` : undefined, requires,
    });
    if (u.party) passive.push('Starts a house party: the disco lights switch on while it runs.');
  }
  if (def.opensApp === 'boutique') activities.push({ label: 'Change outfit', seconds: null, cost: 0, effects: [], requires: ['Clothes you own'] });
  if (def.comfort) passive.push('Improves how well you sleep in this home.');
  if (def.power === 'manual') passive.push('Backup power: when NEPA takes light you must tap it to start it. Until then the house stays dim.');
  if (def.power === 'auto') passive.push('Backup power: starts by itself when NEPA takes light and restores the house lights.');
  if (def.power === 'solar') passive.push('Backup power: keeps the house lit all the time. NEPA outages do not touch it, nothing to switch on.');
  if (def.id === 'disco_light') passive.push('Lights up when a party is running (start one with a speaker).');
  if (def.id === 'lamp') passive.push('During a NEPA outage it makes the house a little brighter.');
  const functional = activities.length > 0 || passive.length > 0;
  return {
    name: def.name, category: ITEM_CATEGORIES.find((c) => c.id === def.category)?.label ?? def.category,
    tier: def.rarity[0].toUpperCase() + def.rarity.slice(1), tierColor: RARITY_COLOR[def.rarity],
    price: priceOf(def.price), description: def.description, functional, activities, passive,
  };
}
