import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { castDef } from '@/data/cast';
import { requestTalkTo } from '@/game/story';
import { useCastStore, type Placed } from '@/stores/castStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useObjectiveStore } from '@/stores/objectiveStore';
import { useStoryStore } from '@/stores/storyStore';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { directives, nav, runtime, yawTo } from '@/world/actors';
import { buildNavGrid, findPath, type NavGrid, type Pt } from '@/world/navigation';
import { liveNpcs, livePlayer } from '@/world/npcLive';
import { Avatar, type ActionKind, type Motion } from '../avatar/Avatar';

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/**
 * The named cast in the current venue. Each person is a real character (existing Avatar and Appearance), driven by Directives from
 * world/actors.ts: they walk routes on the same navigation grid as the player, turn to face people, sit, and play talking, listening or
 * idle poses. With no directive they stand and fidget in their own way (each has their own idle list). Tapping one starts the story's
 * conversation if it is the current objective.
 */
export function StoryActors({ layout, items }: { layout: PropertyLayout; items: PlacedItem[] }) {
  const present = useCastStore((s) => s.present), here = useInteriorStore((s) => s.current);
  const grid = useMemo(() => buildNavGrid(layout, items), [layout, items]);
  nav.grid = grid;
  if (!here) return null;
  return <group>{Object.values(present).filter((p) => p.venue === here.kind).map((p) => <CastActor key={p.id} p={p} grid={grid} />)}</group>;
}

function CastActor({ p, grid }: { p: Placed; grid: NavGrid }) {
  const def = castDef(p.id)!;
  const g = useRef<Group>(null), motion = useRef<Motion>({ moving: false, lying: false, sitting: false, action: 'idle' });
  const st = useRef({ x: p.x, z: p.z, yaw: p.yaw, path: [] as Pt[], key: '', arrived: true, y: 0 });
  const gridRef = useRef(grid); gridRef.current = grid;
  const [near, setNear] = useState(false), t = useRef(0);
  const talking = useStoryStore((x) => !!x.dialogue); // no name tags over a conversation
  const isTarget = useObjectiveStore((s) => s.current?.target.kind === 'npc' && s.current.target.castId === p.id);
  useEffect(() => () => { runtime.delete(p.id); liveNpcs.delete(p.id); }, [p.id]);
  useFrame((_, dtRaw) => {
    const s = st.current, o = g.current; if (!o) return; const dt = Math.min(dtRaw, 0.1);
    const d = directives.get(p.id);
    let moving = false;
    if (d?.goal) {
      const key = `${d.goal.x.toFixed(2)},${d.goal.z.toFixed(2)}`;
      if (d.snap) { s.x = d.goal.x; s.z = d.goal.z; s.path = []; s.key = key; s.arrived = true; }
      else if (s.key !== key) { s.key = key; s.arrived = false; s.path = findPath(gridRef.current, { x: s.x, z: s.z }, d.goal) ?? [d.goal]; }
      const speed = d.speed ?? 1.6;
      if (!s.arrived && speed > 0) {
        const next = s.path[0];
        if (!next) s.arrived = true;
        else {
          const dx = next.x - s.x, dz = next.z - s.z, dd = Math.hypot(dx, dz), step = Math.min(dd, speed * dt);
          if (dd < 0.06) s.path.shift(); else { s.x += (dx / dd) * step; s.z += (dz / dd) * step; moving = true; s.yaw += angleDiff(s.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 10)); }
          if (!s.path.length && Math.hypot(d.goal.x - s.x, d.goal.z - s.z) < 0.15) s.arrived = true;
        }
      }
    } else { s.key = ''; s.arrived = true; }
    if (!moving) {
      const face = d?.face, goalYaw = face ? yawTo({ x: s.x, z: s.z }, face) : d?.yaw ?? s.yaw;
      s.yaw += angleDiff(s.yaw, goalYaw) * (1 - Math.exp(-dt * 7));
    }
    const sitting = d?.pose === 'sit' && s.arrived;
    s.y += ((sitting ? (d?.seatY ?? 0) : 0) - s.y) * (1 - Math.exp(-dt * 10));
    o.position.set(s.x, s.y, s.z); o.rotation.y = s.yaw;
    const m = motion.current; m.moving = moving; m.sitting = sitting;
    // no scripted pose: their own idle fidgets, in turn, offset per person so no two match
    const want: ActionKind | undefined = d?.action && d.action !== 'idle' ? d.action : def.idle[Math.floor((performance.now() / 1000 + hash(p.id) % 7) / 6) % def.idle.length];
    m.action = moving ? undefined : want;
    runtime.set(p.id, { x: s.x, z: s.z, yaw: s.yaw, moving, arrived: s.arrived, pose: sitting ? 'sit' : 'stand' });
    liveNpcs.set(p.id, { x: s.x, z: s.z });
    t.current += dt; if (t.current > 0.3) { t.current = 0; const n = livePlayer.set && Math.hypot(s.x - livePlayer.x, s.z - livePlayer.z) < 5; if (n !== near) setNear(n); }
  });
  return (
    <group ref={g} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); requestTalkTo(p.id); }}>
      <Avatar appearance={def.appearance} motion={motion} />
      {(near || isTarget) && !talking && (
        <Html position={[0, 2.1, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-bold shadow ${isTarget ? 'bg-amber-300 text-night' : 'bg-night/80 text-white'}`}>{def.name}</div>
        </Html>
      )}
    </group>
  );
}
