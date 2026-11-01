export type VehicleBody = 'sedan' | 'suv' | 'truck' | 'sport' | 'keke';
/**
 * Every car the player can own has a real model: `model` is the file name (no extension) in public/models/cars/, and its picture for
 * the dealership card is public/models/cars/thumbs/<model>.webp. The `type` is only used for the phone app's icon and for the
 * simple procedural body that the street traffic and the cab/keke rides are built from.
 */
export interface VehicleDef { id: string; name: string; price: number; type: VehicleBody; color: string; blurb: string; model: string }

export const VEHICLES: VehicleDef[] = [
  { id: 'audi', name: 'Audi R8', price: 55_000_000, type: 'sedan', color: '#B8202E', blurb: 'Sharp lines, quiet confidence.', model: 'audi' },
  { id: 'dodge', name: 'Dodge Challenger', price: 75_000_000, type: 'sport', color: '#E4572E', blurb: 'American muscle. You will hear it before you see it.', model: 'dodge' },
  { id: 'tesla', name: 'Tesla Roadster', price: 150_000_000, type: 'sedan', color: '#F4F1EA', blurb: 'Silent, quick and very online.', model: 'tesla' },
  { id: 'gtr', name: 'Nissan GT-R', price: 300_000_000, type: 'sport', color: '#C9CED1', blurb: 'Godzilla. Takes the Third Mainland Bridge personally.', model: 'gtr' },
  { id: 'supercar', name: 'Lamborghini Hurac\u00e1n', price: 480_000_000, type: 'sport', color: '#FFC21A', blurb: 'Low, wide and mostly for the gram.', model: 'huracan' },
  { id: 'agera', name: 'Koenigsegg Agera', price: 1_500_000_000, type: 'sport', color: '#3A78D4', blurb: 'A hypercar. Nobody in Lagos needs it. Everybody wants it.', model: 'agera' },
];
export const getVehicle = (id: string) => VEHICLES.find((v) => v.id === id);

/** Cars that used to be in the catalog without a real model. Old saves that own them get their money back (see vehicleStore). */
export const REMOVED_CAR_PRICES: Record<string, number> = { keke: 1_800_000, corolla: 6_500_000, camry: 14_000_000, hilux: 38_000_000, rx350: 45_000_000, rangerover: 120_000_000, gwagon: 220_000_000 };
