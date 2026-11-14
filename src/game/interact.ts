import { castDef } from '@/data/cast';
import { useActorStore } from '@/stores/actorStore';
import { useCastStore } from '@/stores/castStore';
import { useCameraStore } from '@/stores/cameraStore';
import { create } from 'zustand';
import type { ActionKind } from '@/three/avatar/Avatar';
import { arrangeGroup, standoff, type Seat, type Slot } from '@/world/arrangement';
import { clearPlayerDirective, direct, directives, playerDirective, release, runtime, yawTo } from '@/world/actors';
import { shotFor, twoShot, type Shot } from '@/world/cameraShots';
import { liveNpcs, livePlayer } from '@/world/npcLive';
import type { Pt } from '@/world/navigation';

/**
 * The reusable character-interaction system. One place that knows how to bring the player and other people together and let a scene
 * play: standing talks, group talks (with sitting), following someone, handshakes and giving things, scripted ceremonies. Stories only
 * ask for what they want ("talk to bayo", "meet these three at this spot", "follow bayo to the gate"); positioning, facing, animation
 * and camera work live here, so no storyline hardcodes them.
 *
 * Everything that touches the world goes through `IO` (default: the real stores and live positions), so the rules run in tests without a
 * renderer. The driver component (three/property/InteractionDriver.tsx) calls `tickInteraction` every frame.
 */
export interface IO {
  now: () => number;
  player: () => Pt;
  walkPlayer: (p: Pt) => void;
  stopPlayer: () => void;
  actor: (id: string) => { x: number; z: number; moving: boolean; arrived: boolean } | undefined;
  setShot: (s: Shot | null) => void;
  aspect: () => number;
}
export const realIO: IO = {
  now: () => Date.now(),
  player: () => ({ x: livePlayer.x, z: livePlayer.z }),
  walkPlayer: (p) => useActorStore.getState().walkTo(p.x, p.z),
  stopPlayer: () => useActorStore.getState().clearOrder(),
  actor: (id) => { const r = runtime.get(id); if (r) return r; const l = liveNpcs.get(id); if (l) return { x: l.x, z: l.z, moving: false, arrived: true }; const c = useCastStore.getState().present[id]; return c ? { x: c.x, z: c.z, moving: false, arrived: true } : undefined; }, // before the actor has drawn its first frame, fall back to where it was placed
  setShot: (s) => { const c = useCameraStore.getState(); if (s) c.setCinematic(s, 120_000); else c.endCinematic(); },
  aspect: () => (typeof window === 'undefined' ? 1 : window.innerWidth / Math.max(1, window.innerHeight)),
};
let io: IO = realIO;
export const setIO = (x: IO | null) => { io = x ?? realIO; };

// ------------------------------------------------------------------------------------------------ state
export type Mode = 'idle' | 'approach' | 'scene' | 'follow';
interface InteractState { mode: Mode; /** who we are following (for the Stop button) */ following: string | null; label: string | null }
export const useInteractStore = create<InteractState>(() => ({ mode: 'idle', following: null, label: null }));
const setMode = (p: Partial<InteractState>) => useInteractStore.setState(p);

interface Run {
  kind: 'talk' | 'group' | 'follow' | 'scene';
  ids: string[]; started: number; settledAt: number | null;
  /** where each participant should end up (player is slot 0 for groups) */ slots: Slot[];
  onReady?: () => void; onArrive?: () => void; onCancel?: () => void;
  /** a point to keep behind the people in shots (the fire in the forest) */ backdrop?: Pt;
  dest?: Pt; lastNpc?: Pt; lastOrder: number; centre?: Pt; shot: 'auto' | 'two' | 'group' | 'close';
  presentation: 'standard' | 'cinematic';
}
let run: Run | null = null;
export const currentRun = () => run;
const APPROACH_TIMEOUT_MS = 8000, SETTLE_MS = 450, FOLLOW_GAP = 1.6, FOLLOW_WAIT = 5.5, ARRIVE_NEAR = 0.45;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.z - b.z);

// ------------------------------------------------------------------------------------------------ public API
/** Walk the player up to one person, make them face each other and open the scene (`onReady`). The player never has to line up by hand. */
export function startTalk(castId: string, opts: { presentation?: 'standard' | 'cinematic'; onReady: () => void; shot?: Run['shot'] }): boolean {
  const them = io.actor(castId); if (!them) return false;
  endRun(false);
  const me = io.player(), spot = standoff(them, me, 1.35);
  direct(castId, { goal: null, face: me, action: 'idle' });
  io.walkPlayer(spot);
  run = { kind: 'talk', ids: [castId], started: io.now(), settledAt: null, slots: [{ ...spot, yaw: yawTo(spot, them), pose: 'stand' }], onReady: opts.onReady, lastOrder: io.now(), shot: opts.shot ?? 'auto', presentation: opts.presentation ?? 'standard' };
  setMode({ mode: 'approach', label: castDef(castId)?.name ?? castId });
  return true;
}

/** Bring several people together around a point (benches get used first) and let the scene play. Slot 0 is the player. */
export function startGroup(ids: string[], centre: Pt, opts: { seats?: Seat[]; seed?: number; isFree?: (p: Pt) => boolean; onReady: () => void; presentation?: 'standard' | 'cinematic' }): Slot[] {
  endRun(false);
  const me = io.player(), slots = arrangeGroup({ centre, count: ids.length + 1, seats: opts.seats, from: me, seed: opts.seed ?? 11, isFree: opts.isFree });
  ids.forEach((id, i) => { const s = slots[i + 1]; direct(id, { goal: { x: s.x, z: s.z }, yaw: s.yaw, pose: s.pose, seatY: 0, action: 'idle', face: null, speed: 1.7 }); });
  io.walkPlayer({ x: slots[0].x, z: slots[0].z });
  run = { kind: 'group', ids, started: io.now(), settledAt: null, slots, centre, onReady: opts.onReady, lastOrder: io.now(), shot: 'group', presentation: opts.presentation ?? 'cinematic' };
  setMode({ mode: 'approach', label: null });
  return slots;
}

/** An NPC leads, the player follows at a polite distance. `onArrive` runs at the destination. Cancel with `cancelInteraction()`. */
export function startFollow(castId: string, dest: Pt, opts: { onArrive: () => void; onCancel?: () => void; speed?: number }): boolean {
  const them = io.actor(castId); if (!them) return false;
  endRun(false); io.setShot(null); // following uses the player's own camera
  direct(castId, { goal: dest, speed: opts.speed ?? 1.55, face: null, yaw: null, action: 'idle' });
  run = { kind: 'follow', ids: [castId], started: io.now(), settledAt: null, slots: [], dest, lastNpc: { x: them.x, z: them.z }, lastOrder: 0, onArrive: opts.onArrive, onCancel: opts.onCancel, shot: 'auto', presentation: 'standard' };
  setMode({ mode: 'follow', following: castId, label: castDef(castId)?.name ?? castId });
  return true;
}

/** A scene whose people are already in place (the initiation circle): the system only handles speaker animation and the camera for them. */
export function beginScene(ids: string[], backdrop?: Pt) {
  endRun(false);
  run = { backdrop, kind: 'scene', ids, started: io.now(), settledAt: io.now(), slots: [], lastOrder: 0, shot: 'group', presentation: 'cinematic' };
  setMode({ mode: 'scene', label: null });
}

/** Whose turn it is to speak: the speaker gestures, everyone else listens, and the camera can move to them. `who` is a cast id or 'player'. */
export function setSpeaker(who: string | 'player' | null) {
  if (!run) return;
  const everyone = [...run.ids];
  for (const id of everyone) {
    const d = castDef(id), sitting = directives.get(id)?.pose === 'sit';
    direct(id, { action: who === id ? (d?.talk ?? 'talk') : who === null ? idleFor(id) : 'listen', face: who === id || who === null ? directives.get(id)?.face ?? null : who === 'player' ? io.player() : (io.actor(who) ?? null) as Pt | null, ...(sitting ? {} : {}) });
  }
  playerDirective.hold = true; if (!playerDirective.lock) playerDirective.action = who === 'player' ? 'gesture' : 'listen';
  const target = who && who !== 'player' ? io.actor(who) : null;
  playerDirective.face = target ? { x: target.x, z: target.z } : run.ids[0] ? ((): Pt | null => { const a = io.actor(run!.ids[0]); return a ? { x: a.x, z: a.z } : null; })() : null;
}
const idleFor = (id: string): ActionKind => { const l = castDef(id)?.idle ?? ['idle']; return l[Math.floor(io.now() / 4000) % l.length]; };

/** A short two-person beat: both turn toward each other and play a pose for `ms`, then go back. Used for handshakes and handing things over. */
export function playBeat(kind: 'handshake' | 'give', castId: string, ms = 1700, done?: () => void) {
  const them = io.actor(castId); if (!them) { done?.(); return; }
  const me = io.player(); direct(castId, { action: kind, face: me }); playerDirective.hold = true; playerDirective.face = { x: them.x, z: them.z }; playerDirective.action = kind;
  setTimeout(() => { direct(castId, { action: 'listen' }); playerDirective.action = 'listen'; done?.(); }, ms);
}

/** Point the camera at the people in the scene. `focus` picks one person for a close framing. */
export function frame(shot: Run['shot'] = 'auto', focus?: string) {
  if (!run) return; const pts: Pt[] = [io.player()];
  for (const id of run.ids) { const a = io.actor(id); if (a) pts.push({ x: a.x, z: a.z }); }
  const asp = io.aspect(); let s: Shot;
  const bd = run.backdrop;
  if (shot === 'close' && focus) { const f = io.actor(focus); const p = f ? { x: f.x, z: f.z } : pts[1]; s = shotFor([p], undefined, bd ? { x: 2 * p.x - bd.x, z: 2 * p.z - bd.z } : io.player(), asp); }
  else if (shot === 'two' || (shot === 'auto' && pts.length === 2)) s = twoShot(pts[0], pts[1] ?? pts[0], 1, asp, bd);
  else s = shotFor(pts, undefined, bd ?? pts[0], asp); // group: the camera ends up beyond the group, so `bd` stays in the background
  io.setShot(s);
}

/** A brief camera glance at someone (a two-shot of the player and them), then back to the player's own view. It has a hard deadline: it can never trap the camera. */
export function glanceAt(castId: string, ms = 2500) {
  const them = io.actor(castId); if (!them) return;
  const me = io.player(); io.setShot(twoShot(me, { x: them.x, z: them.z }, 1, io.aspect()));
  const mine = true; void mine;
  setTimeout(() => { if (!run) io.setShot(null); }, ms);
}

/** Finish: release every person, the player's pose and the camera. Safe to call any time, any number of times. */
export function endInteraction() { endRun(true); }
export const cancelInteraction = () => { const r = run; endRun(true); r?.onCancel?.(); };
function endRun(restoreCamera: boolean) {
  const r = run; run = null;
  if (r) { for (const id of r.ids) { const d = directives.get(id); if (d) release(id); } }
  clearPlayerDirective();
  if (restoreCamera) io.setShot(null);
  setMode({ mode: 'idle', following: null, label: null });
  if (r?.kind === 'follow') io.stopPlayer();
}

// ------------------------------------------------------------------------------------------------ per frame
export function tickInteraction(): void {
  const r = run; if (!r) return;
  const now = io.now(), me = io.player();
  if (r.kind === 'talk') {
    const id = r.ids[0], them = io.actor(id); if (!them) { endRun(true); return; }
    const spot = r.slots[0];
    if (r.settledAt === null) {
      const close = dist(me, spot) < 0.3, late = now - r.started > APPROACH_TIMEOUT_MS;
      if (close || late || dist(me, them) < 1.6) {
        r.settledAt = now; io.stopPlayer(); playerDirective.hold = true; playerDirective.face = { x: them.x, z: them.z };
        direct(id, { face: me, action: 'listen' }); setMode({ mode: 'scene' });
      }
    } else if (now - r.settledAt > SETTLE_MS && r.onReady) { const f = r.onReady; r.onReady = undefined; frame(r.shot); f(); }
    return;
  }
  if (r.kind === 'group') {
    const arrived = r.ids.every((id) => { const a = io.actor(id), s = r.slots[r.ids.indexOf(id) + 1]; return !!a && a.arrived && dist(a, s) < 0.4; }) && dist(me, r.slots[0]) < 0.35;
    const late = now - r.started > APPROACH_TIMEOUT_MS + 4000;
    if (r.settledAt === null && (arrived || late)) {
      if (late && !arrived) r.ids.forEach((id, i) => direct(id, { goal: { x: r.slots[i + 1].x, z: r.slots[i + 1].z }, snap: true })); // stuck: put them on their marks instead of waiting forever
      r.settledAt = now; io.stopPlayer(); playerDirective.hold = true; playerDirective.yaw = r.slots[0].yaw; setMode({ mode: 'scene' });
      r.ids.forEach((id) => direct(id, { goal: null, action: 'listen' })); playerDirective.action = 'listen';
    } else if (r.settledAt !== null && now - r.settledAt > SETTLE_MS && r.onReady) { const f = r.onReady; r.onReady = undefined; frame('group'); f(); }
    return;
  }
  if (r.kind === 'scene') return;
  // follow
  const id = r.ids[0], them = io.actor(id); if (!them) { endRun(true); return; }
  const dNpc = dist(me, them), toGoal = r.dest ? dist(them, r.dest) : 0;
  // the leader waits when the player falls behind, and goes on when they catch up
  const d = directives.get(id); if (d) d.speed = dNpc > FOLLOW_WAIT ? 0 : 1.55;
  if (now - r.lastOrder > 350 && dNpc > FOLLOW_GAP + 0.6) {
    r.lastOrder = now; const heading = r.lastNpc ? { x: them.x - r.lastNpc.x, z: them.z - r.lastNpc.z } : { x: 0, z: 0 }, hl = Math.hypot(heading.x, heading.z);
    const back = hl > 0.01 ? { x: -heading.x / hl, z: -heading.z / hl } : { x: (me.x - them.x) / (dNpc || 1), z: (me.z - them.z) / (dNpc || 1) };
    io.walkPlayer({ x: them.x + back.x * FOLLOW_GAP, z: them.z + back.z * FOLLOW_GAP });
  }
  r.lastNpc = { x: them.x, z: them.z };
  if (toGoal < ARRIVE_NEAR && them.arrived && dNpc < FOLLOW_GAP + 1.4) { const f = r.onArrive; endRun(true); f?.(); }
}
export { directives };
