import type { AdsConfig, AdSubmission, BillboardSlot, SeaSlot, SlotAvailability } from '@/types/ads';
import type { StateDefinition } from '@/types/world';
import { distToLand, distToSegment, nearestRoad, roadSegments, slabContains } from '@/world/mapGeometry';

/**
 * Where ads can go. Both inventories are derived from the state's own data: Sea Ads slots from the WATER of its map
 * layout, billboard slots from its billboard definitions. The 3D scene, the placement picker and the validators all read
 * the same slot objects, so a selected slot is always a real position in the world.
 */
const seaCache = new Map<string, SeaSlot[]>();

export function seaSlots(state: StateDefinition): SeaSlot[] {
  const hit = seaCache.get(state.id); if (hit) return hit;
  const layout = state.mapData.layout, cfg = state.ads;
  if (!layout || !cfg) return [];
  const { w, h, pitchX, pitchZ } = cfg.seaSlot, { sea } = layout, margin = 0.9;
  const bridges = roadSegments(layout).filter((s) => s.edge.bridge);
  const out: SeaSlot[] = [];
  let row = 0;
  for (let z = sea.z0 + pitchZ / 2; z < sea.z1; z += pitchZ, row++) {
    let col = 0;
    for (let x = sea.x0 + pitchX / 2; x < sea.x1; x += pitchX, col++) {
      const free = layout.slabs.every((s) => Math.abs(x - s.cx) > s.w / 2 + w / 2 + margin || Math.abs(z - s.cz) > s.d / 2 + h / 2 + margin);
      if (!free) continue;
      if (bridges.some((b) => distToSegment(x, z, b.a, b.b) < h / 2 + 1.1)) continue; // never under or across a bridge
      const d = distToLand(layout, x, z), tier = cfg.seaTiers.find((t) => d <= t.maxDistToLand) ?? cfg.seaTiers[cfg.seaTiers.length - 1];
      out.push({ id: `sea-${row}-${col}`, x: +x.toFixed(2), z: +z.toFixed(2), w, h, tier: tier.id, price: tier.price });
    }
  }
  seaCache.set(state.id, out);
  return out;
}

/** Landmarks closer than this make a board "near" them. */
const NEAR_LANDMARK = 3.8;

/**
 * Plain-language location of a board, computed from the state's own data so new boards and cities get it for free:
 * inside the airport -> the airport's name; otherwise "Near <closest landmark>" if one is within NEAR_LANDMARK;
 * otherwise the district it sits in. `road` is the named road beside it, if any.
 */
export function billboardLocation(state: StateDefinition, pos: [number, number]): { location: string; road?: string } {
  const layout = state.mapData.layout;
  const road = layout ? nearestRoad(layout, pos[0], pos[1]).edge?.name : undefined;
  const slab = layout?.slabs.find((s) => slabContains(s, pos[0], pos[1]));
  if (slab?.kind === 'airport') {
    const mmia = state.mapData.landmarks.find((l) => l.modelId === 'airportTerminal');
    return { location: mmia?.name ?? slab.label ?? slab.name, road };
  }
  // closest landmark on the SAME stretch of land (so an island board is never "near" a landmark across the water)
  let best: { name: string; d: number } | null = null;
  for (const l of state.mapData.landmarks) {
    if (slab && !slabContains(slab, l.position[0], l.position[1], 0.3)) continue;
    const d = Math.hypot(l.position[0] - pos[0], l.position[1] - pos[1]);
    if (d <= NEAR_LANDMARK && (!best || d < best.d)) best = { name: l.name, d };
  }
  if (best) return { location: `Near ${best.name}`, road };
  // otherwise the nearest named area (neighbourhood) on the same land, else the district itself
  let area: { name: string; d: number } | null = null;
  for (const a of state.areas) {
    if (slab && !slabContains(slab, a.mapData.position[0], a.mapData.position[1], 0.5)) continue;
    const d = Math.hypot(a.mapData.position[0] - pos[0], a.mapData.position[1] - pos[1]);
    if (d <= 5 && (!area || d < area.d)) area = { name: a.name, d };
  }
  if (area) return { location: `In ${area.name}`, road };
  if (road) return { location: `On ${road}` };
  return { location: slab ? `In ${slab.label ?? slab.name}` : 'Open ground' };
}

export function billboardSlots(state: StateDefinition): BillboardSlot[] {
  const cfg = state.ads;
  if (!cfg) return [];
  const dayMs = 86_400_000;
  return (state.mapData.billboards ?? []).map((b) => {
    const tier = cfg.billboardTierById[b.id] ?? 'standard';
    const area = state.areas.find((a) => a.id === b.areaId);
    return {
      id: b.id, name: area ? `${area.name} board` : b.id.replace('lagos.bb.', '').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) + ' board',
      areaId: b.areaId, position: b.position, format: b.format, sizeLabel: cfg.billboardSizeLabel[b.format], ...billboardLocation(state, b.position), tier,
      price: Math.round(cfg.billboardBasePrice[b.format] * (cfg.billboardTierMultiplier[tier] ?? 1)),
      durationMs: cfg.billboardDurationDays * dayMs,
    };
  });
}

/** Effective status: an 'active' ad past its expiresAt is expired, whether or not anything has swept the store yet. */
export function effectiveStatus(s: AdSubmission, now: number): AdSubmission['status'] {
  return s.status === 'active' && s.expiresAt !== undefined && now >= s.expiresAt ? 'expired' : s.status;
}
/** Pending and live ads hold their slot; draft, rejected and expired ones do not. */
export const holdsSlot = (s: AdSubmission, now: number) => { const e = effectiveStatus(s, now); return e === 'pending' || e === 'active'; };

export function slotAvailability(subs: AdSubmission[], kind: AdSubmission['kind'], slotId: string, now: number): { state: SlotAvailability; by?: AdSubmission } {
  const by = subs.find((s) => s.kind === kind && s.slotId === slotId && holdsSlot(s, now));
  return by ? { state: effectiveStatus(by, now) === 'pending' ? 'reserved' : 'occupied', by } : { state: 'available' };
}

export const liveAds = (subs: AdSubmission[], kind: AdSubmission['kind'], now: number) => subs.filter((s) => s.kind === kind && effectiveStatus(s, now) === 'active');

/** Why a slot cannot be bought, or null when it can. Used by the UI and re-checked at submit time. */
export function slotProblem(state: StateDefinition, subs: AdSubmission[], kind: AdSubmission['kind'], slotId: string, now: number): string | null {
  const exists = kind === 'sea' ? seaSlots(state).some((s) => s.id === slotId) : billboardSlots(state).some((s) => s.id === slotId);
  if (!exists) return kind === 'sea' ? 'That position is not on the water.' : 'That billboard does not exist.';
  const a = slotAvailability(subs, kind, slotId, now);
  if (a.state === 'occupied') return 'That position is already taken by a live advertisement.';
  if (a.state === 'reserved') return 'That position is reserved by an advertisement waiting for approval.';
  return null;
}

export const slotPrice = (state: StateDefinition, kind: AdSubmission['kind'], slotId: string): number | null =>
  (kind === 'sea' ? seaSlots(state).find((s) => s.id === slotId)?.price : billboardSlots(state).find((s) => s.id === slotId)?.price) ?? null;
export const slotDurationMs = (cfg: AdsConfig, kind: AdSubmission['kind']) => (kind === 'sea' ? cfg.seaDurationDays : cfg.billboardDurationDays) * 86_400_000;
