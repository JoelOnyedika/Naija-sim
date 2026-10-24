import { B, Cyl, Sph } from './primitives';

/**
 * Venue furniture: market stall, church pew and altar, gallery plinth, stadium stand, club bar and DJ booth, showroom podium,
 * reception desk, prison bunk. Same conventions as the home catalogue: origin = floor centre, +z = front. These are not sold in
 * the shop (they are part of public buildings), so they can be larger and bolder than home furniture.
 */
export function VStall() {
  const poles: [number, number][] = [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]];
  return (
    <group>
      <B size={[1.9, 0.08, 0.9]} pos={[0, 0.85, 0.1]} color="#B07A44" rough={0.7} radius={0.02} />
      <B size={[1.8, 0.8, 0.8]} pos={[0, 0.4, 0.1]} color="#8E5C2E" rough={0.8} radius={0.02} />
      {poles.map(([x, z]) => <B key={`${x}${z}`} size={[0.06, 2.0, 0.06]} pos={[x, 1.0, z]} color="#5A3A20" rough={0.7} radius={0.015} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} size={[0.34, 0.05, 1.3]} pos={[-0.85 + i * 0.34, 2.05, 0]} rot={[0.1, 0, 0]} color={i % 2 ? '#F4E6C8' : '#C4552D'} rough={0.95} radius={0.01} />)}
      {['#E4572E', '#1F4E47', '#E9B949', '#3A5BA0'].map((c, i) => <B key={c} size={[0.34, 0.14, 0.34]} pos={[-0.65 + i * 0.44, 0.97, 0.12]} color={c} rough={0.9} radius={0.03} />)}
      <B size={[0.5, 0.06, 0.06]} pos={[0, 1.55, 0.45]} color="#F4E6C8" rough={0.9} />
    </group>
  );
}
export function VSacks() {
  return (
    <group>
      <B size={[0.7, 0.55, 0.6]} pos={[-0.1, 0.28, 0]} color="#C9A66B" rough={0.9} radius={0.03} />
      <B size={[0.6, 0.45, 0.55]} pos={[0.25, 0.78, 0.02]} rot={[0, 0.3, 0]} color="#E4572E" rough={0.9} radius={0.05} />
      <Sph r={0.3} pos={[-0.2, 0.85, 0.05]} scale={[1, 0.9, 1]} color="#F1EADB" rough={0.95} />
      <B size={[0.45, 0.12, 0.45]} pos={[0.1, 0.06, 0.55]} color="#7A4A26" rough={0.8} />
    </group>
  );
}
export function VPew() {
  return (
    <group>
      <B size={[2.1, 0.08, 0.5]} pos={[0, 0.45, 0]} color="#8A5A30" rough={0.6} radius={0.02} />
      <B size={[2.1, 0.7, 0.07]} pos={[0, 0.8, -0.24]} color="#7A4A26" rough={0.6} radius={0.02} />
      {[-1, 1].map((s) => <B key={s} size={[0.08, 0.95, 0.6]} pos={[s * 1.04, 0.47, 0]} color="#6A3F20" rough={0.6} radius={0.02} />)}
      <B size={[1.9, 0.06, 0.2]} pos={[0, 0.15, 0.3]} color="#6A3F20" rough={0.7} />
    </group>
  );
}
export function VAltar() {
  return (
    <group>
      <B size={[2.4, 0.2, 1.3]} pos={[0, 0.1, 0]} color="#D8D2C4" rough={0.5} radius={0.02} />
      <B size={[1.5, 0.9, 0.7]} pos={[0, 0.65, 0]} color="#F4F0E6" rough={0.4} radius={0.03} />
      <B size={[1.6, 0.06, 0.8]} pos={[0, 1.13, 0]} color="#C9A24A" metal={0.7} rough={0.35} radius={0.01} />
      <B size={[0.07, 0.7, 0.07]} pos={[0, 1.55, -0.1]} color="#C9A24A" metal={0.8} rough={0.3} />
      <B size={[0.4, 0.07, 0.07]} pos={[0, 1.7, -0.1]} color="#C9A24A" metal={0.8} rough={0.3} />
      {[-0.55, 0.55].map((x) => <group key={x}><Cyl r={0.05} h={0.5} pos={[x, 1.4, 0.05]} color="#F6E2B8" rough={0.8} /><Sph r={0.04} pos={[x, 1.7, 0.05]} color="#FFC21A" emissive="#FFB020" emissiveIntensity={1.3} /></group>)}
    </group>
  );
}
export function VPlinth() {
  return (
    <group>
      <B size={[0.7, 0.9, 0.7]} pos={[0, 0.45, 0]} color="#F1EFEA" rough={0.4} radius={0.02} />
      <B size={[0.78, 0.05, 0.78]} pos={[0, 0.92, 0]} color="#CFCAC0" rough={0.4} />
      <Sph r={0.2} pos={[0, 1.18, 0]} scale={[0.8, 1.1, 0.8]} color="#B5651D" metal={0.4} rough={0.4} />
      <Sph r={0.13} pos={[0, 1.5, 0]} color="#B5651D" metal={0.4} rough={0.4} />
    </group>
  );
}
export function VBleachers() {
  return (
    <group>
      {[0, 1, 2].map((i) => <B key={i} size={[2.9, 0.3, 0.45]} pos={[0, 0.2 + i * 0.35, -0.4 + i * -0.4]} color={['#C4552D', '#F4E6C8', '#1F4E47'][i]} rough={0.7} radius={0.02} />)}
      <B size={[2.9, 1.1, 0.12]} pos={[0, 0.55, -1.22]} color="#8C8576" rough={0.8} />
    </group>
  );
}
export function VClubBar() {
  return (
    <group>
      <B size={[3.0, 1.0, 0.7]} pos={[0, 0.5, 0]} color="#17171C" rough={0.4} radius={0.03} />
      <B size={[3.1, 0.07, 0.8]} pos={[0, 1.03, 0]} color="#C9A24A" metal={0.8} rough={0.25} radius={0.02} />
      <B size={[3.0, 0.05, 0.05]} pos={[0, 0.12, 0.38]} color="#FF3FA4" emissive="#FF3FA4" emissiveIntensity={1.2} shadow={false} />
      <B size={[2.8, 1.5, 0.15]} pos={[0, 1.4, -0.5]} color="#22222A" rough={0.6} />
      {[-1.1, -0.55, 0, 0.55, 1.1].map((x, i) => <Cyl key={x} r={0.07} r2={0.05} h={0.34} pos={[x, 1.75, -0.4]} color={['#7A1F2A', '#2F6F73', '#C9A24A', '#3A5BA0', '#E4572E'][i]} rough={0.2} metal={0.2} />)}
      {[-1.1, 0, 1.1].map((x) => <Cyl key={`s${x}`} r={0.17} h={0.05} pos={[x, 0.55, 0.72]} color="#2D2D36" metal={0.5} rough={0.4} />)}
    </group>
  );
}
export function VDjBooth() {
  return (
    <group>
      <B size={[2.2, 1.1, 0.8]} pos={[0, 0.55, 0]} color="#17171C" rough={0.4} radius={0.03} />
      <B size={[2.3, 0.06, 0.9]} pos={[0, 1.13, 0]} color="#2D2D36" rough={0.35} />
      {[-0.6, 0.6].map((x) => <group key={x}><Cyl r={0.26} h={0.04} pos={[x, 1.18, 0]} color="#0B0B0E" rough={0.2} seg={32} /><Cyl r={0.06} h={0.045} pos={[x, 1.2, 0]} color="#E4572E" seg={16} /></group>)}
      <B size={[0.36, 0.05, 0.5]} pos={[0, 1.2, 0]} color="#3A3A44" radius={0.01} />
      <B size={[2.2, 0.07, 0.06]} pos={[0, 0.9, 0.42]} color="#3FD5FF" emissive="#3FD5FF" emissiveIntensity={1.3} shadow={false} />
      <B size={[2.6, 0.9, 0.08]} pos={[0, 1.9, -0.38]} color="#101015" rough={0.5} />
      <B size={[1.8, 0.45, 0.02]} pos={[0, 1.9, -0.33]} color="#FF3FA4" emissive="#FF3FA4" emissiveIntensity={0.9} shadow={false} />
    </group>
  );
}
export function VPodium() {
  return (
    <group>
      <Cyl r={1.55} h={0.18} pos={[0, 0.09, 0]} color="#F1EFEA" rough={0.3} seg={40} />
      <Cyl r={1.4} h={0.04} pos={[0, 0.2, 0]} color="#1B1F24" rough={0.4} seg={40} />
      <Cyl r={1.58} h={0.03} pos={[0, 0.02, 0]} color="#C9A24A" metal={0.8} rough={0.3} seg={40} />
    </group>
  );
}
export function VReceptionDesk() {
  return (
    <group>
      <B size={[2.6, 1.0, 0.8]} pos={[0, 0.5, 0]} color="#F4F0E6" rough={0.35} radius={0.03} />
      <B size={[2.7, 0.06, 0.9]} pos={[0, 1.03, 0]} color="#1B1F24" rough={0.3} />
      <B size={[0.5, 0.35, 0.04]} pos={[-0.5, 1.28, 0]} rot={[-0.2, 0, 0]} color="#101015" rough={0.3} />
      <B size={[1.2, 0.25, 0.04]} pos={[0.5, 0.75, 0.42]} color="#C9A24A" metal={0.7} rough={0.3} shadow={false} />
    </group>
  );
}
export function VCellBed() {
  return (
    <group>
      <B size={[0.95, 0.12, 2.0]} pos={[0, 0.4, 0]} color="#5C6368" metal={0.3} rough={0.6} radius={0.02} />
      <B size={[0.85, 0.12, 1.9]} pos={[0, 0.52, 0]} color="#8C9AA3" rough={0.95} radius={0.04} />
      <B size={[0.55, 0.1, 0.3]} pos={[0, 0.62, -0.7]} color="#E8E4DA" rough={0.95} radius={0.04} />
      {[[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]].map(([x, z]) => <B key={`${x}${z}`} size={[0.05, 0.4, 0.05]} pos={[x, 0.2, z]} color="#3C4248" metal={0.4} rough={0.6} />)}
    </group>
  );
}

export function VKiosk() {
  return (
    <group>
      <B size={[1.2, 0.9, 0.8]} pos={[0, 0.45, 0]} color="#1F4E47" rough={0.6} radius={0.03} />
      <B size={[1.3, 0.06, 0.9]} pos={[0, 0.93, 0]} color="#F4E6C8" rough={0.5} />
      {[-0.55, 0.55].map((x) => <B key={x} size={[0.05, 1.0, 0.05]} pos={[x, 1.4, 0.35]} color="#5A3A20" rough={0.7} />)}
      {[0, 1, 2, 3].map((i) => <B key={i} size={[0.33, 0.04, 0.95]} pos={[-0.5 + i * 0.33, 1.95, 0.05]} rot={[0.12, 0, 0]} color={i % 2 ? '#F4F6F6' : '#E4572E'} rough={0.9} />)}
      {['#FFC21A', '#3A5BA0', '#E4572E'].map((c, i) => <Cyl key={c} r={0.07} h={0.22} pos={[-0.3 + i * 0.3, 1.06, 0.15]} color={c} rough={0.4} />)}
    </group>
  );
}
export function VSpeakerStack() {
  return (
    <group>
      <B size={[0.75, 2.2, 0.55]} pos={[0, 1.1, 0]} color="#17171C" rough={0.6} radius={0.03} />
      {[0.5, 1.15, 1.8].map((y) => <Cyl key={y} r={0.2} h={0.05} rot={[Math.PI / 2, 0, 0]} pos={[0, y, 0.28]} color="#2D2D36" metal={0.4} rough={0.5} seg={24} />)}
      <B size={[0.4, 0.04, 0.04]} pos={[0, 2.12, 0.28]} color="#FF3FA4" emissive="#FF3FA4" emissiveIntensity={1.2} shadow={false} />
    </group>
  );
}
export function VBars() {
  return (
    <group>
      <B size={[3.0, 0.08, 0.14]} pos={[0, 2.05, 0]} color="#3C4248" metal={0.5} rough={0.5} />
      <B size={[3.0, 0.08, 0.14]} pos={[0, 0.08, 0]} color="#3C4248" metal={0.5} rough={0.5} />
      {Array.from({ length: 13 }, (_, i) => <B key={i} size={[0.05, 2.0, 0.05]} pos={[-1.45 + i * 0.2417, 1.05, 0]} color="#6F7880" metal={0.6} rough={0.4} radius={0.01} />)}
    </group>
  );
}
