import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3, type Mesh } from 'three';
import { tickInteraction } from '@/game/interact';
import { useInteriorStore } from '@/stores/interiorStore';
import { useObjectiveStore } from '@/stores/objectiveStore';
import { runtime } from '@/world/actors';
import { liveNpcs, livePlayer } from '@/world/npcLive';

/** Runs the interaction system every frame, and draws the objective's marker in the world (ring on the ground and a bobbing arrow). */
export function InteractionDriver() {
  const { camera, size } = useThree();
  const ring = useRef<Mesh>(null), arrow = useRef<Mesh>(null), acc = useRef(0), tmp = useRef(new Vector3());
  useFrame(({ clock }, dt) => {
    tickInteraction();
    const obj = useObjectiveStore.getState().current, here = useInteriorStore.getState().current;
    let at: { x: number; z: number } | null = null, reach = 3.2;
    if (obj && here) {
      const t = obj.target;
      if (t.kind === 'npc' && t.venue === here.kind) { const r = runtime.get(t.castId) ?? liveNpcs.get(t.castId); if (r) at = { x: r.x, z: r.z }; }
      else if (t.kind === 'point' && t.venue === here.kind) { at = { x: t.x, z: t.z }; reach = 1.8; }
    }
    const show = !!at;
    if (ring.current) { ring.current.visible = show; if (at) { ring.current.position.set(at.x, 0.04, at.z); const k = 1 + Math.sin(clock.elapsedTime * 3) * 0.08; ring.current.scale.set(k, k, k); } }
    if (arrow.current) { arrow.current.visible = show; if (at) { arrow.current.position.set(at.x, 2.55 + Math.sin(clock.elapsedTime * 3.2) * 0.12, at.z); arrow.current.rotation.y = clock.elapsedTime * 1.5; } }
    // screen position of the target for the HUD arrow, and "close enough to interact" for the prompt; a few times a second is plenty
    acc.current += dt; if (acc.current < 0.15) return; acc.current = 0;
    const st = useObjectiveStore.getState();
    if (!at || !livePlayer.set) { if (st.screen) st.setScreen(null); st.setNear(false); return; }
    const v = tmp.current.set(at.x, 1.3, at.z).project(camera), sx = (v.x * 0.5 + 0.5) * size.width, sy = (-v.y * 0.5 + 0.5) * size.height;
    const on = v.z < 1 && sx > 28 && sx < size.width - 28 && sy > 90 && sy < size.height - 140;
    const ang = Math.atan2(sy - size.height / 2, sx - size.width / 2) * (v.z > 1 ? -1 : 1), d = Math.hypot(at.x - livePlayer.x, at.z - livePlayer.z);
    const prev = st.screen; if (!prev || Math.abs(prev.x - sx) > 3 || Math.abs(prev.y - sy) > 3 || prev.on !== on || Math.abs(prev.dist - d) > 0.3) st.setScreen({ x: sx, y: sy, on, angle: ang, dist: d });
    st.setNear(d < reach);
  });
  return (
    <group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.62, 0.8, 32]} /><meshBasicMaterial color="#FFC83D" transparent opacity={0.9} depthWrite={false} /></mesh>
      <mesh ref={arrow} rotation={[Math.PI, 0, 0]} visible={false}><coneGeometry args={[0.2, 0.42, 4]} /><meshBasicMaterial color="#FFC83D" /></mesh>
    </group>
  );
}
