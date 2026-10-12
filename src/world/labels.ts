import type { AreaClass, PropertyCategory, PropertyDefinition } from '@/types/world';

export const POSITIONING_LABEL: Record<AreaClass, string> = {
  lowIncome: 'Budget', workingClass: 'Working class', midIncome: 'Mid-range', affluent: 'Upscale', ultraLuxury: 'Ultra luxury',
};
export const CATEGORY_LABEL: Record<PropertyCategory, string> = { starter: 'Starter', midLevel: 'Mid-level', upperClass: 'Upper class', luxury: 'Luxury' };
export const CATEGORY_ORDER: PropertyCategory[] = ['starter', 'midLevel', 'upperClass', 'luxury'];

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The three spec lines shown on a listing: rooms/bedrooms, bathrooms, parking. */
export function listingLines(p: PropertyDefinition): string[] {
  const first = p.unit === 'rooms' ? plural(p.rooms, 'Room') : plural(p.bedrooms, 'Bedroom');
  const bays = p.garageBays + p.parkingSpaces;
  const parking = bays > 0 ? `${bays}-Car Parking` : 'No Parking';
  return [first, plural(p.bathrooms, 'Bathroom'), parking];
}
export const ctaLabel = (p: PropertyDefinition) => (p.cta === 'move_in' ? 'MOVE IN' : 'BUY');
