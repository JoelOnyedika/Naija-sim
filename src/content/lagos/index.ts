import type { StateDefinition } from '@/types/world';
import { AREAS } from './areas';
import { BILLBOARDS } from './billboards';
import { LAGOS_ADS } from './ads';
import { LANDMARKS } from './landmarks';
import { LAGOS_LAYOUT } from './map/layout';
import { ENTRIES } from './properties';
import { SPREAD, sp, spreadAreas, spreadBillboard, spreadLandmark, spreadLayout } from './spread';

const STATE_ID = 'lagos';

/** The Lagos content pack: the first state. Copy this folder to start another state. */
export const lagos: StateDefinition = {
  id: STATE_ID,
  name: 'Lagos',
  country: 'Nigeria',
  tagline: 'Create your Lagos story.',
  areas: AREAS.map(spreadAreas).map((a) => ({
    ...a,
    stateId: STATE_ID,
    propertyIds: ENTRIES.filter((e) => e.property.areaId === a.id).map((e) => e.property.id),
  })),
  properties: ENTRIES.map((e) => ({ ...e.property, stateId: STATE_ID, layoutId: e.property.id })),
  layouts: ENTRIES.map((e) => e.layout(e.property.id)),
  mapData: {
    layout: spreadLayout(LAGOS_LAYOUT),
    center: sp([2, -2]),
    bounds: Math.round(62 * SPREAD),
    viewScale: SPREAD,
    landmarks: LANDMARKS.map(spreadLandmark).map((l) => ({ ...l, stateId: STATE_ID })),
    billboards: BILLBOARDS.map(spreadBillboard).map((b) => ({ ...b, stateId: STATE_ID })),
  },
  ads: LAGOS_ADS,
  visualData: { sceneId: 'lagos', skyTop: '#2B7FBF', skyBottom: '#F7D7A0', accent: '#FFC21A' },
  legacyPropertyIds: {
    ...Object.fromEntries(['7-by-7-yaba', '7-by-7-mushin'].map((k) => [`lagos.${k}`, 'lagos.face-me-i-face-you'])),
    ...Object.fromEntries(['self-contain-agege'].map((k) => [`lagos.${k}`, 'lagos.self-contain-mushin'])),
    ...Object.fromEntries(['room-and-parlour-mushin', 'room-and-parlour-agege'].map((k) => [`lagos.${k}`, 'lagos.room-and-parlour-yaba'])),
    ...Object.fromEntries(['mini-flat-yaba', 'mini-flat-lagos-island', '2-bedroom-flat-surulere', '2-bedroom-flat-yaba', '2-bedroom-flat-lagos-island', '3-bedroom-flat-yaba', '3-bedroom-flat-surulere', '4-bedroom-flat-ikeja', '4-bedroom-flat-lekki'].map((k) => [`lagos.${k}`, 'lagos.3-bedroom-flat-ikeja'])),
    ...Object.fromEntries(['3-bedroom-luxury-apartment-lekki', '4-bedroom-luxury-apartment-lekki', '4-bedroom-luxury-apartment-vi', 'terrace-duplex-lekki', 'semi-detached-duplex-lekki'].map((k) => [`lagos.${k}`, 'lagos.detached-duplex-lekki'])),
    ...Object.fromEntries(['detached-duplex-ikoyi', '5-bedroom-duplex-banana-island', 'luxury-mansion-banana-island', 'waterfront-mansion-banana-island'].map((k) => [`lagos.${k}`, 'lagos.luxury-duplex-ikoyi'])),
  },
  startingProperties: {
    lapo: ['lagos.face-me-i-face-you'],
    nepo: ['lagos.detached-duplex-lekki'],
  },
};
