import type { Effects } from '@/types/game';

export interface FoodDef { id: string; name: string; vendor: string; price: number; glyph: string; effects: Effects; blurb: string }

export const FOODS: FoodDef[] = [
  { id: 'indomie', name: 'Indomie and egg', vendor: 'Mama Put Kitchen', price: 1200, glyph: '🍜', effects: { hunger: 25, happiness: 2 }, blurb: 'Quick and cheap. Always works.' },
  { id: 'jollof', name: 'Jollof rice and chicken', vendor: 'Mama Put Kitchen', price: 4500, glyph: '🍛', effects: { hunger: 50, happiness: 8 }, blurb: 'Party jollof. Do not start the argument.' },
  { id: 'amala', name: 'Amala, gbegiri and ewedu', vendor: 'Iya Basira Spot', price: 3800, glyph: '🥣', effects: { hunger: 48, happiness: 9 }, blurb: 'Hot, with plenty assorted meat.' },
  { id: 'suya', name: 'Suya (spicy)', vendor: 'Mallam Musa Suya', price: 5000, glyph: '🍢', effects: { hunger: 32, happiness: 12 }, blurb: 'Extra yaji. Onions on the side.' },
  { id: 'shawarma', name: 'Chicken shawarma', vendor: 'Eko Bites', price: 6500, glyph: '🌯', effects: { hunger: 38, happiness: 10 }, blurb: 'Loaded. Sausage included.' },
  { id: 'zobo', name: 'Chilled zobo', vendor: 'Mama Put Kitchen', price: 800, glyph: '🥤', effects: { thirst: 35, happiness: 4 }, blurb: 'Hibiscus, ginger, and a little pineapple.' },
  { id: 'water', name: 'Bottled water (x6)', vendor: 'Eko Bites', price: 1500, glyph: '💧', effects: { thirst: 50 }, blurb: 'Pure water. Cold.' },
];

export const getFood = (id: string) => FOODS.find((f) => f.id === id);
