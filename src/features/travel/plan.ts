import { useCharacterStore } from '@/stores/characterStore';
import { useQualityStore } from '@/stores/qualityStore';
import { getVehicle, type VehicleBody } from '@/data/vehicles';
import type { Appearance } from '@/types/game';
import type { LandmarkDefinition } from '@/types/world';

export type Weather = 'clear' | 'rain' | 'dusk';
/** What happens on the way. `jam` is the go-slow, `crowd` is a street packed with people. */
export type Event = 'none' | 'jam' | 'crowd';
export type Ride = 'trek' | 'keke' | 'danfo' | 'okada' | 'cab' | 'own';

export interface TripPlan {
  ride: Ride;
  /** Own cars show that exact model and colour. */
  vehicle?: { body: VehicleBody; color: string; name: string; /** GLB in public/models/cars/ (drawn on the road), if the car has one. */ model?: string };
  weather: Weather;
  event: Event;
  destination: { id: string; name: string; icon: string; category: string };
  appearance: Appearance;
  seconds: number;
  /** A short Nigerian caption for each beat of the ride. */
  lines: string[];
  /** Low-end devices get fewer people, drops and cars. */
  light: boolean;
  key: string;
}

/** Only these four landmark fields are used, so places that are not full map landmarks (the Ride app's destinations) can be planned too. */
export type TripPlace = Pick<LandmarkDefinition, 'id' | 'name' | 'icon' | 'category'>;
export interface TripInput { modeId: string; seconds: number; landmark: TripPlace; vehicleId?: string }

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** 0 (weak) .. 1 (strong): measured frame rate tier plus what the browser tells us about the hardware. */
export function deviceScore(): number {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let s = 1 - useQualityStore.getState().tier * 0.3;
  if ((nav.hardwareConcurrency ?? 8) <= 4) s -= 0.25;
  if ((nav.deviceMemory ?? 8) <= 2) s -= 0.35;
  if (nav.connection?.saveData) s -= 0.2;
  return Math.max(0, Math.min(1, s));
}

const LINES: Record<string, string[]> = {
  trek: ['Na foot we go use.', 'Sun don dey hot o.', 'Oga, buy pure water!', 'Dust everywhere...'],
  keke: ['Driver, small small o!', 'Keke no dey fear traffic.', 'Hold your bag o!'],
  danfo: ['Oshodi! Oshodi! Oshodi o!', 'Conductor: I no get change!', 'No condition is permanent.'],
  okada: ['Oga, slow down!', 'Wetin dey your mind?!', 'Pot lid helmet, fully loaded.'],
  cab: ['Where you dey? I dey come.', 'Your driver is almost here.', 'Smooth ride, five stars.'],
  own: ['Afrobeats on, windows up.', 'Fuel price? We move.', 'Park well, abeg.'],
  rain: ['Rain don catch us!', 'Lagos rain no get mercy.', 'Umbrella do your work!'],
  jam: ['Go-slow don start!', 'Third Mainland, I greet you.', 'Honk honk! Nobody move.'],
  crowd: ['Who dey push?!', 'Sorry o, sorry o.', 'The whole Lagos dey here.'],
};

/** TEST-ONLY: not used by the game. Tests and screenshots can pin parts of the next plan (for example the weather or the event). */
let override: Partial<TripPlan> = {};
export const setTripOverride = (o: Partial<TripPlan>) => { override = o; };

export function planTrip(input: TripInput): TripPlan {
  void import('./preload').then((m) => m.preloadTravel()); // make sure the 3D chunk is on its way before the scene mounts
  const own = !!input.vehicleId, ride: Ride = own ? 'own' : (input.modeId as Ride);
  const device = deviceScore();
  const w = Math.random();
  const weather: Weather = w < 0.28 ? 'rain' : w < 0.5 ? 'dusk' : 'clear';
  const e = Math.random();
  let event: Event = 'none';
  if (ride === 'trek') event = e < 0.5 ? 'crowd' : 'none';
  else event = e < 0.07 ? 'jam' : e < 0.2 ? 'crowd' : 'none'; // a go-slow is now rare (it was 42% of trips and felt like a crawl)
  const v = input.vehicleId ? getVehicle(input.vehicleId) : undefined;
  const vehicle = v ? { body: v.type, color: v.color, name: v.name, model: v.model } : undefined;
  // start downloading the player's car model now, so it is ready by the time the scene draws it
  if (v?.model) void import('@/three/models/CarModel').then((m) => m.preloadCar(v.model!));
  const lines = [pick(LINES[ride]), pick(weather === 'rain' ? LINES.rain : event === 'jam' ? LINES.jam : event === 'crowd' ? LINES.crowd : LINES[ride]), pick(LINES[ride])];
  // a trip is a short film: 12 to 15 seconds (the Skip button is always there)
  const seconds = Math.min(15, Math.max(12, input.seconds * 3));
  return {
    ride, vehicle, weather, event,
    destination: { id: input.landmark.id, name: input.landmark.name, icon: input.landmark.icon, category: input.landmark.category }, appearance: useCharacterStore.getState().appearance,
    seconds, lines, light: device < 0.6, key: `${Date.now()}`, ...override,
  };
}
