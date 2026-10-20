import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import type { Group } from 'three';
import type { PetSpecies } from '@/world/petBrain';
import { B, Sph } from './primitives';

/** What the animation needs to know each frame. The pet layer writes it; a static copy (catalogue, ghost) leaves it undefined. */
export interface PetAnim { walking: boolean; playing: boolean; speed: number }

interface Look {
  bodyW: number; bodyH: number; bodyL: number; legH: number; legW: number; head: number; tail: number;
  color: string; belly: string; nose: string; ears: 'point' | 'flop' | 'round'; mane?: string; snout: number;
}
/** One generator, three animals. A new species is one more row here and one in SPECIES (world/petBrain.ts). */
const LOOKS: Record<PetSpecies, Look> = {
  cat:  { bodyW: 0.15, bodyH: 0.15, bodyL: 0.36, legH: 0.15, legW: 0.045, head: 0.14, tail: 0.34, color: '#D98B3A', belly: '#F4E6D0', nose: '#E88B8B', ears: 'point', snout: 0.04 },
  dog:  { bodyW: 0.22, bodyH: 0.23, bodyL: 0.5, legH: 0.24, legW: 0.065, head: 0.21, tail: 0.3, color: '#8B5A2B', belly: '#E8D3B0', nose: '#1B1B1B', ears: 'flop', snout: 0.1 },
  lion: { bodyW: 0.42, bodyH: 0.42, bodyL: 0.9, legH: 0.42, legW: 0.12, head: 0.3, tail: 0.6, color: '#D9A441', belly: '#EBCB8A', nose: '#3A2A1A', ears: 'round', mane: '#7A4310', snout: 0.12 },
};

/** Pet facing +z, feet on y = 0. Legs, head and tail are separate groups so they can swing independently. */
export function PetModel({ species, anim }: { species: PetSpecies; anim?: MutableRefObject<PetAnim> }) {
  const L = LOOKS[species];
  const legs = [useRef<Group>(null), useRef<Group>(null), useRef<Group>(null), useRef<Group>(null)];
  const tail = useRef<Group>(null), head = useRef<Group>(null), body = useRef<Group>(null);
  const bodyY = L.legH + L.bodyH / 2 - 0.01;
  useFrame(({ clock }) => {
    const a = anim?.current; if (!a) return;
    const t = clock.getElapsedTime();
    const f = a.walking ? 1 : 0, ph = t * (6 + a.speed * 4);
    // diagonal pairs swing together, like a real walk
    legs.forEach((r, i) => { if (r.current) r.current.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 * f; });
    if (tail.current) tail.current.rotation.z = Math.sin(t * (a.playing ? 12 : 3)) * (a.playing ? 0.6 : 0.25);
    if (head.current) head.current.rotation.x = (a.playing ? Math.sin(t * 8) * 0.25 : Math.sin(t * 1.3) * 0.05) + (a.walking ? 0.05 : 0);
    if (body.current) body.current.position.y = Math.abs(Math.sin(ph)) * 0.012 * f;
  });
  const lx = L.bodyW / 2 - L.legW / 2, lz = L.bodyL / 2 - L.legW;
  const legPos: [number, number][] = [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]];
  return (
    <group>
      {legPos.map(([x, z], i) => (
        <group key={i} ref={legs[i]} position={[x, L.legH, z]}>
          <B size={[L.legW, L.legH, L.legW]} pos={[0, -L.legH / 2, 0]} color={i < 2 ? L.color : L.color} rough={0.9} radius={L.legW / 3} shadow={false} />
          <B size={[L.legW * 1.1, L.legW * 0.6, L.legW * 1.4]} pos={[0, -L.legH + L.legW * 0.3, L.legW * 0.15]} color={L.belly} rough={0.9} radius={0.01} shadow={false} />
        </group>
      ))}
      <group ref={body}>
        <B size={[L.bodyW, L.bodyH, L.bodyL]} pos={[0, bodyY, 0]} color={L.color} rough={0.92} radius={L.bodyW * 0.32} />
        <B size={[L.bodyW * 0.8, L.bodyH * 0.45, L.bodyL * 0.7]} pos={[0, bodyY - L.bodyH * 0.3, 0.02]} color={L.belly} rough={0.95} radius={L.bodyW * 0.2} shadow={false} />
        <group ref={head} position={[0, bodyY + L.bodyH * 0.35, L.bodyL / 2 + L.head * 0.25]}>
          {L.mane && <Sph r={L.head * 1.15} pos={[0, 0, -L.head * 0.2]} color={L.mane} rough={1} />}
          <B size={[L.head, L.head * 0.9, L.head]} color={L.color} rough={0.9} radius={L.head * 0.3} />
          <B size={[L.head * 0.55, L.head * 0.4, L.snout + 0.02]} pos={[0, -L.head * 0.15, L.head / 2 + L.snout / 2 - 0.01]} color={L.belly} rough={0.9} radius={0.02} shadow={false} />
          <Sph r={L.head * 0.09} pos={[0, -L.head * 0.05, L.head / 2 + L.snout]} color={L.nose} rough={0.5} />
          {[-1, 1].map((s) => <Sph key={`e${s}`} r={L.head * 0.07} pos={[s * L.head * 0.25, L.head * 0.12, L.head / 2 - 0.005]} color="#1B1B1B" rough={0.3} />)}
          {L.ears === 'point' && [-1, 1].map((s) => <B key={`a${s}`} size={[L.head * 0.28, L.head * 0.38, 0.02]} pos={[s * L.head * 0.32, L.head * 0.55, 0]} rot={[0, 0, -s * 0.25]} color={L.color} radius={0.01} shadow={false} />)}
          {L.ears === 'flop' && [-1, 1].map((s) => <B key={`a${s}`} size={[L.head * 0.18, L.head * 0.5, L.head * 0.3]} pos={[s * L.head * 0.55, L.head * 0.05, -0.01]} rot={[0, 0, s * 0.2]} color="#5E3A1B" radius={0.02} shadow={false} />)}
          {L.ears === 'round' && [-1, 1].map((s) => <Sph key={`a${s}`} r={L.head * 0.15} pos={[s * L.head * 0.4, L.head * 0.5, -L.head * 0.1]} color={L.mane ?? L.color} rough={1} />)}
        </group>
        <group ref={tail} position={[0, bodyY + L.bodyH * 0.15, -L.bodyL / 2]}>
          <B size={[L.legW * 0.9, L.legW * 0.9, L.tail]} pos={[0, L.tail * 0.12, -L.tail / 2]} rot={[0.45, 0, 0]} color={L.color} rough={0.9} radius={L.legW * 0.4} shadow={false} />
          {species === 'lion' && <Sph r={L.legW * 0.9} pos={[0, L.tail * 0.38, -L.tail * 0.95]} color={L.mane ?? L.color} rough={1} />}
        </group>
      </group>
    </group>
  );
}

/** The toy: a red rubber ball with a white band. */
export function PetBall() {
  return (
    <group>
      <Sph r={0.1} pos={[0, 0.1, 0]} color="#E23B3B" rough={0.45} />
      <B size={[0.2, 0.03, 0.2]} pos={[0, 0.1, 0]} color="#F4F6F6" rough={0.5} radius={0.014} shadow={false} />
    </group>
  );
}

export const StaticCat = () => <PetModel species="cat" />;
export const StaticDog = () => <PetModel species="dog" />;
export const StaticLion = () => <PetModel species="lion" />;
