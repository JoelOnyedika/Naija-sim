/**
 * Advertising types shared by both products: Sea Ads (floating on the water) and physical Billboards.
 * Slots are DATA derived from a state's map; submissions are the player's purchases. Nothing here is secure on its own:
 * see docs/ADS_AND_MAP.md for what is frontend-only and what a production backend must do.
 */
export type AdKind = 'sea' | 'billboard';
/** draft -> pending (after simulated checkout) -> active (after approval) -> expired (3 days later) ; pending -> rejected. */
export type AdStatus = 'draft' | 'pending' | 'active' | 'rejected' | 'expired';

export interface AdSubmission {
  id: string;
  stateId: string;
  kind: AdKind;
  slotId: string;
  advertiser: string;
  description: string;
  websiteUrl?: string;
  /** Downscaled artwork as a data URL (kept small so localStorage survives). */
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Price in naira at the moment of purchase (config can change later). */
  price: number;
  status: AdStatus;
  /** Set when the simulated checkout was confirmed. NEVER a real payment. */
  paymentStatus: 'none' | 'simulated';
  createdAt: number;
  submittedAt?: number;
  reviewedAt?: number;
  rejectReason?: string;
  /** Timestamps (ms since epoch). Expiry is always computed from these, never from an in-memory timer. */
  activatedAt?: number;
  expiresAt?: number;
  /** How long the placement lasts once active (ms). Stored so later config changes do not alter running ads. */
  durationMs: number;
}

export type SlotAvailability = 'available' | 'reserved' | 'occupied';

export interface SeaSlot {
  id: string;
  /** Centre on the water plane (map x, z). */
  x: number; z: number;
  /** Ad plane size in map units (2:1). */
  w: number; h: number;
  tier: string;
  price: number;
}
export interface BillboardSlot {
  id: string;
  name: string;
  areaId?: string;
  position: [number, number];
  format: 'wide' | 'standard';
  sizeLabel: string;
  /** Where the board is, in words a player understands: "Murtala Muhammed International Airport", "Near Eko Hotel and Suites". */
  location: string;
  /** Road it stands on, when the road has a name ("Airport Road"). */
  road?: string;
  tier: string;
  price: number;
  durationMs: number;
}

export interface SeaTier { id: string; label: string; /** Slots whose centre is within this distance of land. */ maxDistToLand: number; price: number }
export interface AdsConfig {
  seaDurationDays: number;
  seaSlot: { w: number; h: number; pitchX: number; pitchZ: number };
  seaTiers: SeaTier[];
  billboardDurationDays: number;
  billboardBasePrice: Record<'wide' | 'standard', number>;
  /** Multiplier on the base price by billboard tier; boards not listed use 'standard'. */
  billboardTierMultiplier: Record<string, number>;
  billboardTierById: Record<string, string>;
  billboardSizeLabel: Record<'wide' | 'standard', string>;
  upload: { maxBytes: number; types: string[]; minWidth: number; maxWidth: number; maxAspect: number; storeWidth: number };
  rules: string[];
  refundPolicy: string;
}
