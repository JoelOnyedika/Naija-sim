import { sfx } from '@/audio/sfx';
import { FINALE, OPPONENTS, ROAD, getOpponent, type RoadChoice } from '@/data/agbero';
import { useAgberoStore, type RoadOutcome } from '@/stores/agberoStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { useTravelStore } from '@/stores/travelStore';
import { toast } from '@/stores/uiStore';
import { guardStopsAgbero } from './bodyguard';
import { isJailed } from './crime';
import { dailyHit } from './daily';
import { gunFightBonus } from './weapons';

const A = () => useAgberoStore.getState();
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** What your odds depend on: the needs bars and two skill levels (level 1 is the starting level, so it adds nothing). */
export interface Fighter { health: number; energy: number; charisma: number; fitness: number; communication: number; /** points (0..1) a carried weapon adds to fight odds (game/weapons.ts) */ gun?: number }
export const fighterNow = (): Fighter => {
  const s = useStatsStore.getState().stats, k = useSkillStore.getState();
  return { health: s.health, energy: s.energy, charisma: s.charisma, fitness: k.level('fitness') - 1, communication: k.level('communication') - 1, gun: gunFightBonus() };
};

/** Chances, 0..1. Pure so they can be tested and shown on the buttons. `power` is the opponent's strength (0, 1 or 2). */
/** `crew` is how many men block the road (1 to 3); every extra man takes 6 points off your odds. */
const crewCut = (crew: number) => (Math.max(1, Math.min(ROAD.crewMax, crew)) - 1) * ROAD.crewOddsPenalty;
export const oddsRun = (f: Fighter, power: number, crew = 1) => clamp(0.25 + (f.energy / 100) * 0.30 + (f.health / 100) * 0.10 + f.fitness * 0.05 - power * 0.10 - crewCut(crew), 0.08, 0.90);
export const oddsFight = (f: Fighter, power: number, crew = 1) => clamp(0.12 + (f.health / 100) * 0.25 + (f.energy / 100) * 0.20 + f.fitness * 0.07 + (f.charisma / 100) * 0.08 + (f.gun ?? 0) - power * 0.10 - crewCut(crew), 0.05, 0.85);
export const oddsTalk = (f: Fighter, power: number, crew = 1) => clamp(0.15 + (f.charisma / 100) * 0.40 + f.communication * 0.07 + (f.energy / 100) * 0.05 - power * 0.10 - crewCut(crew), 0.05, 0.85);
export const oddsFor = (c: RoadChoice, f: Fighter, power: number, crew = 1): number => (c === 'pay' ? 1 : c === 'run' ? oddsRun(f, power, crew) : c === 'fight' ? oddsFight(f, power, crew) : oddsTalk(f, power, crew));
/** Crew size from a 0..1 roll: 1, 2 or 3 men with equal chance. */
export const crewFromRoll = (r: number): number => 1 + Math.min(ROAD.crewMax - 1, Math.floor(r * ROAD.crewMax));

/** Which opponent you meet: the story stage is set by how many fights and talks you have won. */
export const stageOf = (wins: number): 0 | 1 | 2 => (wins >= ROAD.stageWins[1] ? 2 : wins >= ROAD.stageWins[0] ? 1 : 0);
export const finaleReady = (): boolean => A().wins >= ROAD.finaleWins && A().ending === null;

/** The amount he asks for: a share of your wallet, kept inside the opponent's range, rounded to ₦100. */
export function demandFor(opponentId: string, money: number, crew = 1): number {
  const [lo, hi] = getOpponent(opponentId).demand;
  const base = clamp(Math.round((money * ROAD.demandShare) / 100) * 100, lo, hi);
  return crew <= 1 ? base : Math.round((base * (1 + ROAD.crewDemandStep * (crew - 1))) / 100) * 100; // a gang asks for more
}

let pendingNext: (() => void) | null = null;

/**
 * Call when a trip ends. Maybe puts a roadblock on screen and keeps `next` until the player is through it. Returns true when one
 * started (so the caller must NOT continue), false when the road is clear (the caller continues as usual).
 */
export function maybeRoadblock(next: () => void, rnd: () => number = Math.random): boolean {
  const a = A();
  if (a.ending === 'joined') { useEconomyStore.getState().credit(FINALE.join.duesPerTrip, 'Union dues', 'income', 'The union'); toast(`Union dues: +₦${FINALE.join.duesPerTrip.toLocaleString('en-NG')}`, 'good'); return false; }
  if (a.ending || isJailed() || a.active) return false;
  const trips = useTravelStore.getState().trips;
  if (trips < ROAD.minTrips || trips - a.lastTrip < 2) return false;
  const finale = finaleReady();
  if (!finale && rnd() >= ROAD.chance) return false;
  if (guardStopsAgbero()) { A().set({ lastTrip: trips }); return false; } // a bodyguard stops it before it starts
  const opp = finale ? OPPONENTS[2] : OPPONENTS[stageOf(a.wins)];
  const crew = finale ? 3 : crewFromRoll(rnd()); // the finale shows the boss with two bodyguards; it has no dice
  const first = Math.floor(rnd() * 1000), looks = Array.from({ length: crew }, (_, i) => (first + i * 3 + (i > 0 ? 1 : 0)) % 8); // distinct looks, same seed rolls the same crew
  pendingNext = next;
  A().set({ active: { opponentId: opp.id, demand: finale ? demandFor(opp.id, useEconomyStore.getState().money) : demandFor(opp.id, useEconomyStore.getState().money, crew), finale, crew, looks }, result: null, lastTrip: trips, encounters: a.encounters + 1 });
  sfx.notify();
  return true;
}

const money = () => useEconomyStore.getState().money;
/** Pay up to `amt` (never more than the wallet). Returns what was actually paid. */
function take(amt: number, label: string, who: string): number {
  const pay = Math.min(Math.max(0, Math.round(amt)), money());
  if (pay > 0) useEconomyStore.getState().debit(pay, label, 'purchase', who);
  return pay;
}

/** The player picked a way out. Rolls the dice (a server must do this later), applies the result and records it for the animation. */
export function chooseRoad(choice: RoadChoice, rnd: () => number = Math.random): RoadOutcome | null {
  const b = A().active; if (!b || b.finale || A().result) return null;
  const opp = getOpponent(b.opponentId), f = fighterNow(), st = useStatsStore.getState(), label = `${opp.name}: road ticket`;
  const crew = b.crew ?? 1, extra = ROAD.crewHealthStep * (crew - 1);
  const roll = choice === 'pay' ? 1 : rnd() < oddsFor(choice, f, opp.power, crew) ? 1 : 0, success = !!roll;
  let text = '', out: Record<string, number> = {}, m = 0;
  if (choice === 'pay') { m = -take(b.demand, label, opp.name); text = m ? `He counts the money and steps aside. "Safe journey, Oga."` : 'Your pockets are empty. He sneers and lets you go this time.'; A().set({ paid: A().paid + 1 }); }
  else if (choice === 'run') {
    if (success) { out = { energy: -8, happiness: 3 }; text = 'You sprint through a gap in traffic and leave him shouting behind you.'; A().set({ escapes: A().escapes + 1 }); }
    else { m = -take(b.demand * 1.5, label, opp.name); out = { energy: -8, health: -8 - extra, happiness: -4 }; text = 'He catches your collar. You pay extra for the trouble and your side hurts.'; A().set({ losses: A().losses + 1 }); }
  } else if (choice === 'fight') {
    if (success) { out = { charisma: 3, social: 3, energy: -12, health: -4 }; m = b.demand; useEconomyStore.getState().credit(b.demand, label, 'reward', opp.name); text = `You land the better punches. He drops ₦${b.demand.toLocaleString('en-NG')} and runs off. People clap.`; win(); }
    else { m = -take(b.demand * 2, label, opp.name); out = { health: -15 - extra, energy: -12, happiness: -6 }; text = crew > 1 ? 'Too many of them. You go down under the sticks and your wallet goes with you.' : 'He hits harder than he looks. You go down, and your wallet goes with you.'; A().set({ losses: A().losses + 1 }); }
  } else {
    if (success) { out = { charisma: 2, social: 2 }; text = 'You speak so well he starts nodding. "Ah, na correct person. Go, go."'; useSkillStore.getState().add('communication', 6); win(); }
    else { m = -take(b.demand, label, opp.name); out = { happiness: -3 }; text = 'He is not impressed by speeches. You pay anyway.'; A().set({ losses: A().losses + 1 }); }
  }
  if (Object.keys(out).length) st.apply(out);
  dailyHit('road');
  const res: RoadOutcome = { choice, success, text, money: m, effects: out };
  A().set({ result: res });
  (success ? sfx.coin : sfx.error)();
  return res;
}

/** A win from outside a roadblock (arguing the street Agbero down) also moves the story along. */
export const addRoadWin = () => win();

function win() {
  const before = stageOf(A().wins); A().set({ wins: A().wins + 1 });
  const after = stageOf(A().wins);
  if (after > before) toast(after === 1 ? 'Word is spreading: Area Boy Kazeem is looking for you.' : 'The Area Boss himself is asking about you now.', 'info');
  else if (finaleReady()) toast('The Area Boss wants to meet you. Your next trip may be different.', 'info');
}

/** The finale: join the union or walk away and report him. */
export function resolveFinale(which: 'join' | 'report'): boolean {
  const b = A().active; if (!b?.finale) return false;
  const f = FINALE[which];
  useEconomyStore.getState().credit(f.money, `Area Boss: ${which === 'join' ? 'union signing bonus' : 'reward'}`, 'reward', 'Area Boss');
  useStatsStore.getState().apply(f.effects);
  A().set({ ending: which === 'join' ? 'joined' : 'reformed', result: { choice: 'talk', success: true, text: f.text, money: f.money, effects: f.effects } });
  sfx.reward();
  return true;
}

/** Close the roadblock and let the trip carry on. */
export function finishRoadblock(): void {
  A().set({ active: null, result: null });
  const n = pendingNext; pendingNext = null; n?.();
}
