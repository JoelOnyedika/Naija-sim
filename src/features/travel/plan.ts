import { useCharacterStore } from '@/stores/characterStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useTravelStore } from '@/stores/travelStore';
import { getVehicle, type VehicleBody } from '@/data/vehicles';
import type { Appearance } from '@/types/game';
import type { LandmarkDefinition } from '@/types/world';

export type Renderer = '2d' | '3d';
export type Weather = 'clear' | 'rain' | 'dusk';
/** What happens on the way. `jam` is the go-slow, `crowd` is a street packed with people. */
export type Event = 'none' | 'jam' | 'crowd';
export type Ride = 'trek' | 'keke' | 'danfo' | 'okada' | 'cab' | 'own';
export type Building = 'tower' | 'market' | 'church' | 'mosque' | 'stadium' | 'club' | 'gate' | 'shop' | 'bank';

export interface TripPlan {
  renderer: Renderer;
  ride: Ride;
  /** Own cars show that exact model and colour. */
  vehicle?: { body: VehicleBody; color: string; name: string };
  weather: Weather;
  event: Event;
  building: Building;
  destination: { name: string; icon: string };
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
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 3D or 2D? New players (few trips) mostly get the 3D version, long-time players mostly the quick 2D one; weak devices get 2D
 * whatever their experience. There is always some chance of the other kind, so the trips do not feel the same every time.
 */
export function chooseRenderer(trips: number, device: number): Renderer {
  if (device < 0.35 || reducedMotion()) return '2d';
  const experience = trips < 4 ? 0.85 : trips < 12 ? 0.6 : trips < 30 ? 0.35 : 0.2;
  return Math.random() < experience * (0.6 + device * 0.4) ? '3d' : '2d';
}

function buildingFor(l: TripPlace): Building {
  const n = `${l.name} ${l.id}`.toLowerCase();
  if (/mosque/.test(n)) return 'mosque';
  if (/church|cathedral|redeemed|chapel/.test(n)) return 'church';
  if (/stadium|arena|teslim|national.*stad/.test(n)) return 'stadium';
  if (/club|quilox|lounge|nightlife/.test(n) || l.category === 'club') return 'club';
  if (/tower|marina|plaza|house|towers|bank|exchange|securities|hub|tech/.test(n) || ['bank', 'business', 'tech', 'government'].includes(l.category)) return /bank/.test(n) ? 'bank' : 'tower';
  if (l.category === 'market' || l.category === 'shopping' || /market|mall/.test(n)) return 'market';
  if (l.category === 'park' || l.category === 'beach') return 'gate';
  return 'shop';
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

/** TEST-ONLY: not used by the game. Tests and screenshots can pin parts of the next plan (for example the renderer or the weather). */
let override: Partial<TripPlan> = {};
export const setTripOverride = (o: Partial<TripPlan>) => { override = o; };

export function planTrip(input: TripInput): TripPlan {
  const own = !!input.vehicleId, ride: Ride = own ? 'own' : (input.modeId as Ride);
  const trips = useTravelStore.getState().trips, device = deviceScore();
  const w = Math.random();
  const weather: Weather = w < 0.28 ? 'rain' : w < 0.5 ? 'dusk' : 'clear';
  const e = Math.random();
  let event: Event = 'none';
  if (ride === 'trek') event = e < 0.5 ? 'crowd' : 'none';
  else event = e < 0.42 ? 'jam' : e < 0.55 ? 'crowd' : 'none';
  const v = input.vehicleId ? getVehicle(input.vehicleId) : undefined;
  const vehicle = v ? { body: v.type, color: v.color, name: v.name } : undefined;
  const lines = [pick(LINES[ride]), pick(weather === 'rain' ? LINES.rain : event === 'jam' ? LINES.jam : event === 'crowd' ? LINES.crowd : LINES[ride])];
  const seconds = Math.min(5, Math.max(3.5, input.seconds));
  return {
    renderer: chooseRenderer(trips, device), ride, vehicle, weather, event, building: buildingFor(input.landmark),
    destination: { name: input.landmark.name, icon: input.landmark.icon }, appearance: useCharacterStore.getState().appearance,
    seconds, lines, light: device < 0.6, key: `${Date.now()}`, ...override,
  };
}
