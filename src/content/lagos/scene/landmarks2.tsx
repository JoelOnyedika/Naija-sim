import type { ComponentType } from 'react';
import { B, Cyl, Sph } from '@/three/models/primitives';
import { DecorItem } from '@/three/property/Decor';

/** More Lagos landmark models (shopping, arts, food, recreation, entertainment). ~3 world units wide, built from shared primitives. */

const COLS = ['#E4572E', '#FFC21A', '#2B8FD2', '#0B8F4D', '#FF4D6D', '#8A63D2'];

function Tejuosho() {
  return (
    <group>
      <B size={[3.1, 0.08, 2.2]} pos={[0, 0.04, 0]} color="#8D8576" rough={1} radius={0.02} />
      <B size={[3.0, 0.8, 1.5]} pos={[0, 0.48, -0.2]} color="#E7DCC4" rough={0.9} radius={0.03} />
      <B size={[3.1, 0.1, 1.7]} pos={[0, 0.92, -0.2]} rot={[0.12, 0, 0]} color="#B5532F" rough={0.8} radius={0.02} />
      <B size={[2.2, 0.28, 0.05]} pos={[0, 0.78, 0.58]} color="#C23B3B" emissive="#C23B3B" emissiveIntensity={0.4} radius={0.02} shadow={false} />
      {COLS.map((c, i) => <B key={c} size={[0.38, 0.5, 0.3]} pos={[-1.2 + i * 0.48, 0.3, 0.95]} color={c} rough={0.95} radius={0.02} />)}
    </group>
  );
}

function MarketStalls() {
  return (
    <group>
      <B size={[3.0, 0.06, 2.6]} pos={[0, 0.03, 0]} color="#9A8F78" rough={1} radius={0.02} />
      {Array.from({ length: 6 }, (_, i) => {
        const x = (i % 3 - 1) * 0.95, z = (Math.floor(i / 3) - 0.5) * 1.2, c = ['#2E9B4F', '#E4572E', '#FFC21A'][i % 3];
        return (
          <group key={i} position={[x, 0, z]}>
            <B size={[0.7, 0.35, 0.5]} pos={[0, 0.2, 0]} color="#8B5E3C" rough={0.9} radius={0.02} />
            <B size={[0.82, 0.05, 0.66]} pos={[0, 0.78, 0]} rot={[0.18, 0, 0]} color={c} rough={0.9} radius={0.01} />
            {[-0.3, 0, 0.3].map((px) => <Sph key={px} r={0.09} pos={[px, 0.43, 0.05]} color={['#E4572E', '#7BC043', '#F0A030'][Math.abs(Math.round(px * 3)) % 3]} />)}
            <B size={[0.04, 0.6, 0.04]} pos={[-0.36, 0.5, 0.26]} color="#5A4A38" shadow={false} /><B size={[0.04, 0.6, 0.04]} pos={[0.36, 0.5, 0.26]} color="#5A4A38" shadow={false} />
          </group>
        );
      })}
    </group>
  );
}

function Mall() {
  return (
    <group>
      <B size={[3.2, 0.06, 2.4]} pos={[0, 0.03, 0.1]} color="#6E7077" rough={0.9} radius={0.02} />
      <B size={[2.7, 1.15, 1.7]} pos={[0, 0.63, -0.25]} color="#F0F1F3" rough={0.5} radius={0.05} />
      <B size={[2.4, 0.6, 0.04]} pos={[0, 0.62, 0.61]} color="#7FB5E8" opacity={0.7} rough={0.1} metal={0.3} radius={0.01} shadow={false} />
      <B size={[2.8, 0.12, 1.85]} pos={[0, 1.26, -0.25]} color="#3A4A66" rough={0.6} radius={0.03} />
      <B size={[1.1, 0.07, 0.55]} pos={[0, 0.95, 0.9]} color="#2B4C7E" rough={0.6} radius={0.02} />
      {[-0.5, 0.5].map((x) => <Cyl key={x} r={0.04} h={0.9} pos={[x, 0.45, 1.1]} color="#C9CED1" metal={0.7} seg={8} />)}
      <B size={[1.2, 0.2, 0.04]} pos={[0, 1.1, 0.62]} color="#5B93FF" emissive="#5B93FF" emissiveIntensity={1.1} radius={0.01} shadow={false} />
    </group>
  );
}

function ArtsPavilion() {
  return (
    <group>
      <B size={[3.0, 0.08, 2.2]} pos={[0, 0.04, 0]} color="#CBBFA6" rough={1} radius={0.02} />
      {[[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].map(([x, z], i) => <Cyl key={i} r={0.07} h={1.1} pos={[x, 0.63, z]} color="#F4F1EA" rough={0.6} seg={12} />)}
      <B size={[2.8, 0.1, 1.8]} pos={[0, 1.22, 0]} color="#E4572E" rough={0.7} radius={0.02} />
      <B size={[2.8, 0.05, 0.3]} pos={[0, 1.3, 0]} color="#FFC21A" rough={0.7} radius={0.01} />
      {COLS.slice(0, 4).map((c, i) => <B key={c} size={[0.5, 0.65, 0.04]} pos={[-0.95 + i * 0.63, 0.65, -0.78]} color={c} rough={0.8} radius={0.01} />)}
      <Cyl r={0.05} r2={0.11} h={0.55} pos={[-0.4, 0.34, 0.35]} color="#8B5E3C" rough={0.7} seg={10} />
      <Sph r={0.14} pos={[-0.4, 0.74, 0.35]} color="#B8892F" metal={0.6} rough={0.35} />
      <Cyl r={0.05} r2={0.09} h={0.7} pos={[0.5, 0.43, 0.4]} color="#2B4C7E" rough={0.7} seg={10} />
    </group>
  );
}

function Shrine() {
  return (
    <group>
      <B size={[2.6, 1.1, 2.0]} pos={[0, 0.58, 0]} color="#1C1612" rough={0.6} radius={0.05} />
      <B size={[2.7, 0.1, 2.1]} pos={[0, 1.18, 0]} color="#7A2E1E" rough={0.7} radius={0.02} />
      {['#0B8F4D', '#FFC21A', '#C23B3B'].map((c, i) => <B key={c} size={[2.4, 0.06, 0.05]} pos={[0, 0.9 - i * 0.12, 1.02]} color={c} emissive={c} emissiveIntensity={1.5} radius={0.01} shadow={false} />)}
      <Cyl r={0.2} h={0.05} pos={[0, 0.6, 1.03]} rot={[Math.PI / 2, 0, 0]} color="#FFC21A" emissive="#FFC21A" emissiveIntensity={1.0} seg={20} />
      {[-1.0, 1.0].map((x) => <B key={x} size={[0.35, 0.8, 0.3]} pos={[x, 0.4, 1.25]} color="#16181F" rough={0.7} radius={0.02} />)}
    </group>
  );
}

function Cinema() {
  return (
    <group>
      <B size={[2.6, 1.2, 1.8]} pos={[0, 0.63, -0.1]} color="#3A2F4A" rough={0.6} radius={0.05} />
      <B size={[2.2, 0.36, 0.1]} pos={[0, 1.15, 0.85]} color="#FFC21A" emissive="#FFC21A" emissiveIntensity={1.4} radius={0.02} shadow={false} />
      {[-0.7, 0, 0.7].map((x, i) => <B key={x} size={[0.45, 0.6, 0.04]} pos={[x, 0.5, 0.82]} color={COLS[(i * 2) % COLS.length]} rough={0.7} radius={0.01} />)}
      <Cyl r={0.12} r2={0.17} h={0.3} pos={[1.15, 0.2, 1.0]} color="#C23B3B" rough={0.7} seg={10} />
      <Sph r={0.15} pos={[1.15, 0.42, 1.0]} color="#FFF4C2" rough={0.9} />
    </group>
  );
}

function SuyaSpot() {
  return (
    <group>
      <B size={[2.4, 0.05, 2.0]} pos={[0, 0.03, 0]} color="#7B715F" rough={1} radius={0.02} />
      <Cyl r={0.4} r2={0.34} h={0.5} pos={[0, 0.3, 0]} color="#2A2A2E" rough={0.8} seg={16} />
      <Cyl r={0.34} h={0.04} pos={[0, 0.56, 0]} color="#E4572E" emissive="#FF6A1A" emissiveIntensity={1.4} seg={16} />
      {[-0.22, -0.07, 0.08, 0.23].map((x) => <Cyl key={x} r={0.012} h={0.7} pos={[x, 0.62, 0]} rot={[0, 0, Math.PI / 2]} color="#C9CED1" metal={0.8} seg={6} />)}
      <B size={[1.0, 0.07, 0.5]} pos={[0.95, 0.45, 0.2]} color="#8B5E3C" rough={0.8} radius={0.01} />
      {[[0.55, 0], [1.35, 0], [0.55, 0.4], [1.35, 0.4]].map(([x, z], i) => <B key={i} size={[0.05, 0.45, 0.05]} pos={[x, 0.22, z]} color="#5A4A38" shadow={false} />)}
      <Cyl r={0.02} h={0.9} pos={[-0.9, 0.5, -0.4]} color="#8E979C" seg={6} />
      <mesh position={[-0.9, 0.98, -0.4]}><coneGeometry args={[0.7, 0.28, 12]} /><meshStandardMaterial color="#C23B3B" roughness={0.8} /></mesh>
    </group>
  );
}

function Bakery() {
  return (
    <group>
      <B size={[1.8, 0.9, 1.4]} pos={[0, 0.48, 0]} color="#EADBC0" rough={0.9} radius={0.03} />
      <B size={[2.0, 0.1, 1.6]} pos={[0, 0.98, 0]} color="#D9792B" rough={0.8} radius={0.02} />
      <Cyl r={0.1} h={0.7} pos={[0.6, 1.3, -0.35]} color="#8A5A3C" rough={0.9} seg={8} />
      <B size={[1.4, 0.06, 0.5]} pos={[0, 0.45, 0.95]} color="#8B5E3C" rough={0.8} radius={0.01} />
      {[-0.45, -0.15, 0.15, 0.45].map((x) => <Sph key={x} r={0.11} pos={[x, 0.54, 0.95]} scale={[1.7, 0.7, 0.9]} color="#E1A55B" rough={0.9} />)}
      <B size={[1.2, 0.2, 0.04]} pos={[0, 0.78, 0.72]} color="#FFF4C2" emissive="#FFC21A" emissiveIntensity={0.5} radius={0.01} shadow={false} />
    </group>
  );
}

function TechHub() {
  return (
    <group>
      <B size={[1.9, 1.7, 1.9]} pos={[0, 0.9, 0]} color="#9CC7E8" opacity={0.75} rough={0.1} metal={0.3} radius={0.04} />
      {[0.35, 0.95, 1.5].map((y) => <B key={y} size={[1.95, 0.05, 1.95]} pos={[0, y, 0]} color="#2A3140" rough={0.6} radius={0.01} />)}
      {[-0.95, 0.95].flatMap((x) => [-0.95, 0.95].map((z) => <B key={`${x}${z}`} size={[0.06, 1.7, 0.06]} pos={[x, 0.9, z]} color="#2A3140" rough={0.6} />))}
      <Sph r={0.14} pos={[0, 1.95, 0]} color="#FFE98A" emissive="#FFD84A" emissiveIntensity={1.4} />
      <Cyl r={0.03} h={0.3} pos={[0, 1.78, 0]} color="#2A3140" seg={6} />
    </group>
  );
}

function Conservation() {
  return (
    <group>
      <Cyl r={2.0} h={0.08} pos={[0, 0.04, 0]} color="#7DAF6E" rough={1} seg={28} />
      <B size={[3.2, 0.06, 0.36]} pos={[0, 0.22, 0]} rot={[0, 0.5, 0]} color="#8B5E3C" rough={0.9} radius={0.01} />
      {[[-1.1, -0.7, 0.9], [0.9, 0.9, 1.1], [-0.4, 0.9, 0.8], [1.2, -0.6, 0.85]].map(([x, z, s], i) => <DecorItem key={i} d={{ kind: i % 2 ? 'palm' : 'tree', x, z, scale: s * 0.6 }} />)}
      <B size={[0.55, 0.4, 0.45]} pos={[-0.15, 0.28, -0.1]} color="#CDB88A" rough={0.9} radius={0.02} />
      <B size={[0.7, 0.07, 0.6]} pos={[-0.15, 0.52, -0.1]} color="#6B4A32" rough={0.9} radius={0.01} />
    </group>
  );
}

function GolfClub() {
  return (
    <group>
      <Cyl r={2.0} h={0.07} pos={[0, 0.04, 0]} color="#5FA55A" rough={1} seg={32} />
      <Cyl r={0.45} h={0.02} pos={[0.55, 0.09, 0.3]} color="#7BC66E" rough={1} seg={20} />
      <Cyl r={0.35} h={0.02} pos={[-0.9, 0.09, 0.9]} color="#E7D7A5" rough={1} seg={16} />
      <Cyl r={0.012} h={0.6} pos={[0.55, 0.4, 0.3]} color="#F4F1EA" seg={6} />
      <mesh position={[0.65, 0.62, 0.3]}><coneGeometry args={[0.12, 0.2, 3]} /><meshStandardMaterial color="#C23B3B" roughness={0.8} /></mesh>
      <B size={[1.0, 0.5, 0.7]} pos={[-0.7, 0.33, -0.7]} color="#F4EFE4" rough={0.8} radius={0.03} />
      <B size={[1.15, 0.08, 0.85]} pos={[-0.7, 0.62, -0.7]} color="#2B4C7E" rough={0.7} radius={0.02} />
      <DecorItem d={{ kind: 'tree', x: 1.2, z: -0.9, scale: 0.6 }} />
    </group>
  );
}

function Marina() {
  const boat = (x: number, z: number, rot: number, c: string) => (
    <group position={[x, 0.1, z]} rotation={[0, rot, 0]}>
      <B size={[0.5, 0.18, 1.1]} pos={[0, 0.1, 0]} color="#F4F1EA" rough={0.4} radius={0.08} />
      <B size={[0.34, 0.2, 0.4]} pos={[0, 0.3, -0.1]} color={c} rough={0.5} radius={0.04} />
    </group>
  );
  return (
    <group>
      <Cyl r={2.2} h={0.04} pos={[0, 0.0, 0]} color="#3FA7C8" opacity={0.7} rough={0.1} seg={28} />
      <B size={[0.34, 0.08, 2.6]} pos={[0, 0.16, 0]} color="#8B5E3C" rough={0.9} radius={0.01} />
      <B size={[2.0, 0.08, 0.3]} pos={[0, 0.16, 1.1]} color="#8B5E3C" rough={0.9} radius={0.01} />
      {boat(-0.9, -0.5, 0.1, '#2B4C7E')}{boat(0.85, -0.3, -0.12, '#C23B3B')}{boat(-0.85, 0.5, 0.05, '#19C3A6')}
    </group>
  );
}

export const LANDMARK_MODELS_2: Record<string, ComponentType> = {
  tejuosho: Tejuosho, marketStalls: MarketStalls, mall: Mall, artsPavilion: ArtsPavilion, shrine: Shrine, cinema: Cinema,
  suyaSpot: SuyaSpot, bakery: Bakery, techHub: TechHub, conservation: Conservation, golfClub: GolfClub, marina: Marina,
};
