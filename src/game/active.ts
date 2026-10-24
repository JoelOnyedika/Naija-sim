import { useMemo } from 'react';
import type { PlacedItem } from '@/types/game';
import type { PropertyDefinition, PropertyLayout } from '@/types/world';
import { usePropertyStore } from '@/stores/propertyStore';
import { fixturesOf } from '@/world/placement';
import { getLayout, getProperty } from '@/world/registry';
import { INTERIORS } from '@/data/interiors';
import { interiorLayout, interiorProperty, venueItems } from '@/world/interiors/build';
import { useInteriorStore, type InteriorPresence } from '@/stores/interiorStore';

export interface ActiveHome { property: PropertyDefinition; layout: PropertyLayout; placed: PlacedItem[]; fixtures: PlacedItem[] }

const venueHome = (p: InteriorPresence): ActiveHome => {
  const def = INTERIORS[p.kind];
  return { property: interiorProperty(def, p.name), layout: interiorLayout(def), placed: venueItems(def), fixtures: [] };
};

/** The player's active place: while visiting a public interior that interior, otherwise the active home. Every home-related system reads from here. */
export function getActiveHome(): ActiveHome | null {
  const visit = useInteriorStore.getState().current;
  if (visit) return venueHome(visit);
  const { activeId, furniture } = usePropertyStore.getState();
  const property = activeId ? getProperty(activeId) : undefined;
  const layout = property ? getLayout(property.layoutId) : undefined;
  if (!property || !layout) return null;
  return { property, layout, placed: furniture[property.id] ?? [], fixtures: fixturesOf(layout) };
}

export function useActiveHome(): ActiveHome | null {
  const visit = useInteriorStore((s) => s.current);
  const activeId = usePropertyStore((s) => s.activeId);
  const placed = usePropertyStore((s) => (s.activeId ? s.furniture[s.activeId] : undefined));
  return useMemo(() => {
    if (visit) return venueHome(visit);
    const property = activeId ? getProperty(activeId) : undefined;
    const layout = property ? getLayout(property.layoutId) : undefined;
    if (!property || !layout) return null;
    return { property, layout, placed: placed ?? [], fixtures: fixturesOf(layout) };
  }, [activeId, placed, visit?.kind, visit?.name]);
}

export const setPlaced = (propertyId: string, items: PlacedItem[]) => usePropertyStore.getState().setFurniture(propertyId, items);
