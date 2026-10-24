import { INTERIORS, type InteriorKind } from '@/data/interiors';

/**
 * Interior instances and capacity. A venue holds at most `capacity` (10) people in total. Real players take seats from NPCs one for
 * one: 1 player + 9 NPCs, 2 + 8, ... 10 + 0. When every seat of an instance is taken by real players the next player is sent to
 * another copy of the same venue.
 *
 * THIS IS A CLIENT SIMULATION. With real multiplayer the server must decide who joins which instance and how many NPCs exist; a
 * client-side counter can be bypassed. `InstanceDirectory` is the boundary: swap `localDirectory` for one that talks to the server.
 */
export const npcCountFor = (capacity: number, npcTarget: number, realPlayers: number): number =>
  Math.max(0, Math.min(npcTarget, capacity - Math.max(0, realPlayers)));

/** Choose an instance: the lowest-numbered one with a free real-player seat, else a new one. `counts` = real players per instance. */
export function pickInstance(capacity: number, counts: Readonly<Record<number, number>>): { instance: number; created: boolean } {
  const ids = Object.keys(counts).map(Number).sort((a, b) => a - b);
  for (const id of ids) if ((counts[id] ?? 0) < capacity) return { instance: id, created: false };
  return { instance: (ids.at(-1) ?? 0) + 1, created: true };
}

export interface JoinResult { instance: number; realPlayers: number; npcCount: number }
export interface InstanceDirectory {
  readonly authoritative: boolean;
  join(kind: InteriorKind, playerId: string): JoinResult;
  leave(kind: InteriorKind, playerId: string): void;
}

/** Offline directory: this device is the only real player, so it is always instance 1 with NPCs filling the rest. */
export const localDirectory: InstanceDirectory = {
  authoritative: false,
  join(kind) { const d = INTERIORS[kind]; return { instance: 1, realPlayers: 1, npcCount: npcCountFor(d.capacity, d.npcTarget, 1) }; },
  leave() { /* nothing to release offline */ },
};
let directory: InstanceDirectory = localDirectory;
export const getDirectory = () => directory;
export const setDirectory = (d: InstanceDirectory) => { directory = d; };

/** In-memory model of the server's bookkeeping, used by the tests to check the rules with many players. */
export class SimulatedServer {
  private rooms = new Map<InteriorKind, Map<number, Set<string>>>();
  join(kind: InteriorKind, playerId: string): JoinResult {
    const d = INTERIORS[kind]; const m = this.rooms.get(kind) ?? new Map<number, Set<string>>(); this.rooms.set(kind, m);
    for (const s of m.values()) if (s.has(playerId)) throw new Error('already inside');
    const counts: Record<number, number> = {}; for (const [i, s] of m) counts[i] = s.size;
    const { instance } = pickInstance(d.capacity, counts);
    const set = m.get(instance) ?? new Set<string>(); m.set(instance, set); set.add(playerId);
    return { instance, realPlayers: set.size, npcCount: npcCountFor(d.capacity, d.npcTarget, set.size) };
  }
  leave(kind: InteriorKind, playerId: string) { for (const s of this.rooms.get(kind)?.values() ?? []) s.delete(playerId); }
  occupancy(kind: InteriorKind, instance: number): { real: number; npc: number; total: number } {
    const d = INTERIORS[kind]; const real = this.rooms.get(kind)?.get(instance)?.size ?? 0; const npc = npcCountFor(d.capacity, d.npcTarget, real);
    return { real, npc, total: real + npc };
  }
}
