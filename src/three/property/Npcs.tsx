import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group, PointLight } from 'three';
import { NPC } from '@/data/balance';
import { INTERIORS } from '@/data/interiors';
import { makeNpcs, type NpcProfile } from '@/data/npcs';
import { getFurniture } from '@/data/items';
import { vendorSpots } from '@/data/vendors';
import { useInteriorStore } from '@/stores/interiorStore';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { buildNavGrid, nearestFree, type NavGrid } from '@/world/navigation';
import { liveNpcs, livePlayer } from '@/world/npcLive';
import { initBrain, stepPet, type PetBrain } from '@/world/petBrain';
import { Avatar, type Motion } from '../avatar/Avatar';

/** True while this spot is within `range` of the player; checked a few times a second so it costs almost nothing. */
function useNear(at: () => { x: number; z: number } | undefined, range: number) {
  const [near, setNear] = useState(false), t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt; if (t.current < 0.3) return; t.current = 0;
    const p = at(); const n = !!p && livePlayer.set && Math.hypot(p.x - livePlayer.x, p.z - livePlayer.z) < range;
    if (n !== near) setNear(n);
  });
  return near;
}

/** A small floating name above a person's head (a DOM label, so it stays sharp and cheap). */
function NameTag({ name, vendor, show }: { name: string; vendor?: boolean; show: boolean }) {
  if (!show) return null;
  return (
    <Html position={[0, 2.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-bold shadow ${vendor ? 'bg-amber-300/90 text-night' : 'bg-night/80 text-white'}`}>{name}</div>
    </Html>
  );
}

/** A vendor: stays behind their stall or counter, facing the customer, and can be tapped to talk to. */
function VendorActor({ p, x, z, yaw }: { p: NpcProfile; x: number; z: number; yaw: number }) {
  const motion = useRef<Motion>({ moving: false, lying: false, sitting: false });
  useEffect(() => { liveNpcs.set(p.id, { x, z }); return () => { liveNpcs.delete(p.id); }; }, [p.id, x, z]);
  const near = useNear(() => ({ x, z }), 5.2);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); useInteriorStore.getState().selectNpc(p.id); }}>
      <Avatar appearance={p.appearance} motion={motion} />
      <NameTag name={p.name} vendor show={near} />
    </group>
  );
}

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
  const near = useNear(() => liveNpcs.get(p.id), 4.2);
  return (
    <group ref={g} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); useInteriorStore.getState().selectNpc(p.id); }}>
      <Avatar appearance={p.appearance} motion={motion} />
      <NameTag name={p.name} show={near} />
    </group>
  );
}

/** The people in a public interior: `npcCount` of them (capacity minus real players), wandering on the same navigation grid as the player. */
export function NpcLayer({ layout, items }: { layout: PropertyLayout; items: PlacedItem[] }) {
  const here = useInteriorStore((s) => s.current);
  const profiles = useMemo(() => (here ? makeNpcs(here.kind, here.seed, here.npcCount) : []), [here?.kind, here?.seed, here?.npcCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const grid = useMemo(() => buildNavGrid(layout, items), [layout, items]);
  const vendors = useMemo(() => (here ? vendorSpots(here.kind, items, (id) => getFurniture(id)?.footprint ?? { w: 1, d: 1 }, { w: INTERIORS[here.kind].w, d: INTERIORS[here.kind].d }) : []), [here, items]);
  if (!here) return null;
  const def = INTERIORS[here.kind];
  return <group>{def.nightlife && <ClubLights w={def.w} d={def.d} />}{profiles.map((p) => <NpcActor key={p.id} p={p} grid={grid} w={def.w} d={def.d} />)}{vendors.map((v) => <VendorActor key={v.profile.id} p={v.profile} x={v.x} z={v.z} yaw={v.yaw} />)}</group>;
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
