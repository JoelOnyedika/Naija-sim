import type { LandmarkDefinition } from '@/types/world';

type Base = Omit<LandmarkDefinition, 'stateId'>;

export const LANDMARKS: Base[] = [
  { id: 'lagos.quilox', areaId: 'lagos.victoria-island', name: 'Quilox', category: 'club', icon: '🪩', modelId: 'quilox', position: [6, 11.5],
    tagline: 'Create your Lagos story.', description: 'Hang out at Quilox, meet real players and gist.', visit: { cost: 15000, seconds: 8, effects: { social: 25, happiness: 18, energy: -12, hygiene: -6 }, taskEvent: 'club' } },
  { id: 'lagos.balogun', areaId: 'lagos.lagos-island', name: 'Balogun Market', category: 'market', icon: '🛍️', modelId: 'balogun', position: [2, -0.5],
    tagline: 'Shop, haggle, repeat.', description: 'Fabric, shoes and anything else. Bargain hard and watch your pockets.', visit: { cost: 5000, seconds: 7, effects: { social: 8, happiness: 8, energy: -10, charisma: 1 }, taskEvent: 'market' } },
  { id: 'lagos.freedom-park', areaId: 'lagos.lagos-island', name: 'Freedom Park', category: 'park', icon: '🎨', modelId: 'freedomPark', position: [4.5, 4.5],
    tagline: 'Art, music and open air.', description: 'Visit the park, meet people and complete activities.', visit: { cost: 1000, seconds: 6, effects: { happiness: 14, social: 10, charisma: 1, energy: -5 }, taskEvent: 'art' } },
  { id: 'lagos.national-theatre', areaId: 'lagos.surulere', name: 'National Theatre', category: 'culture', icon: '🎭', modelId: 'nationalTheatre', position: [-10, 4.5],
    tagline: 'A landmark with a story.', description: 'Catch a show or just admire the building.', visit: { cost: 3000, seconds: 7, effects: { happiness: 12, charisma: 2, energy: -6 }, taskEvent: 'culture' } },
  { id: 'lagos.eko-atlantic', areaId: 'lagos.victoria-island', name: 'Eko Atlantic', category: 'business', icon: '🏙️', modelId: 'ekoAtlantic', position: [15, 17],
    tagline: 'The future skyline.', description: 'Glass towers on reclaimed land. Network with people who matter.', visit: { cost: 2000, seconds: 7, effects: { charisma: 3, social: 6, energy: -8 }, taskEvent: 'business' } },
  { id: 'lagos.computer-village', areaId: 'lagos.ikeja', name: 'Computer Village', category: 'tech', icon: '📱', modelId: 'computerVillage', position: [-15, -14],
    tagline: 'Phones, parts, noise.', description: 'Ikeja\'s famous electronics market. Look around, nobody leaves without haggling.', visit: { cost: 4000, seconds: 6, effects: { happiness: 6, charisma: 1, energy: -8 }, taskEvent: 'tech' } },
  { id: 'lagos.mama-put', areaId: 'lagos.yaba', name: 'Mama Put Kitchen', category: 'food', icon: '🍛', modelId: 'mamaPut', position: [-8.5, -6],
    tagline: 'Food that hugs back.', description: 'Rice, stew and plenty of plantain. Eat well, spend small.', visit: { cost: 3500, seconds: 6, effects: { hunger: 45, thirst: 15, happiness: 8 }, taskEvent: 'food' } },
  { id: 'lagos.eko-trust-bank', areaId: 'lagos.ikoyi', name: 'Eko Trust Bank', category: 'bank', icon: '🏦', modelId: 'bank', position: [12, 1.5],
    tagline: 'Your money, in safe hands.', description: 'Branch with polished floors and a long queue. Good for networking.', visit: { cost: 0, seconds: 5, effects: { charisma: 1, energy: -4 }, taskEvent: 'bank' } },
  { id: 'lagos.lekki-beach', areaId: 'lagos.lekki', name: 'Lekki Beach', category: 'beach', icon: '🏖️', modelId: 'beach', position: [28, 14.5],
    tagline: 'Sand, suya and sunset.', description: 'Relax by the sea. Weekend crowd, loud music and good vibes.', visit: { cost: 2500, seconds: 7, effects: { happiness: 22, social: 12, energy: -4, hygiene: -4 }, taskEvent: 'beach' } },
];
