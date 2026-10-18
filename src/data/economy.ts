/**
 * Economy rules for banking and scheduled events, in one place. Every number here is a *game rule* that can be tuned;
 * nothing in the UI hardcodes a rate, term, fee or threshold. All money is whole naira. Rates are basis points
 * (1 bp = 0.01%) so calculations stay in integers.
 */
export const DAY_MINUTES = 1440;
/** One "game week" of in-game clock time. At the default clock speed (CONFIG.gameMinutesPerSecond = 1) this is 2h48m of play. */
export const WEEK_MINUTES = 7 * DAY_MINUTES;

/** Used by net worth: a car counts at this share of its list price (matches the old Forbes formula). */
export const VEHICLE_NETWORTH_BPS = 8000;

export const SAVINGS = {
  /** Weekly interest on the savings balance at the moment the weekly run happens. 50 bps = 0.5%. */
  weeklyRateBps: 50,
  minDeposit: 500,
  /** A savings balance at or above this at a weekly run counts as a "consistent saving week" for Credibility. */
  consistencyMinBalance: 10_000,
};

export interface BondDef { id: string; name: string; glyph: string; termDays: number; returnBps: number; min: number; max: number; blurb: string }
/** In-game bonds. The return is fixed by these rules and paid at maturity; there is no default risk and no early redemption. */
export const BONDS: BondDef[] = [
  { id: 'nt-3d', name: '3-Day Treasury Bill', glyph: '📜', termDays: 3, returnBps: 120, min: 10_000, max: 5_000_000, blurb: 'Short lock, small steady return.' },
  { id: 'nt-7d', name: '7-Day Treasury Note', glyph: '🏛️', termDays: 7, returnBps: 300, min: 50_000, max: 50_000_000, blurb: 'One game week for a better return.' },
  { id: 'nt-14d', name: '14-Day Naija Bond', glyph: '💠', termDays: 14, returnBps: 700, min: 100_000, max: 500_000_000, blurb: 'Lock your money longer, earn the most.' },
];
export const getBond = (id: string) => BONDS.find((b) => b.id === id);
export const bondReturn = (principal: number, def: BondDef) => Math.floor((principal * def.returnBps) / 10_000);

export interface BillDef { id: string; label: string; glyph: string; appliesTo: 'home' | 'vehicle'; rateBps: number; min: number; max: number; note: string }
/** Recurring bills, charged once per game week. Amount = clamp(asset price x rate, min, max). */
export const BILLS: BillDef[] = [
  { id: 'electricity', label: 'Electricity (prepaid token)', glyph: '💡', appliesTo: 'home', rateBps: 5, min: 1_500, max: 150_000, note: 'Charged for the home you live in.' },
  { id: 'vehicle-maintenance', label: 'Vehicle maintenance', glyph: '🔧', appliesTo: 'vehicle', rateBps: 10, min: 4_000, max: 1_000_000, note: 'Charged for each car you own.' },
];
export const getBill = (id: string) => BILLS.find((b) => b.id === id);
export const billAmount = (def: BillDef, price: number) => Math.min(def.max, Math.max(def.min, Math.floor((price * def.rateBps) / 10_000)));

/**
 * Income tax: an in-game rule (the "Lagos Revenue Service"), not Nigerian tax law. Each game week the previous week's taxable income
 * (salary and business income: job pay, Hustle pay, company payouts) is taxed through these progressive brackets. `upTo` is the top
 * of a bracket for ONE game week of income (null = no limit); each bracket's rate applies only to the slice inside it.
 * Interest, bond returns, asset sales, refunds and transfers are not taxable. Set `enabled: false` to switch the whole system off.
 */
export const INCOME_TAX: { enabled: boolean; taxableKinds: string[]; brackets: { upTo: number | null; rateBps: number }[] } = {
  enabled: true,
  taxableKinds: ['salary', 'business'],
  brackets: [{ upTo: 150_000, rateBps: 0 }, { upTo: 600_000, rateBps: 500 }, { upTo: 2_000_000, rateBps: 1000 }, { upTo: null, rateBps: 1500 }],
};
export function taxOn(taxable: number): number {
  let tax = 0, floor = 0;
  for (const b of INCOME_TAX.brackets) {
    const top = b.upTo ?? Infinity;
    if (taxable > floor) tax += Math.floor((Math.min(taxable, top) - floor) * b.rateBps / 10_000);
    floor = top;
    if (taxable <= top) break;
  }
  return tax;
}

/** Credibility is a 0 to 100 in-game score. It never affects anything outside this game. */
export const CREDIBILITY = {
  base: 12,
  /** A transfer to a contact of at least this much is a "verified transfer". */
  transferThreshold: 500_000,
  /** Farming limits: one counted transfer per contact per game day, at most this many per contact in total. */
  maxTransfersPerContact: 3,
  pointsPerTransfer: 4, maxTransferPoints: 24,
  pointsPerSavingsWeek: 3, maxSavingsPoints: 24,
  pointsPerOnTimeBill: 2, maxBillPoints: 20,
  penaltyPerOverdueBill: 8,
  pointsPerBond: 6, maxBondPoints: 20,
};

/** Land: the sale fee is kept by the in-game registry, so buying and selling the same plot always loses money. */
export const LAND = { sellFeeBps: 500 };
export const MARKET_PERIOD = DAY_MINUTES;
