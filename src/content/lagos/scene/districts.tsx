import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { DistrictKind, MapLayout } from '@/types/world';
import { nearAnyRoad, roadSegments, streetSegments } from '@/world/mapGeometry';

/** Land rectangles (kerb + ground) and the instanced buildings on them. Buildings keep off roads, streets and landmarks. */
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const PALETTE: Record<DistrictKind, string[]> = {
  dense: ['#B5532F', '#6F8FA6', '#7A9A5E', '#A9743A', '#8D8D8D'],
  market: ['#E7E1D2', '#C9A27A', '#B9CAD1', '#D8B48A', '#9FB8C4'],
  civic: ['#E7E1D2', '#CFC8B6', '#D9D4C6', '#C9C3B2', '#B9CAD1'],
  business: ['#B9CAD1', '#9FB8C4', '#CBD8DD', '#8FA6B2', '#DCE4E8'],
  estate: ['#EFE8DA', '#E2D8C3', '#F5EFE4', '#D9C7A5', '#E8DFCB'],
  resort: ['#F3EEE3', '#E8E2D2', '#FFFFFF', '#E7D9BC', '#F0E6D0'],
  airport: [], industrial: [],
};
/** Footprint range per district kind: towers are slim and tall, estates are small and low, markets are packed. */
const FOOT: Record<DistrictKind, [number, number]> = { dense: [0.4, 0.9], market: [0.45, 1.0], civic: [0.5, 1.1], business: [0.45, 0.9], estate: [0.4, 0.7], resort: [0.5, 0.8], airport: [0, 0], industrial: [0, 0] };

export function Land({ layout }: { layout: MapLayout }) {
  return (
    <>
      {layout.slabs.map((s) => (
        <group key={s.id}>
          <mesh position={[s.cx, -0.1, s.cz]} receiveShadow><boxGeometry args={[s.w + 0.6, 0.3, s.d + 0.6]} /><meshStandardMaterial color="#E4D3A6" roughness={1} /></mesh>
          <mesh position={[s.cx, 0.02, s.cz]} receiveShadow><boxGeometry args={[s.w, 0.1, s.d]} /><meshStandardMaterial color={s.ground} roughness={1} /></mesh>
        </group>
      ))}
    </>
  );
}

export function Buildings({ layout, avoid }: { layout: MapLayout; avoid: [number, number][] }) {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => {
    const roads = [...roadSegments(layout), ...streetSegments(layout)];
    const r = rng(42), out: { x: number; z: number; w: number; h: number; d: number; c: string }[] = [];
    for (const s of layout.slabs) {
      if (s.density <= 0) continue;
      const pal = s.tin ? PALETTE.dense : PALETTE[s.kind], [f0, f1] = FOOT[s.kind];
      const count = Math.round(s.w * s.d * 0.9 * s.density);
      for (let i = 0; i < count; i++) {
        const x = s.cx + (r() - 0.5) * (s.w - 0.8), z = s.cz + (r() - 0.5) * (s.d - 0.8);
        const w = f0 + r() * (f1 - f0), d = f0 + r() * (f1 - f0);
        if (avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < 2.0)) continue;
        if (nearAnyRoad(roads, x, z, Math.max(w, d) / 2 + 0.12)) continue;
        // business districts: a few real towers among shorter blocks
        const tower = s.kind === 'business' && r() < 0.22;
        const h = 0.25 + r() * s.tall * (tower ? 1.9 : 1);
        out.push({ x, z, w: tower ? w * 0.75 : w, h, d: tower ? d * 0.75 : d, c: pal[Math.floor(r() * pal.length)] });
      }
    }
    return out;
  }, [layout, avoid]);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new Object3D(), col = new Color();
    items.forEach((b, i) => { o.position.set(b.x, b.h / 2 + 0.07, b.z); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(b.c)); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh key={items.length} ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>;
}
