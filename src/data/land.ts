import { CITY_CATALOG } from '@/content/cities';

/**
 * Land for sale, by city. Ids are stable (`<cityId>.plot-<n>`), so ownership never depends on a display name or on which city
 * is selected on the map. Prices are game values. Mechanics that are implemented: buy, appreciate weekly by `growthBps`, sell
 * (minus the registry fee). NOT implemented: rent, building on the plot, 3D plots on the map.
 */
export type LandKind = 'Residential' | 'Commercial' | 'Farmland' | 'Industrial';
export interface PlotDef { id: string; cityId: string; district: string; name: string; sqm: number; price: number; kind: LandKind; growthBps: number }

const rows: Record<string, [district: string, sqm: number, price: number, kind: LandKind, growthBps: number][]> = {
  lagos: [['Epe', 600, 9_500_000, 'Residential', 35], ['Ibeju-Lekki', 900, 24_000_000, 'Residential', 55], ['Ikorodu', 450, 7_800_000, 'Residential', 30], ['Badagry', 1200, 6_200_000, 'Farmland', 25], ['Sangotedo', 700, 32_000_000, 'Commercial', 50], ['Agbara', 2000, 28_000_000, 'Industrial', 40]],
  abuja: [['Kuje', 800, 8_500_000, 'Residential', 30], ['Gwagwalada', 600, 6_500_000, 'Residential', 28], ['Lugbe', 500, 12_000_000, 'Residential', 40], ['Karshi', 1500, 5_000_000, 'Farmland', 22], ['Kubwa', 700, 15_000_000, 'Commercial', 45], ['Bwari', 2500, 11_000_000, 'Industrial', 35]],
  'port-harcourt': [['Eleme', 1000, 9_000_000, 'Industrial', 38], ['Choba', 450, 7_000_000, 'Residential', 32], ['Oyigbo', 600, 4_800_000, 'Residential', 26], ['Obio-Akpor', 500, 13_000_000, 'Commercial', 42], ['Rumuola', 400, 11_500_000, 'Residential', 36], ['Ikwerre', 1800, 3_900_000, 'Farmland', 20]],
  edo: [['Benin GRA', 600, 14_000_000, 'Residential', 34], ['Ekpoma', 700, 3_800_000, 'Residential', 22], ['Uromi', 1600, 3_100_000, 'Farmland', 20], ['Auchi', 900, 4_200_000, 'Commercial', 26], ['Ugbowo', 500, 6_000_000, 'Residential', 30], ['Ikpoba Hill', 1200, 5_400_000, 'Industrial', 28]],
};
export const PLOTS: PlotDef[] = CITY_CATALOG.flatMap((c) => (rows[c.id] ?? []).map(([district, sqm, price, kind, growthBps], i) => ({
  id: `${c.id}.plot-${i + 1}`, cityId: c.id, district, name: `${district}, ${sqm} sqm ${kind.toLowerCase()} plot`, sqm, price, kind, growthBps,
})));
export const getPlot = (id: string) => PLOTS.find((p) => p.id === id);
export const plotsIn = (cityId: string) => PLOTS.filter((p) => p.cityId === cityId);
export const cityName = (id: string) => CITY_CATALOG.find((c) => c.id === id)?.name ?? id;
