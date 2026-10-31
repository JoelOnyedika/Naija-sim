export type VehicleBody = 'sedan' | 'suv' | 'truck' | 'sport' | 'keke';
/** `model` = file name (no extension) in public/models/cars/. Cars with a model are drawn from that GLB; the rest use the procedural body for `type`. */
export interface VehicleDef { id: string; name: string; price: number; type: VehicleBody; color: string; blurb: string; model?: string }

export const VEHICLES: VehicleDef[] = [
  { id: 'keke', name: 'Keke Napep', price: 1_800_000, type: 'keke', color: '#FFC21A', blurb: 'Three wheels, zero stress in traffic.' },
  { id: 'corolla', name: 'Toyota Corolla (Tokunbo)', price: 6_500_000, type: 'sedan', color: '#C9CED1', blurb: 'The people\'s car. Clean and reliable.' },
  { id: 'camry', name: 'Toyota Camry', price: 14_000_000, type: 'sedan', color: '#1B1F24', blurb: 'Muscle. Comfortable on Third Mainland.' },
  { id: 'hilux', name: 'Toyota Hilux', price: 38_000_000, type: 'truck', color: '#F4F1EA', blurb: 'Handles Nigerian potholes like nothing.' },
  { id: 'rx350', name: 'Lexus RX 350', price: 45_000_000, type: 'suv', color: '#2B4C7E', blurb: 'Soft ride, quiet cabin. Owambe ready.' },
  { id: 'audi', name: 'Audi', price: 55_000_000, type: 'sedan', color: '#1B1F24', blurb: 'Sharp lines, quiet confidence.', model: 'audi' },
  { id: 'dodge', name: 'Dodge', price: 75_000_000, type: 'sport', color: '#E4572E', blurb: 'American muscle. You will hear it before you see it.', model: 'dodge' },
  { id: 'rangerover', name: 'Range Rover Sport', price: 120_000_000, type: 'suv', color: '#0F2A27', blurb: 'Arrive like the party started because of you.' },
  { id: 'tesla', name: 'Tesla', price: 150_000_000, type: 'sedan', color: '#F4F1EA', blurb: 'Silent, quick and very online.', model: 'tesla' },
  { id: 'gwagon', name: 'Mercedes G-Wagon', price: 220_000_000, type: 'suv', color: '#222B2A', blurb: 'Boxy, loud, and impossible to ignore.' },
  { id: 'gtr', name: 'Nissan GT-R', price: 300_000_000, type: 'sport', color: '#C9CED1', blurb: 'Godzilla. Takes the Third Mainland Bridge personally.', model: 'gtr' },
  { id: 'supercar', name: 'Lamborghini Huracán', price: 480_000_000, type: 'sport', color: '#FFC21A', blurb: 'Low, wide and mostly for the gram.', model: 'huracan' },
  { id: 'agera', name: 'Koenigsegg Agera', price: 1_500_000_000, type: 'sport', color: '#3A78D4', blurb: 'A hypercar. Nobody in Lagos needs it. Everybody wants it.', model: 'agera' },
];
export const getVehicle = (id: string) => VEHICLES.find((v) => v.id === id);
