import { VEHICLES, type VehicleDef } from './vehicles';

/**
 * Polanco Motors display slots: the n-th podium shows the n-th vehicle. To use a real car model, put the .glb in `public/models/`
 * and add its path here (e.g. `corolla: '/models/corolla.glb'`). Until a file is listed AND loads, the showroom draws a clearly
 * labelled placeholder car; it is never passed off as the real asset.
 */
export const VEHICLE_MODELS: Record<string, string | undefined> = {};
export const slotVehicle = (podiumIndex: number): VehicleDef | undefined => VEHICLES[podiumIndex];
export const podiumIndexOf = (uid: string): number => { const m = /^v:showroom:(\d+)$/.exec(uid); return m ? Number(m[1]) : -1; };
export const hasRealModel = (id: string) => !!VEHICLE_MODELS[id];
