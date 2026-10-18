import { formatNaira } from '@/core/format';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useRideStore } from '@/stores/rideStore';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { getDestination, getMethod, type ActivityDef, type Method } from '@/data/ride';
import { currentStateId } from '@/stores/mapStore';
import { guarded } from './guard';

/**
 * Ride rules. A trip is SIMULATED: it charges the fare, advances the game clock by the trip time, applies the method's stat
 * cost and records where you are. It does not move the 3D character. Intercity travel is not available: you can only ride to
 * places in the city you are in (switch city on the map first). Activities need you to have arrived first.
 */
export type Result = { ok: true } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });

export function travelBlocker(destId: string, method: Method): string | null {
  const d = getDestination(destId), m = getMethod(method);
  if (!d) return 'That place does not exist.';
  if (d.cityId !== currentStateId()) return 'Intercity travel is not available yet. Switch city on the map first.';
  if (useRideStore.getState().at === destId) return 'You are already here.';
  if (m.needsCar && useVehicleStore.getState().owned.length === 0) return 'You do not own a car.';
  if (useStatsStore.getState().activity) return 'Finish what you are doing first.';
  if (m.fare[d.distance] > useEconomyStore.getState().money) return `The fare is ${formatNaira(m.fare[d.distance])}. You do not have enough.`;
  return null;
}
export function travel(destId: string, method: Method): Result {
  const blocked = travelBlocker(destId, method);
  if (blocked) return no(blocked);
  const d = getDestination(destId)!, m = getMethod(method), fare = m.fare[d.distance];
  return guarded(`ride|${destId}|${method}`, () => {
    if (fare > 0 && !useEconomyStore.getState().debit(fare, `${m.label} to ${d.name}`, 'visit', d.name, { ref: { type: 'ride', id: destId } })) return no('The fare could not be paid.');
    useClockStore.setState((c) => ({ minutes: c.minutes + m.minutes[d.distance] }));
    useStatsStore.getState().apply(m.effects);
    useRideStore.getState().countTrip(destId);
    return { ok: true } as Result;
  }, no('Already on the way.'));
}
export function goHome(): Result {
  if (!useRideStore.getState().at) return no('You are already home.');
  useClockStore.setState((c) => ({ minutes: c.minutes + 15 }));
  useRideStore.getState().setAt(null);
  return { ok: true };
}
export function doActivity(destId: string, a: ActivityDef): Result {
  const d = getDestination(destId);
  if (!d || !d.activities.some((x) => x.id === a.id)) return no('That is not offered here.');
  if (useRideStore.getState().at !== destId) return no('Travel there first.');
  const { stats, activity } = useStatsStore.getState();
  if (activity) return no('Finish what you are doing first.');
  if ((a.effects.energy ?? 0) < 0 && stats.energy < -(a.effects.energy ?? 0)) return no('You are too tired.');
  if (a.cost > useEconomyStore.getState().money) return no(`That costs ${formatNaira(a.cost)}. You do not have enough.`);
  return guarded(`act|${destId}|${a.id}`, () => {
    if (a.cost > 0 && !useEconomyStore.getState().debit(a.cost, `${a.label} at ${d.name}`, 'visit', d.name)) return no('The payment could not be made.');
    useClockStore.setState((c) => ({ minutes: c.minutes + a.minutes }));
    useStatsStore.getState().apply(a.effects);
    if (a.skill) useSkillStore.getState().add(a.skill.id, a.skill.xp);
    return { ok: true } as Result;
  }, no('Already done.'));
}
