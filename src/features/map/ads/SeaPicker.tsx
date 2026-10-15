import { Minus, Plus, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { seaSlots, slotAvailability } from '@/game/ads/slots';
import { useAdsStore } from '@/stores/adsStore';
import { useAdsUiStore } from '@/stores/adsUiStore';
import type { StateDefinition } from '@/types/world';
import { roadSegments, ROAD_WIDTH } from '@/world/mapGeometry';

/**
 * Placement picker for Sea Ads. The minimap is drawn from the SAME data as the 3D world (land slabs, roads and the sea
 * slots), and the 3D map shows matching green/red markers while this is open, so every tap here is a real position on the
 * water. Free = green circle with a tick; taken or reserved = red square with a cross; your pick = gold.
 */
export function SeaPicker({ state, selected, onSelect }: { state: StateDefinition; selected: string | null; onSelect: (id: string | null) => void }) {
  const layout = state.mapData.layout!, cfg = state.ads!;
  const slots = useMemo(() => seaSlots(state), [state]);
  const subs = useAdsStore((s) => s.submissions);
  const tick = useAdsStore((s) => s.tick);
  const [tier, setTier] = useState<string>('all');
  const [zoom, setZoom] = useState(1);
  const sea = layout.sea, W = sea.x1 - sea.x0, H = sea.z1 - sea.z0;
  const [centre, setCentre] = useState<[number, number]>([(sea.x0 + sea.x1) / 2, (sea.z0 + sea.z1) / 2]);
  const drag = useRef<{ x: number; y: number; cx: number; cz: number; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const now = Date.now();
  const info = useMemo(() => { const m = new Map(slots.map((s) => [s.id, slotAvailability(subs, 'sea', s.id, Date.now()).state])); return m; }, [slots, subs, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const free = slots.filter((s) => info.get(s.id) === 'available');
  const shown = slots.filter((s) => tier === 'all' || s.tier === tier);
  const vw = W / zoom, vh = H / zoom;
  const vx = Math.max(sea.x0, Math.min(sea.x1 - vw, centre[0] - vw / 2)), vz = Math.max(sea.z0, Math.min(sea.z1 - vh, centre[1] - vh / 2));
  const roads = useMemo(() => roadSegments(layout), [layout]);
  const sel = slots.find((s) => s.id === selected);
  const pick = (id: string) => { if (info.get(id) !== 'available') { sfx.error(); return; } sfx.pop(); onSelect(id); };
  const suggest = () => { const pool = free.filter((s) => tier === 'all' || s.tier === tier); const best = pool.sort((a, b) => Math.hypot(a.x - 8, a.z - 8) - Math.hypot(b.x - 8, b.z - 8))[0]; if (best) { onSelect(best.id); setCentre([best.x, best.z]); sfx.pop(); } };
  void now;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {[{ id: 'all', label: 'All' }, ...cfg.seaTiers.map((t) => ({ id: t.id, label: `${t.id[0].toUpperCase()}${t.id.slice(1)} ${formatNaira(t.price)}` }))].map((t) => (
          <button key={t.id} onClick={() => setTier(t.id)} aria-pressed={tier === t.id} className={`rounded-full px-2.5 py-1 font-bold ${tier === t.id ? 'bg-danfo text-night' : 'bg-white/10 text-white/80'}`}>{t.label}</button>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/15" style={{ touchAction: 'none' }}>
        <svg ref={svg} viewBox={`${vx} ${vz} ${vw} ${vh}`} className="block h-52 w-full select-none bg-[#0B6E8A]" role="group" aria-label="Sea Ads placement map"
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, cx: centre[0], cz: centre[1], moved: false }; (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            const d = drag.current; if (!d || !svg.current) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 5) d.moved = true;
            if (d.moved) { const r = svg.current.getBoundingClientRect(); setCentre([d.cx - (dx / r.width) * vw, d.cz - (dy / r.height) * vh]); }
          }}
          onPointerUp={() => { window.setTimeout(() => { drag.current = null; }, 0); }}>
          {layout.slabs.map((s) => <rect key={s.id} x={s.cx - s.w / 2} y={s.cz - s.d / 2} width={s.w} height={s.d} fill={s.kind === 'airport' ? '#B4BFA2' : s.kind === 'industrial' ? '#A9A99A' : s.ground} stroke="#E4D3A6" strokeWidth={0.5} />)}
          {roads.map((r, i) => <line key={i} x1={r.a[0]} y1={r.a[1]} x2={r.b[0]} y2={r.b[1]} stroke={r.edge.bridge ? '#C8C8C8' : '#3A3F45'} strokeWidth={ROAD_WIDTH[r.edge.cls] * 1.4} strokeLinecap="round" />)}
          {shown.map((s) => {
            const st = info.get(s.id), isSel = s.id === selected, ok = st === 'available';
            const u = Math.max(vw / 90, 0.6); // hit area grows as you zoom out so it stays tappable
            return (
              <g key={s.id} onClick={() => { if (drag.current?.moved) return; pick(s.id); }} style={{ cursor: ok ? 'pointer' : 'not-allowed' }} aria-label={`${ok ? 'Available' : st === 'reserved' ? 'Reserved' : 'Taken'} position`}>
                <rect x={s.x - Math.max(s.w / 2, u * 2.2)} y={s.z - Math.max(s.h / 2, u * 1.4)} width={Math.max(s.w, u * 4.4)} height={Math.max(s.h, u * 2.8)} fill="transparent" />
                {ok ? <rect x={s.x - s.w / 2} y={s.z - s.h / 2} width={s.w} height={s.h} rx={s.h / 2} fill={isSel ? '#FFC21A' : '#22C55E'} stroke="#fff" strokeWidth={isSel ? 0.5 : 0.18} opacity={0.92} />
                  : <rect x={s.x - s.w / 2} y={s.z - s.h / 2} width={s.w} height={s.h} fill="#EF4444" stroke="#fff" strokeWidth={0.18} opacity={0.92} />}
                {zoom >= 2 && <text x={s.x} y={s.z + s.h * 0.28} textAnchor="middle" fontSize={s.h * 0.85} fontWeight="800" fill={ok ? '#052e16' : '#fff'}>{ok ? '✓' : '✕'}</text>}
              </g>
            );
          })}
        </svg>
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(6, z * 1.8))} className="glass-dark flex h-8 w-8 items-center justify-center rounded-full"><Plus size={15} /></button>
          <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z / 1.8))} className="glass-dark flex h-8 w-8 items-center justify-center rounded-full"><Minus size={15} /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70" aria-label="Legend">
        <span><b className="text-emerald-300">● ✓</b> Available ({free.length})</span><span><b className="text-rose-300">■ ✕</b> Taken or reserved ({slots.length - free.length})</span><span><b className="text-amber-300">◆</b> Your pick</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-sm">{sel ? <><b>Position {sel.id.replace('sea-', '')}</b> <span className="text-white/60">· {cfg.seaTiers.find((t) => t.id === sel.tier)?.label}</span></> : <span className="text-white/60">Tap a green position on this map or on the 3D sea.</span>}</div>
        <button onClick={suggest} className="glass-dark flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold"><Sparkles size={12} />Suggest one</button>
      </div>
    </div>
  );
}

export const useSeaPickerFocus = () => useAdsUiStore((s) => s.picker?.selected);
