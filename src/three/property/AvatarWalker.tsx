import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MathUtils, type Group } from 'three';
import { getFurniture } from '@/data/items';
import { useCharacterStore } from '@/stores/characterStore';
import { useStatsStore } from '@/stores/statsStore';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { getTransform } from '@/world/placement';
import { Avatar, type Motion } from '../avatar/Avatar';

/** The player's avatar. Idles in the main room, walks to furniture when an activity starts. */
export function AvatarWalker({ layout, items }: { layout: PropertyLayout; items: PlacedItem[] }) {
  const appearance = useCharacterStore((s) => s.appearance);
  const root = useRef<Group>(null);
  const motion = useRef<Motion>({ moving: false, lying: false, sitting: false });
  const home = useMemo<[number, number]>(() => {
    const z = layout.zones.find((q) => q.furnishable && q.indoor && (q.kind === 'living' || q.kind === 'parlour')) ?? layout.zones.find((q) => q.furnishable && q.indoor) ?? layout.zones[0];
    return [(z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2 + (z.z1 - z.z0) * 0.2];
  }, [layout]);

  useFrame((_, dt) => {
    const g = root.current; if (!g) return;
    const { activity } = useStatsStore.getState();
    const item = activity?.targetUid ? items.find((p) => p.uid === activity.targetUid) : undefined;
    const def = item && getFurniture(item.defId);
    let tx = home[0], tz = home[1], ry = 0, y = 0;
    const pose = activity?.pose ?? 'stand';
    if (item && def) {
      const t = getTransform(def, item);
      tx = t.position[0]; tz = t.position[2]; ry = t.rotationY;
      if (pose === 'stand') { const off = def.footprint.d / 2 + 0.45; tx += Math.sin(ry) * off; tz += Math.cos(ry) * off; }
      else if (pose === 'sit') {
        const watching = def.category === 'fun' || def.id === 'desk';
        const off = watching ? 1.1 : 0; tx += Math.sin(ry) * off; tz += Math.cos(ry) * off;
      } else y = Math.min(def.height * 0.65, 0.6);
    }
    const dx = tx - g.position.x, dz = tz - g.position.z, dist = Math.hypot(dx, dz);
    const moving = dist > 0.06;
    if (moving) {
      const step = Math.min(dist, 1.8 * dt);
      g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step;
      g.rotation.y = MathUtils.lerp(g.rotation.y, Math.atan2(dx, dz), 0.2);
    } else if (item && def && pose !== 'stand') {
      const watching = def.category === 'fun' || def.id === 'desk';
      g.rotation.y = MathUtils.lerp(g.rotation.y, pose === 'sleep' ? ry : ry + (watching ? Math.PI : 0), 0.15);
    }
    g.position.y = MathUtils.lerp(g.position.y, pose === 'sleep' && !moving ? y : 0, 0.15);
    motion.current.moving = moving;
    motion.current.lying = pose === 'sleep' && !moving && !!item;
    motion.current.sitting = pose === 'sit' && !moving && !!item;
  });

  return <group ref={root} position={[home[0], 0, home[1]]}><Avatar appearance={appearance} motion={motion} /></group>;
}
