import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, type Group } from 'three';
import { B, Cyl } from '@/three/models/primitives';
import { ROAD_WIDTH, roadSegments, streetSegments, type Seg } from '@/world/mapGeometry';
import type { MapLayout, RoadClass } from '@/types/world';

/** Roads, local streets, junctions and bridges, all derived from the state's MapLayout. One instanced mesh per road class. */
const COLOR: Record<RoadClass, string> = { major: '#3A3F45', secondary: '#474C52', local: '#5A5F66' };
const Y = 0.082;

function Strips({ segs, cls }: { segs: Seg[]; cls: RoadClass }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new Object3D();
    segs.forEach((s, i) => {
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
      o.position.set((s.a[0] + s.b[0]) / 2, Y + (cls === 'major' ? 0.004 : cls === 'secondary' ? 0.002 : 0), (s.a[1] + s.b[1]) / 2);
      o.rotation.set(0, Math.atan2(dx, dz), 0); o.scale.set(ROAD_WIDTH[cls], 0.02, Math.hypot(dx, dz) + ROAD_WIDTH[cls] * 0.5); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [segs, cls]);
  if (!segs.length) return null;
  return <instancedMesh key={`${cls}${segs.length}`} ref={ref} args={[undefined, undefined, segs.length]} receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={COLOR[cls]} roughness={0.95} /></instancedMesh>;
}

/** Dashed white centre line on major roads: one instanced mesh of short dashes. */
function Dashes({ segs }: { segs: Seg[] }) {
  const dashes = useMemo(() => segs.flatMap((s) => {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], len = Math.hypot(dx, dz), n = Math.floor(len / 0.9), yaw = Math.atan2(dx, dz);
    return Array.from({ length: n }, (_, i) => ({ x: s.a[0] + (dx * (i + 0.5)) / n, z: s.a[1] + (dz * (i + 0.5)) / n, yaw }));
  }), [segs]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new Object3D();
    dashes.forEach((d, i) => { o.position.set(d.x, Y + 0.016, d.z); o.rotation.set(0, d.yaw, 0); o.scale.set(0.04, 0.01, 0.34); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [dashes]);
  if (!dashes.length) return null;
  return <instancedMesh key={dashes.length} ref={ref} args={[undefined, undefined, dashes.length]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#F1EEE4" /></instancedMesh>;
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

function Bridge({ a, b, cable, buses = 0, cls }: { a: [number, number]; b: [number, number]; cable?: boolean; buses?: number; cls: RoadClass }) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz), w = ROAD_WIDTH[cls] + 0.2;
  const refs = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((g, i) => {
      if (!g) return;
      const lane = i % 2 === 0 ? 1 : -1, p = (((t * 0.045 + i * 0.27) % 1) + 1) % 1, u = lane === 1 ? p : 1 - p, off = lane * 0.2;
      g.position.set(a[0] + dx * u + Math.cos(yaw) * off, 0.36, a[1] + dz * u - Math.sin(yaw) * off);
      g.rotation.y = yaw + (lane === 1 ? 0 : Math.PI);
    });
  });
  return (
    <group>
      <group position={[(a[0] + b[0]) / 2, 0.2, (a[1] + b[1]) / 2]} rotation={[0, yaw, 0]}>
        <B size={[w, 0.14, len]} pos={[0, 0, 0]} color="#7B7F82" rough={0.8} radius={0.02} />
        <B size={[0.03, 0.02, len]} pos={[0, 0.08, 0]} color="#F4F1EA" shadow={false} />
        {Array.from({ length: Math.floor(len / 2.2) + 1 }, (_, i) => <B key={i} size={[0.26, 0.5, 0.26]} pos={[0, -0.3, -len / 2 + i * 2.2]} color="#9A9488" rough={0.9} />)}
        {cable && (<><Cyl r={0.07} h={2.8} pos={[0, 1.4, 0]} color="#F4F1EA" rough={0.5} seg={8} />{[-1.6, -0.8, 0.8, 1.6].map((z) => <B key={z} size={[0.015, 0.015, 1.9]} pos={[0, 1.5, z * 0.6]} color="#F4F1EA" shadow={false} />)}</>)}
      </group>
      {Array.from({ length: buses }, (_, i) => <group key={i} ref={(g) => { refs.current[i] = g; }}><Danfo /></group>)}
    </group>
  );
}

export function Roads({ layout }: { layout: MapLayout }) {
  const { by, bridges, junctions } = useMemo(() => {
    const segs = roadSegments(layout), local = streetSegments(layout);
    const by: Record<RoadClass, Seg[]> = { major: [], secondary: [], local: [...local] };
    const bridges: Seg[] = [];
    for (const s of segs) (s.edge.bridge ? bridges : by[s.edge.cls]).push(s);
    // junction discs where three or more roads meet or a road ends, so corners and T-junctions look joined up
    const deg = new Map<string, { x: number; z: number; w: number; n: number }>();
    const nodes = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const e of layout.edges) if (!e.bridge) for (const id of [e.a, e.b]) { const n = nodes.get(id)!, d = deg.get(id) ?? { x: n.x, z: n.z, w: 0, n: 0 }; d.n++; d.w = Math.max(d.w, ROAD_WIDTH[e.cls]); deg.set(id, d); }
    return { by, bridges, junctions: [...deg.values()] };
  }, [layout]);
  return (
    <group>
      <Strips segs={by.local} cls="local" /><Strips segs={by.secondary} cls="secondary" /><Strips segs={by.major} cls="major" />
      <Dashes segs={by.major} />
      {junctions.map((j, i) => <mesh key={i} position={[j.x, Y + 0.008, j.z]}><cylinderGeometry args={[j.w * 0.62, j.w * 0.62, 0.02, 14]} /><meshStandardMaterial color={j.w >= 0.7 ? COLOR.major : COLOR.secondary} roughness={0.95} /></mesh>)}
      {bridges.map((s, i) => <Bridge key={i} a={s.a} b={s.b} cable={s.edge.cable} buses={s.edge.buses} cls={s.edge.cls} />)}
    </group>
  );
}
