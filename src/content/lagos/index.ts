import type { StateDefinition } from '@/types/world';
import { AREAS } from './areas';
import { LANDMARKS } from './landmarks';
import { ENTRIES } from './properties';

const STATE_ID = 'lagos';

/** The Lagos content pack: the first state. Copy this folder to start another state. */
export const lagos: StateDefinition = {
  id: STATE_ID,
  name: 'Lagos',
  country: 'Nigeria',
  tagline: 'Create your Lagos story.',
  areas: AREAS.map((a) => ({
    ...a,
    stateId: STATE_ID,
    propertyIds: ENTRIES.filter((e) => e.property.areaId === a.id).map((e) => e.property.id),
  })),
  properties: ENTRIES.map((e) => ({ ...e.property, stateId: STATE_ID, layoutId: e.property.id })),
  layouts: ENTRIES.map((e) => e.layout(e.property.id)),
  mapData: {
    center: [4, 0],
    bounds: 38,
    landmarks: LANDMARKS.map((l) => ({ ...l, stateId: STATE_ID })),
  },
  visualData: { sceneId: 'lagos', skyTop: '#2B7FBF', skyBottom: '#F7D7A0', accent: '#FFC21A' },
  startingProperties: {
    lapo: ['lagos.face-me-i-face-you', 'lagos.7-by-7-yaba', 'lagos.7-by-7-mushin', 'lagos.self-contain-mushin'],
    nepo: ['lagos.detached-duplex-lekki', 'lagos.4-bedroom-luxury-apartment-lekki', 'lagos.3-bedroom-luxury-apartment-lekki'],
  },
};
