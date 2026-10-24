import { B, Cyl, Mat } from './primitives';

/** A plain plastic chair pushed up to a desk (shared by the sit-down computer desks). */
function DeskChair({ color = '#2B3138' }: { color?: string }) {
  return (
    <group>
      <B size={[0.42, 0.04, 0.42]} pos={[0, 0.48, 0.55]} color={color} rough={0.7} radius={0.04} />
      <B size={[0.42, 0.38, 0.04]} pos={[0, 0.7, 0.76]} color={color} rough={0.7} radius={0.04} />
      <Cyl r={0.025} h={0.3} pos={[0, 0.3, 0.55]} color="#555" metal={0.6} seg={8} />
    </group>
  );
}

/** An open laptop (base, keyboard strip, tilted lit screen). */
function Laptop({ pos, color = '#C9CED1', glow = '#3B9AD6' }: { pos: [number, number, number]; color?: string; glow?: string }) {
  return (
    <group position={pos}>
      <B size={[0.36, 0.015, 0.25]} pos={[0, 0, 0.06]} color={color} metal={0.7} rough={0.3} />
      <B size={[0.3, 0.004, 0.1]} pos={[0, 0.01, 0.1]} color="#2A2F36" rough={0.8} />
      <B size={[0.36, 0.24, 0.012]} pos={[0, 0.13, -0.06]} color={color} metal={0.7} rough={0.3} rot={[-0.2, 0, 0]} />
      <mesh position={[0, 0.13, -0.052]} rotation={[-0.2, 0, 0]}><planeGeometry args={[0.33, 0.2]} /><Mat color="#102B3F" emissive={glow} emissiveIntensity={0.7} /></mesh>
    </group>
  );
}

/** Cheap student desk: thin metal frame, one laptop, a bright plastic chair. */
export function StudentDesk() {
  return (
    <group>
      <B size={[1.0, 0.04, 0.55]} pos={[0, 0.72, 0]} color="#D9C7A0" rough={0.7} radius={0.01} />
      {[-0.46, 0.46].flatMap((x) => [-0.22, 0.22].map((z) => <B key={`${x}${z}`} size={[0.04, 0.7, 0.04]} pos={[x, 0.35, z]} color="#7C858C" metal={0.6} rough={0.4} />))}
      <Laptop pos={[-0.1, 0.745, 0]} color="#B7BDC2" />
      <B size={[0.1, 0.05, 0.1]} pos={[0.33, 0.765, -0.1]} color="#E85D75" rough={0.6} radius={0.02} />
      <DeskChair color="#2E86C1" />
    </group>
  );
}

/** Height-adjustable standing desk: two tall legs, a long top, laptop on a riser. No chair: you stand. */
export function StandingDesk() {
  return (
    <group>
      <B size={[1.3, 0.04, 0.65]} pos={[0, 1.02, 0]} color="#E8E4DC" rough={0.4} radius={0.012} />
      {[-0.55, 0.55].map((x) => <B key={x} size={[0.06, 1.0, 0.5]} pos={[x, 0.5, 0]} color="#1F2428" metal={0.5} rough={0.4} />)}
      <B size={[1.1, 0.04, 0.05]} pos={[0, 0.2, 0]} color="#1F2428" metal={0.5} rough={0.4} />
      <B size={[0.3, 0.08, 0.2]} pos={[0.1, 1.08, -0.05]} color="#1F2428" rough={0.5} radius={0.01} />
      <Laptop pos={[0.1, 1.12, -0.05]} />
      <B size={[0.18, 0.012, 0.07]} pos={[-0.35, 1.05, 0.12]} color="#2A2F36" rough={0.6} />
      <B size={[0.07, 0.02, 0.1]} pos={[-0.12, 1.05, 0.12]} color="#2A2F36" rough={0.5} radius={0.008} />
    </group>
  );
}

/** Dual-monitor workstation: dark desk, two lit screens, tower with a glowing strip, keyboard, mouse, desk lamp, gaming-style chair. */
export function Workstation() {
  return (
    <group>
      <B size={[1.4, 0.05, 0.65]} pos={[0, 0.74, 0]} color="#1B1E22" rough={0.35} radius={0.012} />
      {[-0.64, 0.64].map((x) => <B key={x} size={[0.05, 0.72, 0.55]} pos={[x, 0.36, 0]} color="#101215" rough={0.5} radius={0.01} />)}
      {[-0.32, 0.32].map((x, i) => (
        <group key={x}>
          <B size={[0.58, 0.34, 0.025]} pos={[x, 1.03, -0.15]} color="#0C0C10" rough={0.2} radius={0.01} rot={[0, i ? -0.12 : 0.12, 0]} />
          <mesh position={[x, 1.03, -0.135]} rotation={[0, i ? -0.12 : 0.12, 0]}><planeGeometry args={[0.54, 0.3]} /><Mat color="#0E2A3A" emissive={i ? '#2BD4A0' : '#3B9AD6'} emissiveIntensity={0.85} /></mesh>
          <B size={[0.04, 0.2, 0.04]} pos={[x, 0.87, -0.15]} color="#2A2F36" metal={0.6} rough={0.4} />
        </group>
      ))}
      <B size={[0.5, 0.014, 0.16]} pos={[0, 0.775, 0.14]} color="#16181C" rough={0.5} />
      <B size={[0.07, 0.02, 0.11]} pos={[0.38, 0.78, 0.14]} color="#16181C" rough={0.4} radius={0.01} />
      <B size={[0.22, 0.52, 0.5]} pos={[-0.56, 0.26, 0.05]} color="#15171B" rough={0.4} radius={0.02} />
      <mesh position={[-0.449, 0.3, 0.05]}><boxGeometry args={[0.004, 0.4, 0.04]} /><Mat color="#3A1B5A" emissive="#B04DFF" emissiveIntensity={1.1} /></mesh>
      <Cyl r={0.05} r2={0.07} h={0.02} pos={[0.58, 0.775, -0.1]} color="#1F2428" rough={0.5} seg={12} />
      <B size={[0.02, 0.2, 0.02]} pos={[0.58, 0.88, -0.1]} color="#8E979C" metal={0.7} rough={0.3} />
      <DeskChair color="#16181C" />
      <B size={[0.04, 0.34, 0.03]} pos={[-0.2, 0.74, 0.76]} color="#C0392B" rough={0.7} />
      <B size={[0.04, 0.34, 0.03]} pos={[0.2, 0.74, 0.76]} color="#C0392B" rough={0.7} />
    </group>
  );
}

/** Floor-standing printer and scanner unit with a paper tray and a small status light. */
export function PrinterStation() {
  return (
    <group>
      <B size={[0.6, 0.5, 0.45]} pos={[0, 0.25, 0]} color="#D7DCE0" rough={0.55} radius={0.02} />
      <B size={[0.62, 0.34, 0.5]} pos={[0, 0.67, 0]} color="#EEF1F3" rough={0.45} radius={0.03} />
      <B size={[0.5, 0.02, 0.3]} pos={[0, 0.86, 0.02]} color="#9AA3AB" metal={0.4} rough={0.3} />
      <B size={[0.44, 0.012, 0.22]} pos={[0, 0.63, 0.3]} color="#FFFFFF" rough={0.9} />
      <B size={[0.16, 0.04, 0.02]} pos={[0.2, 0.74, 0.255]} color="#1B1F24" rough={0.4} />
      <mesh position={[0.27, 0.74, 0.256]}><boxGeometry args={[0.025, 0.025, 0.005]} /><Mat color="#0A3A22" emissive="#32E27A" emissiveIntensity={1.2} /></mesh>
    </group>
  );
}
