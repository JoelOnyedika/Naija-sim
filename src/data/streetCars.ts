import { assetUrl } from '@/core/assets';

/**
 * Street cars: six low-poly GLB cars (public/models/street/, built from the owner's low_poly_cars_pack.glb by tools/prepare-street-cars.mjs).
 * They replace the old procedural cars on streets: travel traffic, the taxi, parked cars outside venues, the roadblock and destination scenes.
 * Each file is 600 to 1,100 triangles, two draw calls (body + dark trim), one 384 px texture, front toward +z, wheels on y = 0.
 * The body is painted white-ish so the game tints it with any colour; the trim (tyres, bumpers, wheel discs) keeps its own colour.
 */
export type StreetModel = 'sedan' | 'hatch' | 'van' | 'wagon' | 'pickup_s' | 'pickup_l';
export interface StreetCarDef { model: StreetModel; name: string; length: number; width: number; height: number; triangles: number }
// measured from the built files (tools/prepare-street-cars.mjs writes the same numbers to public/models/street/manifest.json; test:streetcars checks them)
export const STREET_CARS: Record<StreetModel, StreetCarDef> = {
  sedan: { model: 'sedan', name: 'Old saloon', length: 4.5, width: 1.8, height: 1.42, triangles: 926 },
  hatch: { model: 'hatch', name: 'Hatchback', length: 3.9, width: 2.15, height: 1.46, triangles: 726 },
  van: { model: 'van', name: 'Panel van', length: 5, width: 2.37, height: 2.09, triangles: 1104 },
  wagon: { model: 'wagon', name: 'Family wagon', length: 4.4, width: 2.12, height: 1.84, triangles: 588 },
  pickup_s: { model: 'pickup_s', name: 'Small pickup', length: 4.3, width: 1.87, height: 2, triangles: 1074 },
  pickup_l: { model: 'pickup_l', name: 'Double-cab pickup', length: 5.3, width: 2.2, height: 1.83, triangles: 770 },
};
export const STREET_MODELS = Object.keys(STREET_CARS) as StreetModel[];
export const streetCarUrl = (model: StreetModel) => assetUrl(`models/street/${model}.glb`);

/** What the travel scene's traffic kinds draw. (The kind names are the old procedural ones; 'suv' is now the family wagon.) */
export type TrafficKind = 'sedan' | 'hatch' | 'suv' | 'pickup' | 'van' | 'minipick';
export const TRAFFIC_MODEL: Record<TrafficKind, StreetModel> = { sedan: 'sedan', hatch: 'hatch', suv: 'wagon', pickup: 'pickup_l', van: 'van', minipick: 'pickup_s' };
export const TRAFFIC_KINDS = Object.keys(TRAFFIC_MODEL) as TrafficKind[];
