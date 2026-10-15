import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { B } from '@/three/models/primitives';
import { nearestRoad } from '@/world/mapGeometry';
import type { MapLayout } from '@/types/world';
import { PortCrane } from './landmarks3';

/**
 * Apapa port and the industrial/logistics belt, on the 'apapa' slab (x -35..-13, z 12..24): quay on the harbour side,
 * gantry cranes, instanced container stacks, and warehouse depots near the road. Geography: Apapa sits south-west of
 * Lagos Island across the harbour, reached from the mainland by the Apapa-Oshodi expressway and a bridge.
 */
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const COLORS = ['#C23B3B', '#2F6BFF', '#E5792F', '#0B8F4D', '#8A8F96', '#F4C430'];

export function Port({ layout }: { layout: MapLayout }) {
  const slab = layout.slabs.find((s) => s.id === 'apapa');
  const ref = useRef<InstancedMesh>(null);
  const boxes = useMemo(() => {
    if (!slab) return [];
    const r = rng(7), out: { x: number; y: number; z: number; c: string }[] = [];
    const x0 = slab.cx - slab.w / 2 + 1, x1 = slab.cx + slab.w / 2 - 1, z0 = slab.cz + 1.6, z1 = slab.cz + slab.d / 2 - 1.6;
    for (let x = x0; x < x1; x += 0.66) for (let z = z0; z < z1; z += 0.34) {
      if (nearestRoad(layout, x, z).d < 0.7) continue;
      if (r() < 0.22) continue;
      const stack = 1 + Math.floor(r() * 3), c = COLORS[Math.floor(r() * COLORS.length)];
      for (let k = 0; k < stack; k++) out.push({ x, y: 0.07 + 0.125 + k * 0.25, z, c });
    }
    return out;
  }, [layout, slab]);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new Object3D(), col = new Color();
    boxes.forEach((b, i) => { o.position.set(b.x, b.y, b.z); o.scale.set(0.58, 0.24, 0.3); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(b.c)); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [boxes]);
  if (!slab) return null;
  const zQuay = slab.cz + slab.d / 2 - 0.6, xs = [-31, -27.5, -24];
  return (
    <group>
      <mesh position={[slab.cx, 0.081, zQuay]}><boxGeometry args={[slab.w - 0.6, 0.02, 1.0]} /><meshStandardMaterial color="#8B8F94" roughness={0.95} /></mesh>
      {xs.map((x) => <group key={x} position={[x, 0.08, zQuay - 0.1]} rotation={[0, Math.PI, 0]}><PortCrane /></group>)}
      <instancedMesh key={boxes.length} ref={ref} args={[undefined, undefined, boxes.length]} castShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.7} /></instancedMesh>
      {[-31, -19.5].map((x) => <B key={x} size={[3.2, 0.5, 0.9]} pos={[x, 0.32, slab.cz - slab.d / 2 + 1.1]} color="#B9BEC4" rough={0.8} radius={0.03} />)}
      {[-27.4].map((x) => <B key={x} size={[2.4, 0.45, 0.8]} pos={[x, 0.3, slab.cz - slab.d / 2 + 2.3]} color="#A9ADB3" rough={0.8} radius={0.03} />)}
    </group>
  );
}
