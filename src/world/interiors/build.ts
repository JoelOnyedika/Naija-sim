import { INTERIORS, type InteriorDef, type InteriorKind } from '@/data/interiors';
import type { PlacedItem } from '@/types/game';
import type { PropertyDefinition, PropertyLayout } from '@/types/world';

const layouts = new Map<InteriorKind, PropertyLayout>();

/** A public interior as an ordinary property layout: one walled room, cutaway toward the camera like every home. */
export function interiorLayout(def: InteriorDef): PropertyLayout {
  const hit = layouts.get(def.id); if (hit) return hit;
  const L: PropertyLayout = {
    id: `interior.${def.id}`,
    plot: { x0: -0.6, z0: -0.6, x1: def.w + 0.6, z1: def.d + 0.6, ground: 'paving', fence: 'none' },
    zones: [{ id: 'main', kind: 'parlour', label: def.label, x0: 0, z0: 0, x1: def.w, z1: def.d, floor: def.floor, indoor: true, furnishable: false }],
    connections: [], wallHeight: def.wallHeight, windows: [], palette: def.palette, finish: 'painted', decor: [], fixtures: [], publicPower: true,
  };
  layouts.set(def.id, L); return L;
}

/** The venue's furniture as placed items with stable ids (so a visit to the same venue always has the same uids). */
export const venueItems = (def: InteriorDef): PlacedItem[] => def.items.map((it, i) => ({ uid: `v:${def.id}:${i}`, defId: it.defId, x: it.x, z: it.z, rotation: it.rotation }));

/** A pretend property record so every system that wants "the active home" works inside a venue. It is never saved or sold. */
export const interiorProperty = (def: InteriorDef, name: string): PropertyDefinition => ({
  id: `interior:${def.id}`, stateId: 'lagos', areaId: '', name, category: 'starter', price: 0, unit: 'rooms', rooms: 1, bedrooms: 0, bathrooms: 0,
  garageBays: 0, parkingSpaces: 0, layoutId: `interior.${def.id}`, description: def.tagline, cta: 'move_in', luxuryLevel: 1,
});
export { INTERIORS };
