/**
 * Company rules and balancing numbers, all in one place. Every money figure for a category is the "food" example number
 * multiplied by that category's scale (startup cost / 2,500,000), so categories differ in size but follow the same rules.
 * Design guarantee (tested): each employee earns more than they cost, and the manager costs less than the base revenue, so a
 * running company's daily result is never negative.
 */
export interface CategoryDef { id: string; name: string; glyph: string; startup: number; roles: string[]; blurb: string }
export const COMPANY_CATEGORIES: CategoryDef[] = [
  { id: 'tech', name: 'Technology startup', glyph: '💻', startup: 4_000_000, roles: ['Developer', 'Designer', 'Support agent'], blurb: 'Apps and software for Nigerian users.' },
  { id: 'food', name: 'Food and catering', glyph: '🍛', startup: 2_500_000, roles: ['Cook', 'Server', 'Delivery rider'], blurb: 'Mama Put style kitchens and party catering.' },
  { id: 'transport', name: 'Transport', glyph: '🚌', startup: 6_000_000, roles: ['Driver', 'Mechanic', 'Dispatcher'], blurb: 'Keke, bus and ride services.' },
  { id: 'retail', name: 'Retail', glyph: '🛍️', startup: 3_000_000, roles: ['Shop attendant', 'Stock keeper', 'Cashier'], blurb: 'Provision stores and fashion stalls.' },
  { id: 'realestate', name: 'Real estate', glyph: '🏘️', startup: 9_000_000, roles: ['Agent', 'Surveyor', 'Caretaker'], blurb: 'Sell and manage properties.' },
  { id: 'logistics', name: 'Logistics', glyph: '📦', startup: 5_000_000, roles: ['Rider', 'Warehouse hand', 'Coordinator'], blurb: 'Parcels and freight across cities.' },
  { id: 'fashion', name: 'Fashion', glyph: '🧵', startup: 2_000_000, roles: ['Tailor', 'Designer', 'Sales rep'], blurb: 'Native wear and ready-to-wear.' },
  { id: 'media', name: 'Media and content', glyph: '🎬', startup: 3_500_000, roles: ['Producer', 'Editor', 'Presenter'], blurb: 'Skits, radio shows and brand content.' },
  { id: 'hospitality', name: 'Hospitality', glyph: '🏨', startup: 7_000_000, roles: ['Receptionist', 'Housekeeper', 'Chef'], blurb: 'Guest houses and event centres.' },
];
export const getCategory = (id: string) => COMPANY_CATEGORIES.find((c) => c.id === id);
export const LOGOS = ['🏢', '🍛', '🚚', '💡', '🌍', '⭐', '🔥', '🏗️', '🎯', '🦅'];

export const COMPANY = {
  /** Companies a standard account can own. */
  slots: 4,
  /** Extra slots shown as a FUTURE feature. They cannot be bought: no payment system exists. */
  futureSlots: 2,
  capacity: [8, 12, 24],           // staff, by level 1..3
  branchCap: [0, 1, 3],            // branches besides HQ, by level 1..3
  levelRevenueBps: [10_000, 14_000, 20_000],
  levelCostBps: [0, 8_000, 20_000],  // upgrade cost as a share of startup (to level 2, level 3)
  efficiency: { max: 3, bonusBps: 1_000, costBps: [3_000, 6_000, 9_000] },
  // "food" example numbers (naira per game day unless noted), scaled per category:
  base: { revenue: 180_000, perStaff: 40_000, managerWage: 60_000, staffWage: 20_000, managerHire: 150_000, staffHire: 30_000, branchOpen: 1_200_000, branchOpex: 25_000, branchRevenue: 90_000 },
  /** Level 2 needs a manager and 4 staff. Level 3 needs 8 staff and a branch. */
  prereq: [{ staff: 0, branches: 0 }, { staff: 4, branches: 0 }, { staff: 8, branches: 1 }],
  startupFeeCap: 30,
  /** A company can pay its owner out once per game day. */
  payoutCooldownDays: 1,
};
export const scaleOf = (categoryId: string) => (getCategory(categoryId)?.startup ?? 2_500_000) / 2_500_000;
export const scaled = (n: number, categoryId: string) => Math.round((n * scaleOf(categoryId)) / 100) * 100;

export interface ChannelDef { id: string; name: string; glyph: string; baseCost: number; days: number; bonusBps: number; blurb: string }
/** Marketing channels. Cost is scaled by category. The effect is a revenue bonus while the campaign runs (a game rule). */
export const MARKETING: ChannelDef[] = [
  { id: 'flyers', name: 'Flyers', glyph: '📄', baseCost: 150_000, days: 1, bonusBps: 500, blurb: 'Hand out flyers around the neighbourhood.' },
  { id: 'social', name: 'Social media campaign', glyph: '📱', baseCost: 600_000, days: 2, bonusBps: 1_000, blurb: 'Paid posts and influencer shout-outs.' },
  { id: 'radio', name: 'Radio advertising', glyph: '📻', baseCost: 2_500_000, days: 3, bonusBps: 2_000, blurb: 'Jingles on the morning drive.' },
];
export const getChannel = (id: string) => MARKETING.find((m) => m.id === id);
