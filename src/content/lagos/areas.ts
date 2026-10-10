import type { AreaDefinition } from '@/types/world';

type Base = Omit<AreaDefinition, 'stateId' | 'propertyIds'>;

/** Property ids are attached automatically from the property catalogue (see index.ts). */
export const AREAS: Base[] = [
  { id: 'lagos.mushin', name: 'Mushin', tagline: 'Loud, proud, affordable.', positioning: 'lowIncome', description: 'Dense mainland neighbourhood known for compound housing, markets and nonstop energy.', mapData: { position: [-14, -7], radius: 3.2, color: '#E4572E' } },
  { id: 'lagos.agege', name: 'Agege', tagline: 'Quiet streets, fresh bread.', positioning: 'lowIncome', description: 'Residential mainland area with budget-friendly units and a calmer pace.', mapData: { position: [-24, -13], radius: 3.4, color: '#D9A441' } },
  { id: 'lagos.surulere', name: 'Surulere', tagline: 'Football, family, flats.', positioning: 'workingClass', description: 'Established mainland district with family flats and the National Stadium.', mapData: { position: [-14, 2], radius: 3.4, color: '#4BAE55' } },
  { id: 'lagos.yaba', name: 'Yaba', tagline: 'Tech, students, hustle.', positioning: 'midIncome', description: 'Lagos\'s tech and university corridor. Compact homes and flats near everything.', mapData: { position: [-8, -9], radius: 3.2, color: '#38BDF8' } },
  { id: 'lagos.ikeja', name: 'Ikeja', tagline: 'State capital, GRA calm.', positioning: 'midIncome', description: 'Government, airport and leafy estates. Comfortable family flats.', mapData: { position: [-15, -17], radius: 3.6, color: '#8A63D2' } },
  { id: 'lagos.lagos-island', name: 'Lagos Island', tagline: 'Where Lagos began.', positioning: 'midIncome', description: 'Historic business core: markets, colonial buildings and compact city flats.', mapData: { position: [3, 2], radius: 3.4, color: '#FFC21A' } },
  { id: 'lagos.victoria-island', name: 'Victoria Island', tagline: 'Money, nightlife, skyline.', positioning: 'affluent', description: 'Banks, clubs and high-rise luxury living on the lagoon.', mapData: { position: [9, 12], radius: 4, color: '#19C3A6' } },
  { id: 'lagos.ikoyi', name: 'Ikoyi', tagline: 'Old money, big gates.', positioning: 'affluent', description: 'Leafy, quiet and expensive, with walled homes and polo-club energy.', mapData: { position: [13, 0], radius: 3.2, color: '#B8892F' } },
  { id: 'lagos.lekki', name: 'Lekki', tagline: 'New Lagos, new money.', positioning: 'affluent', description: 'Fast-growing peninsula of gated estates, duplexes and beachfront lifestyle.', mapData: { position: [24, 12], radius: 4.4, color: '#FF8A3D' } },
  { id: 'lagos.banana-island', name: 'Banana Island', tagline: 'The address of addresses.', positioning: 'ultraLuxury', description: 'Man-made island of mansions and waterfront estates. Few people live here.', mapData: { position: [21, -4.5], radius: 3.2, color: '#FF4D6D' } },
];
