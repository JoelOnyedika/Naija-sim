import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, PointLight } from 'three';
import { useStatsStore } from '@/stores/statsStore';
import { B, Cyl, Sph } from './primitives';

/** Bathtub: a rim, a recessed basin with water, and a tap at the head. Independent of showers and toilets. */
export function Bathtub() {
  return (
    <group>
      <B size={[0.8, 0.55, 1.7]} pos={[0, 0.275, 0]} color="#F4F6F6" rough={0.25} radius={0.14} />
      <B size={[0.62, 0.04, 1.5]} pos={[0, 0.54, 0.0]} color="#BFE3EE" opacity={0.85} rough={0.05} radius={0.1} />
      <Cyl r={0.025} h={0.22} pos={[0, 0.66, -0.74]} color="#C9CED1" metal={0.9} rough={0.15} seg={10} />
      <Cyl r={0.02} h={0.16} pos={[0, 0.76, -0.66]} rot={[Math.PI / 2, 0, 0]} color="#C9CED1" metal={0.9} rough={0.15} seg={10} />
    </group>
  );
}

/** Jacuzzi: a round tub with a stepped skirt, bubbling water and jets. */
export function Jacuzzi() {
  const jets: [number, number][] = [0, 1, 2, 3, 4, 5].map((i) => [Math.cos((i / 6) * Math.PI * 2) * 0.66, Math.sin((i / 6) * Math.PI * 2) * 0.66]);
  return (
    <group>
      <Cyl r={0.9} h={0.62} pos={[0, 0.31, 0]} color="#E9EEF0" rough={0.25} seg={28} />
      <Cyl r={0.94} h={0.08} pos={[0, 0.04, 0]} color="#8E979C" rough={0.5} seg={28} />
      <Cyl r={0.74} h={0.05} pos={[0, 0.6, 0]} color="#7FD3E6" opacity={0.85} rough={0.05} seg={28} />
      {jets.map(([x, z], i) => <Cyl key={i} r={0.03} h={0.03} pos={[x, 0.5, z]} color="#C9CED1" metal={0.8} rough={0.2} seg={8} />)}
      <Sph r={0.05} pos={[0.2, 0.64, 0.1]} color="#FFFFFF" opacity={0.7} />
      <Sph r={0.04} pos={[-0.25, 0.64, -0.15]} color="#FFFFFF" opacity={0.7} />
    </group>
  );
}

/** Washbasin on a pedestal. */
export function Washbasin() {
  return (
    <group>
      <Cyl r={0.07} r2={0.1} h={0.7} pos={[0, 0.35, 0]} color="#F7F7F5" rough={0.25} seg={14} />
      <B size={[0.56, 0.14, 0.42]} pos={[0, 0.78, 0]} color="#F7F7F5" rough={0.2} radius={0.06} />
      <B size={[0.44, 0.02, 0.3]} pos={[0, 0.84, 0.0]} color="#DDE3E6" rough={0.1} radius={0.04} />
      <Cyl r={0.015} h={0.14} pos={[0, 0.92, -0.14]} color="#C9CED1" metal={0.9} rough={0.15} seg={8} />
      <Cyl r={0.012} h={0.1} pos={[0, 0.98, -0.09]} rot={[Math.PI / 2, 0, 0]} color="#C9CED1" metal={0.9} rough={0.15} seg={8} />
    </group>
  );
}

/** Tower speaker with a woofer, tweeter and a blue status light. */
export function Speaker() {
  return (
    <group>
      <B size={[0.36, 1.0, 0.32]} pos={[0, 0.5, 0]} color="#1B1F24" rough={0.6} radius={0.03} />
      <Cyl r={0.12} r2={0.09} h={0.05} pos={[0, 0.3, 0.17]} rot={[Math.PI / 2, 0, 0]} color="#3A4048" rough={0.8} seg={18} />
      <Cyl r={0.12} r2={0.09} h={0.05} pos={[0, 0.62, 0.17]} rot={[Math.PI / 2, 0, 0]} color="#3A4048" rough={0.8} seg={18} />
      <Cyl r={0.04} h={0.03} pos={[0, 0.86, 0.17]} rot={[Math.PI / 2, 0, 0]} color="#C9CED1" metal={0.8} seg={12} />
      <Sph r={0.012} pos={[0.13, 0.95, 0.165]} color="#5B93FF" emissive="#5B93FF" emissiveIntensity={1.6} />
    </group>
  );
}

export function BedsideTable() {
  return (
    <group>
      <B size={[0.46, 0.5, 0.4]} pos={[0, 0.25, 0]} color="#8B5E3C" rough={0.55} radius={0.015} />
      <B size={[0.4, 0.2, 0.01]} pos={[0, 0.34, 0.205]} color="#6B4A32" rough={0.6} radius={0.005} />
      <B size={[0.4, 0.14, 0.01]} pos={[0, 0.14, 0.205]} color="#6B4A32" rough={0.6} radius={0.005} />
      <Sph r={0.018} pos={[0, 0.34, 0.22]} color="#E5C16E" metal={0.7} rough={0.3} />
      <Sph r={0.018} pos={[0, 0.14, 0.22]} color="#E5C16E" metal={0.7} rough={0.3} />
    </group>
  );
}

export function CoffeeTable() {
  return (
    <group>
      <B size={[1.0, 0.05, 0.55]} pos={[0, 0.4, 0]} color="#7A5640" rough={0.5} radius={0.02} />
      <B size={[0.9, 0.03, 0.45]} pos={[0, 0.2, 0]} color="#5E4332" rough={0.6} radius={0.015} />
      {[-0.45, 0.45].flatMap((x) => [-0.22, 0.22].map((z) => <B key={`${x}${z}`} size={[0.05, 0.4, 0.05]} pos={[x, 0.2, z]} color="#4A3527" rough={0.6} radius={0.01} />))}
    </group>
  );
}

/** Wall shelf with brackets and a few books. Front faces +z, like the other wall items. */
export function WallShelf() {
  return (
    <group>
      <B size={[1.0, 0.035, 0.22]} pos={[0, -0.02, 0.11]} color="#8B5E3C" rough={0.55} radius={0.01} />
      {[-0.38, 0.38].map((x) => <B key={x} size={[0.03, 0.14, 0.18]} pos={[x, -0.1, 0.09]} color="#4A3527" rough={0.6} radius={0.006} />)}
      <B size={[0.05, 0.22, 0.14]} pos={[-0.3, 0.1, 0.1]} color="#2B4C7E" rough={0.7} radius={0.004} />
      <B size={[0.05, 0.19, 0.14]} pos={[-0.24, 0.085, 0.1]} color="#C23B3B" rough={0.7} radius={0.004} />
      <B size={[0.05, 0.24, 0.14]} pos={[-0.18, 0.11, 0.1]} color="#0B8F4D" rough={0.7} radius={0.004} />
      <Cyl r={0.05} r2={0.04} h={0.1} pos={[0.25, 0.04, 0.11]} color="#E4572E" rough={0.8} seg={12} />
    </group>
  );
}

/**
 * Disco light on a stand. It only lights up while a party activity is running: the mirror ball spins and a single
 * coloured point light cycles hue. Idle, it costs nothing (no light, no per-frame work beyond one cheap check).
 */
export function DiscoLight() {
  const party = useStatsStore((s) => !!s.activity?.party);
  const ball = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  useFrame(({ clock }, dt) => {
    if (!party) return;
    if (ball.current) ball.current.rotation.y += dt * 2.2;
    light.current?.color.setHSL((clock.elapsedTime * 0.35) % 1, 0.9, 0.55);
  });
  return (
    <group>
      <Cyl r={0.2} r2={0.16} h={0.06} pos={[0, 0.03, 0]} color="#2A2F36" rough={0.6} seg={14} />
      <Cyl r={0.02} h={1.2} pos={[0, 0.66, 0]} color="#8E979C" metal={0.7} rough={0.3} seg={8} />
      <group ref={ball} position={[0, 1.3, 0]}>
        <Sph r={0.12} color={party ? '#E8F0FF' : '#9AA3AB'} metal={0.9} rough={0.1} emissive={party ? '#6C8CFF' : '#000000'} emissiveIntensity={party ? 0.8 : 0} />
      </group>
      {party && <pointLight ref={light} position={[0, 1.2, 0]} intensity={9} distance={6} decay={1.8} />}
    </group>
  );
}

/**
 * Gym mat, procedural: a thick foam mat with a darker non-slip border, centre stripes, a thicker rolled lip at the toe end and
 * a small logo block. Origin is the centre on the floor; an avatar doing push-ups faces +z, so its hands land toward +z and its toes toward -z.
 */
export function GymMat() {
  return (
    <group>
      <B size={[0.9, 0.045, 1.9]} pos={[0, 0.0225, 0]} color="#1E3A8A" rough={0.95} radius={0.02} />
      <B size={[0.78, 0.05, 1.78]} pos={[0, 0.024, 0]} color="#2F5BD3" rough={0.95} radius={0.015} />
      {[-0.22, 0, 0.22].map((x) => <B key={x} size={[0.05, 0.052, 1.62]} pos={[x, 0.026, 0]} color="#E9F0FF" rough={0.9} radius={0.006} shadow={false} />)}
      {[-0.55, 0.55].map((z) => <B key={z} size={[0.7, 0.052, 0.04]} pos={[0, 0.026, z]} color="#FFC21A" rough={0.9} radius={0.006} shadow={false} />)}
      <B size={[0.9, 0.065, 0.1]} pos={[0, 0.032, -0.9]} color="#162A66" rough={0.9} radius={0.03} />
      <B size={[0.22, 0.054, 0.12]} pos={[0, 0.027, 0.78]} color="#FFC21A" rough={0.8} radius={0.01} shadow={false} />
    </group>
  );
}

/** "Ibeta Pass My Neighbor": the small petrol set. Tubular frame, yellow tank, pull-cord, one socket panel. Needs a tap during NEPA outages. */
export function Ibeta() {
  return (
    <group>
      <B size={[0.62, 0.05, 0.42]} pos={[0, 0.16, 0]} color="#2B2F32" metal={0.4} rough={0.55} />
      <B size={[0.5, 0.3, 0.34]} pos={[0, 0.34, 0]} color="#E8B21E" rough={0.45} radius={0.05} />
      <B size={[0.34, 0.1, 0.26]} pos={[-0.04, 0.54, 0]} color="#C93A2B" rough={0.4} radius={0.04} />
      <Cyl r={0.03} h={0.04} pos={[0.12, 0.6, 0.05]} color="#1B1B1B" />
      {/* tubular frame */}
      {[-0.29, 0.29].map((x) => [-0.19, 0.19].map((z) => <B key={`${x}${z}`} size={[0.025, 0.48, 0.025]} pos={[x, 0.4, z]} color="#B0B6BA" metal={0.7} rough={0.3} radius={0.008} shadow={false} />))}
      <B size={[0.62, 0.025, 0.025]} pos={[0, 0.64, 0.19]} color="#B0B6BA" metal={0.7} rough={0.3} radius={0.008} shadow={false} />
      <B size={[0.62, 0.025, 0.025]} pos={[0, 0.64, -0.19]} color="#B0B6BA" metal={0.7} rough={0.3} radius={0.008} shadow={false} />
      {/* socket panel and pull-cord handle */}
      <B size={[0.16, 0.12, 0.01]} pos={[0.14, 0.34, 0.175]} color="#1B1B1B" />
      <Cyl r={0.018} h={0.02} pos={[0.12, 0.34, 0.185]} rot={[Math.PI / 2, 0, 0]} color="#F4F6F6" />
      <Cyl r={0.025} h={0.05} pos={[-0.3, 0.36, 0.0]} rot={[0, 0, Math.PI / 2]} color="#C93A2B" />
    </group>
  );
}

/** Solar kit: a tilted two-panel array on a stand and a wall-style inverter/battery cabinet with a green status light. */
export function SolarSystem() {
  return (
    <group>
      {/* array */}
      <group position={[0, 0.78, -0.1]} rotation={[-0.5, 0, 0]}>
        <B size={[1.1, 0.04, 0.62]} color="#1C2B4A" metal={0.3} rough={0.25} radius={0.01} />
        <B size={[1.14, 0.03, 0.66]} pos={[0, -0.025, 0]} color="#C7CCD0" metal={0.6} rough={0.35} radius={0.01} />
        {[-0.275, 0.275].map((x) => <B key={x} size={[0.005, 0.045, 0.6]} pos={[x * 2, 0.002, 0]} color="#7F95B8" rough={0.3} radius={0.001} shadow={false} />)}
        {[-0.2, 0, 0.2].map((z) => <B key={z} size={[1.08, 0.045, 0.005]} pos={[0, 0.002, z]} color="#7F95B8" rough={0.3} radius={0.001} shadow={false} />)}
      </group>
      <B size={[0.06, 0.62, 0.06]} pos={[-0.45, 0.31, -0.28]} color="#9AA0A4" metal={0.6} rough={0.4} radius={0.01} />
      <B size={[0.06, 0.62, 0.06]} pos={[0.45, 0.31, -0.28]} color="#9AA0A4" metal={0.6} rough={0.4} radius={0.01} />
      <B size={[0.06, 0.3, 0.06]} pos={[-0.45, 0.15, 0.1]} color="#9AA0A4" metal={0.6} rough={0.4} radius={0.01} />
      <B size={[0.06, 0.3, 0.06]} pos={[0.45, 0.15, 0.1]} color="#9AA0A4" metal={0.6} rough={0.4} radius={0.01} />
      {/* inverter + battery cabinet */}
      <B size={[0.5, 0.62, 0.24]} pos={[0.85, 0.31, 0.15]} color="#EEF1F2" rough={0.35} radius={0.03} />
      <B size={[0.34, 0.16, 0.012]} pos={[0.85, 0.46, 0.27]} color="#1B1B1B" />
      <Sph r={0.018} pos={[0.76, 0.2, 0.275]} color="#22C55E" emissive="#22C55E" emissiveIntensity={1.2} />
      <B size={[0.22, 0.03, 0.012]} pos={[0.88, 0.2, 0.27]} color="#9AA0A4" />
    </group>
  );
}
