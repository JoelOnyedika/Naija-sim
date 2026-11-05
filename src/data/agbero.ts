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
  /** A roadblock is 1, 2 or 3 men at random. Each extra man lowers your odds, raises the demand and makes a loss hurt more. */
  crewMax: 3, crewOddsPenalty: 0.06, crewDemandStep: 0.4, crewHealthStep: 5,
};

/** How the men on the street look: ugly on purpose. Drawn by RoadBlock's Thug component; each is a different mix of face, clothes and weapon. */
export type Headwear = 'none' | 'bandana' | 'cap' | 'beanie' | 'fila';
export type Top = 'vest' | 'bare' | 'jersey' | 'hoodie' | 'kaftan';
export type Weapon = 'club' | 'plank' | 'pipe' | 'bottle' | 'cane';
export interface ThugLook { skin: string; top: Top; topColor: string; trousers: string; head: Headwear; headColor: string; weapon: Weapon; scar: boolean; gold: boolean; stubble: boolean; gap: boolean; /** body width factor */ build: number; brow: number }
export const THUG_LOOKS: ThugLook[] = [
  { skin: '#6B4128', top: 'vest', topColor: '#C9C2A8', trousers: '#3B4252', head: 'bandana', headColor: '#B91C1C', weapon: 'club', scar: true, gold: true, stubble: true, gap: true, build: 1.1, brow: 1 },
  { skin: '#4A2C1B', top: 'bare', topColor: '#4A2C1B', trousers: '#6B5B3E', head: 'none', headColor: '#000', weapon: 'plank', scar: false, gold: true, stubble: false, gap: false, build: 1.25, brow: 1.2 },
  { skin: '#7A4A2B', top: 'jersey', topColor: '#16A34A', trousers: '#1F2937', head: 'cap', headColor: '#111827', weapon: 'pipe', scar: true, gold: false, stubble: true, gap: true, build: 1, brow: 0.9 },
  { skin: '#5B3720', top: 'hoodie', topColor: '#6B7280', trousers: '#111827', head: 'beanie', headColor: '#D97706', weapon: 'bottle', scar: false, gold: false, stubble: true, gap: false, build: 1.05, brow: 1.1 },
  { skin: '#8A5A3C', top: 'vest', topColor: '#E5E7EB', trousers: '#7F1D1D', head: 'none', headColor: '#000', weapon: 'club', scar: true, gold: true, stubble: false, gap: true, build: 1.3, brow: 1.3 },
  { skin: '#3B2314', top: 'jersey', topColor: '#DC2626', trousers: '#374151', head: 'bandana', headColor: '#0B8F4D', weapon: 'plank', scar: false, gold: true, stubble: true, gap: false, build: 0.95, brow: 1 },
  { skin: '#6B4226', top: 'bare', topColor: '#6B4226', trousers: '#92400E', head: 'cap', headColor: '#E5A400', weapon: 'pipe', scar: true, gold: false, stubble: false, gap: true, build: 1.2, brow: 1.2 },
  { skin: '#5A3A22', top: 'hoodie', topColor: '#1E3A8A', trousers: '#1F2937', head: 'none', headColor: '#000', weapon: 'club', scar: false, gold: true, stubble: true, gap: true, build: 1.15, brow: 1.1 },
];
export const lookFor = (i: number): ThugLook => THUG_LOOKS[((i % THUG_LOOKS.length) + THUG_LOOKS.length) % THUG_LOOKS.length];

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

/** The Alhaji Area Boss in the finale: a white kaftan, a green fila cap and a gold-topped cane, with the same angry face. */
export const BOSS_LOOK: ThugLook = { skin: '#6B4226', top: 'kaftan', topColor: '#F8FAFC', trousers: '#F8FAFC', head: 'fila', headColor: '#0B8F4D', weapon: 'cane', scar: true, gold: true, stubble: true, gap: false, build: 1.3, brow: 1.3 };
