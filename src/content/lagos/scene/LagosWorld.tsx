import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D, type Group } from 'three';
import { B, Cyl } from '@/three/models/primitives';
import { Water } from '@/three/world/Water';
import type { StateDefinition } from '@/types/world';
import { LANDMARK_MODELS } from './landmarks';

/**
 * Lagos 3D world: islands, mainland, bridges, danfo buses, landmark models.
 * Terrain is Lagos-specific art; areas and landmarks come from the state's data, so the same
 * scene would update if the data changed.
 */
interface Slab { cx: number; cz: number; w: number; d: number; ground: string; density: number; tall: number; tin: boolean }
const SLABS: Slab[] = [
  { cx: -17.5, cz: -7, w: 25, d: 30, ground: '#8FAE7A', density: 1.0, tall: 0.5, tin: true },
  { cx: 4, cz: 2, w: 8, d: 10, ground: '#A7B58E', density: 0.9, tall: 1.0, tin: false },
  { cx: 13, cz: 0, w: 6, d: 8, ground: '#86B07C', density: 0.5, tall: 0.6, tin: false },
  { cx: 21, cz: -4.5, w: 6, d: 7, ground: '#7FB57F', density: 0.35, tall: 0.5, tin: false },
  { cx: 10, cz: 12, w: 14, d: 6, ground: '#A2B48D', density: 0.8, tall: 1.6, tin: false },
  { cx: 15, cz: 17.5, w: 8, d: 4, ground: '#C9C3AE', density: 0.4, tall: 2.6, tin: false },
  { cx: 25, cz: 12, w: 14, d: 8, ground: '#9DB885', density: 0.55, tall: 0.8, tin: false },
];

const BRIDGES: { a: [number, number]; b: [number, number]; cable?: boolean; buses?: number }[] = [
  { a: [-5, -8], b: [0, -2.5], buses: 4 },
  { a: [4.5, 7], b: [5, 9], buses: 1 },
  { a: [8, 0], b: [10, 0] },
  { a: [16, 1.5], b: [19.5, 8.2], cable: true, buses: 2 },
  { a: [16, -2.5], b: [18, -3.5] },
];

function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

function Buildings({ avoid }: { avoid: [number, number][] }) {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => {
    const r = rng(42), out: { x: number; z: number; w: number; h: number; d: number; c: string }[] = [];
    const tin = ['#B5532F', '#6F8FA6', '#7A9A5E', '#A9743A', '#8D8D8D'], city = ['#E7E1D2', '#CFC8B6', '#B9CAD1', '#D8D2C2', '#9FB8C4'];
    for (const s of SLABS) {
      const count = Math.round(s.w * s.d * 0.9 * s.density);
      for (let i = 0; i < count; i++) {
        const x = s.cx + (r() - 0.5) * (s.w - 0.8), z = s.cz + (r() - 0.5) * (s.d - 0.8);
        if (avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < 2.0)) continue;
        const h = 0.25 + r() * s.tall;
        out.push({ x, z, w: 0.4 + r() * 0.5, h, d: 0.4 + r() * 0.5, c: (s.tin ? tin : city)[Math.floor(r() * 5)] });
      }
    }
    return out;
  }, [avoid]);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new Object3D(), col = new Color();
    items.forEach((b, i) => { o.position.set(b.x, b.h / 2, b.z); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(b.c)); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh key={items.length} ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>;
}

function Danfo() {
  return (
    <group scale={0.55}>
      <B size={[0.9, 0.7, 2.0]} pos={[0, 0.55, 0]} color="#FFC21A" rough={0.45} radius={0.08} />
      <B size={[0.92, 0.12, 2.02]} pos={[0, 0.55, 0]} color="#16181C" rough={0.5} radius={0.02} />
      <B size={[0.86, 0.3, 1.5]} pos={[0, 0.98, -0.1]} color="#14222B" rough={0.1} metal={0.4} radius={0.05} />
      {[[-0.32, 0.7], [0.32, 0.7], [-0.32, -0.7], [0.32, -0.7]].map(([x, z], i) => <Cyl key={i} r={0.17} h={0.14} pos={[x, 0.17, z]} rot={[0, 0, Math.PI / 2]} color="#16181C" seg={12} />)}
    </group>
  );
}

function Bridge({ a, b, cable, buses = 0 }: (typeof BRIDGES)[number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
  const refs = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((g, i) => {
      if (!g) return;
      const lane = i % 2 === 0 ? 1 : -1;
      const p = (((t * 0.045 + i * 0.27) % 1) + 1) % 1;
      const u = lane === 1 ? p : 1 - p;
      const off = lane * 0.22;
      g.position.set(a[0] + dx * u + Math.cos(yaw) * off, 0.36, a[1] + dz * u - Math.sin(yaw) * off);
      g.rotation.y = yaw + (lane === 1 ? 0 : Math.PI);
    });
  });
  return (
    <group>
      <group position={[(a[0] + b[0]) / 2, 0.2, (a[1] + b[1]) / 2]} rotation={[0, yaw, 0]}>
        <B size={[0.9, 0.14, len]} pos={[0, 0, 0]} color="#7B7F82" rough={0.8} radius={0.02} />
        <B size={[0.03, 0.02, len]} pos={[0, 0.08, 0]} color="#F4F1EA" shadow={false} />
        {Array.from({ length: Math.floor(len / 2.2) + 1 }, (_, i) => <B key={i} size={[0.26, 0.5, 0.26]} pos={[0, -0.3, -len / 2 + i * 2.2]} color="#9A9488" rough={0.9} />)}
        {cable && (<><Cyl r={0.07} h={2.8} pos={[0, 1.4, 0]} color="#F4F1EA" rough={0.5} seg={8} />{[-1, 1].map((s) => [-1.6, -0.8, 0.8, 1.6].map((z) => <B key={`${s}${z}`} size={[0.015, 0.015, 1.9]} pos={[s * 0.0, 1.5, z * 0.6]} rot={[Math.atan2(2.4, z * 1.0) * 0, 0, 0]} color="#F4F1EA" shadow={false} />))}</>)}
      </group>
      {Array.from({ length: buses }, (_, i) => <group key={i} ref={(g) => { refs.current[i] = g; }}><Danfo /></group>)}
    </group>
  );
}

export function LagosWorld({ state }: { state: StateDefinition }) {
  const landmarks = state.mapData.landmarks;
  const avoid = useMemo(() => landmarks.map((l) => l.position), [landmarks]);
  return (
    <group>
      <Water size={[260, 260]} position={[0, -0.25, 0]} />
      {SLABS.map((s, i) => (
        <group key={i}>
          <mesh position={[s.cx, -0.1, s.cz]} receiveShadow><boxGeometry args={[s.w + 0.6, 0.3, s.d + 0.6]} /><meshStandardMaterial color="#E4D3A6" roughness={1} /></mesh>
          <mesh position={[s.cx, 0.02, s.cz]} receiveShadow><boxGeometry args={[s.w, 0.1, s.d]} /><meshStandardMaterial color={s.ground} roughness={1} /></mesh>
        </group>
      ))}
      <Buildings avoid={avoid} />
      {BRIDGES.map((b, i) => <Bridge key={i} {...b} />)}
      {state.areas.map((a) => (
        <mesh key={a.id} rotation={[-Math.PI / 2, 0, 0]} position={[a.mapData.position[0], 0.09, a.mapData.position[1]]}>
          <circleGeometry args={[a.mapData.radius, 40]} /><meshBasicMaterial color={a.mapData.color} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      {landmarks.map((l) => {
        const Model = LANDMARK_MODELS[l.modelId];
        return (
          <group key={l.id} position={[l.position[0], 0.07, l.position[1]]}>
            {Model ? <Model /> : <B size={[1.4, 1.2, 1.4]} pos={[0, 0.6, 0]} color="#C9C4B6" />}
          </group>
        );
      })}
    </group>
  );
}
