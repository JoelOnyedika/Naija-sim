/**
 * The Agbero on the road. When you arrive from a trip there is a chance somebody blocks you and wants "ticket" money. You can pay,
 * run, fight or talk your way out; run, fight and talk are dice rolls shaped by your stats. Winning fights and talks builds a
 * story with three opponents that ends with a choice about the Area Boss. Pure data; the rules are in game/agbero.ts. In-game naira only.
 */
export interface Opponent { id: string; name: string; title: string; /** 0 = small, 1 = area boy, 2 = boss. Subtracts from your odds. */ power: number; demand: [number, number]; line: string; cap: string; skin: string; shirt: string }

export const ROAD = {
  /** Chance of a roadblock on arrival, once you have taken `minTrips` trips. */
  chance: 0.28, minTrips: 2,
  /** Demand is this fraction of your wallet, clamped to the opponent's range and rounded to ₦100. */
  demandShare: 0.015,
  /** Wins (fights won plus talks won) needed to reach story stage 1 and stage 2. */
  stageWins: [2, 5] as [number, number],
  /** Wins that unlock the finale with the Area Boss. */
  finaleWins: 8,
};

export const OPPONENTS: Opponent[] = [
  { id: 'ticket_boy', name: 'Ticket Boy', title: 'Park ticket boy', power: 0, demand: [500, 1000], cap: '#E5A400', skin: '#7A4A2B', shirt: '#9CA3AF', line: '"Oga, where you dey go? Park your body small. Na ticket, ₦{amount}!"' },
  { id: 'kazeem', name: 'Area Boy Kazeem', title: 'Area boy', power: 1, demand: [1500, 3000], cap: '#B91C1C', skin: '#5B3720', shirt: '#1D4ED8', line: '"Ehen! The one wey dey carry himself like big man. Na ₦{amount} to pass my street!"' },
  { id: 'boss', name: 'Alhaji Area Boss', title: 'Area Boss', power: 2, demand: [3000, 6000], cap: '#0B8F4D', skin: '#6B4226', shirt: '#F8FAFC', line: '"I hear say you dey disturb my boys. Settle ₦{amount}, or we go talk another way."' },
];
export const getOpponent = (id: string) => OPPONENTS.find((o) => o.id === id) ?? OPPONENTS[0];

/** Story stage names, for the progress card. */
export const STAGES = ['Ticket Boy', 'Area Boy Kazeem', 'Alhaji Area Boss'];

export type RoadChoice = 'pay' | 'run' | 'fight' | 'talk';
export interface ChoiceInfo { id: RoadChoice; label: string; sub: string; emoji: string }
export const ROAD_CHOICES: ChoiceInfo[] = [
  { id: 'pay', label: 'Give him the money', sub: 'Safe. He leaves you alone.', emoji: '💸' },
  { id: 'run', label: 'Run for it', sub: 'Needs energy, health and fitness.', emoji: '🏃🏾' },
  { id: 'fight', label: 'Fight him', sub: 'Needs health, energy, fitness and charisma.', emoji: '🥊' },
  { id: 'talk', label: 'Talk your way out', sub: 'Needs charisma and communication.', emoji: '🗣️' },
];

export const FINALE = {
  intro: 'The Area Boss has heard your name all over the neighbourhood. He steps out of his car, folds his arms, and smiles: "You are not like the others. Join my union and you will never pay ticket again. Or go and report me and see what happens."',
  join: { label: 'Join the union', sub: '₦5,000 now, ₦1,500 dues every trip, no more roadblocks. -3 Charisma.', money: 5000, effects: { charisma: -3 }, duesPerTrip: 1500, text: 'You shake his hand. Somebody pins a union badge on you. Nobody blocks your road again.' },
  report: { label: 'Walk away and report him', sub: '₦10,000 reward, +5 Charisma, +5 Social, no more roadblocks.', money: 10000, effects: { charisma: 5, social: 5 }, text: 'You walk away and make a call. By evening the street is quiet and a stranger posts your name online as a hero.' },
};
