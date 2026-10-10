import type { PropertyLayout, ZoneKind } from '@/types/world';

const FILL: Partial<Record<ZoneKind, string>> = {
  bedroom: '#8FB8D8', living: '#F2D58A', parlour: '#F2D58A', kitchen: '#F4A56E', bathroom: '#7FD6CF', corridor: '#D6D0C0',
  balcony: '#C9E6A8', terrace: '#C9E6A8', garage: '#8E9498', parking: '#9FA5A9', compound: '#BDB7A4', garden: '#6FB86A',
  waterfront: '#3AA8C1', neighbour: '#6B6F72', security: '#B9892F',
};

/** A tiny floor plan drawn from layout data. Works for any property in any state. */
export function PlanPreview({ layout }: { layout: PropertyLayout }) {
  const { plot } = layout;
  const w = plot.x1 - plot.x0, d = plot.z1 - plot.z0;
  return (
    <svg viewBox={`${plot.x0} ${plot.z0} ${w} ${d}`} className="w-full rounded-2xl bg-night-700" style={{ aspectRatio: `${w} / ${d}`, maxHeight: 220 }}>
      <rect x={plot.x0} y={plot.z0} width={w} height={d} fill="#2A3A34" />
      {layout.zones.map((z) => (
        <g key={z.id}>
          <rect x={z.x0 + 0.05} y={z.z0 + 0.05} width={z.x1 - z.x0 - 0.1} height={z.z1 - z.z0 - 0.1} rx={0.15} fill={FILL[z.kind] ?? '#CCC'} opacity={z.indoor ? 0.95 : 0.7} stroke={z.indoor ? '#0A1512' : 'none'} strokeWidth={0.12} />
          {(z.x1 - z.x0) > 2 && (z.z1 - z.z0) > 1.4 && <text x={(z.x0 + z.x1) / 2} y={(z.z0 + z.z1) / 2} fontSize={Math.min(0.8, (z.x1 - z.x0) / 6)} textAnchor="middle" dominantBaseline="middle" fill="#0A1512" fontWeight={700}>{z.label}</text>}
        </g>
      ))}
    </svg>
  );
}
