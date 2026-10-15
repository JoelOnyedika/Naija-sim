import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState, type MutableRefObject } from 'react';
import type { Mesh } from 'three';
import { useStatsStore } from '@/stores/statsStore';
import type { Motion } from '../avatar/Avatar';

/** Hygiene below this and flies start to circle the avatar's head. */
export const FLY_HYGIENE = 25;

/**
 * Effects over the avatar's head: a thought bubble with an emoji for whatever it is doing (`motion.bubble`, set by the walker),
 * and flies when it is dirty. The bubble is a small DOM element (no extra 3D cost) and React only re-renders when the emoji
 * changes; the flies are three tiny meshes moved in one useFrame.
 */
export function HeadFx({ motion }: { motion: MutableRefObject<Motion> }) {
  const [emoji, setEmoji] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const flies = [useRef<Mesh>(null), useRef<Mesh>(null), useRef<Mesh>(null)];
  useFrame(({ clock }) => {
    const b = motion.current.bubble ?? null;
    if (b !== emoji) setEmoji(b);
    const d = useStatsStore.getState().stats.hygiene < FLY_HYGIENE;
    if (d !== dirty) setDirty(d);
    if (!d) return;
    const t = clock.getElapsedTime();
    flies.forEach((r, i) => {
      const m = r.current; if (!m) return;
      const a = t * (3.2 + i * 0.9) + i * 2.1, rad = 0.2 + 0.07 * Math.sin(t * 2 + i);
      m.position.set(Math.cos(a) * rad, 2.0 + 0.08 * Math.sin(t * 5 + i * 1.7), Math.sin(a * 1.3) * rad);
    });
  });
  return (
    <group>
      {emoji && (
        <Html position={[0, 2.15, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="thought-bubble" key={emoji} aria-hidden>{emoji}</div>
        </Html>
      )}
      {dirty && flies.map((r, i) => <mesh key={i} ref={r}><sphereGeometry args={[0.022, 6, 5]} /><meshBasicMaterial color="#15110E" /></mesh>)}
    </group>
  );
}
