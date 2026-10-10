import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import { MathUtils, type Group } from 'three';
import type { Appearance } from '@/types/game';
import { B, Cyl, Sph } from '../models/primitives';

export interface Motion { moving: boolean; lying: boolean; sitting: boolean }

function Hair({ a }: { a: Appearance }) {
  const c = a.hairColor;
  const cap = (r: number, y: number, ext = 0.55) => (
    <mesh position={[0, y, -0.01]} castShadow>
      <sphereGeometry args={[r, 22, 14, 0, Math.PI * 2, 0, Math.PI * ext]} />
      <meshStandardMaterial color={c} roughness={0.9} />
    </mesh>
  );
  switch (a.hairStyle) {
    case 'bald': return null;
    case 'lowcut': return cap(0.152, 1.64, 0.5);
    case 'afro': return <Sph r={0.24} pos={[0, 1.7, -0.02]} color={c} rough={1} />;
    case 'bun': return (<>{cap(0.15, 1.64, 0.55)}<Sph r={0.08} pos={[0, 1.88, -0.04]} color={c} rough={1} /></>);
    case 'braids':
    case 'dreads': {
      const n = a.hairStyle === 'braids' ? 12 : 8, r = a.hairStyle === 'braids' ? 0.016 : 0.028;
      return (
        <>
          {cap(0.155, 1.645, 0.58)}
          {Array.from({ length: n }, (_, i) => {
            const ang = (i / n) * Math.PI * 2;
            return <Cyl key={i} r={r} h={0.34} pos={[Math.sin(ang) * 0.15, 1.52, Math.cos(ang) * 0.12 - 0.04]} color={c} rough={0.9} seg={6} />;
          })}
        </>
      );
    }
  }
}

function Top({ a }: { a: Appearance }) {
  const col = a.topColor;
  const long = a.top === 'hoodie' || a.top === 'kaftan';
  return (
    <group>
      <B size={[0.4, a.top === 'kaftan' ? 0.95 : 0.55, 0.23]} pos={[0, a.top === 'kaftan' ? 0.98 : 1.15, 0]} color={col} rough={0.8} radius={0.08} />
      {a.top === 'kaftan' && (<><Cyl r={0.26} r2={0.2} h={0.35} pos={[0, 0.62, 0]} color={col} rough={0.85} seg={16} /><B size={[0.12, 0.7, 0.01]} pos={[0, 1.0, 0.12]} color="#FFC21A" rough={0.5} metal={0.5} shadow={false} /></>)}
      {a.top === 'hoodie' && <Sph r={0.12} pos={[0, 1.44, -0.12]} scale={[1.3, 0.8, 0.8]} color={col} rough={0.9} />}
      {a.top === 'jersey' && (<><B size={[0.42, 0.06, 0.24]} pos={[0, 1.34, 0]} color="#FFFFFF" rough={0.7} shadow={false} /><B size={[0.14, 0.18, 0.01]} pos={[0, 1.15, -0.12]} color="#FFFFFF" rough={0.7} shadow={false} /></>)}
      {[-1, 1].map((s) => (
        <group key={s}>
          <B size={[0.12, long ? 0.5 : 0.22, 0.12]} pos={[s * 0.27, long ? 1.12 : 1.25, 0]} color={col} rough={0.8} radius={0.05} />
          {!long && <B size={[0.1, 0.28, 0.1]} pos={[s * 0.27, 1.0, 0]} color={a.skin} rough={0.65} radius={0.04} />}
          <Sph r={0.055} pos={[s * 0.27, 0.84, 0]} color={a.skin} rough={0.65} />
        </group>
      ))}
    </group>
  );
}

function Legs({ a, legL, legR }: { a: Appearance; legL: MutableRefObject<Group | null>; legR: MutableRefObject<Group | null> }) {
  const shortLegs = a.bottom === 'shorts' || a.bottom === 'skirt';
  const leg = (s: number, ref: MutableRefObject<Group | null>) => (
    <group ref={ref} position={[s * 0.09, 0.85, 0]}>
      <B size={[0.14, shortLegs ? 0.36 : 0.82, 0.16]} pos={[0, shortLegs ? -0.18 : -0.41, 0]} color={a.bottom === 'skirt' ? a.skin : a.bottomColor} rough={0.8} radius={0.05} />
      {shortLegs && <B size={[0.12, 0.4, 0.13]} pos={[0, -0.58, 0]} color={a.skin} rough={0.65} radius={0.05} />}
      <B size={[0.15, 0.08, 0.25]} pos={[0, -0.8, 0.04]} color="#F4F1EA" rough={0.6} radius={0.03} />
    </group>
  );
  return (
    <>
      {leg(-1, legL)}{leg(1, legR)}
      {a.bottom === 'skirt' && <Cyl r={0.27} r2={0.2} h={0.4} pos={[0, 0.72, 0]} color={a.bottomColor} rough={0.85} seg={18} />}
      {a.bottom !== 'skirt' && <B size={[0.38, 0.14, 0.22]} pos={[0, 0.86, 0]} color={a.bottomColor} rough={0.8} radius={0.05} />}
    </>
  );
}

/** Placeholder 3D avatar built from primitives. `motion` lets a parent drive walk/sit/lie poses. */
export function Avatar({ appearance: a, motion }: { appearance: Appearance; motion?: MutableRefObject<Motion> }) {
  const body = useRef<Group>(null), legL = useRef<Group>(null), legR = useRef<Group>(null);
  useFrame(({ clock }) => {
    const b = body.current; if (!b) return;
    const m = motion?.current ?? { moving: false, lying: false, sitting: false };
    const t = clock.getElapsedTime();
    const swing = m.moving ? Math.sin(t * 9) * 0.6 : 0;
    if (legL.current) legL.current.rotation.x = m.sitting ? -1.4 : swing;
    if (legR.current) legR.current.rotation.x = m.sitting ? -1.4 : -swing;
    b.rotation.x = MathUtils.lerp(b.rotation.x, m.lying ? -Math.PI / 2 : 0, 0.15);
    const y = m.lying ? 0.7 : m.sitting ? -0.3 : 0;
    b.position.y = MathUtils.lerp(b.position.y, y + (m.moving || m.lying ? 0 : Math.sin(t * 1.6) * 0.008), 0.15);
  });
  return (
    <group ref={body}>
      <Legs a={a} legL={legL} legR={legR} />
      <Top a={a} />
      <Cyl r={0.05} h={0.08} pos={[0, 1.45, 0]} color={a.skin} rough={0.65} seg={12} />
      <Sph r={0.14} pos={[0, 1.62, 0]} scale={[0.95, 1.08, 1]} color={a.skin} rough={0.6} />
      <Sph r={0.018} pos={[-0.05, 1.63, 0.13]} color="#1A1411" />
      <Sph r={0.018} pos={[0.05, 1.63, 0.13]} color="#1A1411" />
      <B size={[0.05, 0.012, 0.01]} pos={[0, 1.57, 0.138]} color="#5A2E24" shadow={false} />
      <Hair a={a} />
    </group>
  );
}
