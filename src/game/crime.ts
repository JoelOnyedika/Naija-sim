import { CRIME } from '@/data/balance';
import { INTERIORS } from '@/data/interiors';
import { npcRegistry } from '@/data/npcs';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useJailStore } from '@/stores/jailStore';
import { toast } from '@/stores/uiStore';
import { liveNpcs, livePlayer } from '@/world/npcLive';
import { enterInterior, leaveInterior } from './interiors';

/**
 * Pickpocketing and jail. Fictional gameplay about NPCs only.
 *  success chance = base (50%) minus 2% per point of criminality, never below 15%      (successChance)
 *  sentence       = 10 min + 5 min per point of criminality, never above 2 hours        (sentenceMinutesFor)
 *  a success adds 1 criminality, an arrest adds 2, a served sentence takes 1 off.
 * Everything is configurable in CRIME (balance.ts). THE CLIENT MUST NOT DECIDE THESE IN A REAL GAME: the dice, the sentence, the
 * clock and the money all belong to a server. `CrimeAuthority` is that boundary; the local one below is for offline play.
 */
export const successChance = (criminality: number) => Math.min(1, Math.max(CRIME.minSuccess, CRIME.baseSuccess - Math.max(0, criminality) * CRIME.penaltyPerPoint));
export const sentenceMinutesFor = (criminality: number) => Math.min(CRIME.maxSentenceMinutes, CRIME.sentenceBaseMinutes + Math.max(0, criminality) * CRIME.sentencePerPointMinutes);

export interface CrimeAuthority {
  readonly authoritative: boolean;
  resolvePickpocket(input: { criminality: number; wallet: number }, rnd: () => number): { success: boolean; stolen: number };
  sentenceMinutes(criminality: number): number;
}
export const localCrimeAuthority: CrimeAuthority = {
  authoritative: false,
  resolvePickpocket: ({ criminality, wallet }, rnd) => {
    if (rnd() >= successChance(criminality)) return { success: false, stolen: 0 };
    const share = CRIME.takeShare[0] + (CRIME.takeShare[1] - CRIME.takeShare[0]) * rnd();
    return { success: true, stolen: Math.max(100, Math.round((wallet * share) / 100) * 100) };
  },
  sentenceMinutes: sentenceMinutesFor,
};
let authority: CrimeAuthority = localCrimeAuthority;
export const setCrimeAuthority = (a: CrimeAuthority) => { authority = a; };

/** NPCs robbed during this visit (each wallet can only be taken once). */
const robbed = new Set<string>();
export const resetCrimeVisit = () => robbed.clear();

export const remainingMs = (now = Date.now()): number => { const s = useJailStore.getState().sentence; return s ? Math.max(0, s.endAt - now) : 0; };
export const isJailed = (now = Date.now()): boolean => { const s = useJailStore.getState().sentence; return !!s && now < s.endAt; };
export const formatRemaining = (ms: number): string => { const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };

export type CrimeResult = { ok: false; message: string } | { ok: true; outcome: 'stolen'; amount: number; message: string } | { ok: true; outcome: 'caught'; minutes: number; message: string };

export function attemptPickpocket(npcId: string, opts: { now?: number; rnd?: () => number } = {}): CrimeResult {
  const now = opts.now ?? Date.now(), rnd = opts.rnd ?? Math.random;
  const jail = useJailStore.getState(), here = useInteriorStore.getState().current;
  if (isJailed(now)) return { ok: false, message: 'You are serving time.' };
  if (!here || !INTERIORS[here.kind].crowd) return { ok: false, message: 'Nobody here to rob.' };
  const npc = npcRegistry.get(npcId);
  if (!npc || !liveNpcs.has(npcId)) return { ok: false, message: 'They are gone.' };
  if (robbed.has(npcId)) return { ok: false, message: `${npc.name} has nothing left.` };
  const at = liveNpcs.get(npcId)!;
  if (!livePlayer.set || Math.hypot(at.x - livePlayer.x, at.z - livePlayer.z) > 2.4) return { ok: false, message: `Get closer to ${npc.name} first.` };
  if (now - jail.lastAttemptAt < CRIME.cooldownSeconds * 1000) return { ok: false, message: 'Too hot. Wait a little.' };
  useJailStore.getState().patch({ lastAttemptAt: now }); useJailStore.getState().note('attempt');
  const r = authority.resolvePickpocket({ criminality: jail.criminality, wallet: npc.wallet }, rnd);
  robbed.add(npcId);
  if (r.success) {
    useEconomyStore.getState().credit(r.stolen, `Pickpocketed ${npc.name}`, 'income');
    useJailStore.getState().patch({ criminality: jail.criminality + CRIME.criminalityPerSuccess }); useJailStore.getState().note('theft', r.stolen);
    return { ok: true, outcome: 'stolen', amount: r.stolen, message: `You lifted the money from ${npc.name}. Nobody noticed.` };
  }
  const minutes = authority.sentenceMinutes(jail.criminality);
  useJailStore.getState().patch({ criminality: jail.criminality + CRIME.criminalityPerArrest, sentence: { startAt: now, endAt: now + minutes * 60_000, minutes, reason: 'Pickpocketing' } });
  useJailStore.getState().note('arrest');
  enterInterior('jail', { force: true, name: 'Police cell' });
  return { ok: true, outcome: 'caught', minutes, message: `Police don catch you! ${minutes} minute${minutes === 1 ? '' : 's'} in jail.` };
}

/** Called every game tick and once on start. Releases the player when the time is up (even if the game was closed meanwhile), and puts a sentenced player back in the cell. */
export function stepJail(now = Date.now()): 'released' | 'imprisoned' | null {
  const j = useJailStore.getState(), here = useInteriorStore.getState().current;
  if (!j.sentence) return null;
  if (now >= j.sentence.endAt) {
    useJailStore.getState().patch({ sentence: null, criminality: j.criminality - CRIME.reliefPerSentence });
    if (here?.kind === 'jail') leaveInterior();
    toast('You have served your time. You are free to go.', 'good');
    return 'released';
  }
  if (here?.kind !== 'jail') { const r = enterInterior('jail', { force: true, name: 'Police cell' }); return r.ok ? 'imprisoned' : null; }
  return null;
}
