import { formatNaira, uid } from '@/core/format';
import { nowMinutes } from '@/core/gameTime';
import { LAND } from '@/data/economy';
import { getPlot } from '@/data/land';
import { useEconomyStore } from '@/stores/economyStore';
import { useLandStore } from '@/stores/landStore';
import { guarded } from './guard';
import { notify } from './notify';

/**
 * Land rules. Buying and selling are asset conversions (wallet <-> land), recorded as INTERNAL ledger entries, so they are
 * not income or expense; the gain or loss is tracked in `realized` and, while held, in the plot's value. Each owned plot
 * grows by its own weekly rate on the game clock (once per game week). Selling pays the current value minus a registry fee.
 */
export type Result = { ok: true } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const land = () => useLandStore.getState();

export const saleProceeds = (value: number) => Math.floor((value * (10_000 - LAND.sellFeeBps)) / 10_000);

export function buyPlot(plotId: string): Result {
  const plot = getPlot(plotId);
  if (!plot) return no('That plot does not exist.');
  if (land().owned[plotId]) return no('You already own this plot.');
  if (plot.price > useEconomyStore.getState().money) return no(`You need ${formatNaira(plot.price)} to buy this plot.`);
  return guarded(`land-buy|${plotId}`, () => {
    const r = useEconomyStore.getState().post({ direction: 'expense', amount: plot.price, label: `Bought land: ${plot.name}`, kind: 'invest', meta: { internal: true, opKey: `land-buy:${uid()}`, description: 'Wallet to land', ref: { type: 'land', id: plotId } } });
    if (!r.ok) return no('Could not complete the purchase.');
    const now = nowMinutes();
    useLandStore.setState((s) => ({ owned: { ...s.owned, [plotId]: { cost: plot.price, value: plot.price, boughtAt: now } }, history: [{ id: uid(), plotId, kind: 'bought' as const, amount: plot.price, at: now }, ...s.history].slice(0, 100) }));
    return { ok: true } as Result;
  }, no('Already submitted.'));
}

export function sellPlot(plotId: string): Result {
  const own = land().owned[plotId], plot = getPlot(plotId);
  if (!own || !plot) return no('You do not own this plot.');
  return guarded(`land-sell|${plotId}`, () => {
    const proceeds = saleProceeds(own.value);
    // remove ownership FIRST so a second tap cannot sell it again
    useLandStore.setState((s) => { const owned = { ...s.owned }; delete owned[plotId]; return { owned, realized: s.realized + (proceeds - own.cost), history: [{ id: uid(), plotId, kind: 'sold' as const, amount: proceeds, at: nowMinutes() }, ...s.history].slice(0, 100) }; });
    useEconomyStore.getState().post({ direction: 'income', amount: proceeds, label: `Sold land: ${plot.name}`, kind: 'invest', meta: { internal: true, opKey: `land-sell:${plotId}:${own.boughtAt}`, description: `Value ${formatNaira(own.value)} minus ${LAND.sellFeeBps / 100}% fee`, ref: { type: 'land', id: plotId } } });
    return { ok: true } as Result;
  }, no('Already submitted.'));
}

/** Weekly appreciation for game week `period`. Runs once per week; floors every value to whole naira. */
export function growLand(period: number) {
  if (period <= land().lastGrowthPeriod) return;
  const owned = land().owned;
  const next = Object.fromEntries(Object.entries(owned).map(([id, o]) => [id, { ...o, value: o.value + Math.floor((o.value * (getPlot(id)?.growthBps ?? 0)) / 10_000) }]));
  useLandStore.setState({ owned: next, lastGrowthPeriod: period });
  const gain = Object.keys(next).reduce((s, id) => s + next[id].value - owned[id].value, 0);
  if (gain > 0) notify({ title: 'Land values rose', body: `Your plots gained ${formatNaira(gain)} this week.`, icon: '🗺️', appId: 'invest' });
}

export const landValue = () => Object.values(land().owned).reduce((s, o) => s + o.value, 0);
