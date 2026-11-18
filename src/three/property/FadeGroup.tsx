import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import { Vector3, type Camera, type Group } from 'three';
import { livePlayer } from '@/world/npcLive';

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

/**
 * A tree (or any tall thing) that sinks out of the way while it stands between the camera and the player, so no angle of the camera
 * is ever blocked by foliage. Eased like FadeGroup. `radius` is how far from the line of sight it counts as blocking.
 */
export function OccluderFade({ radius, height, children }: { radius: number; height: number; children: ReactNode }) {
  const ref = useRef<Group>(null), wp = useRef(new Vector3());
  useFrame(({ camera }, dt) => {
    const g = ref.current; if (!g) return;
    let hide = false;
    if (livePlayer.set) {
      g.getWorldPosition(wp.current);
      const ax = camera.position.x, az = camera.position.z, bx = livePlayer.x, bz = livePlayer.z, dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((wp.current.x - ax) * dx + (wp.current.z - az) * dz) / len2));
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(wp.current.x - px, wp.current.z - pz);
      const lineY = camera.position.y + (1.0 - camera.position.y) * t; // height of the line of sight above the tree
      hide = t > 0.04 && t < 0.97 && d < radius && lineY < height + 0.3;
    }
    const target = hide ? 0.001 : 1, k = 1 - Math.exp(-Math.min(dt, 0.1) * 7);
    g.scale.y += (target - g.scale.y) * k; if (Math.abs(target - g.scale.y) < 0.002) g.scale.y = target; g.visible = g.scale.y > 0.01;
  });
  return <group ref={ref}>{children}</group>;
}
