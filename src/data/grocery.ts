/**
 * Grocery catalogue. Art is emoji (no image downloads, works offline). Prices are game values. Delivery is charged only below
 * the free-delivery amount. Orders are RECORDS: when delivered they add to a pantry list, not to the 3D house (see game/grocery.ts).
 */
export type GroceryCategory = 'Staples' | 'Produce' | 'Protein' | 'Pantry' | 'Drinks';
export interface Product { id: string; name: string; glyph: string; vendor: string; category: GroceryCategory; unit: string; price: number; blurb: string }
export const VENDORS = ['Mile 12 Market Stall', 'Alaba Provisions', 'Mama Cass Frozen Foods'] as const;
const p = (id: string, name: string, glyph: string, vendor: (typeof VENDORS)[number], category: GroceryCategory, unit: string, price: number, blurb: string): Product => ({ id, name, glyph, vendor, category, unit, price, blurb });
export const PRODUCTS: Product[] = [
  p('rice', 'Local rice', '🍚', 'Alaba Provisions', 'Staples', '5 kg bag', 9_500, 'Stone-free and ready for jollof.'),
  p('beans', 'Honey beans', '🫘', 'Alaba Provisions', 'Staples', '2 kg', 4_200, 'For moin moin and ewa agoyin.'),
  p('garri', 'Ijebu garri', '🥣', 'Alaba Provisions', 'Staples', '2 kg', 2_300, 'Crispy and sour, just right.'),
  p('indomie', 'Indomie noodles', '🍜', 'Alaba Provisions', 'Staples', 'carton of 40', 9_800, 'The student essential.'),
  p('bread', 'Sliced bread', '🍞', 'Alaba Provisions', 'Staples', 'loaf', 1_700, 'Fresh from the bakery.'),
  p('oil', 'Vegetable oil', '🛢️', 'Alaba Provisions', 'Pantry', '3 litres', 7_200, 'For frying and stews.'),
  p('tomatopaste', 'Tomato paste', '🥫', 'Alaba Provisions', 'Pantry', 'tin x 6', 2_400, 'Naija stew starts here.'),
  p('cubes', 'Seasoning cubes', '🧂', 'Alaba Provisions', 'Pantry', 'pack of 50', 1_300, 'Maggi-style stock cubes.'),
  p('salt', 'Table salt', '🧂', 'Alaba Provisions', 'Pantry', '500 g', 400, 'A small pack goes far.'),
  p('yam', 'Tuber of yam', '🍠', 'Mile 12 Market Stall', 'Produce', 'medium', 3_500, 'Pounded, boiled or fried.'),
  p('plantain', 'Plantain', '🍌', 'Mile 12 Market Stall', 'Produce', 'bunch of 6', 2_000, 'Ripe for dodo, firm for roasting.'),
  p('tomatoes', 'Tomatoes', '🍅', 'Mile 12 Market Stall', 'Produce', 'basket', 4_800, 'Fresh from Mile 12.'),
  p('peppers', 'Tatashe and rodo', '🌶️', 'Mile 12 Market Stall', 'Produce', 'small basket', 3_000, 'Heat for the stew.'),
  p('onions', 'Onions', '🧅', 'Mile 12 Market Stall', 'Produce', '1 kg', 1_800, 'Red onions for everything.'),
  p('ugu', 'Ugu leaves', '🥬', 'Mile 12 Market Stall', 'Produce', 'bunch', 700, 'For egusi and vegetable soup.'),
  p('eggs', 'Eggs', '🥚', 'Mile 12 Market Stall', 'Protein', 'crate of 30', 4_600, 'Boiled, fried or scrambled.'),
  p('chicken', 'Frozen chicken', '🍗', 'Mama Cass Frozen Foods', 'Protein', '1.5 kg', 6_800, 'Cut up and ready.'),
  p('beef', 'Beef', '🥩', 'Mama Cass Frozen Foods', 'Protein', '1 kg', 7_500, 'For stew and suya.'),
  p('fish', 'Titus fish', '🐟', 'Mama Cass Frozen Foods', 'Protein', '1 kg', 5_200, 'Frozen mackerel.'),
  p('croaker', 'Croaker fish', '🐠', 'Mama Cass Frozen Foods', 'Protein', '1 kg', 6_400, 'For pepper soup.'),
  p('water', 'Bottled water', '💧', 'Mama Cass Frozen Foods', 'Drinks', 'pack of 12', 2_100, 'Pure and cold.'),
  p('zobo', 'Zobo drink', '🥤', 'Mama Cass Frozen Foods', 'Drinks', '1.5 litre', 1_500, 'Hibiscus and ginger.'),
  p('milk', 'Peak milk', '🥛', 'Alaba Provisions', 'Drinks', 'tin x 12', 5_400, 'For tea and cereal.'),
  p('tea', 'Lipton tea', '🫖', 'Alaba Provisions', 'Drinks', 'box of 25', 1_900, 'Strong with sugar.'),
];
export const getProduct = (id: string) => PRODUCTS.find((x) => x.id === id);
export const CATEGORIES: GroceryCategory[] = ['Staples', 'Produce', 'Protein', 'Pantry', 'Drinks'];
export const GROCERY = { deliveryFee: 700, freeDeliveryFrom: 10_000, maxPerLine: 20, preparingMinutes: 4, deliveryMinutes: 10 };
