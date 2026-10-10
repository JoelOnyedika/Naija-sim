import type { AreaDefinition, PropertyDefinition, PropertyLayout, StateDefinition, LandmarkDefinition } from '@/types/world';

/**
 * The content registry. A state is "installed" by calling registerState(). Every system reads
 * states, areas, properties and layouts through these lookups, never by importing a content pack.
 */
const states = new Map<string, StateDefinition>();
const areas = new Map<string, AreaDefinition>();
const properties = new Map<string, PropertyDefinition>();
const layouts = new Map<string, PropertyLayout>();
const landmarks = new Map<string, LandmarkDefinition>();

export function registerState(def: StateDefinition) {
  states.set(def.id, def);
  def.areas.forEach((a) => areas.set(a.id, a));
  def.properties.forEach((p) => properties.set(p.id, p));
  def.layouts.forEach((l) => layouts.set(l.id, l));
  def.mapData.landmarks.forEach((l) => landmarks.set(l.id, l));
}

export const listStates = () => [...states.values()];
export const getState = (id: string) => states.get(id);
export const getArea = (id: string) => areas.get(id);
export const getProperty = (id: string) => properties.get(id);
export const getLayout = (id: string) => layouts.get(id);
export const getLandmark = (id: string) => landmarks.get(id);
export const propertiesOfState = (stateId: string) => states.get(stateId)?.properties ?? [];
export const areasOfState = (stateId: string) => states.get(stateId)?.areas ?? [];
export const stateOfProperty = (propertyId: string) => {
  const p = properties.get(propertyId);
  return p ? states.get(p.stateId) : undefined;
};
export const layoutOf = (property: PropertyDefinition) => layouts.get(property.layoutId);
/** The first registered state is the default. No state is special-cased. */
export const firstStateId = () => [...states.keys()][0] ?? '';
