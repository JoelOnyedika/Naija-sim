import type { Effects } from '@/types/game';

/**
 * Daily loop content: the 7-day login calendar and the pool daily quests are drawn from. Pure data, no logic: every naira
 * and stat value that the daily loop hands out lives in this file (and is the thing a server would own later, see
 * `DailyAuthority` in game/daily.ts). In-game naira only.
 */
export interface DailyReward { day: number; icon: string; label: string; /** Fits under a small calendar tile. */ short: string; blurb: string; money?: number; effects?: Effects }

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, icon: '💵', label: '₦2,000', short: '₦2,000', blurb: 'Small change, big day.', money: 2000 },
  { day: 2, icon: '🍛', label: 'Jollof pack', short: 'Jollof', blurb: 'Party jollof for lunch.', effects: { hunger: 30, happiness: 5 } },
  { day: 3, icon: '💵', label: '₦4,000', short: '₦4,000', blurb: 'Alert don enter.', money: 4000 },
  { day: 4, icon: '😎', label: '+3 Charisma', short: '+3 Cha', blurb: 'You are looking sharp.', effects: { charisma: 3 } },
  { day: 5, icon: '💰', label: '₦6,000', short: '₦6,000', blurb: 'Weekend money loading.', money: 6000 },
  { day: 6, icon: '⚡', label: 'Energy boost', short: 'Energy', blurb: 'Malt, bread and a long nap.', effects: { energy: 40, happiness: 5 } },
  { day: 7, icon: '🎉', label: 'Owambe jackpot', short: 'Jackpot', blurb: '₦15,000, +5 Charisma, +10 Social.', money: 15000, effects: { charisma: 5, social: 10 } },
];

export interface QuestReward { money?: number; charisma?: number; social?: number }
export interface QuestDef {
  id: string; icon: string; title: string; hint: string;
  /** The counter key this quest watches (see `dailyHit` in game/daily.ts). */
  hit: string; target: number; reward: QuestReward;
  /** easy / medium / social: one of each is picked per day. */
  tier: 'easy' | 'medium' | 'social';
}

export const QUESTS_PER_DAY = 3;
/** Finish all of a day's quests for this on top. */
export const QUEST_BONUS: QuestReward & { label: string } = { money: 3000, charisma: 3, label: '₦3,000 and +3 Charisma' };

export const QUEST_POOL: QuestDef[] = [
  // easy: things you do at home
  { id: 'q_bath', tier: 'easy', icon: '🚿', title: 'Take a bath', hint: 'Shower or bath at home.', hit: 'use:bathe', target: 1, reward: { money: 800 } },
  { id: 'q_study', tier: 'easy', icon: '📘', title: 'Study or practise coding', hint: 'Use a desk or laptop.', hit: 'use:study', target: 1, reward: { money: 1000 } },
  { id: 'q_workout', tier: 'easy', icon: '💪', title: 'Do a workout', hint: 'Gym rug or equipment.', hit: 'use:workout', target: 1, reward: { money: 1000, charisma: 1 } },
  { id: 'q_food', tier: 'easy', icon: '🍛', title: 'Order food', hint: 'Use the Food app.', hit: 'phone:food', target: 1, reward: { money: 800, social: 1 } },
  { id: 'q_three', tier: 'easy', icon: '🧹', title: 'Finish 3 activities', hint: 'Anything that runs on the circle.', hit: 'act', target: 3, reward: { money: 1200 } },
  // medium: hustle
  { id: 'q_shift', tier: 'medium', icon: '💼', title: 'Finish a shift', hint: 'Pick a job in the Jobs app.', hit: 'act:job', target: 1, reward: { money: 2500 } },
  { id: 'q_earn', tier: 'medium', icon: '💸', title: 'Earn ₦3,000 from work', hint: 'Shifts, venue hustles and coding tasks count.', hit: 'earn', target: 3000, reward: { money: 1500, charisma: 2 } },
  { id: 'q_skill', tier: 'medium', icon: '🧠', title: 'Level up a skill twice', hint: 'Practise any skill two times.', hit: 'skill', target: 2, reward: { money: 1800 } },
  { id: 'q_venue_work', tier: 'medium', icon: '🏪', title: 'Do 2 tasks in venues', hint: 'Tasks at stalls, booths and counters.', hit: 'act:venue', target: 2, reward: { money: 2000, social: 2 } },
  // social: go out, meet Nigeria
  { id: 'q_street2', tier: 'social', icon: '🗣️', title: 'Answer 2 street moments', hint: 'Someone will stop you. Say something.', hit: 'street', target: 2, reward: { money: 1500, charisma: 2 } },
  { id: 'q_market', tier: 'social', icon: '🛍️', title: 'Go to the market', hint: 'Balogun or any market on the map.', hit: 'visit:market', target: 1, reward: { money: 1200, social: 2 } },
  { id: 'q_church', tier: 'social', icon: '⛪', title: 'Visit a church', hint: 'Find one on the map.', hit: 'visit:church', target: 1, reward: { money: 1000, social: 3 } },
  { id: 'q_viewing', tier: 'social', icon: '📺', title: 'Watch the match at a viewing centre', hint: 'Football gist awaits.', hit: 'visit:viewing', target: 1, reward: { money: 1000, social: 3 } },
  { id: 'q_beach', tier: 'social', icon: '🏖️', title: 'Chill at the beach', hint: 'Lekki side.', hit: 'visit:beach', target: 1, reward: { money: 1500, social: 2 } },
  { id: 'q_gallery', tier: 'social', icon: '🎨', title: 'See art at a gallery', hint: 'Freedom Park and friends.', hit: 'visit:gallery', target: 1, reward: { money: 1000, charisma: 2 } },
  { id: 'q_tech', tier: 'social', icon: '💻', title: 'Visit the tech hub', hint: 'Yaba, where the code people live.', hit: 'visit:techhub', target: 1, reward: { money: 1200, charisma: 1 } },
  { id: 'q_club', tier: 'social', icon: '🪩', title: 'Go to the club', hint: 'Quilox or any club.', hit: 'visit:club', target: 1, reward: { money: 1500, social: 4 } },
  { id: 'q_agbo', tier: 'social', icon: '🌿', title: 'Buy agbo from a market woman', hint: 'She will find you at the market.', hit: 'street:agbo', target: 1, reward: { money: 1200, charisma: 1 } },
  { id: 'q_outings', tier: 'social', icon: '🗺️', title: 'Visit 2 places', hint: 'Any two venues.', hit: 'visit', target: 2, reward: { money: 1500, social: 2 } },
];
