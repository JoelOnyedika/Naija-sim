import { B, Cyl, Mat } from './primitives';

export function KingBed() {
  return (
    <group>
      <B size={[1.95, 0.32, 2.15]} pos={[0, 0.26, 0]} color="#3A2A22" rough={0.55} />
      <B size={[2.05, 1.15, 0.16]} pos={[0, 0.7, -1.0]} color="#7A5A48" rough={0.9} radius={0.06} />
      {[-0.6, 0, 0.6].map((x) => <B key={x} size={[0.55, 0.9, 0.04]} pos={[x, 0.72, -0.9]} color="#8A6A56" rough={0.95} radius={0.04} />)}
      <B size={[1.85, 0.26, 2.0]} pos={[0, 0.55, 0.05]} color="#F5F1EA" rough={0.9} radius={0.08} />
      <B size={[1.88, 0.07, 1.25]} pos={[0, 0.7, 0.4]} color="#C4A15A" rough={0.8} radius={0.03} />
      <B size={[1.88, 0.08, 0.28]} pos={[0, 0.72, -0.2]} color="#1F4E47" rough={0.9} radius={0.03} />
      {[-0.5, 0.5].map((x) => <B key={x} size={[0.7, 0.15, 0.4]} pos={[x, 0.78, -0.75]} color="#FFFFFF" rough={0.95} radius={0.07} />)}
      {[-0.5, 0.5].map((x) => <B key={`c${x}`} size={[0.4, 0.12, 0.3]} pos={[x, 0.86, -0.5]} color="#C4A15A" rough={0.9} radius={0.06} />)}
    </group>
  );
}

export function Wardrobe() {
  return (
    <group>
      <B size={[1.2, 2.0, 0.6]} pos={[0, 1.0, 0]} color="#6B4A32" rough={0.55} radius={0.02} />
      <B size={[0.58, 1.85, 0.02]} pos={[-0.3, 1.0, 0.31]} color="#7A5638" rough={0.5} radius={0.01} />
      <B size={[0.58, 1.85, 0.02]} pos={[0.3, 1.0, 0.31]} color="#7A5638" rough={0.5} radius={0.01} />
      <B size={[0.03, 0.3, 0.03]} pos={[-0.06, 1.0, 0.34]} color="#D8C48A" metal={0.8} rough={0.3} />
      <B size={[0.03, 0.3, 0.03]} pos={[0.06, 1.0, 0.34]} color="#D8C48A" metal={0.8} rough={0.3} />
    </group>
  );
}

export function Bookshelf() {
  const colors = ['#E4572E', '#2B4C7E', '#FFC21A', '#0B8F4D', '#8A63D2', '#C23B3B'];
  return (
    <group>
      <B size={[0.9, 1.9, 0.35]} pos={[0, 0.95, 0]} color="#7A5638" rough={0.6} radius={0.015} />
      {[0.35, 0.8, 1.25, 1.7].map((y, r) => (
        <group key={y}>
          <B size={[0.84, 0.03, 0.33]} pos={[0, y - 0.2, 0.01]} color="#5A3E28" rough={0.6} />
          {Array.from({ length: 7 }, (_, i) => (
            <B key={i} size={[0.07, 0.28 + ((i + r) % 3) * 0.04, 0.22]} pos={[-0.32 + i * 0.105, y - 0.02, 0.02]} color={colors[(i + r) % colors.length]} rough={0.8} radius={0.005} />
          ))}
        </group>
      ))}
    </group>
  );
}

export function Cooker() {
  return (
    <group>
      <B size={[0.6, 0.85, 0.6]} pos={[0, 0.425, 0]} color="#E8ECEE" rough={0.3} metal={0.2} radius={0.02} />
      <B size={[0.52, 0.04, 0.52]} pos={[0, 0.87, 0]} color="#1B1F24" rough={0.3} radius={0.01} />
      {[[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]].map(([x, z], i) => <Cyl key={i} r={0.07} h={0.02} pos={[x, 0.9, z]} color="#3A3F44" metal={0.6} seg={14} />)}
      <B size={[0.46, 0.3, 0.02]} pos={[0, 0.4, 0.31]} color="#2B2F32" rough={0.2} />
      <B size={[0.42, 0.02, 0.04]} pos={[0, 0.6, 0.33]} color="#B0B6BA" metal={0.7} rough={0.3} />
      {[-0.18, -0.06, 0.06, 0.18].map((x) => <Cyl key={x} r={0.02} h={0.03} pos={[x, 0.76, 0.31]} rot={[Math.PI / 2, 0, 0]} color="#B0B6BA" metal={0.7} seg={10} />)}
      <Cyl r={0.17} h={0.5} pos={[0.45, 0.25, -0.1]} color="#C93A2B" rough={0.4} />
      <Cyl r={0.06} h={0.06} pos={[0.45, 0.53, -0.1]} color="#B0B6BA" metal={0.7} />
    </group>
  );
}

export function Cabinet() {
  return (
    <group>
      <B size={[1.8, 0.82, 0.6]} pos={[0, 0.41, 0]} color="#F4F1EA" rough={0.45} radius={0.015} />
      <B size={[1.84, 0.05, 0.64]} pos={[0, 0.845, 0]} color="#3B3F44" rough={0.2} metal={0.1} radius={0.01} />
      {[-0.6, 0, 0.6].map((x) => <B key={x} size={[0.56, 0.7, 0.02]} pos={[x, 0.4, 0.31]} color="#E7E1D4" rough={0.5} radius={0.01} />)}
      {[-0.6, 0, 0.6].map((x) => <B key={`h${x}`} size={[0.1, 0.02, 0.03]} pos={[x, 0.7, 0.34]} color="#C9CED1" metal={0.8} rough={0.2} />)}
      <Cyl r={0.1} h={0.2} pos={[-0.6, 0.97, 0]} color="#1F4E47" rough={0.5} />
    </group>
  );
}

export function Toilet() {
  return (
    <group>
      <B size={[0.4, 0.4, 0.2]} pos={[0, 0.55, -0.22]} color="#F7F7F5" rough={0.2} radius={0.04} />
      <Cyl r={0.04} h={0.03} pos={[0, 0.77, -0.22]} color="#C9CED1" metal={0.8} seg={10} />
      <B size={[0.34, 0.2, 0.42]} pos={[0, 0.3, 0.0]} color="#F7F7F5" rough={0.2} radius={0.08} />
      <B size={[0.38, 0.05, 0.48]} pos={[0, 0.43, 0.04]} color="#EDEDED" rough={0.3} radius={0.05} />
      <B size={[0.2, 0.18, 0.2]} pos={[0, 0.1, -0.08]} color="#F7F7F5" rough={0.2} radius={0.05} />
    </group>
  );
}

export function Desk() {
  return (
    <group>
      <B size={[1.2, 0.05, 0.6]} pos={[0, 0.74, 0]} color="#8B5E3C" rough={0.5} radius={0.012} />
      {[-0.55, 0.55].map((x) => <B key={x} size={[0.05, 0.72, 0.5]} pos={[x, 0.36, 0]} color="#6B4A32" rough={0.6} radius={0.01} />)}
      <B size={[0.4, 0.015, 0.28]} pos={[0, 0.78, 0.08]} color="#C9CED1" metal={0.7} rough={0.3} />
      <B size={[0.4, 0.26, 0.012]} pos={[0, 0.92, -0.06]} color="#C9CED1" metal={0.7} rough={0.3} rot={[-0.2, 0, 0]} />
      <mesh position={[0, 0.92, -0.052]} rotation={[-0.2, 0, 0]}><planeGeometry args={[0.36, 0.22]} /><Mat color="#102B3F" emissive="#3B9AD6" emissiveIntensity={0.7} /></mesh>
      <B size={[0.45, 0.04, 0.45]} pos={[0, 0.5, 0.55]} color="#1B1F24" rough={0.7} radius={0.04} />
      <B size={[0.45, 0.4, 0.05]} pos={[0, 0.72, 0.78]} color="#1B1F24" rough={0.7} radius={0.04} />
      <Cyl r={0.025} h={0.3} pos={[0, 0.32, 0.55]} color="#555" metal={0.6} seg={8} />
    </group>
  );
}

export function GamingSetup() {
  return (
    <group>
      <B size={[1.2, 0.05, 0.6]} pos={[0, 0.74, 0]} color="#16181C" rough={0.3} radius={0.012} />
      {[-0.55, 0.55].map((x) => <B key={x} size={[0.05, 0.72, 0.5]} pos={[x, 0.36, 0]} color="#16181C" rough={0.4} radius={0.01} />)}
      <B size={[0.85, 0.48, 0.03]} pos={[0, 1.04, -0.12]} color="#0C0C10" rough={0.2} radius={0.01} />
      <mesh position={[0, 1.04, -0.1]}><planeGeometry args={[0.8, 0.43]} /><Mat color="#1B0F3A" emissive="#8A4DFF" emissiveIntensity={0.9} /></mesh>
      <B size={[0.3, 0.06, 0.24]} pos={[-0.35, 0.8, 0.12]} color="#EDEDED" rough={0.3} radius={0.02} />
      <B size={[0.4, 0.015, 0.14]} pos={[0.1, 0.78, 0.18]} color="#111" rough={0.4} />
      <B size={[1.1, 0.012, 0.02]} pos={[0, 0.72, 0.29]} color="#19C3A6" emissive="#19C3A6" emissiveIntensity={1.4} />
    </group>
  );
}

export function Piano() {
  return (
    <group>
      <B size={[1.4, 0.06, 0.45]} pos={[0, 0.8, 0]} color="#16181C" rough={0.3} radius={0.02} />
      <B size={[1.3, 0.02, 0.2]} pos={[0, 0.845, 0.08]} color="#F7F7F5" rough={0.3} />
      {Array.from({ length: 12 }, (_, i) => <B key={i} size={[0.05, 0.02, 0.12]} pos={[-0.55 + i * 0.1 + (i % 7 > 2 ? 0.05 : 0), 0.86, 0.04]} color="#111" rough={0.4} />)}
      <B size={[1.4, 0.08, 0.15]} pos={[0, 0.88, -0.14]} color="#16181C" rough={0.3} radius={0.02} />
      {[[-0.6, 0], [0.6, 0]].map(([x], i) => (
        <group key={i}>
          <B size={[0.05, 0.78, 0.05]} pos={[x, 0.39, 0.1]} color="#555B61" metal={0.7} rough={0.3} />
          <B size={[0.05, 0.78, 0.05]} pos={[x, 0.39, -0.1]} color="#555B61" metal={0.7} rough={0.3} />
        </group>
      ))}
    </group>
  );
}

export function Lamp() {
  return (
    <group>
      <Cyl r={0.14} h={0.03} pos={[0, 0.015, 0]} color="#2B2F32" metal={0.5} />
      <Cyl r={0.015} h={1.35} pos={[0, 0.7, 0]} color="#D8C48A" metal={0.8} rough={0.3} seg={8} />
      <Cyl r={0.18} r2={0.12} h={0.28} pos={[0, 1.5, 0]} color="#FFF3D6" emissive="#FFD27A" emissiveIntensity={0.9} rough={0.9} />
    </group>
  );
}

export function Dispenser() {
  return (
    <group>
      <B size={[0.32, 1.0, 0.32]} pos={[0, 0.5, 0]} color="#F4F4F2" rough={0.3} radius={0.03} />
      <Cyl r={0.13} h={0.3} pos={[0, 1.15, 0]} color="#8FD3F4" opacity={0.6} rough={0.1} />
      <B size={[0.06, 0.04, 0.05]} pos={[-0.07, 0.78, 0.17]} color="#2D7DD2" />
      <B size={[0.06, 0.04, 0.05]} pos={[0.07, 0.78, 0.17]} color="#E4572E" />
      <B size={[0.22, 0.02, 0.1]} pos={[0, 0.5, 0.14]} color="#B0B6BA" metal={0.7} rough={0.3} />
    </group>
  );
}

