import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, type Group, type InstancedMesh, MeshStandardMaterial, Object3D, type PointLight } from 'three';
import type { PropertyLayout } from '@/types/world';
import { INTERIORS, type InteriorKind } from '@/data/interiors';
import { useStoryStore } from '@/stores/storyStore';

/**
 * The initiation forest: a dark clearing ringed by instanced low-poly trees, a flickering fire with a moving light, twelve
 * black-robed members who circle it slowly and raise and lower their hands together on a drum beat, and Dayo (red sash) opposite
 * the player. Nothing here is a player: the open world may reuse the circle with real players in the ring. The beating is shown
 * only as a tightening circle, a red pulse and a screen shake (features/game/StoryDialogue.tsx): no gore, no slow-motion injury.
 */
const ROBES = 12, BEAT = 0.9; // seconds per hand raise
const robe = new MeshStandardMaterial({ color: '#2A2D40', roughness: 0.95, flatShading: true });
const hood = new MeshStandardMaterial({ color: '#161826', roughness: 1, flatShading: true });
const sash = new MeshStandardMaterial({ color: '#B91C1C', roughness: 0.7, flatShading: true });
const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** One robed figure: cone body, hood, two arms that swing up from the shoulders. `arms` is driven from outside. */
function Robed({ leader = false, setArms }: { leader?: boolean; setArms?: (g: Group | null, side: number) => void }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} material={robe}><coneGeometry args={[0.46, 1.7, 9]} /></mesh>
      <mesh position={[0, 1.78, 0]} material={hood}><sphereGeometry args={[0.2, 8, 6]} /></mesh>
      <mesh position={[0, 1.62, 0.1]} material={hood} scale={[1, 1, 0.8]}><sphereGeometry args={[0.18, 7, 5]} /></mesh>
      {leader && <mesh position={[0, 1.1, 0.02]} material={sash} rotation={[0, 0, 0.45]}><boxGeometry args={[0.12, 1.0, 0.7]} /></mesh>}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.3, 1.45, 0]} ref={(g) => setArms?.(g, s)}>
          <mesh position={[0, -0.28, 0]} material={robe}><boxGeometry args={[0.14, 0.62, 0.14]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Forest({ layout }: { layout: PropertyLayout }) {
  const kind = layout.id.replace('interior.', '') as InteriorKind, def = INTERIORS[kind];
  const cx = def.w / 2, cz = def.d / 2;
  const ring = useRef<Group>(null), light = useRef<PointLight>(null), flames = useRef<Group>(null), trees = useRef<InstancedMesh>(null), crowns = useRef<InstancedMesh>(null);
  const arms = useRef<{ g: Group; side: number }[]>([]);
  const members = useMemo(() => Array.from({ length: ROBES }, (_, i) => ({ a: (i / ROBES) * Math.PI * 2 })), []);
  const spots = useMemo(() => {
    const r = rng(777), out: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = 10.5 + r() * 14; out.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, s: 0.8 + r() * 0.9 }); }
    return out;
  }, [cx, cz]);
  const tmp = useMemo(() => new Object3D(), []);
  const setup = (mesh: InstancedMesh | null, crown: boolean) => {
    if (!mesh) return;
    spots.forEach((t, i) => { tmp.position.set(t.x, crown ? 3.4 * t.s : 1.2 * t.s, t.z); tmp.scale.set(t.s, t.s, t.s); tmp.updateMatrix(); mesh.setMatrixAt(i, tmp.matrix); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  const crownMat = useMemo(() => new MeshStandardMaterial({ color: new Color('#2A5A3E'), roughness: 1, flatShading: true }), []);
  const trunkMat = useMemo(() => new MeshStandardMaterial({ color: '#2B1D12', roughness: 1, flatShading: true }), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime(), beating = useStoryStore.getState().beating;
    if (ring.current) { ring.current.rotation.y = t * (beating ? 0.55 : 0.22); const k = beating ? 0.82 : 1; ring.current.scale.set(k, 1, k); } // the circle tightens during the beating
    // hands up and down together on the beat; faster when the drum speeds up
    const beat = Math.sin((t / (beating ? BEAT / 2 : BEAT)) * Math.PI * 2) * 0.5 + 0.5;
    for (const { g, side } of arms.current) { g.rotation.z = side * (0.15 + beat * 2.4); g.rotation.x = 0; }
    if (light.current) light.current.intensity = 70 + Math.sin(t * 17) * 10 + Math.sin(t * 7.3) * 6 + (beating ? 25 : 0);
    if (flames.current) flames.current.children.forEach((c, i) => { c.scale.y = 0.8 + Math.abs(Math.sin(t * (9 + i * 2.3))) * 0.7; c.rotation.y = t * 2 + i; });
  });
  const setArms = (g: Group | null, side: number) => { if (g && !arms.current.some((a) => a.g === g)) arms.current.push({ g, side }); };
  return (
    <group>
      <hemisphereLight args={['#7A94D8', '#2A1E14', 0.9]} />
      {/* the clearing: dark ground fading to black, with the sky as a deep blue night */}
      <mesh position={[cx, -0.04, cz]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[30, 40]} /><meshStandardMaterial color="#3A2E22" roughness={1} /></mesh>
      <mesh position={[cx, -0.02, cz]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.6, 6.8, 40]} /><meshStandardMaterial color="#5A4630" roughness={1} /></mesh>
      <instancedMesh ref={(m) => { (trees as { current: InstancedMesh | null }).current = m; setup(m, false); }} args={[undefined, undefined, spots.length]} material={trunkMat}><cylinderGeometry args={[0.18, 0.26, 2.4, 6]} /></instancedMesh>
      <instancedMesh ref={(m) => { (crowns as { current: InstancedMesh | null }).current = m; setup(m, true); }} args={[undefined, undefined, spots.length]} material={crownMat}><coneGeometry args={[1.3, 3.6, 7]} /></instancedMesh>
      {/* the fire */}
      <group position={[cx, 0, cz]}>
        {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.26) * 0.5, 0.12, Math.sin(i * 1.26) * 0.5]} rotation={[0, -i * 1.26, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 1.1, 6]} /><meshStandardMaterial color="#3A2616" roughness={1} /></mesh>)}
        <group ref={flames}>
          <mesh position={[0, 0.6, 0]}><coneGeometry args={[0.45, 1.3, 7]} /><meshStandardMaterial color="#FF7A2B" emissive="#FF5A00" emissiveIntensity={1.6} transparent opacity={0.92} /></mesh>
          <mesh position={[0.1, 0.5, 0.05]}><coneGeometry args={[0.3, 1.0, 6]} /><meshStandardMaterial color="#FFC84A" emissive="#FFB000" emissiveIntensity={1.8} transparent opacity={0.9} /></mesh>
          <mesh position={[-0.1, 0.4, -0.05]}><coneGeometry args={[0.2, 0.7, 6]} /><meshStandardMaterial color="#FFF1A0" emissive="#FFE070" emissiveIntensity={2} transparent opacity={0.85} /></mesh>
        </group>
        <pointLight ref={light} position={[0, 1.4, 0]} color="#FF8A3D" intensity={70} distance={26} decay={1.2} castShadow={false} />
        {/* the circle of robed members, rotating around the fire */}
        <group ref={ring}>
          {members.map((m, i) => (
            <group key={i} position={[Math.sin(m.a) * 5.2, 0, Math.cos(m.a) * 5.2]} rotation={[0, m.a + Math.PI, 0]}><Robed setArms={setArms} /></group>
          ))}
        </group>
        {/* Dayo stands still opposite the player, red sash on his robe */}
        <group position={[0, 0, -3.2]} rotation={[0, 0, 0]}><Robed leader /></group>
      </group>
    </group>
  );
}
