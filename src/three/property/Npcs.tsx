import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, PointLight } from 'three';
import { NPC } from '@/data/balance';
import { INTERIORS } from '@/data/interiors';
import { makeNpcs, type NpcProfile } from '@/data/npcs';
import { useInteriorStore } from '@/stores/interiorStore';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { buildNavGrid, nearestFree, type NavGrid } from '@/world/navigation';
import { liveNpcs, livePlayer } from '@/world/npcLive';
import { initBrain, stepPet, type PetBrain } from '@/world/petBrain';
import { Avatar, type Motion } from '../avatar/Avatar';

function NpcActor({ p, grid, w, d }: { p: NpcProfile; grid: NavGrid; w: number; d: number }) {
  const g = useRef<Group>(null);
  const motion = useRef<Motion>({ moving: false, lying: false, sitting: false });
  const gridRef = useRef(grid); gridRef.current = grid;
  const brain = useRef<PetBrain>(null as unknown as PetBrain);
  if (!brain.current) {
    // a deterministic spot from the id, moved to free floor if furniture is in the way
    let h = 0; for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
    const spot = nearestFree(grid, { x: 1 + (h % 1000) / 1000 * (w - 2), z: 1.5 + ((h >>> 10) % 1000) / 1000 * (d - 2.5) }, 12);
    brain.current = initBrain(spot?.x ?? w / 2, spot?.z ?? d / 2);
  }
  const avoid = useMemo(() => (pt: { x: number; z: number }) => {
    if (livePlayer.set && Math.hypot(pt.x - livePlayer.x, pt.z - livePlayer.z) < NPC.minSpacing) return true;
    for (const [id, o] of liveNpcs) if (id !== p.id && Math.hypot(pt.x - o.x, pt.z - o.z) < NPC.minSpacing) return true;
    return false;
  }, [p.id]);
  useFrame((_, dt) => {
    const b = brain.current; if (!g.current) return;
    stepPet(b, 'npc', dt, { grid: gridRef.current, ball: null, avoid });
    g.current.position.set(b.x, 0, b.z); g.current.rotation.y = b.yaw;
    motion.current.moving = b.mode === 'walk';
    liveNpcs.set(p.id, { x: b.x, z: b.z });
  });
  useEffect(() => () => { liveNpcs.delete(p.id); }, [p.id]);
  return (
    <group ref={g} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); useInteriorStore.getState().selectNpc(p.id); }}>
      <Avatar appearance={p.appearance} motion={motion} />
    </group>
  );
}

/** The people in a public interior: `npcCount` of them (capacity minus real players), wandering on the same navigation grid as the player. */
export function NpcLayer({ layout, items }: { layout: PropertyLayout; items: PlacedItem[] }) {
  const here = useInteriorStore((s) => s.current);
  const profiles = useMemo(() => (here ? makeNpcs(here.kind, here.seed, here.npcCount) : []), [here?.kind, here?.seed, here?.npcCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const grid = useMemo(() => buildNavGrid(layout, items), [layout, items]);
  if (!here) return null;
  const def = INTERIORS[here.kind];
  return <group>{def.nightlife && <ClubLights w={def.w} d={def.d} />}{profiles.map((p) => <NpcActor key={p.id} p={p} grid={grid} w={def.w} d={def.d} />)}</group>;
}

/** Cheap nightclub lighting: three coloured point lights that sweep the dance floor. No shadows, no extra geometry. */
function ClubLights({ w, d }: { w: number; d: number }) {
  const a = useRef<PointLight>(null), b = useRef<PointLight>(null), c = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const place = (l: PointLight | null, k: number, hue: number) => {
      if (!l) return;
      l.position.set(w / 2 + Math.sin(t * 0.7 + k * 2.1) * (w * 0.32), 2.6, d / 2 + Math.cos(t * 0.9 + k * 1.7) * (d * 0.28));
      l.color.setHSL((hue + t * 0.12) % 1, 0.95, 0.55);
    };
    place(a.current, 0, 0.88); place(b.current, 1, 0.52); place(c.current, 2, 0.75);
  });
  return (
    <group>
      <pointLight ref={a} intensity={14} distance={11} decay={1.6} />
      <pointLight ref={b} intensity={14} distance={11} decay={1.6} />
      <pointLight ref={c} intensity={12} distance={11} decay={1.6} />
    </group>
  );
}
