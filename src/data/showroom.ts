import { assetUrl } from '@/core/assets';
import { VEHICLES, type VehicleDef } from './vehicles';

/**
 * Polanco Motors display slots: the n-th podium shows the n-th vehicle. A vehicle with a `model` in data/vehicles.ts is drawn from
 * its GLB in `public/models/cars/`; the others use the procedural body for their type.
 */
export const carModelUrl = (model: string) => assetUrl(`models/cars/${model}.glb`);
export const VEHICLE_MODELS: Record<string, string | undefined> = Object.fromEntries(VEHICLES.filter((v) => v.model).map((v) => [v.id, carModelUrl(v.model!)]));
export const slotVehicle = (podiumIndex: number): VehicleDef | undefined => VEHICLES[podiumIndex];
export const podiumIndexOf = (uid: string): number => { const m = /^v:showroom:(\d+)$/.exec(uid); return m ? Number(m[1]) : -1; };
export const hasRealModel = (id: string) => !!VEHICLE_MODELS[id];
