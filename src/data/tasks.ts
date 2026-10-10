export interface TaskDef { id: string; title: string; icon: string; rewardLabel: string; reward: { charisma?: number; money?: number; social?: number }; event: string }

/** Tasks appear three at a time in this order. `event` strings are fired by game systems via taskStore.fire(). */
export const TASKS: TaskDef[] = [
  { id: 'art', title: 'See art at Freedom Park', icon: '🎨', rewardLabel: '+3 Charisma', reward: { charisma: 3 }, event: 'visit:art' },
  { id: 'furniture', title: 'Buy your first furniture', icon: '🛒', rewardLabel: '+₦5,000', reward: { money: 5000 }, event: 'buy:furniture' },
  { id: 'wash', title: 'Take a bath', icon: '🚿', rewardLabel: '+1 Charisma', reward: { charisma: 1 }, event: 'use:bathe' },
  { id: 'food', title: 'Order food on the Food app', icon: '🍛', rewardLabel: '+4 Social', reward: { social: 4 }, event: 'phone:food' },
  { id: 'shift', title: 'Finish your first shift', icon: '💼', rewardLabel: '+₦3,000', reward: { money: 3000 }, event: 'job:shift' },
  { id: 'forbes', title: 'Check the Forbes list', icon: '📈', rewardLabel: '+1 Charisma', reward: { charisma: 1 }, event: 'app:forbes' },
  { id: 'house', title: 'Browse homes in the Houses app', icon: '🏠', rewardLabel: '+2 Charisma', reward: { charisma: 2 }, event: 'app:houses' },
  { id: 'party', title: 'Hang out at Quilox', icon: '🪩', rewardLabel: '+5 Social', reward: { social: 5 }, event: 'visit:club' },
];
