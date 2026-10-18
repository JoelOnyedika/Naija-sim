import { PLAYERS } from '@/data/players';
import { nowMinutes } from '@/core/gameTime';
import { DAY_MINUTES } from '@/data/economy';
import { formatNaira } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';
import { useGamesStore } from '@/stores/gamesStore';

/**
 * Games lobby (initial version: Ludo). Tables are SIMULATED: they are generated from the city and the game day, and the
 * "players" at them are scripted characters. Ludo itself is not built yet, so a wager is only ever shown, never charged:
 * sitting down reserves a seat and checks you could afford the stake. When the table fills, it cannot start and you are released.
 */
export interface Table { id: string; game: 'Ludo'; cityId: string; creator: string; seated: number; max: number; wager: number; status: 'waiting' | 'full' }
export const LUDO_RULES = ['2 to 4 players. Everyone has four pieces.', 'Roll a six to bring a piece out of the yard.', 'Landing on an opponent sends their piece home.', 'The first player to bring all four pieces home wins.', 'A wager (in-game naira) is split by the winner. Not active yet: Ludo gameplay is still being built.'];
const WAGERS = [0, 5_000, 20_000, 50_000];
const hash = (s: string) => { let h = 5; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export function tablesFor(cityId: string, day = Math.floor(nowMinutes() / DAY_MINUTES)): Table[] {
  const seat = useGamesStore.getState().seat;
  return Array.from({ length: 4 }, (_, i) => {
    const h = hash(`${cityId}|${day}|${i}`), max = h % 2 ? 4 : 2, creator = PLAYERS[h % PLAYERS.length].username;
    const base = 1 + (h >> 3) % (max - 1 + 1 - 1 || 1); // 1..max-1 simulated players already seated
    const seated = Math.min(max - 1, Math.max(1, base)) + (seat?.tableId === `${cityId}:${day}:${i}` ? 1 : 0);
    return { id: `${cityId}:${day}:${i}`, game: 'Ludo' as const, cityId, creator, seated, max, wager: WAGERS[(h >> 5) % WAGERS.length], status: seated >= max ? 'full' as const : 'waiting' as const };
  });
}
export type Result = { ok: true } | { ok: false; error: string };
export function joinTable(t: Table): Result {
  const g = useGamesStore.getState();
  if (g.seat) return { ok: false, error: 'You already have a seat. Leave it first.' };
  if (t.status !== 'waiting' || t.seated >= t.max) return { ok: false, error: 'This table is full.' };
  if (t.wager > useEconomyStore.getState().money) return { ok: false, error: `You need ${formatNaira(t.wager)} to sit at this table.` };
  useGamesStore.getState().setSeat({ tableId: t.id, cityId: t.cityId });
  return { ok: true };
}
export const leaveTable = () => useGamesStore.getState().setSeat(null);
