import { B, Cyl, Sph } from '../models/primitives';
import { Water } from '../world/Water';
import type { Decor } from '@/types/world';
import { zincTexture } from '../textures';

const GREEN = ['#2F7F3D', '#3F9A4A', '#4BAE55'];

function Tree({ s = 1 }: { s?: number }) {
  return (
    <group scale={s}>
      <Cyl r={0.13} r2={0.18} h={2.2} pos={[0, 1.1, 0]} color="#6B4A32" rough={0.9} seg={10} />
      <Sph r={1.0} pos={[0, 2.7, 0]} scale={[1, 0.85, 1]} color={GREEN[0]} rough={0.9} />
      <Sph r={0.75} pos={[0.6, 2.4, 0.3]} color={GREEN[1]} rough={0.9} />
      <Sph r={0.7} pos={[-0.55, 2.5, -0.3]} color={GREEN[2]} rough={0.9} />
    </group>
  );
}

function Palm({ s = 1 }: { s?: number }) {
  return (
    <group scale={s}>
      {Array.from({ length: 7 }, (_, i) => <Cyl key={i} r={0.14 - i * 0.008} h={0.62} pos={[Math.sin(i * 0.22) * 0.18 * i * 0.3, 0.3 + i * 0.58, 0]} rot={[0, 0, -0.08 * i * 0.3]} color={i % 2 ? '#8A6A4A' : '#7A5A3A'} rough={0.95} seg={10} />)}
      <group position={[0.38, 4.2, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
            <B size={[1.6, 0.04, 0.34]} pos={[0.8, -0.1, 0]} rot={[0, 0, -0.35]} color={GREEN[i % 3]} rough={0.8} radius={0.01} shadow={false} />
          </group>
        ))}
        <Sph r={0.1} pos={[0.1, -0.15, 0.1]} color="#6B4A32" />
        <Sph r={0.1} pos={[-0.1, -0.15, -0.05]} color="#6B4A32" />
      </group>
    </group>
  );
}

function Drum({ s = 1 }: { s?: number }) {
  return (
    <group scale={s}>
      <Cyl r={0.3} h={0.9} pos={[0, 0.45, 0]} color="#2D6FD2" rough={0.5} metal={0.2} />
      {[0.2, 0.5, 0.78].map((y) => <Cyl key={y} r={0.31} h={0.03} pos={[0, y, 0]} color="#1B4A9C" metal={0.3} />)}
    </group>
  );
}

function Clothesline({ w = 5 }: { w?: number }) {
  const cols = ['#FFC21A', '#E4572E', '#F4F1EA', '#2B4C7E', '#0B8F4D', '#D8344A'];
  return (
    <group>
      {[-w / 2, w / 2].map((x) => <Cyl key={x} r={0.04} h={2.1} pos={[x, 1.05, 0]} color="#6B6B6B" seg={8} />)}
      <B size={[w, 0.015, 0.015]} pos={[0, 1.95, 0]} color="#E5E1D6" shadow={false} />
      {cols.map((c, i) => <B key={i} size={[0.5, 0.7, 0.02]} pos={[-w / 2 + (i + 0.7) * (w / 7), 1.58, 0]} color={c} rough={1} radius={0.01} shadow={false} />)}
    </group>
  );
}

function Gate({ open = true }: { open?: boolean }) {
  const leaf = (
    <group>
      <B size={[1.6, 1.7, 0.06]} pos={[0.8, 0.95, 0]} color="#1B1F24" metal={0.5} rough={0.5} radius={0.02} />
      {Array.from({ length: 9 }, (_, i) => <B key={i} size={[0.03, 1.5, 0.08]} pos={[0.1 + i * 0.17, 0.95, 0]} color="#B8892F" metal={0.7} rough={0.3} radius={0.01} />)}
    </group>
  );
  return (
    <group>
      {[-1.8, 1.8].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <B size={[0.4, 2.2, 0.4]} pos={[0, 1.1, 0]} color="#D9D3C4" rough={0.9} radius={0.02} />
          <B size={[0.5, 0.12, 0.5]} pos={[0, 2.25, 0]} color="#B8892F" rough={0.6} radius={0.02} />
        </group>
      ))}
      <group position={[-1.6, 0, 0]} rotation={[0, open ? -1.1 : 0, 0]}>{leaf}</group>
    </group>
  );
}

function Pillar({ s = 1 }: { s?: number }) {
  return (
    <group scale={s}>
      <B size={[0.55, 0.18, 0.55]} pos={[0, 0.09, 0]} color="#EDE7DA" rough={0.8} radius={0.02} />
      <Cyl r={0.22} h={2.6} pos={[0, 1.5, 0]} color="#F4F1EA" rough={0.75} seg={20} />
      <B size={[0.6, 0.16, 0.6]} pos={[0, 2.9, 0]} color="#EDE7DA" rough={0.8} radius={0.02} />
    </group>
  );
}

function Awning({ w = 4, d = 1.4 }: { w?: number; d?: number }) {
  const t = zincTexture().clone();
  t.repeat.set(w / 1.5, 1); t.needsUpdate = true;
  return (
    <group>
      <mesh position={[0, 2.55, 0]} rotation={[0.1, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.05, d + 0.2]} />
        <meshStandardMaterial map={t} roughness={0.55} metalness={0.5} />
      </mesh>
      {[-w / 2 + 0.1, 0, w / 2 - 0.1].map((x) => <Cyl key={x} r={0.05} h={2.5} pos={[x, 1.25, d / 2 - 0.1]} color="#7A5C2E" rough={0.8} seg={8} />)}
    </group>
  );
}

function Hedge({ w = 4 }: { w?: number }) { return <B size={[w, 0.7, 0.55]} pos={[0, 0.35, 0]} color="#2F7F3D" rough={1} radius={0.2} />; }

function GeneratorHouse() {
  return (
    <group>
      <B size={[1.1, 1.2, 0.9]} pos={[0, 0.6, 0]} color="#C8C2B2" rough={0.9} radius={0.02} />
      <B size={[1.25, 0.06, 1.05]} pos={[0, 1.25, 0]} color="#8E9496" metal={0.5} rough={0.5} radius={0.01} />
      <B size={[0.7, 0.9, 0.03]} pos={[0, 0.5, 0.46]} color="#2B6A60" rough={0.6} radius={0.01} />
      <Cyl r={0.04} h={0.6} pos={[0.4, 1.5, -0.2]} color="#555" metal={0.6} seg={8} />
    </group>
  );
}

function Lamppost() {
  return (
    <group>
      <Cyl r={0.06} h={3.4} pos={[0, 1.7, 0]} color="#1B1F24" metal={0.6} rough={0.4} seg={10} />
      <B size={[0.7, 0.05, 0.05]} pos={[0.3, 3.4, 0]} color="#1B1F24" metal={0.6} />
      <B size={[0.34, 0.1, 0.2]} pos={[0.6, 3.34, 0]} color="#FFF3D6" emissive="#FFD27A" emissiveIntensity={1.4} radius={0.03} shadow={false} />
    </group>
  );
}

function Planter() {
  return (
    <group>
      <B size={[0.95, 0.35, 0.5]} pos={[0, 0.175, 0]} color="#B5532F" rough={0.9} radius={0.03} />
      {[[-0.3, 0], [0, 0.08], [0.3, -0.05], [-0.1, -0.1], [0.15, 0.12]].map(([x, z], i) => (
        <group key={i}><Cyl r={0.01} h={0.35} pos={[x, 0.5, z]} color="#3C7A3D" seg={5} /><Sph r={0.09} pos={[x, 0.7, z]} color={['#FF4D6D', '#FFC21A', '#F4F1EA', '#C084FC', '#FF8A3D'][i]} /></group>
      ))}
    </group>
  );
}

function Stairs() {
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => <B key={i} size={[1.5, 0.18 * (i + 1), 0.3]} pos={[0, 0.09 * (i + 1), 1.0 - i * 0.3]} color="#E7DFCF" rough={0.7} radius={0.01} />)}
      <B size={[0.05, 1.0, 2.4]} pos={[0.78, 0.9, 0.0]} rot={[0.62, 0, 0]} color="#3F2A1B" rough={0.5} />
      <B size={[0.05, 0.05, 2.5]} pos={[0.78, 1.5, 0]} rot={[0.62, 0, 0]} color="#B8892F" metal={0.7} rough={0.3} />
    </group>
  );
}

function Rail({ w = 4 }: { w?: number }) {
  const posts = Math.max(2, Math.round(w / 0.45));
  return (
    <group>
      <B size={[w, 0.05, 0.05]} pos={[0, 1.0, 0]} color="#1B1F24" metal={0.6} rough={0.4} radius={0.01} />
      <B size={[w, 0.03, 0.03]} pos={[0, 0.2, 0]} color="#1B1F24" metal={0.6} rough={0.4} radius={0.01} />
      {Array.from({ length: posts + 1 }, (_, i) => <B key={i} size={[0.03, 0.85, 0.03]} pos={[-w / 2 + (i * w) / posts, 0.6, 0]} color="#1B1F24" metal={0.6} rough={0.4} radius={0.008} shadow={false} />)}
    </group>
  );
}

function Bench() {
  return (
    <group>
      <B size={[1.4, 0.06, 0.45]} pos={[0, 0.45, 0]} color="#8B5E3C" rough={0.6} radius={0.01} />
      <B size={[1.4, 0.4, 0.05]} pos={[0, 0.7, -0.2]} color="#8B5E3C" rough={0.6} radius={0.01} />
      {[-0.6, 0.6].map((x) => <B key={x} size={[0.06, 0.45, 0.4]} pos={[x, 0.22, 0]} color="#3F2A1B" rough={0.6} />)}
    </group>
  );
}

function Jetty({ w = 3.4, d = 1.1 }: { w?: number; d?: number }) {
  return (
    <group>
      <B size={[w, 0.1, d]} pos={[w / 2, 0.1, 0]} color="#8B6A47" rough={0.8} radius={0.01} />
      {Array.from({ length: 9 }, (_, i) => <B key={i} size={[0.02, 0.105, d]} pos={[0.2 + i * (w / 9), 0.101, 0]} color="#5A3E28" shadow={false} />)}
      {[0.3, w - 0.3].flatMap((x) => [-d / 2 + 0.05, d / 2 - 0.05].map((z) => <Cyl key={`${x}${z}`} r={0.06} h={0.9} pos={[x, 0.0, z]} color="#4A3320" seg={8} />))}
    </group>
  );
}

function Boat() {
  return (
    <group>
      <B size={[1.5, 0.55, 3.6]} pos={[0, 0.1, 0]} color="#F6F6F4" rough={0.25} metal={0.1} radius={0.25} />
      <B size={[1.52, 0.12, 3.62]} pos={[0, 0.25, 0]} color="#19C3A6" rough={0.3} radius={0.06} />
      <B size={[1.1, 0.5, 1.2]} pos={[0, 0.7, -0.4]} color="#14222B" rough={0.1} metal={0.4} radius={0.12} />
      <B size={[1.2, 0.06, 1.3]} pos={[0, 0.98, -0.4]} color="#F6F6F4" rough={0.3} radius={0.03} />
      <B size={[1.2, 0.3, 0.5]} pos={[0, 0.5, 1.1]} color="#C4A15A" rough={0.6} radius={0.08} />
    </group>
  );
}

export function DecorItem({ d }: { d: Decor }) {
  const s = d.scale ?? 1;
  const props = { s };
  let node: JSX.Element | null = null;
  switch (d.kind) {
    case 'tree': node = <Tree {...props} />; break;
    case 'palm': node = <Palm {...props} />; break;
    case 'drum': node = <Drum {...props} />; break;
    case 'clothesline': node = <Clothesline w={d.w} />; break;
    case 'gate': node = <Gate />; break;
    case 'pillar': node = <Pillar {...props} />; break;
    case 'awning': node = <Awning w={d.w} d={d.d} />; break;
    case 'hedge': node = <Hedge w={d.w} />; break;
    case 'bench': node = <Bench />; break;
    case 'generatorHouse': node = <GeneratorHouse />; break;
    case 'lamppost': node = <Lamppost />; break;
    case 'jetty': node = <Jetty w={d.w} d={d.d} />; break;
    case 'boat': node = <Boat />; break;
    case 'planter': node = <Planter />; break;
    case 'stairs': node = <Stairs />; break;
    case 'rail': node = <Rail w={d.w} />; break;
  }
  return <group position={[d.x, 0, d.z]} rotation={[0, d.rotation ?? 0, 0]}>{node}</group>;
}

export { Water };
