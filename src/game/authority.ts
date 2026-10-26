import { ACTIVITY_SETS } from '@/data/activities';

/**
 * Who decides how much an activity pays. The client never gets to name the amount: it reports WHICH activity finished
 * (`defId:activityId`) and the authority answers with the amount. Offline, this device is the authority and reads the same table
 * the game ships with. With real multiplayer a server implements this interface, checks the duration actually elapsed, and
 * credits the player itself; a modified client then cannot invent money.
 */
export interface RewardAuthority {
  readonly authoritative: boolean;
  approvePayout(activityKey: string, claimed?: number): number;
}
const table = (): Map<string, number> => {
  const m = new Map<string, number>();
  for (const [defId, list] of Object.entries(ACTIVITY_SETS)) for (const u of list) { if (u.id && u.payout) m.set(`${defId}:${u.id}`, u.payout); if (u.id && u.risk?.winMoney) m.set(`${defId}:${u.id}:win`, u.risk.winMoney); }
  return m;
};
export const localAuthority: RewardAuthority = { authoritative: false, approvePayout: (key) => table().get(key) ?? 0 /* the claimed amount is ignored on purpose */ };
let authority: RewardAuthority = localAuthority;
export const getAuthority = () => authority;
export const setAuthority = (a: RewardAuthority) => { authority = a; };
