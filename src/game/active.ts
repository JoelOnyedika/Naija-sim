import { useMemo } from 'react';
import type { PlacedItem } from '@/types/game';
import type { PropertyDefinition, PropertyLayout } from '@/types/world';
import { usePropertyStore } from '@/stores/propertyStore';
import { fixturesOf } from '@/world/placement';
import { getLayout, getProperty } from '@/world/registry';

export interface ActiveHome { property: PropertyDefinition; layout: PropertyLayout; placed: PlacedItem[]; fixtures: PlacedItem[] }

/** The player's active home: the single place every home-related system reads from. */
export function getActiveHome(): ActiveHome | null {
  const { activeId, furniture } = usePropertyStore.getState();
  const property = activeId ? getProperty(activeId) : undefined;
  const layout = property ? getLayout(property.layoutId) : undefined;
  if (!property || !layout) return null;
  return { property, layout, placed: furniture[property.id] ?? [], fixtures: fixturesOf(layout) };
}

export function useActiveHome(): ActiveHome | null {
  const activeId = usePropertyStore((s) => s.activeId);
  const placed = usePropertyStore((s) => (s.activeId ? s.furniture[s.activeId] : undefined));
  return useMemo(() => {
    const property = activeId ? getProperty(activeId) : undefined;
    const layout = property ? getLayout(property.layoutId) : undefined;
    if (!property || !layout) return null;
    return { property, layout, placed: placed ?? [], fixtures: fixturesOf(layout) };
  }, [activeId, placed]);
}

export const setPlaced = (propertyId: string, items: PlacedItem[]) => usePropertyStore.getState().setFurniture(propertyId, items);
