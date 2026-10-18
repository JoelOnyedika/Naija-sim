import { VEHICLE_NETWORTH_BPS } from '@/data/economy';
import { getVehicle } from '@/data/vehicles';
import { ASSETS, useAppsStore } from '@/stores/appsStore';
import { useBankStore } from '@/stores/bankStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useLandStore } from '@/stores/landStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { getProperty } from '@/world/registry';

/**
 * Net worth = wallet + savings + active bond principal + homes at list price + land at its current value + market holdings
 * at current prices + company funds + cars at 80% of list price.
 * Each naira is counted in exactly one place: buying a bond or depositing to savings first removes it from the wallet,
 * a matured bond leaves this list when it is paid out, and company funds are not included (they are not personal money
 * until a payout). Furniture and finishes are not counted. This single function is used by Banking and Forbes.
 */
export interface NetWorth { wallet: number; savings: number; bonds: number; homes: number; land: number; markets: number; companies: number; vehicles: number; total: number }

export function computeNetWorth(): NetWorth {
  const wallet = useEconomyStore.getState().money;
  const bank = useBankStore.getState();
  const savings = bank.savings.balance;
  const bonds = bank.bonds.filter((b) => b.status === 'active').reduce((s, b) => s + b.principal, 0);
  const homes = usePropertyStore.getState().ownedIds.reduce((s, id) => s + (getProperty(id)?.price ?? 0), 0);
  const land = Object.values(useLandStore.getState().owned).reduce((s, o) => s + o.value, 0);
  const apps = useAppsStore.getState();
  const markets = ASSETS.reduce((s, a) => s + Math.round((apps.holdings[a.id] ?? 0) * (apps.prices[a.id] ?? 0)), 0);
  const companies = useCompanyStore.getState().companies.reduce((s, c) => s + c.funds, 0);
  const vehicles = useVehicleStore.getState().owned.reduce((s, id) => s + Math.floor(((getVehicle(id)?.price ?? 0) * VEHICLE_NETWORTH_BPS) / 10_000), 0);
  return { wallet, savings, bonds, homes, land, markets, companies, vehicles, total: wallet + savings + bonds + homes + land + markets + companies + vehicles };
}
