import { livePlayer } from '@/world/npcLive';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MathUtils, type Group, type Mesh } from 'three';
import { AFK_DELAY_S, AFK_DURATION_S, pickAfk } from '@/game/afk';
import { startUse } from '@/game/interactions';
import { useActorStore, type CosmeticKind } from '@/stores/actorStore';
import { useCharacterStore } from '@/stores/characterStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useStatsStore } from '@/stores/statsStore';
import { useUiStore } from '@/stores/uiStore';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { buildNavGrid, findPath, interactionSpot, isFree, nearestFree, type Pt, type Spot } from '@/world/navigation';
import { bubbleFor } from '@/world/bubbles';
import { Avatar, type Motion } from '../avatar/Avatar';
import { HeadFx } from './HeadFx';

const WALK = 1.8, GLIDE = 1.1, ARRIVE = 0.05;
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

type Stage = 'idle' | 'walk' | 'glide';
interface Plan {
  stage: Stage; path: Pt[]; spot: Spot | null;
  /** what to do on arrival */
  then: 'none' | { use: string } | { cosmetic: CosmeticKind; uid?: string };
  clip: boolean; // controlled fallback: no route was found, glide straight (logged)
}
const IDLE: Plan = { stage: 'idle', path: [], spot: null, then: 'none', clip: false };

/**
 * The player's avatar. It only ever MOVES because of intent in actorStore (tap floor, tap furniture, AFK): it plans a
 * path with world/navigation.ts, walks it, turns to face the object, and only then starts the activity (startUse) or the
 * cosmetic AFK behaviour. Seat / bed / tub positions come from `interactionSpot`. When an activity ends the avatar steps
 * back out onto free floor, so it can never be left stuck inside furniture.
 */
export function AvatarWalker({ layout, items }: { layout: PropertyLayout; items: PlacedItem[] }) {
  const appearance = useCharacterStore((s) => s.appearance);
  const root = useRef<Group>(null);
  const cover = useRef<Mesh>(null);
  const motion = useRef<Motion>({ moving: false, lying: false, sitting: false });
  const plan = useRef<Plan>(IDLE);
  const lastOrder = useRef(0);
  const held = useRef<{ key: string; spot: Spot | null }>({ key: '', spot: null });
  const cosmeticStart = useRef(0);
  const afkNot = useRef<CosmeticKind | undefined>(undefined);
  const invalidate = useThree((s) => s.invalidate);

  const home = useMemo<Pt>(() => {
    const z = layout.zones.find((q) => q.furnishable && q.indoor && (q.kind === 'living' || q.kind === 'parlour')) ?? layout.zones.find((q) => q.furnishable && q.indoor) ?? layout.zones[0];
    return { x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2 + (z.z1 - z.z0) * 0.2 };
  }, [layout]);
  const itemsRef = useRef(items); itemsRef.current = items;

  // any real player input resets the AFK clock and cancels a running AFK behaviour
  useEffect(() => {
    const touch = () => useActorStore.getState().touch();
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, touch));
  }, []);

  useFrame((_, dtRaw) => {
    const g = root.current; if (!g) return;
    const dt = Math.min(dtRaw, 0.1);
    const its = itemsRef.current;
    const grid = buildNavGrid(layout, its);
    const stats = useStatsStore.getState(), actor = useActorStore.getState();
    let activity = stats.activity;
    const here: Pt = { x: g.position.x, z: g.position.z };
    livePlayer.x = here.x; livePlayer.z = here.z; livePlayer.set = true;
    let p = plan.current;

    // ---- new order from the player
    const order = actor.order;
    if (order && order.id !== lastOrder.current) {
      lastOrder.current = order.id;
      if (order.kind === 'walk') {
        const target = isFree(grid, order) ? { x: order.x, z: order.z } : nearestFree(grid, order, 3);
        const path = target ? findPath(grid, here, target) : null;
        plan.current = p = path ? { stage: 'walk', path, spot: null, then: 'none', clip: false } : IDLE;
        if (!path) actor.clearOrder();
      } else {
        const item = its.find((i) => i.uid === order.uid);
        const spot = item ? interactionSpot(layout, its, item) : null;
        if (import.meta.env.DEV) { const w = window as unknown as { __navlog?: string[] }; (w.__navlog ??= []).push(`order use ${item?.defId} spot=${spot ? `${spot.approach.x.toFixed(1)},${spot.approach.z.toFixed(1)}->${spot.final.x.toFixed(1)},${spot.final.z.toFixed(1)} ${spot.pose}` : 'NONE'} from ${here.x.toFixed(1)},${here.z.toFixed(1)}`); }
        if (!item || !spot) { if (item) startUse(item); actor.clearOrder(); }
        else {
          const path = findPath(grid, here, spot.approach);
          if (!path) console.warn('[nav] no route to', item.defId, '- using the controlled straight-line fallback');
          plan.current = p = { stage: 'walk', path: path ?? [spot.approach], spot, then: { use: item.uid }, clip: !path };
        }
      }
    }
    // ---- player input cancels an AFK behaviour (and a walk toward one)
    const cosmetic = actor.cosmetic;
    if (cosmetic && actor.lastInput > cosmeticStart.current) { actor.setCosmetic(null); }
    if (typeof p.then === 'object' && 'cosmetic' in p.then && actor.lastInput > cosmeticStart.current) plan.current = p = IDLE;

    // ---- movement along the plan
    let moving = false, yawGoal: number | null = null;
    const moveToward = (t: Pt, speed: number) => {
      const dx = t.x - g.position.x, dz = t.z - g.position.z, d = Math.hypot(dx, dz);
      if (d <= ARRIVE) return true;
      const step = Math.min(d, speed * dt);
      g.position.x += (dx / d) * step; g.position.z += (dz / d) * step; moving = true; yawGoal = Math.atan2(dx, dz);
      return false;
    };
    let finishedTurn = true;
    if (p.stage === 'walk') {
      if (p.path.length && moveToward(p.path[0], WALK)) p.path.shift();
      if (!p.path.length) p.stage = p.spot ? 'glide' : 'idle';
    }
    if (p.stage === 'glide' && p.spot) {
      const arrived = moveToward(p.spot.final, p.spot.pose === 'stand' ? WALK : GLIDE);
      if (!moving) yawGoal = p.spot.yaw; else if (p.spot.pose !== 'stand') yawGoal = p.spot.yaw;
      finishedTurn = Math.abs(angleDiff(g.rotation.y, p.spot.yaw)) < 0.12;
      if (arrived && finishedTurn) {
        const then = p.then; p.stage = 'idle';
        if (typeof then === 'object' && 'use' in then) { const it = its.find((i) => i.uid === then.use); actor.clearOrder(); held.current = { key: '', spot: p.spot }; if (it) startUse(it); }
        else if (typeof then === 'object') { actor.setCosmetic({ kind: then.cosmetic, uid: then.uid, until: performance.now() + (AFK_DURATION_S[0] + Math.random() * (AFK_DURATION_S[1] - AFK_DURATION_S[0])) * 1000 }); }
        p.then = 'none';
      }
    }

    // a plain walk is finished once the path is used up: clear the order so AFK and new orders see an idle avatar
    if (p.stage === 'idle' && p.then === 'none' && actor.order?.kind === 'walk' && actor.order.id === lastOrder.current) actor.clearOrder();
    activity = useStatsStore.getState().activity; // startUse above may have just started one: never judge from the stale value

    // ---- what the avatar is doing right now: a real activity, an AFK cosmetic, or nothing
    let spot: Spot | null = null, acting = false;
    if (activity?.targetUid) {
      const key = activity.id;
      if (held.current.key !== key) {
        const it = its.find((i) => i.uid === activity.targetUid);
        held.current = { key, spot: held.current.spot ?? (it ? interactionSpot(layout, its, it) : null) };
      }
      spot = held.current.spot;
    } else if (cosmetic) {
      spot = cosmeticSpot(cosmetic.kind, cosmetic.uid);
    }
    function cosmeticSpot(kind: CosmeticKind, uid?: string): Spot | null {
      const it = uid ? its.find((i) => i.uid === uid) : undefined;
      if (kind === 'relax' || !it) return null;
      const s = interactionSpot(layout, its, it);
      return s ? { ...s, bathing: false } : null;
    }
    if (spot && p.stage === 'idle' && !(typeof p.then === 'object')) {
      // hold the spot: settle exactly onto it (seat, bed, tub...)
      const done = moveToward(spot.final, GLIDE);
      if (!moving) yawGoal = spot.yaw; else yawGoal = spot.yaw;
      acting = done && Math.abs(angleDiff(g.rotation.y, spot.yaw)) < 0.25;
    } else if (!spot && (activity || cosmetic) && p.stage === 'idle') acting = true; // e.g. a job or "relax": stays where it is

    // ---- activity over: step out of the furniture onto free floor
    if (!activity && !cosmetic && p.stage === 'idle' && typeof p.then !== 'object' && !isFree(grid, here)) {
      const out = nearestFree(grid, here, 10);
      if (out) plan.current = p = { stage: 'glide', path: [], spot: { approach: out, final: out, yaw: g.rotation.y, pose: 'stand', y: 0, action: 'idle', bathing: false }, then: 'none', clip: false };
    }
    if (cosmetic && performance.now() > cosmetic.until) { actor.setCosmetic(null); afkNot.current = cosmetic.kind; }

    // ---- AFK: after 15 s of no input, one cosmetic behaviour from the closed list in game/afk.ts
    const ui = useUiStore.getState();
    const idleFor = (performance.now() - actor.lastInput) / 1000;
    if (idleFor > AFK_DELAY_S && !activity && !cosmetic && !order && p.stage === 'idle' && p.then === 'none' && ui.mode === 'home' && !usePhoneStore.getState().open && !ui.foodPickerUid) {
      const choice = pickAfk(its, Math.random, afkNot.current);
      actor.touch(); // restart the clock so the next AFK window is a full 15 s; only LATER input cancels the behaviour
      cosmeticStart.current = useActorStore.getState().lastInput;
      const it = choice.uid ? its.find((i) => i.uid === choice.uid) : undefined;
      const s = it ? (choice.kind === 'pushups' ? cosmeticSpot('pushups', it.uid) : interactionSpot(layout, its, it)) : null;
      if (choice.kind === 'relax' || !s) actor.setCosmetic({ kind: 'relax', until: performance.now() + 8000 });
      else { const path = findPath(grid, here, s.approach); if (path) plan.current = p = { stage: 'walk', path, spot: { ...s, bathing: false }, then: { cosmetic: choice.kind, uid: it!.uid }, clip: false }; else actor.setCosmetic({ kind: 'relax', until: performance.now() + 8000 }); }
    }

    // ---- turn, lift/lower, publish pose to the avatar
    const ay = p.stage !== 'idle' && !moving && p.spot ? p.spot.yaw : yawGoal;
    if (ay !== null) g.rotation.y += angleDiff(g.rotation.y, ay) * (1 - Math.exp(-dt * (moving ? 12 : 9)));
    const yTarget = acting && spot ? spot.y : 0;
    g.position.y = MathUtils.lerp(g.position.y, yTarget, 1 - Math.exp(-dt * 10));
    const m = motion.current;
    m.moving = moving;
    m.lying = acting && spot?.pose === 'sleep';
    m.sitting = acting && spot?.pose === 'sit';
    m.action = acting ? (spot?.action ?? 'idle') : 'idle';
    m.bathing = acting && !!spot?.bathing;
    // what the thought bubble shows: the object being used (real activity or AFK cosmetic), nothing while walking
    const usedUid = activity?.targetUid ?? cosmetic?.uid, usedDef = usedUid ? its.find((i) => i.uid === usedUid)?.defId : undefined;
    m.bubble = acting ? (cosmetic?.kind === 'relax' && !activity ? '😌' : bubbleFor(usedDef, spot?.action, spot?.pose)) : null;
    if (cover.current) cover.current.visible = !!m.bathing;
    if (moving || acting || p.stage !== 'idle') invalidate();
    // dev-only probe for browser tests (tests-browser): where the avatar is and what it is doing
    if (import.meta.env.DEV) (window as unknown as { __avatar?: unknown }).__avatar = { x: g.position.x, y: g.position.y, z: g.position.z, yaw: g.rotation.y, stage: p.stage, acting, pose: spot?.pose ?? null, action: m.action, lying: m.lying, sitting: m.sitting, bathing: !!m.bathing, path: p.path.length };
  });

  return (
    <group ref={root} position={[home.x, 0, home.z]}>
      <Avatar appearance={appearance} motion={motion} />
      <HeadFx motion={motion} />
      {/* bathing is shown with a light-blue water cover (no clothing changes), only while a bathing activity runs */}
      <mesh ref={cover} visible={false} position={[0, 0.72, 0]}><cylinderGeometry args={[0.3, 0.3, 1.45, 20, 1, true]} /><meshStandardMaterial color="#6EC1F5" transparent opacity={0.35} roughness={0.2} depthWrite={false} /></mesh>
    </group>
  );
}
