import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { BODYGUARD, BODYGUARD_LOOK } from '@/data/bodyguard';
import { useBankStore } from '@/stores/bankStore';
import { useBodyguardStore } from '@/stores/bodyguardStore';
import type { PropertyLayout } from '@/types/world';
import { entranceOf } from '@/world/layoutGeometry';
import { Avatar, type Motion } from '../avatar/Avatar';

/**
 * The bodyguard stands inside the house beside the main door: black suit, black trousers, dark glasses, arms at his sides. Now and
 * then he touches his earpiece (a raised hand), and every few seconds a strong emoji pops up over his head. You cannot interact with
 * him. He is there only while he is hired and his wage is paid.
 */
export function BodyguardLayer({ layout }: { layout: PropertyLayout }) {
  const hired = useBodyguardStore((s) => s.hired), overdue = useBankStore((s) => s.bills.some((b) => b.defId === BODYGUARD.id && b.status === 'overdue'));
  const ent = useMemo(() => entranceOf(layout), [layout]);
  if (!hired || overdue || !ent) return null;
  return <Guard x={ent.guard.x} z={ent.guard.z} yaw={ent.guard.yaw} />;
}

function Guard({ x, z, yaw }: { x: number; z: number; yaw: number }) {
  const motion = useRef<Motion>({ moving: false, lying: false, sitting: false, action: 'idle' }), g = useRef<Group>(null);
  const [emoji, setEmoji] = useState<string | null>(null), next = useRef(2.5), hide = useRef(0), touch = useRef(4), earpiece = useRef(0), n = useRef(0);
  useEffect(() => { const r = (BODYGUARD.bubbleEvery[0] + BODYGUARD.bubbleEvery[1]) / 2; next.current = r * 0.4; }, []);
  useFrame((_, dt) => {
    next.current -= dt; touch.current -= dt;
    if (next.current <= 0) { n.current++; setEmoji(BODYGUARD.emojis[(n.current * 7 + Math.floor(Math.random() * 3)) % BODYGUARD.emojis.length]); hide.current = BODYGUARD.bubbleFor; next.current = BODYGUARD.bubbleEvery[0] + Math.random() * (BODYGUARD.bubbleEvery[1] - BODYGUARD.bubbleEvery[0]); }
    if (hide.current > 0) { hide.current -= dt; if (hide.current <= 0) setEmoji(null); }
    if (touch.current <= 0) { earpiece.current = 1.8; touch.current = 7 + Math.random() * 8; }
    if (earpiece.current > 0) { earpiece.current -= dt; motion.current.action = 'drink'; } else motion.current.action = 'idle'; // a raised hand, like touching an earpiece
    if (g.current) g.current.rotation.y = yaw + Math.sin(performance.now() * 0.0004) * 0.05; // a slow, watchful turn of the head and shoulders
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={g} rotation={[0, yaw, 0]}><Avatar appearance={BODYGUARD_LOOK} motion={motion} /></group>
      {emoji && (
        <Html position={[0, 2.15, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div className="select-none text-[30px] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.55)]" style={{ animation: 'bgpop 0.35s ease-out' }}>{emoji}</div>
        </Html>
      )}
    </group>
  );
}
