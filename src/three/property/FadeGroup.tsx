import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Camera, Group } from 'three';

/**
 * Lowers its children towards the floor while `hide(camera)` is true, and restores them when it is false. Used for
 * walls and roofs that would otherwise hide the interior. The change is eased over time (never a sudden pop), and
 * the group is switched off entirely once flat so it costs nothing.
 */
export function FadeGroup({ hide, minScale = 0.001, children }: { hide: (camera: Camera) => boolean; minScale?: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }, dt) => {
    const g = ref.current; if (!g) return;
    const target = hide(camera) ? minScale : 1;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 9);
    g.scale.y += (target - g.scale.y) * k;
    if (Math.abs(target - g.scale.y) < 0.002) g.scale.y = target;
    g.visible = g.scale.y > 0.01;
  });
  return <group ref={ref}>{children}</group>;
}
