import type { QuestDef, QuestReward } from './daily';

/** Weekly goals: bigger versions of the daily counters, three per week (Monday to Sunday), with a bigger chest. Pure data. */
export const WEEKLY_PER_WEEK = 3;
export const WEEKLY_BONUS: QuestReward & { label: string } = { money: 15000, charisma: 5, social: 5, label: '₦15,000, +5 Charisma, +5 Social' };

export const WEEKLY_POOL: QuestDef[] = [
  { id: 'w_earn', tier: 'medium', icon: '💰', title: 'Earn ₦40,000 from work', hint: 'Shifts, venue hustles and coding tasks.', hit: 'earn', target: 40000, reward: { money: 6000, charisma: 2 } },
  { id: 'w_shifts', tier: 'medium', icon: '💼', title: 'Finish 8 shifts', hint: 'Any job in the Jobs app.', hit: 'act:job', target: 8, reward: { money: 7000 } },
  { id: 'w_places', tier: 'social', icon: '🗺️', title: 'Visit 8 places', hint: 'Markets, churches, clubs, beaches.', hit: 'visit', target: 8, reward: { money: 5000, social: 4 } },
  { id: 'w_street', tier: 'social', icon: '🗣️', title: 'Answer 12 street moments', hint: 'Someone stops you? Say something.', hit: 'street', target: 12, reward: { money: 5000, charisma: 3 } },
  { id: 'w_venue', tier: 'medium', icon: '🏪', title: 'Do 15 tasks in venues', hint: 'Stalls, booths, counters.', hit: 'act:venue', target: 15, reward: { money: 6000, social: 3 } },
  { id: 'w_skill', tier: 'medium', icon: '🧠', title: 'Practise skills 10 times', hint: 'Desks, laptops, gym.', hit: 'skill', target: 10, reward: { money: 6000 } },
  { id: 'w_study', tier: 'easy', icon: '📘', title: 'Study 5 times', hint: 'Laptop or desk.', hit: 'use:study', target: 5, reward: { money: 4000, charisma: 1 } },
  { id: 'w_baths', tier: 'easy', icon: '🚿', title: 'Stay fresh: 5 baths', hint: 'A clean Lagosian is a happy one.', hit: 'use:bathe', target: 5, reward: { money: 3000, charisma: 2 } },
  { id: 'w_club', tier: 'social', icon: '🪩', title: 'Hit the club twice', hint: 'Quilox and friends.', hit: 'visit:club', target: 2, reward: { money: 5000, social: 5 } },
  { id: 'w_church', tier: 'social', icon: '⛪', title: 'Go to church twice', hint: 'Sunday service or midweek.', hit: 'visit:church', target: 2, reward: { money: 4000, social: 4 } },
];
