import { B, Cyl, Mat, Sph } from './primitives';

/**
 * v8 catalogue models. Every item has its own silhouette (not a recolour): different frames, legs, backs and details.
 * Origin is the floor centre, +z is the front (wall items: origin at the centre of the face, depth along +z).
 * Shared geometry stays tiny (rounded boxes and cylinders), so none of these costs more than the existing furniture.
 */
const WOOD = '#7A4A26', DARK = '#2B2F32', STEEL = '#B8BEC2';

function Ring({ r, tube, pos, rot, color, emissive }: { r: number; tube: number; pos: [number, number, number]; rot?: [number, number, number]; color: string; emissive?: string }) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <torusGeometry args={[r, tube, 10, 36]} />
      <Mat color={color} rough={0.35} emissive={emissive} emissiveIntensity={emissive ? 1.4 : 1} />
    </mesh>
  );
}

// ---------------------------------------------------------------- seating
export function Armchair() {
  return (
    <group>
      {[[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.3], [0.34, 0.3]].map(([x, z]) => <Cyl key={`${x}${z}`} r={0.03} r2={0.02} h={0.16} pos={[x, 0.08, z]} color={WOOD} rough={0.6} />)}
      <B size={[0.82, 0.22, 0.78]} pos={[0, 0.27, 0]} color="#1F6F78" rough={0.95} radius={0.07} />
      <B size={[0.82, 0.55, 0.2]} pos={[0, 0.6, -0.29]} color="#1F6F78" rough={0.95} radius={0.09} rot={[-0.12, 0, 0]} />
      {[-0.4, 0.4].map((x) => <B key={x} size={[0.12, 0.34, 0.74]} pos={[x, 0.42, 0]} color="#18595F" rough={0.95} radius={0.05} />)}
      <B size={[0.6, 0.1, 0.5]} pos={[0, 0.43, 0.06]} color="#2A8C97" rough={1} radius={0.05} />
      <B size={[0.3, 0.3, 0.1]} pos={[0.18, 0.62, -0.14]} color="#E9B949" rough={1} radius={0.05} rot={[-0.2, 0.3, 0.2]} />
    </group>
  );
}

export function OfficeChair() {
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2; return (
        <group key={i}>
          <B size={[0.05, 0.03, 0.3]} pos={[Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15]} rot={[0, a, 0]} color={DARK} metal={0.4} rough={0.5} radius={0.012} />
          <Sph r={0.03} pos={[Math.sin(a) * 0.29, 0.035, Math.cos(a) * 0.29]} color="#111" rough={0.6} />
        </group>); })}
      <Cyl r={0.035} h={0.34} pos={[0, 0.27, 0]} color={STEEL} metal={0.8} rough={0.3} />
      <B size={[0.5, 0.09, 0.48]} pos={[0, 0.48, 0]} color="#22262A" rough={0.9} radius={0.04} />
      <B size={[0.46, 0.5, 0.07]} pos={[0, 0.8, -0.22]} color="#2D3338" rough={0.9} radius={0.04} rot={[-0.08, 0, 0]} />
      <B size={[0.3, 0.12, 0.05]} pos={[0, 1.1, -0.25]} color="#22262A" rough={0.9} radius={0.03} rot={[-0.08, 0, 0]} />
      {[-0.27, 0.27].map((x) => <B key={x} size={[0.05, 0.03, 0.26]} pos={[x, 0.68, 0]} color={DARK} rough={0.6} radius={0.012} />)}
      {[-0.27, 0.27].map((x) => <B key={`s${x}`} size={[0.03, 0.18, 0.03]} pos={[x, 0.59, -0.05]} color={DARK} rough={0.6} radius={0.01} />)}
    </group>
  );
}

export function DiningChair() {
  return (
    <group>
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z]) => <B key={`${x}${z}`} size={[0.04, 0.44, 0.04]} pos={[x, 0.22, z]} color={WOOD} rough={0.55} radius={0.012} />)}
      <B size={[0.42, 0.05, 0.42]} pos={[0, 0.46, 0]} color="#A76B3A" rough={0.6} radius={0.02} />
      {[-0.18, -0.06, 0.06, 0.18].map((x) => <B key={x} size={[0.04, 0.4, 0.03]} pos={[x, 0.72, -0.19]} color={WOOD} rough={0.55} radius={0.01} />)}
      <B size={[0.42, 0.05, 0.04]} pos={[0, 0.93, -0.19]} color={WOOD} rough={0.55} radius={0.015} />
    </group>
  );
}

export function Stool() {
  return (
    <group>
      {[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2 + 0.4; return <B key={i} size={[0.035, 0.6, 0.035]} pos={[Math.sin(a) * 0.14, 0.3, Math.cos(a) * 0.14]} rot={[Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]} color={STEEL} metal={0.7} rough={0.35} radius={0.01} />; })}
      <Cyl r={0.2} h={0.06} pos={[0, 0.64, 0]} color="#C4552D" rough={0.8} />
      <Ring r={0.13} tube={0.012} pos={[0, 0.25, 0]} rot={[Math.PI / 2, 0, 0]} color={STEEL} />
    </group>
  );
}

// ---------------------------------------------------------------- tables and storage
export function SideTable() {
  return (
    <group>
      <Cyl r={0.26} h={0.04} pos={[0, 0.53, 0]} color="#F1EDE6" rough={0.25} metal={0.1} />
      <Cyl r={0.035} h={0.5} pos={[0, 0.27, 0]} color="#C9A24A" metal={0.8} rough={0.3} />
      <Cyl r={0.2} r2={0.17} h={0.03} pos={[0, 0.015, 0]} color="#C9A24A" metal={0.8} rough={0.3} />
    </group>
  );
}

export function Locker() {
  return (
    <group>
      <B size={[0.5, 1.8, 0.5]} pos={[0, 0.9, 0]} color="#5C7C8A" metal={0.5} rough={0.5} radius={0.015} />
      {[-0.125, 0.125].map((x) => (
        <group key={x}>
          <B size={[0.22, 1.6, 0.02]} pos={[x, 0.92, 0.255]} color="#6F93A3" metal={0.5} rough={0.45} radius={0.008} />
          {[0, 1, 2].map((i) => <B key={i} size={[0.14, 0.012, 0.02]} pos={[x, 1.62 - i * 0.04, 0.268]} color="#2B3A42" radius={0.003} shadow={false} />)}
          <B size={[0.02, 0.1, 0.03]} pos={[x + (x < 0 ? 0.07 : -0.07), 0.9, 0.275]} color={STEEL} metal={0.8} rough={0.3} radius={0.006} />
        </group>
      ))}
      <B size={[0.5, 0.06, 0.5]} pos={[0, 0.03, 0]} color="#3C4A52" rough={0.6} />
    </group>
  );
}

export function ShelfUnit() {
  const books = ['#C4552D', '#1F4E47', '#E9B949', '#3A5BA0', '#8A3F6A'];
  return (
    <group>
      <B size={[0.04, 1.7, 0.34]} pos={[-0.43, 0.85, 0]} color={WOOD} rough={0.6} radius={0.01} />
      <B size={[0.04, 1.7, 0.34]} pos={[0.43, 0.85, 0]} color={WOOD} rough={0.6} radius={0.01} />
      {[0.08, 0.5, 0.92, 1.34, 1.68].map((y) => <B key={y} size={[0.9, 0.035, 0.34]} pos={[0, y, 0]} color="#9A6A3C" rough={0.6} radius={0.008} />)}
      <B size={[0.9, 1.7, 0.02]} pos={[0, 0.85, -0.16]} color="#5A3A20" rough={0.8} radius={0.005} shadow={false} />
      {books.map((c, i) => <B key={c} size={[0.06, 0.28 + (i % 2) * 0.05, 0.2]} pos={[-0.34 + i * 0.075, 0.24 + (i % 2) * 0.025, 0]} color={c} rough={0.8} radius={0.005} />)}
      <B size={[0.28, 0.2, 0.22]} pos={[0.18, 0.62, 0]} color="#D9C4A0" rough={0.9} radius={0.01} />
      <Sph r={0.1} pos={[-0.2, 1.05, 0]} color="#2A8C97" rough={0.4} />
      <Cyl r={0.07} r2={0.05} h={0.2} pos={[0.25, 1.04, 0]} color="#C4552D" rough={0.5} />
    </group>
  );
}

export function ShoeRack() {
  const shoe = (x: number, y: number, c: string) => <B key={`${x}${y}`} size={[0.1, 0.07, 0.24]} pos={[x, y, 0]} color={c} rough={0.7} radius={0.03} />;
  return (
    <group>
      {[-0.38, 0.38].map((x) => <B key={x} size={[0.03, 0.5, 0.28]} pos={[x, 0.25, 0]} color={DARK} metal={0.5} rough={0.5} radius={0.008} />)}
      {[0.06, 0.28, 0.5].map((y) => <B key={y} size={[0.8, 0.025, 0.28]} pos={[0, y, 0]} color="#C9A66B" rough={0.6} radius={0.008} />)}
      {shoe(-0.22, 0.11, '#1B1B1B')}{shoe(-0.04, 0.11, '#E8E1D2')}{shoe(0.18, 0.11, '#C4552D')}{shoe(-0.12, 0.33, '#3A5BA0')}{shoe(0.12, 0.33, '#2B2B2B')}
    </group>
  );
}

// ---------------------------------------------------------------- rugs: one generator, three shapes
function RugBase({ shape, colors, w, d }: { shape: 'round' | 'runner' | 'rect'; colors: string[]; w: number; d: number }) {
  if (shape === 'round') {
    return (
      <group>
        {colors.map((c, i) => <Cyl key={i} r={(w / 2) * (1 - i * 0.2)} h={0.02 + i * 0.002} pos={[0, 0.01 + i * 0.001, 0]} color={c} rough={1} seg={40} />)}
      </group>
    );
  }
  return (
    <group>
      {colors.map((c, i) => <B key={i} size={[w - i * 0.16, 0.02 + i * 0.002, d - i * 0.16]} pos={[0, 0.01 + i * 0.001, 0]} color={c} rough={1} radius={0.006} />)}
      {shape === 'runner' && [-0.3, -0.1, 0.1, 0.3].map((t) => <B key={t} size={[w * 0.2, 0.026, 0.06]} pos={[0, 0.014, t * d]} color="#F4E6C8" rough={1} radius={0.004} shadow={false} />)}
    </group>
  );
}
export const RugRound = () => <RugBase shape="round" colors={['#1F4E47', '#EBC77F', '#C4552D', '#F4E6C8']} w={1.6} d={1.6} />;
export const RugRunner = () => <RugBase shape="runner" colors={['#3A5BA0', '#F4E6C8', '#3A5BA0']} w={0.7} d={2.0} />;
export function RugPersian() {
  return (
    <group>
      <RugBase shape="rect" colors={['#6E1F2A', '#D9B66B', '#6E1F2A', '#1E2F5C']} w={2.4} d={1.7} />
      <B size={[0.9, 0.03, 0.6]} pos={[0, 0.02, 0]} color="#D9B66B" rough={1} radius={0.01} />
      <Sph r={0.2} pos={[0, 0.035, 0]} scale={[1, 0.08, 0.7]} color="#6E1F2A" rough={1} />
      {[-0.9, 0.9].map((x) => <Sph key={x} r={0.14} pos={[x, 0.03, 0]} scale={[1, 0.1, 1]} color="#D9B66B" rough={1} />)}
    </group>
  );
}

// ---------------------------------------------------------------- wall art (origin = centre of the face, depth +z)
export function WallArtAbstract() {
  return (
    <group>
      <B size={[0.9, 0.9, 0.04]} color="#1B1B1B" rough={0.5} radius={0.01} />
      <B size={[0.82, 0.82, 0.02]} pos={[0, 0, 0.02]} color="#F1E9DA" rough={0.9} radius={0.004} />
      <Sph r={0.24} pos={[-0.1, 0.1, 0.034]} scale={[1, 1, 0.08]} color="#E4572E" rough={0.8} />
      <B size={[0.5, 0.12, 0.012]} pos={[0.08, -0.2, 0.034]} color="#1F4E47" rough={0.8} radius={0.004} rot={[0, 0, 0.2]} />
      <Sph r={0.1} pos={[0.2, 0.22, 0.036]} scale={[1, 1, 0.08]} color="#FFC21A" rough={0.8} />
    </group>
  );
}
export function WallPhotos() {
  const f = (x: number, y: number, w: number, h: number, c: string, i: string) => (
    <group key={`${x}${y}`} position={[x, y, 0]}>
      <B size={[w, h, 0.03]} color="#F4F6F6" rough={0.5} radius={0.006} /><B size={[w - 0.06, h - 0.06, 0.02]} pos={[0, 0, 0.012]} color={c} rough={0.9} radius={0.003} />
      <Sph r={Math.min(w, h) * 0.18} pos={[0, h * 0.08, 0.026]} scale={[1, 1, 0.1]} color={i} rough={0.8} />
    </group>
  );
  return <group>{f(-0.28, 0.1, 0.32, 0.42, '#C7D8E8', '#7A5A3A')}{f(0.1, 0.16, 0.4, 0.3, '#EAD9C0', '#3A5BA0')}{f(0.22, -0.2, 0.28, 0.28, '#D8E8D0', '#C4552D')}{f(-0.18, -0.25, 0.24, 0.24, '#EBC9C9', '#2B2F32')}</group>;
}
export function WallPanel() {
  return (
    <group>
      <B size={[0.7, 1.5, 0.04]} color="#3A2A1D" rough={0.7} radius={0.008} />
      {Array.from({ length: 9 }, (_, i) => <B key={i} size={[0.05, 1.46, 0.05]} pos={[-0.3 + i * 0.075, 0, 0.03]} color={i % 2 ? '#B07A44' : '#8E5C2E'} rough={0.55} radius={0.008} />)}
    </group>
  );
}
export function WallClock() {
  return (
    <group>
      <Cyl r={0.26} h={0.04} rot={[Math.PI / 2, 0, 0]} pos={[0, 0, 0.0]} color={DARK} rough={0.4} seg={36} />
      <Cyl r={0.23} h={0.02} rot={[Math.PI / 2, 0, 0]} pos={[0, 0, 0.02]} color="#F6F2E8" rough={0.6} seg={36} />
      {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <B key={i} size={[0.012, i % 3 ? 0.03 : 0.05, 0.008]} pos={[Math.sin(a) * 0.19, Math.cos(a) * 0.19, 0.032]} rot={[0, 0, -a]} color={DARK} radius={0.002} shadow={false} />; })}
      <B size={[0.012, 0.14, 0.01]} pos={[0.02, 0.06, 0.04]} rot={[0, 0, -0.5]} color={DARK} radius={0.002} shadow={false} />
      <B size={[0.01, 0.18, 0.01]} pos={[-0.03, 0.05, 0.045]} rot={[0, 0, 0.7]} color="#C4552D" radius={0.002} shadow={false} />
    </group>
  );
}
export function WallMirror() {
  return (
    <group>
      <B size={[0.62, 1.2, 0.05]} color="#C9A24A" metal={0.8} rough={0.3} radius={0.02} />
      <B size={[0.54, 1.12, 0.02]} pos={[0, 0, 0.026]} color="#CFE3EE" metal={0.2} rough={0.18} emissive="#9FC4D6" emissiveIntensity={0.3} radius={0.01} />
      <B size={[0.12, 0.5, 0.005]} pos={[-0.1, 0.2, 0.038]} color="#F4FAFF" rough={0.1} rot={[0, 0, 0.35]} radius={0.002} shadow={false} />
    </group>
  );
}
export function NeonSign() {
  const c = '#FF3FA4';
  return (
    <group>
      <B size={[1.0, 0.5, 0.03]} color="#15151A" rough={0.8} radius={0.01} />
      <Ring r={0.15} tube={0.012} pos={[-0.3, 0.02, 0.03]} color={c} emissive={c} />
      <B size={[0.012, 0.3, 0.012]} pos={[-0.04, 0.02, 0.03]} color={c} emissive={c} emissiveIntensity={1.4} radius={0.004} shadow={false} />
      <B size={[0.24, 0.012, 0.012]} pos={[0.1, 0.1, 0.03]} color="#3FD5FF" emissive="#3FD5FF" emissiveIntensity={1.4} radius={0.004} shadow={false} />
      <B size={[0.24, 0.012, 0.012]} pos={[0.1, -0.06, 0.03]} color="#3FD5FF" emissive="#3FD5FF" emissiveIntensity={1.4} radius={0.004} shadow={false} />
      <B size={[0.012, 0.16, 0.012]} pos={[0.22, 0.02, 0.03]} color="#3FD5FF" emissive="#3FD5FF" emissiveIntensity={1.4} radius={0.004} shadow={false} />
    </group>
  );
}

// ---------------------------------------------------------------- creator gear and music
export function RingLight() {
  return (
    <group>
      {[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return <B key={i} size={[0.025, 0.55, 0.025]} pos={[Math.sin(a) * 0.12, 0.26, Math.cos(a) * 0.12]} rot={[Math.cos(a) * 0.38, 0, -Math.sin(a) * 0.38]} color={DARK} metal={0.5} rough={0.5} radius={0.008} />; })}
      <Cyl r={0.02} h={1.0} pos={[0, 0.95, 0]} color={STEEL} metal={0.8} rough={0.3} />
      <Ring r={0.24} tube={0.03} pos={[0, 1.5, 0.03]} color="#FFF7E6" emissive="#FFF1CC" />
      <B size={[0.07, 0.13, 0.025]} pos={[0, 1.5, 0.0]} color="#1B1B1B" radius={0.01} />
      <B size={[0.05, 0.1, 0.012]} pos={[0, 1.5, 0.017]} color="#2B3A5C" emissive="#2B3A5C" emissiveIntensity={0.4} radius={0.004} shadow={false} />
    </group>
  );
}
export function CameraTripod() {
  return (
    <group>
      {[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2 + 0.5; return <B key={i} size={[0.025, 0.95, 0.025]} pos={[Math.sin(a) * 0.17, 0.46, Math.cos(a) * 0.17]} rot={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]} color={DARK} metal={0.6} rough={0.4} radius={0.008} />; })}
      <Cyl r={0.04} h={0.06} pos={[0, 0.94, 0]} color={STEEL} metal={0.8} rough={0.3} />
      <B size={[0.2, 0.13, 0.1]} pos={[0, 1.04, 0]} color="#1E1E22" rough={0.5} radius={0.02} />
      <Cyl r={0.045} h={0.11} pos={[0, 1.04, 0.1]} rot={[Math.PI / 2, 0, 0]} color="#111" rough={0.3} />
      <Sph r={0.03} pos={[0, 1.04, 0.16]} color="#6FA8DC" metal={0.3} rough={0.2} />
      <Sph r={0.012} pos={[0.07, 1.09, 0.052]} color="#EF4444" emissive="#EF4444" emissiveIntensity={1.4} />
    </group>
  );
}
export function DjDeck() {
  return (
    <group>
      <B size={[1.4, 0.08, 0.6]} pos={[0, 0.9, 0]} color="#17171C" rough={0.5} radius={0.02} />
      {[-0.7, 0.7].map((x) => <B key={x} size={[0.06, 0.9, 0.5]} pos={[x * 0.97, 0.45, 0]} color="#22222A" rough={0.6} radius={0.015} />)}
      <B size={[1.3, 0.8, 0.04]} pos={[0, 0.45, -0.27]} color="#22222A" rough={0.6} radius={0.01} />
      {[-0.4, 0.4].map((x) => (
        <group key={x}>
          <Cyl r={0.21} h={0.03} pos={[x, 0.955, 0]} color="#2D2D36" rough={0.4} seg={32} />
          <Cyl r={0.17} h={0.012} pos={[x, 0.975, 0]} color="#0B0B0E" rough={0.2} seg={32} />
          <Cyl r={0.05} h={0.014} pos={[x, 0.985, 0]} color="#E4572E" rough={0.5} seg={20} />
        </group>
      ))}
      <B size={[0.34, 0.04, 0.4]} pos={[0, 0.96, 0]} color="#2D2D36" rough={0.4} radius={0.01} />
      {[-0.1, 0, 0.1].map((x, i) => <B key={x} size={[0.02, 0.012, 0.14]} pos={[x, 0.99, 0.02]} color={['#22C55E', '#FFC21A', '#EF4444'][i]} emissive={['#22C55E', '#FFC21A', '#EF4444'][i]} emissiveIntensity={1.1} radius={0.003} shadow={false} />)}
      <B size={[0.5, 0.06, 0.03]} pos={[0, 1.02, -0.25]} color="#FF3FA4" emissive="#FF3FA4" emissiveIntensity={1.0} radius={0.01} shadow={false} />
    </group>
  );
}

// ---------------------------------------------------------------- lighting and pet gear
export function BedsideLamp() {
  return (
    <group>
      <Cyl r={0.08} r2={0.065} h={0.04} pos={[0, 0.02, 0]} color="#2B2F32" metal={0.4} rough={0.5} />
      <Cyl r={0.012} h={0.2} pos={[0, 0.14, 0]} color="#C9A24A" metal={0.8} rough={0.3} />
      <Cyl r={0.1} r2={0.15} h={0.16} pos={[0, 0.3, 0]} color="#F6E2B8" emissive="#FFD58A" emissiveIntensity={0.45} rough={0.9} />
    </group>
  );
}
export function PetBed() {
  return (
    <group>
      <Cyl r={0.32} h={0.1} pos={[0, 0.05, 0]} color="#8A5A3A" rough={1} seg={32} />
      <Cyl r={0.25} h={0.08} pos={[0, 0.06, 0]} color="#E8D6BC" rough={1} seg={32} />
      <Sph r={0.05} pos={[0.12, 0.12, 0.04]} color="#C4552D" rough={0.9} />
    </group>
  );
}
export function PetBowl() {
  return (
    <group>
      <Cyl r={0.1} r2={0.07} h={0.06} pos={[-0.11, 0.03, 0]} color="#3A5BA0" metal={0.3} rough={0.4} />
      <Cyl r={0.1} r2={0.07} h={0.06} pos={[0.11, 0.03, 0]} color="#3A5BA0" metal={0.3} rough={0.4} />
      <Cyl r={0.08} h={0.012} pos={[-0.11, 0.058, 0]} color="#A9783D" rough={0.9} />
      <Cyl r={0.08} h={0.012} pos={[0.11, 0.058, 0]} color="#9FD3F0" rough={0.1} />
    </group>
  );
}
