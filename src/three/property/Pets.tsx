import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { getFurniture } from '@/data/items';
import { interactWith } from '@/game/interactions';
import { useEditorStore } from '@/stores/editorStore';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { buildNavGrid, nearestFree, type NavGrid, type Pt } from '@/world/navigation';
import { initBrain, stepPet, type PetBrain } from '@/world/petBrain';
import { PetBall, PetModel, type PetAnim } from '../models/pets';

interface BallState { x: number; z: number; fx: number; fz: number; tx: number; tz: number; t: number; baseX: number; baseZ: number }
type Balls = Map<string, BallState>;

function nearestBall(balls: Balls, from: Pt): Pt | null {
  let best: Pt | null = null, bd = Infinity;
  for (const b of balls.values()) { const d = Math.hypot(b.x - from.x, b.z - from.z); if (d < bd) { bd = d; best = b; } }
  return best;
}

function BallActor({ item, balls }: { item: PlacedItem; balls: Balls }) {
  const g = useRef<Group>(null);
  // A moved ball starts from its new placed spot; a ball the pet has batted keeps its own position until it is moved.
  const s = balls.get(item.uid);
  if (!s || s.baseX !== item.x || s.baseZ !== item.z) balls.set(item.uid, { x: item.x, z: item.z, fx: item.x, fz: item.z, tx: item.x, tz: item.z, t: 1, baseX: item.x, baseZ: item.z });
  useFrame((_, dt) => {
    const b = balls.get(item.uid); if (!b || !g.current) return;
    if (b.t < 1) { b.t = Math.min(1, b.t + Math.min(dt, 0.1) / 0.45); b.x = b.fx + (b.tx - b.fx) * b.t; b.z = b.fz + (b.tz - b.fz) * b.t; }
    g.current.position.set(b.x, Math.sin(b.t * Math.PI) * 0.25, b.z);
    g.current.rotation.x += b.t < 1 ? dt * 10 : 0;
  });
  return <group ref={g} position={[item.x, 0, item.z]}><PetBall /></group>;
}

function PetActor({ item, species, grid, balls }: { item: PlacedItem; species: 'cat' | 'dog' | 'lion'; grid: NavGrid; balls: Balls }) {
  const g = useRef<Group>(null);
  // Start a little apart from the placed spot, so pets bought together do not stack on one point.
  const brain = useRef<PetBrain>(null as unknown as PetBrain);
  if (!brain.current) {
    const spot = nearestFree(grid, { x: item.x + (Math.random() - 0.5) * 1.2, z: item.z + (Math.random() - 0.5) * 1.2 }, 8) ?? item;
    brain.current = initBrain(spot.x, spot.z);
  }
  const anim = useRef<PetAnim>({ walking: false, playing: false, speed: 1 });
  const gridRef = useRef(grid); gridRef.current = grid;
  useFrame((_, dt) => {
    const b = brain.current; if (!g.current) return;
    const r = stepPet(b, species, dt, { grid: gridRef.current, ball: nearestBall(balls, b) });
    if (r.kickBallTo) {
      const ball = nearestBall(balls, b);
      for (const s of balls.values()) if (s === ball) { s.fx = s.x; s.fz = s.z; s.tx = r.kickBallTo.x; s.tz = r.kickBallTo.z; s.t = 0; }
    }
    g.current.position.set(b.x, b.y, b.z); g.current.rotation.y = b.yaw;
    anim.current.walking = b.mode === 'walk'; anim.current.playing = b.mode === 'play';
  });
  const onClick = (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); interactWith(item); };
  return <group ref={g} position={[item.x, 0, item.z]} onClick={onClick}><PetModel species={species} anim={anim} /></group>;
}

/**
 * Live pets and their toys, drawn in Home mode. (In Buy mode they are ordinary placed items so they can be moved, stored or sold.)
 * Each pet runs the brain in world/petBrain.ts on the avatar's navigation grid; one frame callback per pet, no extra lights.
 */
export function PetLayer({ layout, items }: { layout: PropertyLayout; items: PlacedItem[] }) {
  const draftUid = useEditorStore((s) => s.draft?.uid);
  const balls = useRef<Balls>(new Map()).current;
  const grid = useMemo(() => buildNavGrid(layout, items), [layout, items]);
  const pets = items.filter((i) => i.uid !== draftUid && getFurniture(i.defId)?.pet);
  const toys = items.filter((i) => i.uid !== draftUid && getFurniture(i.defId)?.toy);
  // forget balls that were stored or sold
  for (const k of [...balls.keys()]) if (!toys.some((t) => t.uid === k)) balls.delete(k);
  return (
    <group>
      {toys.map((t) => <BallActor key={t.uid} item={t} balls={balls} />)}
      {pets.map((p) => <PetActor key={p.uid} item={p} species={getFurniture(p.defId)!.pet!} grid={grid} balls={balls} />)}
    </group>
  );
}
