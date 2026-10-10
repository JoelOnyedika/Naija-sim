import { useMemo } from 'react';
import type { FenceKind, PropertyLayout } from '@/types/world';
import { B, Cyl } from '../models/primitives';
import { brickTexture, zincTexture } from '../textures';

function Run({ kind, len, h, along }: { kind: FenceKind; len: number; h: number; along: 'x' | 'z' }) {
  const rot: [number, number, number] = [0, along === 'x' ? 0 : Math.PI / 2, 0];
  const tex = useMemo(() => {
    if (kind !== 'zinc' && kind !== 'brick') return null;
    const t = (kind === 'zinc' ? zincTexture() : brickTexture()).clone();
    t.repeat.set(len / (kind === 'zinc' ? 1.5 : 2), h / 1.5); t.needsUpdate = true; return t;
  }, [kind, len, h]);
  if (kind === 'ironbar') {
    const n = Math.max(2, Math.round(len / 0.28));
    return (
      <group rotation={rot}>
        <B size={[len, 0.06, 0.06]} pos={[0, h - 0.1, 0]} color="#16181C" metal={0.6} rough={0.4} radius={0.01} shadow={false} />
        <B size={[len, 0.05, 0.05]} pos={[0, 0.2, 0]} color="#16181C" metal={0.6} rough={0.4} radius={0.01} shadow={false} />
        {Array.from({ length: n + 1 }, (_, i) => <B key={i} size={[0.025, h - 0.2, 0.025]} pos={[-len / 2 + (i * len) / n, h / 2 + 0.05, 0]} color="#16181C" metal={0.6} rough={0.4} radius={0.005} shadow={false} />)}
        {Array.from({ length: Math.floor(len / 3) + 1 }, (_, i) => <B key={`p${i}`} size={[0.3, h + 0.15, 0.3]} pos={[-len / 2 + i * 3, (h + 0.15) / 2, 0]} color="#E7E1D4" rough={0.8} radius={0.02} />)}
      </group>
    );
  }
  return (
    <group rotation={rot}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, h, 0.08]} />
        <meshStandardMaterial map={tex ?? undefined} roughness={kind === 'zinc' ? 0.55 : 0.9} metalness={kind === 'zinc' ? 0.5 : 0} />
      </mesh>
      <B size={[len, 0.06, 0.14]} pos={[0, h + 0.03, 0]} color={kind === 'zinc' ? '#6F7577' : '#8C8576'} rough={0.7} radius={0.01} shadow={false} />
      {kind === 'zinc' && Array.from({ length: Math.floor(len / 2.4) + 1 }, (_, i) => <Cyl key={i} r={0.05} h={h + 0.1} pos={[-len / 2 + i * 2.4, h / 2, 0.06]} color="#5A4A38" seg={6} />)}
    </group>
  );
}

/** Boundary fence: tall at the back and left, low curb at the front and right so the view stays open. */
export function Fence({ layout }: { layout: PropertyLayout }) {
  const { plot } = layout;
  if (plot.fence === 'none') return null;
  const tall = plot.fence === 'ironbar' ? 1.9 : 2.1, low = 0.55;
  const w = plot.x1 - plot.x0, d = plot.z1 - plot.z0;
  const gate = layout.decor.find((x) => x.kind === 'gate');
  const gx = gate?.x ?? (plot.x0 + plot.x1) / 2;
  const gapL = gx - 1.9, gapR = gx + 1.9;
  const front = [[plot.x0, Math.max(plot.x0, gapL)], [Math.min(plot.x1, gapR), plot.x1]].filter(([a, b]) => b - a > 0.3);
  const cx = (plot.x0 + plot.x1) / 2, cz = (plot.z0 + plot.z1) / 2;
  return (
    <group>
      <group position={[cx, 0, plot.z0]}><Run kind={plot.fence} len={w} h={tall} along="x" /></group>
      <group position={[plot.x0, 0, cz]}><Run kind={plot.fence} len={d} h={tall} along="z" /></group>
      <group position={[plot.x1, 0, cz]}><Run kind={plot.fence} len={d} h={low} along="z" /></group>
      {front.map(([a, b], i) => <group key={i} position={[(a + b) / 2, 0, plot.z1]}><Run kind={plot.fence} len={b - a} h={low} along="x" /></group>)}
    </group>
  );
}
