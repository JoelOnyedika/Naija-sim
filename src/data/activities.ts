import { getFurniture, type FurnitureDef, type UseDef } from './items';
import { skillName, type SkillId } from '@/stores/skillStore';
import { PET_CARE } from './balance';
import { KIT_ACTIVITIES } from './venueKit';

/**
 * Central activity definitions. One table, keyed by furniture id: what each object lets the player do, how long it takes,
 * what it costs, what it needs, what it changes and what it pays. Change a number here and the object, its action menu, the
 * shop's information panel and the simulation all follow. Items with a single entry keep the old direct "tap and go"
 * behaviour; items with several open the action menu.
 *
 * Stats and skills are the existing ones (statsStore, skillStore): there is no second set. "Fitness" is the fitness skill,
 * "social skill" is the communication skill and "creator skill" is creativity.
 * All numbers are balance values in one place so they can be tuned (and later served from an admin dashboard).
 * Money rewards and costs are local simulation only: a multiplayer server must own them.
 */
const SPEAKER_REQ = { anyOf: ['speaker'], hint: 'The decks need a speaker or it is just you and silence. Buy a speaker first.' };
const SPEAKER = { anyOf: ['speaker'], hint: 'No speaker for this dancefloor oh! Buy a speaker and place it in the house first.' };

const TRIPOD = { anyOf: ['camera_tripod'], hint: 'You need a camera and tripod in the house to record. Buy one first.' };
const RING = { anyOf: ['ring_light'], hint: 'Set up a ring light first, the lighting will be bad without it.' };

const BALL = { anyOf: ['pet_ball'], hint: 'You need a pet ball in the house to play fetch. Buy one first.' };
const petSet = (food: number): UseDef[] => [
  { id: 'pet_it', glyph: '🤚', label: 'Pet it', seconds: 6, effects: { happiness: 6, social: 1 }, pose: 'stand', petAction: 'pet' },
  { id: 'feed_pet', glyph: '🍖', label: 'Give pet food', seconds: 5, effects: { happiness: 2 }, pose: 'stand', cost: food, petAction: 'feed' },
  { id: 'play_pet', glyph: '🎾', label: 'Play with it', seconds: 9, effects: { happiness: 10, energy: -3 }, pose: 'stand', skill: { id: 'fitness', xp: 2 }, requires: [BALL], petAction: 'play' },
];

const SPEAKER_STACK = { anyOf: ['v_speaker_stack', 'speaker'], hint: 'No speaker here to play music through.' };
const BASE_ACTIVITY_SETS: Record<string, UseDef[]> = {
  // ---- Public venues. Money rewards below are balance values; a server must own them (game/authority.ts).
  v_stall: [
    { id: 'sell_wares', glyph: '🧺', label: 'Sell wares', seconds: 30, effects: { energy: -8, happiness: 2, social: 3 }, pose: 'stand', payout: 5000, skill: { id: 'communication', xp: 3 } },
    { id: 'haggle', glyph: '🗣️', label: 'Haggle for a trader', seconds: 25, effects: { energy: -6, charisma: 1 }, pose: 'stand', payout: 3500, skill: { id: 'communication', xp: 4 } },
    { id: 'carry_loads', glyph: '📦', label: 'Carry loads', seconds: 20, effects: { energy: -12, hygiene: -3 }, pose: 'stand', payout: 2500, skill: { id: 'fitness', xp: 3 } },
  ],
  v_altar: [
    { id: 'pray', glyph: '🙏', label: 'Pray', seconds: 20, effects: { happiness: 10 }, pose: 'stand' },
    { id: 'candle', glyph: '🕯️', label: 'Light a candle', seconds: 6, effects: { happiness: 4 }, cost: 500, pose: 'stand' },
    { id: 'offering', glyph: '🪙', label: 'Give an offering', seconds: 8, effects: { happiness: 8, social: 2 }, cost: 2000, pose: 'stand' },
  ],
  v_pew: [{ id: 'sit_pew', glyph: '🪑', label: 'Sit and reflect', seconds: 10, effects: { happiness: 3, energy: 3 }, pose: 'sit' }],
  v_plinth: [
    { id: 'study_art', glyph: '🖼️', label: 'Study the artwork', seconds: 15, effects: { happiness: 4 }, pose: 'stand', skill: { id: 'creativity', xp: 4 } },
    { id: 'discuss_art', glyph: '💬', label: 'Talk about the art', seconds: 12, effects: { social: 5 }, pose: 'stand', skill: { id: 'communication', xp: 3 } },
  ],
  v_bleachers: [{ id: 'cheer', glyph: '📣', label: 'Cheer for the team', seconds: 15, effects: { happiness: 12, social: 4, energy: -6 }, pose: 'stand' }],
  v_kiosk: [{ id: 'buy_snack', glyph: '🥤', label: 'Buy a snack', seconds: 6, effects: { hunger: 25, thirst: 15 }, cost: 1500, pose: 'stand' }],
  v_dj_booth: [{ id: 'club_mix', glyph: '🎧', label: 'Take over the decks', seconds: 12, effects: { happiness: 12, social: 3, energy: -5 }, pose: 'stand', party: true, skill: { id: 'creativity', xp: 6 }, requires: [SPEAKER_STACK] }],
  v_speaker_stack: [{ id: 'club_dance', glyph: '💃', label: 'Dance', seconds: 14, effects: { happiness: 16, social: 5, energy: -9, hygiene: -3 }, pose: 'stand', party: true, skill: { id: 'fitness', xp: 3 } }],
  v_cell_bed: [{ id: 'rest', glyph: '🛏️', label: 'Rest on the bunk', seconds: 10, effects: { energy: 6 }, pose: 'sit' }],
  pet_cat: petSet(PET_CARE.foodCost.cat),
  pet_dog: petSet(PET_CARE.foodCost.dog),
  pet_lion: petSet(PET_CARE.foodCost.lion),
  ring_light: [
    { id: 'record_content', glyph: '🎬', label: 'Record content', seconds: 14, effects: { energy: -6, happiness: 4, social: 3 }, pose: 'stand', skill: { id: 'creativity', xp: 8 }, requires: [TRIPOD] },
    { id: 'practise_presenting', glyph: '🎤', label: 'Practise presenting', seconds: 10, effects: { energy: -4, happiness: -1, charisma: 1 }, pose: 'stand', skill: { id: 'communication', xp: 6 } },
  ],
  camera_tripod: [
    { id: 'film_video', glyph: '📸', label: 'Film a video', seconds: 14, effects: { energy: -6, happiness: 4, social: 3 }, pose: 'stand', skill: { id: 'creativity', xp: 8 }, requires: [RING] },
  ],
  dj_deck: [
    { id: 'mix_music', glyph: '🎧', label: 'Mix music', seconds: 12, effects: { happiness: 12, energy: -5 }, pose: 'stand', skill: { id: 'creativity', xp: 6 }, requires: [SPEAKER_REQ] },
  ],
  desk: [
    { id: 'learn_code', glyph: '📘', label: 'Learn to code', seconds: 14, effects: { energy: -5, happiness: -1 }, pose: 'sit', skill: { id: 'coding', xp: 6 }, event: 'use:study' },
    { id: 'practice_code', glyph: '⌨️', label: 'Practise coding', seconds: 12, effects: { energy: -6, happiness: -2 }, pose: 'sit', skill: { id: 'coding', xp: 10 }, event: 'use:study' },
    { id: 'code_task', glyph: '💼', label: 'Work on a coding task', seconds: 18, effects: { energy: -10, happiness: -3 }, pose: 'sit', skill: { id: 'coding', xp: 14 }, payout: 3500, minSkill: { id: 'coding', level: 2 }, event: 'use:study' },
    { id: 'social_media', glyph: '📱', label: 'Browse social media', seconds: 10, effects: { happiness: 9, social: 6, energy: -2 }, pose: 'sit', skill: { id: 'communication', xp: 2 } },
  ],
  student_desk: [
    { id: 'sd_study', glyph: '📘', label: 'Study on the laptop', seconds: 12, effects: { energy: -5, happiness: -1 }, pose: 'sit', skill: { id: 'coding', xp: 7 }, event: 'use:study' },
    { id: 'sd_social', glyph: '📱', label: 'Browse social media', seconds: 10, effects: { happiness: 9, social: 6, energy: -2 }, pose: 'sit', skill: { id: 'communication', xp: 2 } },
  ],
  standing_desk: [
    { id: 'st_code', glyph: '⌨️', label: 'Work standing up', seconds: 12, effects: { energy: -5, happiness: -1 }, pose: 'stand', skill: { id: 'coding', xp: 9 }, event: 'use:study' },
    { id: 'st_task', glyph: '💼', label: 'Do a coding task', seconds: 18, effects: { energy: -9, happiness: -3 }, pose: 'stand', skill: { id: 'coding', xp: 13 }, payout: 4000, minSkill: { id: 'coding', level: 2 }, event: 'use:study' },
  ],
  workstation: [
    { id: 'ws_code', glyph: '⌨️', label: 'Code on two screens', seconds: 12, effects: { energy: -6, happiness: -2 }, pose: 'sit', skill: { id: 'coding', xp: 13 }, event: 'use:study' },
    { id: 'ws_task', glyph: '💼', label: 'Freelance coding job', seconds: 18, effects: { energy: -11, happiness: -3 }, pose: 'sit', skill: { id: 'coding', xp: 16 }, payout: 6500, minSkill: { id: 'coding', level: 3 }, event: 'use:study' },
    { id: 'ws_edit', glyph: '🎬', label: 'Edit a video', seconds: 16, effects: { energy: -8, happiness: 6 }, pose: 'sit', skill: { id: 'creativity', xp: 9 } },
  ],
  printer_station: [
    { id: 'pr_print', glyph: '🖨️', label: 'Print documents', seconds: 8, effects: { energy: -1, happiness: 2 }, pose: 'stand', skill: { id: 'communication', xp: 3 } },
  ],
  speaker: [
    { id: 'party', glyph: '🎉', label: 'Start a party', seconds: 14, effects: { happiness: 20, social: 6, energy: -4 }, pose: 'stand', party: true, event: 'use:party' },
    { id: 'dance', glyph: '💃', label: 'Dance', seconds: 12, effects: { happiness: 14, social: 3, energy: -8, hygiene: -3 }, pose: 'stand', skill: { id: 'fitness', xp: 3 } },
  ],
  disco_light: [
    { id: 'dance_floor', glyph: '🪩', label: 'Dance under the lights', seconds: 12, effects: { happiness: 16, social: 4, energy: -9, hygiene: -3 }, pose: 'stand', party: true, skill: { id: 'fitness', xp: 3 }, requires: [SPEAKER] },
  ],
};

export const ACTIVITY_SETS: Record<string, UseDef[]> = { ...BASE_ACTIVITY_SETS, ...KIT_ACTIVITIES };

/** The activities an object offers: the central table first, then the item's own `use`, else none. */
export function usesOf(def: FurnitureDef | undefined): UseDef[] {
  if (!def) return [];
  return ACTIVITY_SETS[def.id] ?? def.uses ?? (def.use ? [def.use] : []);
}

export const needsMenu = (def: FurnitureDef | undefined) => usesOf(def).length > 1;

/** Why this activity cannot start right now, or null when it can. Pure: callers pass the placed items and the skill-level lookup. */
export function blockedReason(u: UseDef, placed: readonly { defId: string }[], skillLevel: (id: SkillId) => number): string | null {
  for (const r of u.requires ?? []) if (!r.anyOf.some((id) => placed.some((p) => p.defId === id))) return r.hint;
  if (u.minSkill) { const have = skillLevel(u.minSkill.id); if (have < u.minSkill.level) return `Reach ${skillName(u.minSkill.id)} level ${u.minSkill.level} first (you are level ${have}).`; }
  return null;
}

export const findUse = (def: FurnitureDef | undefined, id: string | undefined): UseDef | undefined => { const l = usesOf(def); return l.find((u) => u.id === id) ?? l[0]; };
void getFurniture;
