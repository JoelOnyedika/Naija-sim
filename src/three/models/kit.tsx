import type { ComponentType } from 'react';
import { B, Cyl, Mat, Sph } from './primitives';

/** Models for the venue prop kit (data/venueKit.ts). Origin = floor centre, +z = front. Bolder and brighter than home furniture. */
type P = { pos: [number, number, number] };
const Glow = ({ pos, size, color, intensity = 1 }: P & { size: [number, number]; color: string; intensity?: number }) => (
  <mesh position={pos}><planeGeometry args={size} /><Mat color={color} emissive={color} emissiveIntensity={intensity} /></mesh>
);
/** A service counter: body, top, optional glass screen and a row of small items. */
const Counter = ({ w = 3, d = 0.9, body = '#7A4A26', top = '#D9C7A0', accent = '#E9B949', glass = false }: { w?: number; d?: number; body?: string; top?: string; accent?: string; glass?: boolean }) => (
  <group>
    <B size={[w, 1.0, d]} pos={[0, 0.5, 0]} color={body} rough={0.6} radius={0.03} />
    <B size={[w + 0.1, 0.08, d + 0.12]} pos={[0, 1.04, 0.02]} color={top} rough={0.35} radius={0.02} />
    <B size={[w, 0.06, 0.04]} pos={[0, 0.7, d / 2 + 0.01]} color={accent} rough={0.4} />
    {glass && <B size={[w - 0.2, 0.5, 0.03]} pos={[0, 1.34, -0.1]} color="#CFE8F0" rough={0.1} />}
  </group>
);
const Pots = ({ y, xs, colors }: { y: number; xs: number[]; colors: string[] }) => <>{xs.map((x, i) => <Cyl key={x} r={0.17} r2={0.15} h={0.22} pos={[x, y + 0.11, -0.05]} color={colors[i % colors.length]} rough={0.5} seg={12} />)}</>;
const Seat = ({ x, color }: { x: number; color: string }) => (
  <group position={[x, 0, 0]}>
    <B size={[0.5, 0.1, 0.5]} pos={[0, 0.46, 0]} color={color} rough={0.7} radius={0.05} />
    <B size={[0.5, 0.45, 0.08]} pos={[0, 0.72, -0.22]} color={color} rough={0.7} radius={0.05} />
    <B size={[0.05, 0.4, 0.05]} pos={[-0.2, 0.2, 0.15]} color="#2A2D31" metal={0.5} rough={0.4} /><B size={[0.05, 0.4, 0.05]} pos={[0.2, 0.2, 0.15]} color="#2A2D31" metal={0.5} rough={0.4} />
  </group>
);
const Palm = () => (
  <group>
    <Cyl r={0.12} r2={0.08} h={2.6} pos={[0, 1.3, 0]} color="#7A5A3C" rough={0.9} seg={10} />
    {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} size={[1.5, 0.05, 0.34]} pos={[Math.cos((i * Math.PI) / 3) * 0.6, 2.75, Math.sin((i * Math.PI) / 3) * 0.6]} rot={[0.35 * Math.sin((i * Math.PI) / 3), -(i * Math.PI) / 3, -0.35 * Math.cos((i * Math.PI) / 3)]} color={i % 2 ? '#2E8B4A' : '#3FA35A'} rough={0.8} radius={0.01} />)}
  </group>
);

const MODELS: Record<string, ComponentType> = {
  v_wait_chairs: () => <group>{[-0.6, 0, 0.6].map((x) => <Seat key={x} x={x} color="#2E6FB5" />)}<B size={[1.85, 0.05, 0.06]} pos={[0, 0.3, -0.18]} color="#2A2D31" metal={0.5} rough={0.4} /></group>,
  v_palm: Palm,
  v_tree: () => (
    <group>
      <Cyl r={0.2} r2={0.14} h={1.8} pos={[0, 0.9, 0]} color="#6E4B2E" rough={0.9} seg={10} />
      <Sph r={1.0} pos={[0, 2.5, 0]} scale={[1, 0.85, 1]} color="#2F8F4E" rough={0.9} /><Sph r={0.7} pos={[0.6, 2.2, 0.3]} color="#3FA35A" rough={0.9} /><Sph r={0.65} pos={[-0.55, 2.3, -0.25]} color="#2A7F45" rough={0.9} />
    </group>
  ),
  v_bench: () => (
    <group>
      {[0, 1, 2, 3].map((i) => <B key={i} size={[1.8, 0.04, 0.13]} pos={[0, 0.45, -0.2 + i * 0.14]} color="#A8743F" rough={0.7} radius={0.01} />)}
      {[0, 1, 2].map((i) => <B key={i} size={[1.8, 0.05, 0.1]} pos={[0, 0.65 + i * 0.13, -0.27]} rot={[-0.15, 0, 0]} color="#A8743F" rough={0.7} radius={0.01} />)}
      {[-0.8, 0.8].map((x) => <B key={x} size={[0.06, 0.45, 0.55]} pos={[x, 0.22, 0]} color="#2A2D31" metal={0.6} rough={0.4} />)}
    </group>
  ),
  v_food_counter: () => (
    <group>
      <Counter w={3} body="#2F6B4A" top="#E9DFC4" accent="#E9B949" />
      <Pots y={1.08} xs={[-1.0, -0.4, 0.2, 0.8]} colors={['#B4532A', '#6A3F20', '#C9A66B']} />
      <B size={[0.5, 0.05, 0.4]} pos={[1.25, 1.1, 0.05]} color="#F4F1EA" rough={0.6} />
      <B size={[3.0, 0.08, 0.1]} pos={[0, 1.95, -0.3]} color="#7A4A26" rough={0.7} />
      {[-1.2, 0, 1.2].map((x) => <B key={x} size={[0.8, 0.5, 0.04]} pos={[x, 1.65, -0.38]} color={x ? '#E9B949' : '#D9462F'} rough={0.8} />)}
    </group>
  ),
  v_buka_table: () => (
    <group>
      <B size={[2.4, 0.07, 0.8]} pos={[0, 0.78, 0]} color="#8E5C2E" rough={0.6} radius={0.02} />
      {[-1.0, 1.0].map((x) => <B key={x} size={[0.08, 0.75, 0.7]} pos={[x, 0.38, 0]} color="#5A3A20" rough={0.7} />)}
      {[-0.7, 0.7].map((z) => <B key={z} size={[2.2, 0.06, 0.28]} pos={[0, 0.45, z]} color="#B07A44" rough={0.7} radius={0.015} />)}
      <Cyl r={0.2} h={0.1} pos={[-0.5, 0.86, 0]} color="#F4F1EA" rough={0.4} seg={16} /><Cyl r={0.2} h={0.1} pos={[0.5, 0.86, 0.05]} color="#F4F1EA" rough={0.4} seg={16} />
    </group>
  ),
  v_grill: () => (
    <group>
      <B size={[1.4, 0.7, 0.7]} pos={[0, 0.5, 0]} color="#2A2D31" rough={0.5} metal={0.4} radius={0.03} />
      <B size={[1.3, 0.04, 0.6]} pos={[0, 0.86, 0]} color="#3A3D42" metal={0.6} rough={0.4} />
      <Glow pos={[0, 0.82, 0]} size={[1.2, 0.5]} color="#FF7A2B" intensity={0.9} />
      {[-0.5, -0.17, 0.17, 0.5].map((x) => <B key={x} size={[0.04, 0.04, 0.5]} pos={[x, 0.9, 0]} color="#8B6B4A" rough={0.6} />)}
      <Cyl r={0.12} h={0.8} pos={[0.5, 1.2, -0.25]} color="#5A5F66" metal={0.5} rough={0.5} seg={10} />
    </group>
  ),
  v_drinks_fridge: () => (
    <group>
      <B size={[0.9, 1.9, 0.7]} pos={[0, 0.95, 0]} color="#F4F1EA" rough={0.4} radius={0.03} />
      <B size={[0.76, 1.55, 0.03]} pos={[0, 1.0, 0.36]} color="#BFE3EE" rough={0.1} />
      {[0.5, 0.95, 1.4].map((y) => <B key={y} size={[0.7, 0.2, 0.05]} pos={[0, y, 0.34]} color={y > 1 ? '#E4572E' : y > 0.7 ? '#3FA35A' : '#E9B949'} rough={0.7} />)}
      <B size={[0.9, 0.18, 0.04]} pos={[0, 1.85, 0.36]} color="#D9462F" rough={0.5} />
    </group>
  ),
  v_teller: () => (
    <group>
      <Counter w={3.6} body="#1F3D6B" top="#E8ECEF" accent="#B8892F" glass />
      {[-1.1, 0, 1.1].map((x) => <B key={x} size={[0.4, 0.28, 0.04]} pos={[x, 1.25, -0.2]} color="#102B3F" rough={0.3} />)}
      {[-1.1, 0, 1.1].map((x) => <Glow key={x} pos={[x, 1.25, -0.175]} size={[0.34, 0.22]} color="#3B9AD6" intensity={0.7} />)}
    </group>
  ),
  v_pillar: () => (
    <group>
      <B size={[0.8, 2.8, 0.8]} pos={[0, 1.4, 0]} color="#1F3D6B" rough={0.4} radius={0.04} />
      <B size={[0.86, 0.12, 0.86]} pos={[0, 2.78, 0]} color="#B8892F" metal={0.5} rough={0.3} /><B size={[0.86, 0.12, 0.86]} pos={[0, 0.06, 0]} color="#B8892F" metal={0.5} rough={0.3} />
      <Glow pos={[0, 1.8, 0.41]} size={[0.5, 0.5]} color="#FFFFFF" intensity={0.5} />
    </group>
  ),
  v_shop_rack: () => (
    <group>
      <B size={[1.8, 0.05, 0.6]} pos={[0, 0.05, 0]} color="#2A2D31" metal={0.5} rough={0.4} />
      {[-0.85, 0.85].map((x) => <B key={x} size={[0.05, 1.5, 0.05]} pos={[x, 0.8, 0]} color="#C9CED1" metal={0.7} rough={0.3} />)}
      <B size={[1.8, 0.04, 0.04]} pos={[0, 1.5, 0]} color="#C9CED1" metal={0.7} rough={0.3} />
      {['#C4552D', '#2E86C1', '#E9B949', '#8A3F6A', '#1F4E47', '#F4F1EA', '#2B2F32', '#3FA35A'].map((c, i) => <B key={c} size={[0.16, 0.9, 0.34]} pos={[-0.75 + i * 0.21, 0.98, 0]} color={c} rough={0.9} radius={0.04} />)}
    </group>
  ),
  v_arcade: () => (
    <group>
      {[-0.45, 0.45].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <B size={[0.8, 1.9, 0.7]} pos={[0, 0.95, 0]} color={i ? '#8A3FD0' : '#2E86C1'} rough={0.4} radius={0.04} />
          <B size={[0.62, 0.45, 0.04]} pos={[0, 1.3, 0.34]} color="#0B0D12" rough={0.2} /><Glow pos={[0, 1.3, 0.365]} size={[0.56, 0.4]} color={i ? '#FF4DA6' : '#3BE3A0'} intensity={0.9} />
          <B size={[0.7, 0.1, 0.4]} pos={[0, 0.95, 0.3]} color="#1B1F24" rough={0.5} />
          <Sph r={0.05} pos={[0, 1.02, 0.34]} color="#E4572E" /><Sph r={0.03} pos={[0.2, 1.0, 0.32]} color="#E9B949" />
        </group>
      ))}
    </group>
  ),
  v_fountain: () => (
    <group>
      <Cyl r={1.3} h={0.3} pos={[0, 0.15, 0]} color="#C9C6BE" rough={0.6} seg={32} />
      <Cyl r={1.15} h={0.04} pos={[0, 0.3, 0]} color="#5AB8E6" rough={0.1} metal={0.2} seg={32} />
      <Cyl r={0.25} r2={0.2} h={0.9} pos={[0, 0.7, 0]} color="#B7B2A6" rough={0.6} seg={14} />
      <Cyl r={0.55} r2={0.4} h={0.12} pos={[0, 1.1, 0]} color="#C9C6BE" rough={0.6} seg={20} />
      <Cyl r={0.04} h={0.6} pos={[0, 1.4, 0]} color="#BFE3F4" rough={0.1} seg={8} />
    </group>
  ),
  v_cinema_seats: () => <group>{[-1.2, -0.4, 0.4, 1.2].map((x) => <Seat key={x} x={x} color="#9B1C2E" />)}</group>,
  v_popcorn: () => (
    <group>
      <B size={[1.2, 0.9, 0.7]} pos={[0, 0.45, 0]} color="#D9462F" rough={0.5} radius={0.03} />
      <B size={[1.2, 0.04, 0.7]} pos={[0, 0.92, 0]} color="#F4F1EA" rough={0.4} />
      <B size={[1.0, 0.9, 0.55]} pos={[0, 1.4, -0.05]} color="#FFF4D2" rough={0.2} />
      {[0, 1, 2, 3, 4].map((i) => <Sph key={i} r={0.1} pos={[-0.3 + (i % 3) * 0.3, 1.4 + (i > 2 ? 0.2 : -0.1), 0.05]} color="#FFF1C2" rough={0.9} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} size={[0.2, 0.06, 0.8]} pos={[-0.5 + i * 0.2, 1.95, 0]} rot={[0.1, 0, 0]} color={i % 2 ? '#F4F1EA' : '#D9462F'} rough={0.9} />)}
    </group>
  ),
  v_cinema_screen: () => (
    <group>
      <B size={[6.0, 3.2, 0.2]} pos={[0, 1.9, 0]} color="#101216" rough={0.4} radius={0.05} />
      <Glow pos={[0, 1.9, 0.11]} size={[5.6, 2.9]} color="#5C7CFA" intensity={0.55} />
      <B size={[6.4, 0.18, 0.4]} pos={[0, 3.55, 0]} color="#9B1C2E" rough={0.8} />
    </group>
  ),
  v_stage: () => (
    <group>
      <B size={[5.0, 0.9, 2.6]} pos={[0, 0.45, 0]} color="#2A2D31" rough={0.5} radius={0.03} />
      <B size={[5.0, 0.1, 2.6]} pos={[0, 0.95, 0]} color="#7A4A26" rough={0.5} radius={0.02} />
      <B size={[5.0, 0.06, 0.06]} pos={[0, 0.5, 1.3]} color="#FF3FA4" rough={0.4} />
      <group position={[-1.3, 0.95, -0.3]}><Cyl r={0.35} h={0.45} pos={[0, 0.3, 0]} color="#C4552D" rough={0.4} seg={16} /><Cyl r={0.2} h={0.25} pos={[0.55, 0.4, 0.15]} color="#E9B949" rough={0.4} seg={14} /><Cyl r={0.22} h={0.1} pos={[-0.55, 0.9, 0.1]} color="#C9CED1" metal={0.7} rough={0.3} seg={14} /></group>
      <Cyl r={0.02} h={1.5} pos={[0.8, 1.7, 0.5]} color="#2A2D31" metal={0.5} rough={0.4} seg={6} /><Sph r={0.06} pos={[0.8, 2.5, 0.5]} color="#2A2D31" />
      <B size={[0.5, 0.8, 0.5]} pos={[1.9, 1.35, -0.8]} color="#15171B" rough={0.5} />
      <Glow pos={[0, 2.5, -1.25]} size={[4.6, 0.2]} color="#8A4DFF" intensity={1.1} />
    </group>
  ),
  v_drinks_bar: () => (
    <group>
      <Counter w={3.2} body="#15171B" top="#3A2A22" accent="#4DD0FF" />
      <B size={[3.2, 0.06, 0.4]} pos={[0, 1.5, -0.3]} color="#7A5A48" rough={0.6} /><B size={[3.2, 0.06, 0.4]} pos={[0, 1.95, -0.3]} color="#7A5A48" rough={0.6} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Cyl key={i} r={0.06} h={0.34} pos={[-1.4 + i * 0.4, i % 2 ? 1.7 : 2.15, -0.3]} color={['#3FA35A', '#E9B949', '#C4552D', '#2E86C1'][i % 4]} rough={0.2} seg={8} />)}
    </group>
  ),
  v_reception: () => (
    <group>
      <Counter w={3} body="#F1EBDD" top="#B8892F" accent="#B8892F" />
      <Cyl r={0.1} h={0.05} pos={[0.8, 1.11, 0.05]} color="#B8892F" metal={0.8} rough={0.2} seg={14} /><Sph r={0.07} pos={[0.8, 1.17, 0.05]} color="#B8892F" metal={0.8} rough={0.2} />
      <B size={[0.4, 0.28, 0.04]} pos={[-0.6, 1.25, -0.2]} color="#102B3F" rough={0.3} /><Glow pos={[-0.6, 1.25, -0.175]} size={[0.34, 0.22]} color="#3B9AD6" intensity={0.7} />
      <B size={[2.4, 0.5, 0.06]} pos={[0, 1.95, -0.4]} color="#B8892F" metal={0.4} rough={0.4} />
    </group>
  ),
  v_pool: () => (
    <group>
      <B size={[5.2, 0.12, 3.2]} pos={[0, 0.06, 0]} color="#E8E4DC" rough={0.5} radius={0.02} />
      <B size={[4.7, 0.14, 2.7]} pos={[0, 0.1, 0]} color="#1E9CD8" rough={0.1} metal={0.1} radius={0.02} />
      <Glow pos={[0, 0.19, 0]} size={[4.6, 2.6]} color="#4DD0FF" intensity={0.5} />
      {[-0.7, 0.7].map((x) => <B key={x} size={[0.04, 0.5, 0.05]} pos={[x, 0.35, 1.55]} color="#C9CED1" metal={0.8} rough={0.2} />)}
      <B size={[1.4, 0.04, 0.05]} pos={[0, 0.58, 1.55]} color="#C9CED1" metal={0.8} rough={0.2} />
    </group>
  ),
  v_lounger: () => (
    <group>
      <B size={[0.7, 0.1, 1.2]} pos={[0, 0.32, 0.2]} color="#F4F1EA" rough={0.8} radius={0.04} />
      <B size={[0.7, 0.1, 0.8]} pos={[0, 0.55, -0.55]} rot={[-0.6, 0, 0]} color="#F4F1EA" rough={0.8} radius={0.04} />
      {[[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.3], [0.3, -0.3]].map(([x, z]) => <B key={`${x}${z}`} size={[0.05, 0.28, 0.05]} pos={[x, 0.14, z]} color="#2A2D31" rough={0.5} />)}
      <B size={[0.74, 0.04, 0.3]} pos={[0, 0.39, 0.55]} color="#3FA3D6" rough={0.8} />
    </group>
  ),
  v_tennis: () => (
    <group>
      {[-1.7, 1.7].map((x) => <B key={x} size={[0.08, 1.1, 0.08]} pos={[x, 0.55, 0]} color="#2A2D31" metal={0.5} rough={0.4} />)}
      <B size={[3.4, 0.7, 0.03]} pos={[0, 0.65, 0]} color="#F4F4F4" rough={0.9} /><B size={[3.4, 0.07, 0.05]} pos={[0, 1.02, 0]} color="#FFFFFF" rough={0.8} />
      <B size={[3.6, 0.01, 0.06]} pos={[0, 0.01, 0.5]} color="#F4F4F4" rough={0.9} shadow={false} /><B size={[3.6, 0.01, 0.06]} pos={[0, 0.01, -0.5]} color="#F4F4F4" rough={0.9} shadow={false} />
    </group>
  ),
  v_pc_desk: () => (
    <group>
      <B size={[2.4, 0.06, 0.8]} pos={[0, 0.85, 0]} color="#E8E4DC" rough={0.5} radius={0.015} />
      {[-1.1, 1.1].map((x) => <B key={x} size={[0.06, 0.85, 0.7]} pos={[x, 0.42, 0]} color="#7C858C" metal={0.5} rough={0.4} />)}
      {[-0.8, 0, 0.8].map((x) => (
        <group key={x}><B size={[0.6, 0.38, 0.03]} pos={[x, 1.2, -0.15]} color="#0C0C10" rough={0.2} /><Glow pos={[x, 1.2, -0.13]} size={[0.56, 0.34]} color={x ? '#3B9AD6' : '#2BD4A0'} intensity={0.8} /><B size={[0.35, 0.02, 0.12]} pos={[x, 0.9, 0.15]} color="#2A2D31" rough={0.6} /><B size={[0.24, 0.3, 0.3]} pos={[x + 0.4, 0.55, -0.1]} color="#15171B" rough={0.5} /></group>
      ))}
    </group>
  ),
  v_gadget_stall: () => (
    <group>
      <B size={[1.8, 0.9, 0.8]} pos={[0, 0.45, 0.1]} color="#2E86C1" rough={0.5} radius={0.03} />
      <B size={[1.9, 0.06, 0.9]} pos={[0, 0.93, 0.1]} color="#E8ECEF" rough={0.4} />
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x) => <B key={x} size={[0.18, 0.3, 0.02]} pos={[x, 1.1, 0.1]} rot={[-0.3, 0, 0]} color="#0C0C10" rough={0.2} />)}
      {[-0.9, 0.9].map((x) => <B key={x} size={[0.06, 2.1, 0.06]} pos={[x, 1.05, -0.3]} color="#2A2D31" metal={0.5} rough={0.4} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} size={[0.32, 0.05, 1.1]} pos={[-0.8 + i * 0.32, 2.1, -0.05]} rot={[0.12, 0, 0]} color={i % 2 ? '#F4F1EA' : '#2E86C1'} rough={0.9} />)}
    </group>
  ),
  v_server_rack: () => (
    <group>
      <B size={[0.8, 2.0, 0.7]} pos={[0, 1.0, 0]} color="#15171B" rough={0.4} radius={0.03} />
      {[0.4, 0.7, 1.0, 1.3, 1.6].map((y, i) => <group key={y}><B size={[0.7, 0.18, 0.04]} pos={[0, y, 0.34]} color="#2A2D31" rough={0.4} /><Glow pos={[0.25, y, 0.365]} size={[0.06, 0.06]} color={i % 2 ? '#32E27A' : '#3B9AD6'} intensity={1.2} /></group>)}
    </group>
  ),
  v_jog_path: () => (
    <group>
      <B size={[4.0, 0.04, 1.4]} pos={[0, 0.02, 0]} color="#B5543A" rough={0.9} radius={0.02} shadow={false} />
      {[-1.2, 0, 1.2].map((x) => <B key={x} size={[0.6, 0.012, 0.05]} pos={[x, 0.045, 0]} color="#F4F1EA" rough={0.9} shadow={false} />)}
    </group>
  ),
  v_picnic: () => (
    <group>
      <B size={[1.8, 0.04, 1.8]} pos={[0, 0.03, 0]} color="#D9462F" rough={0.95} radius={0.01} shadow={false} />
      {[-0.45, 0.45].map((x) => <B key={x} size={[0.45, 0.045, 1.8]} pos={[x, 0.032, 0]} color="#F4F1EA" rough={0.95} shadow={false} />)}
      <Cyl r={0.2} h={0.18} pos={[0.1, 0.13, 0.1]} color="#C9A66B" rough={0.9} seg={12} />
    </group>
  ),
  v_umbrella: () => (
    <group>
      <Cyl r={0.04} h={2.1} pos={[0, 1.05, 0]} color="#E8E4DC" rough={0.5} seg={8} />
      {Array.from({ length: 8 }).map((_, i) => <B key={i} size={[0.9, 0.04, 0.45]} pos={[Math.cos((i * Math.PI) / 4) * 0.5, 2.05 - 0.12, Math.sin((i * Math.PI) / 4) * 0.5]} rot={[0.3 * Math.sin((i * Math.PI) / 4), -(i * Math.PI) / 4, -0.3 * Math.cos((i * Math.PI) / 4)]} color={i % 2 ? '#F4F1EA' : '#E4572E'} rough={0.9} radius={0.01} />)}
      <B size={[0.9, 0.08, 0.5]} pos={[0.1, 0.07, 0.9]} color="#3FA3D6" rough={0.8} />
    </group>
  ),
  v_boat: () => (
    <group>
      <B size={[3.2, 0.5, 1.2]} pos={[0, 0.35, 0]} color="#1F5F8B" rough={0.5} radius={0.2} />
      <B size={[3.0, 0.12, 1.0]} pos={[0, 0.63, 0]} color="#E8E4DC" rough={0.6} radius={0.08} />
      <B size={[0.9, 0.7, 0.7]} pos={[-0.7, 0.95, 0]} color="#F4F1EA" rough={0.5} radius={0.05} />
      <B size={[1.6, 0.05, 0.2]} pos={[0.5, 0.78, 0]} color="#A8743F" rough={0.7} />
      <Cyl r={0.03} h={1.8} pos={[0.9, 1.5, 0]} color="#A8743F" rough={0.7} seg={6} />
      <B size={[0.7, 0.9, 0.02]} pos={[1.25, 1.55, 0]} color="#F4F1EA" rough={0.9} />
    </group>
  ),
  v_volleyball: () => (
    <group>
      {[-1.7, 1.7].map((x) => <Cyl key={x} r={0.05} h={2.4} pos={[x, 1.2, 0]} color="#A8743F" rough={0.8} seg={8} />)}
      <B size={[3.4, 0.8, 0.03]} pos={[0, 1.9, 0]} color="#F4F4F4" rough={0.9} /><B size={[3.4, 0.07, 0.05]} pos={[0, 2.3, 0]} color="#E4572E" rough={0.8} />
      <Sph r={0.14} pos={[0.8, 0.14, 0.6]} color="#FFF4D2" rough={0.7} />
    </group>
  ),
  v_gov_desk: () => (
    <group>
      <Counter w={3.4} body="#3A4750" top="#D8D4C8" accent="#1F8A4D" glass />
      <B size={[0.5, 0.35, 0.04]} pos={[-1.2, 1.28, -0.2]} color="#102B3F" rough={0.3} /><Glow pos={[-1.2, 1.28, -0.175]} size={[0.44, 0.28]} color="#3B9AD6" intensity={0.6} />
      <B size={[0.35, 0.08, 0.28]} pos={[0.8, 1.13, 0.05]} color="#F4F1EA" rough={0.9} /><B size={[0.35, 0.08, 0.28]} pos={[0.8, 1.2, 0.05]} color="#E9DFC4" rough={0.9} />
    </group>
  ),
  v_flag: () => (
    <group>
      <Cyl r={0.25} r2={0.2} h={0.12} pos={[0, 0.06, 0]} color="#7C858C" metal={0.5} rough={0.4} seg={14} />
      <Cyl r={0.03} h={3.5} pos={[0, 1.8, 0]} color="#C9CED1" metal={0.7} rough={0.3} seg={8} />
      <B size={[0.9, 0.6, 0.02]} pos={[0.48, 3.25, 0]} color="#FFFFFF" rough={0.9} /><B size={[0.3, 0.6, 0.025]} pos={[0.18, 3.25, 0]} color="#1F8A4D" rough={0.9} /><B size={[0.3, 0.6, 0.025]} pos={[0.78, 3.25, 0]} color="#1F8A4D" rough={0.9} />
    </group>
  ),
  v_exec_desk: () => (
    <group>
      <B size={[2.2, 0.08, 1.0]} pos={[0, 0.8, 0]} color="#3A2A22" rough={0.3} radius={0.02} />
      <B size={[0.5, 0.72, 0.9]} pos={[-0.8, 0.38, 0]} color="#2A1D17" rough={0.4} /><B size={[0.5, 0.72, 0.9]} pos={[0.8, 0.38, 0]} color="#2A1D17" rough={0.4} />
      <B size={[0.55, 0.36, 0.03]} pos={[0.2, 1.1, -0.2]} color="#0C0C10" rough={0.2} /><Glow pos={[0.2, 1.1, -0.18]} size={[0.5, 0.3]} color="#3B9AD6" intensity={0.7} />
      <B size={[0.3, 0.12, 0.3]} pos={[-0.5, 0.9, 0.1]} color="#B8892F" metal={0.6} rough={0.3} />
      <B size={[0.6, 0.1, 0.6]} pos={[0, 0.5, 1.0]} color="#15171B" rough={0.6} radius={0.05} /><B size={[0.55, 0.6, 0.08]} pos={[0, 0.85, 1.28]} color="#15171B" rough={0.6} radius={0.05} />
    </group>
  ),
  v_coffee_bar: () => (
    <group>
      <Counter w={2.4} body="#3A2A22" top="#E8E4DC" accent="#C4552D" />
      <B size={[0.5, 0.5, 0.4]} pos={[-0.6, 1.33, -0.05]} color="#2A2D31" metal={0.5} rough={0.3} radius={0.04} /><Glow pos={[-0.6, 1.35, 0.16]} size={[0.2, 0.1]} color="#32E27A" intensity={1} />
      {[0, 1, 2].map((i) => <Cyl key={i} r={0.07} r2={0.055} h={0.12} pos={[0.1 + i * 0.22, 1.14, 0.05]} color="#F4F1EA" rough={0.4} seg={10} />)}
    </group>
  ),
  v_city_window: () => (
    <group>
      <B size={[4.0, 2.8, 0.18]} pos={[0, 1.4, 0]} color="#1B2330" rough={0.3} radius={0.03} />
      <Glow pos={[0, 1.6, 0.1]} size={[3.7, 2.2]} color="#1D3557" intensity={0.5} />
      {[[-1.4, 0.7], [-0.9, 1.1], [-0.3, 0.9], [0.3, 1.5], [0.9, 1.0], [1.4, 1.3]].map(([x, h], i) => <group key={i}><B size={[0.4, h, 0.02]} pos={[x, 0.5 + h / 2, 0.11]} color="#0F1B2D" rough={0.4} /><Glow pos={[x, 0.5 + h * 0.6, 0.125]} size={[0.18, 0.18]} color="#F4D58A" intensity={0.9} /></group>)}
      <Glow pos={[1.4, 2.4, 0.12]} size={[0.25, 0.25]} color="#FFF4D2" intensity={1} />
    </group>
  ),
  v_checkin: () => (
    <group>
      <Counter w={3.4} body="#1F5F8B" top="#F4F1EA" accent="#E9B949" />
      <B size={[3.2, 0.4, 0.06]} pos={[0, 2.0, -0.35]} color="#1F5F8B" rough={0.5} /><Glow pos={[0, 2.0, -0.31]} size={[3.0, 0.26]} color="#F4D58A" intensity={0.55} />
      <B size={[0.6, 0.06, 0.5]} pos={[1.2, 1.1, 0.0]} color="#2A2D31" rough={0.5} />
      {[-1.2, 0.2].map((x) => <B key={x} size={[0.5, 0.3, 0.04]} pos={[x, 1.28, -0.2]} color="#102B3F" rough={0.3} />)}
    </group>
  ),
  v_board: () => (
    <group>
      <B size={[2.4, 2.0, 0.2]} pos={[0, 1.8, 0]} color="#0C0F14" rough={0.3} radius={0.03} />
      {[0, 1, 2, 3, 4].map((i) => <group key={i}><Glow pos={[-0.7, 2.5 - i * 0.32, 0.11]} size={[0.8, 0.07]} color="#F4D58A" intensity={0.9} /><Glow pos={[0.4, 2.5 - i * 0.32, 0.11]} size={[0.5, 0.07]} color="#7CC8FF" intensity={0.8} /><Glow pos={[0.95, 2.5 - i * 0.32, 0.11]} size={[0.2, 0.07]} color={i % 2 ? '#32E27A' : '#FF7A7A'} intensity={0.9} /></group>)}
      {[-1.0, 1.0].map((x) => <B key={x} size={[0.08, 0.9, 0.08]} pos={[x, 0.45, 0]} color="#2A2D31" metal={0.5} rough={0.4} />)}
    </group>
  ),
  v_luggage: () => (
    <group>
      <B size={[0.9, 0.05, 0.6]} pos={[0, 0.2, 0]} color="#C9CED1" metal={0.7} rough={0.3} />
      <B size={[0.6, 0.5, 0.35]} pos={[-0.12, 0.5, 0]} color="#8A3F6A" rough={0.6} radius={0.05} /><B size={[0.45, 0.35, 0.3]} pos={[0.2, 0.43, 0.05]} color="#1F3D6B" rough={0.6} radius={0.05} />
      <B size={[0.04, 1.0, 0.04]} pos={[-0.4, 0.75, 0.25]} color="#C9CED1" metal={0.7} rough={0.3} /><B size={[0.04, 1.0, 0.04]} pos={[-0.4, 0.75, -0.25]} color="#C9CED1" metal={0.7} rough={0.3} /><B size={[0.04, 0.04, 0.55]} pos={[-0.4, 1.25, 0]} color="#C9CED1" metal={0.7} rough={0.3} />
      {[[-0.35, 0.22], [0.35, 0.22], [-0.35, -0.22], [0.35, -0.22]].map(([x, z]) => <Cyl key={`${x}${z}`} r={0.06} h={0.05} pos={[x, 0.05, z]} rot={[Math.PI / 2, 0, 0]} color="#15171A" seg={8} />)}
    </group>
  ),
  v_container: () => (
    <group>
      <B size={[2.4, 1.1, 1.1]} pos={[0, 0.55, 0]} color="#C4552D" rough={0.6} radius={0.03} />
      <B size={[2.4, 1.1, 1.1]} pos={[0.1, 1.65, 0]} color="#1F5F8B" rough={0.6} radius={0.03} />
      {[-1.0, -0.5, 0, 0.5, 1.0].map((x) => <B key={x} size={[0.04, 1.0, 0.04]} pos={[x, 0.55, 0.56]} color="#1A1A1A" rough={0.9} shadow={false} />)}
      {[-1.0, -0.5, 0, 0.5, 1.0].map((x) => <B key={x} size={[0.04, 1.0, 0.04]} pos={[x + 0.1, 1.65, 0.56]} color="#1A1A1A" rough={0.9} shadow={false} />)}
      <B size={[2.6, 0.06, 1.2]} pos={[0, 0.03, 0]} color="#3A3D42" rough={0.8} />
    </group>
  ),
  v_pallet: () => (
    <group>
      <B size={[1.5, 0.12, 1.1]} pos={[0, 0.06, 0]} color="#A8743F" rough={0.8} radius={0.01} />
      {[0, 1].map((i) => <B key={i} size={[0.7, 0.42, 0.9]} pos={[-0.38 + i * 0.76, 0.33, 0]} color={i ? '#C9A66B' : '#B07A44'} rough={0.8} radius={0.02} />)}
      <B size={[0.6, 0.4, 0.8]} pos={[0, 0.74, 0]} color="#D9C7A0" rough={0.8} radius={0.02} />
    </group>
  ),
  v_crane: () => (
    <group>
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => <B key={`${x}${z}`} size={[0.1, 4.6, 0.1]} pos={[x, 2.3, z]} color="#E9B949" rough={0.5} />)}
      <B size={[1.2, 0.2, 1.2]} pos={[0, 4.6, 0]} color="#E9B949" rough={0.5} /><B size={[3.6, 0.2, 0.3]} pos={[1.2, 4.9, 0]} color="#E9B949" rough={0.5} />
      <B size={[0.04, 1.6, 0.04]} pos={[2.4, 4.1, 0]} color="#2A2D31" rough={0.6} /><B size={[0.5, 0.2, 0.3]} pos={[2.4, 3.2, 0]} color="#15171B" rough={0.6} />
    </group>
  ),
  v_candle_rack: () => (
    <group>
      <B size={[1.0, 0.1, 0.6]} pos={[0, 0.05, 0]} color="#3A2A22" rough={0.6} />
      <B size={[0.9, 0.9, 0.5]} pos={[0, 0.55, 0]} color="#5A3A20" rough={0.6} radius={0.03} />
      {[-0.32, -0.1, 0.12, 0.34].map((x, i) => <group key={x}><Cyl r={0.05} h={0.28} pos={[x, 1.15 + (i % 2) * 0.05, 0]} color="#FFF1C2" rough={0.7} seg={8} /><Glow pos={[x, 1.38 + (i % 2) * 0.05, 0.02]} size={[0.07, 0.12]} color="#FFB45C" intensity={1.6} /></group>)}
    </group>
  ),
  v_choir: () => (
    <group>
      <B size={[2.6, 0.4, 1.0]} pos={[0, 0.2, 0]} color="#5A3A20" rough={0.6} radius={0.03} />
      <B size={[2.6, 0.4, 0.7]} pos={[0, 0.6, -0.15]} color="#6A4528" rough={0.6} radius={0.03} />
      <B size={[2.6, 0.9, 0.12]} pos={[0, 1.15, -0.45]} color="#7A4A26" rough={0.6} radius={0.03} />
      {[-0.9, -0.3, 0.3, 0.9].map((x, i) => <group key={x}><Sph r={0.14} pos={[x, 1.3 - (i % 2) * 0.3, 0.05]} color="#C98A5A" rough={0.8} /><B size={[0.34, 0.5, 0.2]} pos={[x, 0.95 - (i % 2) * 0.3, 0.05]} color={['#7A1F3D', '#F4F1EA', '#7A1F3D', '#F4F1EA'][i]} rough={0.9} radius={0.05} /></group>)}
    </group>
  ),
  v_flower_stand: () => (
    <group>
      <Cyl r={0.35} r2={0.28} h={0.9} pos={[0, 0.45, 0]} color="#F4F1EA" rough={0.4} seg={14} />
      {[[-0.15, 0.2, '#E4572E'], [0.12, 0.3, '#FFE08A'], [0, 0.45, '#FF7AA8'], [-0.2, 0.6, '#F4F1EA'], [0.22, 0.65, '#E4572E']].map(([x, h, c], i) => <group key={i}><Cyl r={0.015} h={0.5} pos={[x as number, 1.1, 0]} color="#2E8B4A" seg={5} /><Sph r={0.11} pos={[x as number, 1.35 + (h as number) * 0.25, 0]} color={c as string} rough={0.8} /></group>)}
      <Sph r={0.34} pos={[0, 1.2, 0]} scale={[1, 0.7, 1]} color="#2E8B4A" rough={0.9} />
    </group>
  ),
  v_fruit_stand: () => (
    <group>
      <B size={[1.8, 0.8, 0.8]} pos={[0, 0.4, 0.05]} color="#2F8F4E" rough={0.6} radius={0.03} />
      <B size={[1.8, 0.2, 0.85]} pos={[0, 0.9, 0.05]} rot={[-0.25, 0, 0]} color="#B07A44" rough={0.7} radius={0.02} />
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => <group key={x}>{[0, 1, 2].map((k) => <Sph key={k} r={0.1} pos={[x + (k - 1) * 0.12, 1.02 + (k % 2) * 0.06, 0.15 - k * 0.05]} color={['#E4572E', '#F4B400', '#3FA35A', '#FF8A3D'][(i + k) % 4]} rough={0.6} />)}</group>)}
      {[-0.85, 0.85].map((x) => <B key={x} size={[0.05, 2.2, 0.05]} pos={[x, 1.1, -0.3]} color="#5A3A20" rough={0.7} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} size={[0.3, 0.05, 1.1]} pos={[-0.75 + i * 0.3, 2.12, -0.05]} rot={[0.12, 0, 0]} color={i % 2 ? '#F4F1EA' : '#3FA35A'} rough={0.9} />)}
    </group>
  ),
  v_fabric_rack: () => (
    <group>
      {[-0.85, 0.85].map((x) => <B key={x} size={[0.06, 2.0, 0.06]} pos={[x, 1.0, 0]} color="#5A3A20" rough={0.7} />)}
      <B size={[1.8, 0.06, 0.06]} pos={[0, 1.95, 0]} color="#5A3A20" rough={0.7} /><B size={[1.8, 0.06, 0.06]} pos={[0, 1.2, 0]} color="#5A3A20" rough={0.7} />
      {['#C4552D', '#2E86C1', '#E9B949', '#8A3F6A', '#1F4E47', '#E4572E', '#3FA35A', '#F4F1EA'].map((c, i) => <B key={c} size={[0.19, 0.75, 0.04]} pos={[-0.77 + i * 0.22, 1.55, 0]} rot={[0, 0, Math.sin(i) * 0.03]} color={c} rough={0.95} radius={0.01} />)}
      {['#FFE08A', '#7A1F3D', '#2F8F4E', '#1F3D6B', '#C4552D', '#FFFFFF'].map((c, i) => <B key={c} size={[0.28, 0.6, 0.04]} pos={[-0.7 + i * 0.28, 0.85, 0.02]} color={c} rough={0.95} radius={0.01} />)}
      <B size={[1.7, 0.08, 0.5]} pos={[0, 0.2, 0.05]} color="#A8743F" rough={0.8} />
    </group>
  ),
  v_spec_board: () => (
    <group>
      <B size={[1.6, 1.3, 0.1]} pos={[0, 1.4, 0]} color="#15171B" rough={0.4} radius={0.03} />
      <Glow pos={[0, 1.45, 0.06]} size={[1.45, 1.1]} color="#102B3F" intensity={0.8} />
      {[0, 1, 2, 3, 4].map((i) => <Glow key={i} pos={[-0.3 + (i % 2) * 0.1, 1.85 - i * 0.2, 0.065]} size={[0.8 - (i % 2) * 0.2, 0.06]} color={i === 0 ? '#E9B949' : '#BFE3F4'} intensity={1} />)}
      {[-0.7, 0.7].map((x) => <B key={x} size={[0.07, 0.8, 0.07]} pos={[x, 0.4, 0]} color="#2A2D31" metal={0.5} rough={0.4} />)}
    </group>
  ),
  v_sculpture: () => (
    <group>
      <Cyl r={0.75} r2={0.65} h={0.5} pos={[0, 0.25, 0]} color="#F4F1EA" rough={0.4} seg={20} />
      <B size={[0.7, 1.1, 0.5]} pos={[0, 1.05, 0]} color="#B8892F" metal={0.8} rough={0.25} radius={0.15} />
      <Sph r={0.34} pos={[0, 1.9, 0]} color="#B8892F" metal={0.8} rough={0.25} />
      <B size={[0.18, 0.9, 0.18]} pos={[0.5, 1.2, 0]} rot={[0, 0, -0.5]} color="#B8892F" metal={0.8} rough={0.25} radius={0.08} /><B size={[0.18, 0.9, 0.18]} pos={[-0.5, 1.3, 0]} rot={[0, 0, 0.7]} color="#B8892F" metal={0.8} rough={0.25} radius={0.08} />
      <Sph r={0.2} pos={[0, 2.5, 0]} scale={[1, 0.6, 1]} color="#C4552D" metal={0.4} rough={0.3} />
    </group>
  ),
  v_gallery_bench: () => (
    <group>
      <B size={[1.8, 0.1, 0.55]} pos={[0, 0.42, 0]} color="#15171B" rough={0.5} radius={0.03} />
      <B size={[1.7, 0.08, 0.5]} pos={[0, 0.5, 0]} color="#C4552D" rough={0.8} radius={0.04} />
      {[-0.8, 0.8].map((x) => <B key={x} size={[0.06, 0.38, 0.45]} pos={[x, 0.19, 0]} color="#15171B" metal={0.5} rough={0.4} />)}
    </group>
  ),
  v_goal: () => (
    <group>
      {[-1.7, 1.7].map((x) => <B key={x} size={[0.1, 2.4, 0.1]} pos={[x, 1.2, 0]} color="#FFFFFF" rough={0.4} />)}
      <B size={[3.5, 0.1, 0.1]} pos={[0, 2.4, 0]} color="#FFFFFF" rough={0.4} />
      <B size={[3.4, 2.3, 0.02]} pos={[0, 1.2, -0.45]} color="#E8ECEF" rough={0.9} shadow={false} />
      {[-1.7, 1.7].map((x) => <B key={x} size={[0.02, 2.3, 0.9]} pos={[x * 0.97, 1.2, -0.2]} color="#E8ECEF" rough={0.9} shadow={false} />)}
      <Sph r={0.13} pos={[0.4, 0.13, 0.9]} color="#FFFFFF" rough={0.6} />
    </group>
  ),
  v_lifeguard: () => (
    <group>
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => <B key={`${x}${z}`} size={[0.1, 1.5, 0.1]} pos={[x, 0.75, z]} color="#F4F1EA" rough={0.6} />)}
      <B size={[1.3, 0.1, 1.3]} pos={[0, 1.5, 0]} color="#F4F1EA" rough={0.6} />
      <B size={[1.0, 0.7, 1.0]} pos={[0, 1.95, 0]} color="#E4572E" rough={0.6} radius={0.03} />
      <B size={[1.5, 0.08, 1.5]} pos={[0, 2.4, 0]} color="#F4F1EA" rough={0.6} />
      <B size={[0.8, 0.3, 0.02]} pos={[0, 2.0, 0.51]} color="#9FD3F0" rough={0.15} />
      <B size={[0.5, 0.06, 1.6]} pos={[0, 0.7, 1.0]} rot={[-0.6, 0, 0]} color="#B07A44" rough={0.7} />
      <B size={[0.4, 0.4, 0.04]} pos={[0.2, 2.9, 0]} color="#E4572E" rough={0.8} />
    </group>
  ),
  v_big_screen: () => (
    <group>
      <B size={[3.2, 1.9, 0.14]} pos={[0, 1.5, 0]} color="#0C0C10" rough={0.3} radius={0.04} />
      <Glow pos={[0, 1.5, 0.08]} size={[3.0, 1.7]} color="#2FA84F" intensity={0.75} />
      <Glow pos={[0, 1.5, 0.085]} size={[0.02, 1.7]} color="#E8F5E8" intensity={0.9} />
      <B size={[3.4, 0.5, 0.5]} pos={[0, 0.25, 0.05]} color="#C9A66B" rough={0.7} radius={0.03} />
      <B size={[3.2, 0.08, 0.06]} pos={[0, 2.5, 0.05]} color="#1F6F4D" rough={0.6} />
    </group>
  ),
  v_view_bench: () => (
    <group>
      {[0, 1, 2].map((i) => <B key={i} size={[2.4, 0.05, 0.2]} pos={[0, 0.46, -0.2 + i * 0.22]} color="#B07A44" rough={0.7} radius={0.01} />)}
      <B size={[2.4, 0.45, 0.05]} pos={[0, 0.75, -0.3]} rot={[-0.1, 0, 0]} color="#B07A44" rough={0.7} radius={0.01} />
      {[-1.1, 1.1].map((x) => <B key={x} size={[0.07, 0.46, 0.65]} pos={[x, 0.23, 0]} color="#5A3A20" rough={0.7} />)}
      <B size={[0.4, 0.12, 0.3]} pos={[-0.6, 0.54, 0.0]} color="#E4572E" rough={0.8} radius={0.03} />
    </group>
  ),
  v_pool_table: () => (
    <group>
      <B size={[2.4, 0.18, 1.4]} pos={[0, 0.8, 0]} color="#5A3A20" rough={0.5} radius={0.04} />
      <B size={[2.1, 0.04, 1.1]} pos={[0, 0.9, 0]} color="#1F8A4D" rough={0.9} />
      {[[-1.0, -0.55], [1.0, -0.55], [-1.0, 0.55], [1.0, 0.55]].map(([x, z]) => <B key={`${x}${z}`} size={[0.14, 0.75, 0.14]} pos={[x, 0.37, z]} color="#3A2A22" rough={0.6} />)}
      {[[-0.4, 0.1, '#E4572E'], [0, -0.1, '#E9B949'], [0.4, 0.15, '#FFFFFF']].map(([x, z, c]) => <Sph key={String(x)} r={0.05} pos={[x as number, 0.97, z as number]} color={c as string} />)}
    </group>
  ),
};

export const KIT_MODELS = MODELS;
