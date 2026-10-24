/**
 * Central balance and tuning values for the v8 systems (pricing, interior geometry, placement, NEPA/backup power).
 * One place on purpose: a future admin dashboard (or a server config) replaces these numbers, and nothing else changes.
 * Values that would affect real money or shared state in multiplayer must be re-validated by the backend; see docs/SYSTEMS.md.
 */

/** Interior partition height in world units (the old fixed value was 0.95). Outer back/left walls keep `layout.wallHeight`. */
export const INTERIOR_WALL_HEIGHT = 1.4;

/** Wall-mounted items sit this far in FRONT of the wall's finished surface (includes the interior finish panel, 0.012 thick). */
export const WALL_MOUNT_GAP = 0.02;

export const PRICING = {
  /** Allowed range of the future admin "affordability" setting. */
  min: 0.1,
  max: 0.9,
  /**
   * The multiplier at which a base price is charged unchanged. The factor applied to prices is `multiplier / neutral`,
   * so 0.1 = one fifth of the base price, 0.5 = base price (today's prices), 0.9 = 1.8x the base price.
   */
  neutral: 0.5,
  /** Value used until the admin setting exists. 0.5 keeps every current price exactly as it was. */
  default: 0.5,
} as const;

/** Camera focus when an item is placed. */
export const PLACE_FOCUS = {
  /** How close the camera moves (1 = no zoom, 0.5 = half the normal distance). */
  zoomFactor: 0.55,
  /** Seconds the camera stays on the item before easing back on its own. */
  holdSeconds: 3.2,
  /** Ease speed (higher = snappier). */
  ease: 5,
  /** Ignore a second focus request for the same item inside this window (duplicate state updates). */
  dedupeMs: 700,
} as const;

/** NEPA outages and backup power. Real seconds, because the game clock runs one game minute per real second. */
export const POWER = {
  /** Time on grid power between outages: random in [min, max]. */
  gapSeconds: [420, 900] as [number, number],
  /** Outage length: random in [min, max]. */
  outageSeconds: [75, 160] as [number, number],
  /** Homes without reliable public power (publicPower: false) get the gaps shortened by this factor. */
  unreliableGapFactor: 0.55,
  /** The first outage never starts before this many seconds of play. */
  graceSeconds: 240,
  /** Light level (0..1 of normal room light) during an outage with no backup. Never zero: the house is dim, not black. */
  dimLevel: 0.22,
  /** Each placed floor lamp adds this much light during an outage, up to `lampCap`. */
  lampBonus: 0.12,
  lampCap: 0.5,
  /** Backup power items (ids in data/items.ts). Prices there are base prices and go through the shared pricing function. */
  items: { manual: 'ibeta', auto: 'generator', solar: 'solar_system' },
} as const;

/** Pets. Behaviour numbers per species live in world/petBrain.ts (SPECIES); these are home-wide limits. */
export const PETS = {
  /** Animated pets per home. Keeps the scene cheap: each pet is ~25 small meshes and one frame callback. */
  maxPerHome: 3,
  maxBallsPerHome: 2,
  /** A pet will not go back to the ball for this many seconds after playing. */
  playCooldown: 10,
} as const;

/** World map presentation. */
export const MAP = {
  /** Camera tilt in radians from straight down. Was 0.38 (nearly top-down). 0.75 is an angled, isometric-like view; still never side-on. */
  polar: 0.75,
  /** Roadside billboards are drawn this many times bigger than their 1.4-1.9 m definitions, so they read at map distance. */
  billboardScale: 2.6,
} as const;

/** Pet care (see game/petCare.ts). Pets never die or leave: neglect only lowers bond and mood. */
export const PET_CARE = {
  /** Hunger (0 = full, 100 = starving) rises this much per second of play: empty in about 42 minutes. */
  hungerPerSecond: 0.04,
  /** Feeding removes this much hunger. */
  feedRelief: 70,
  /** Refuse feeding below this hunger, and refuse playing above `playMaxHunger`. */
  feedMinHunger: 20,
  playMaxHunger: 85,
  /** Bond (0..100) gained per action, and the cooldown (seconds) before the same action on the same pet earns bond again. */
  bondGain: { pet: 2, feed: 4, play: 5 },
  bondCooldownSeconds: { pet: 45, feed: 120, play: 60 },
  /** Bond lost per second while the pet is starving (hunger 100). */
  starvingBondLoss: 1 / 60,
  /** Bond raises the happiness a pet activity gives the player by up to this fraction (at bond 100). */
  bondHappinessBonus: 0.5,
  /** Price of a serving of pet food by species (base price, goes through the shared pricing function). */
  foodCost: { cat: 1500, dog: 2500, lion: 12000 },
} as const;

/**
 * Invitation rewards. In-game naira only: nothing here can be withdrawn or turned into real money. A real-money referral
 * programme would need its own backend, fraud controls, terms and legal / payment-provider review.
 */
export const REFERRAL = {
  /** The referred player must spend at least this much in the game before the invite counts. */
  minSpend: 15_000,
  /** What the inviter earns for each qualifying friend. */
  reward: 1_000,
  /** Which kinds of money going out count as spending. Transfers, savings, bonds, bets and investments do NOT (they can be cycled). */
  spendKinds: ['purchase', 'food', 'visit'] as readonly string[],
  /** Money coming back for these kinds is taken off the spend (selling an item back must not count as spending). */
  refundKinds: ['refund'] as readonly string[],
} as const;

/** NPCs in public interiors (world/petBrain.ts drives them with the same navigation grid as the player). */
export const NPC = { minSpacing: 1.1, chatterSeconds: [18, 40] as [number, number] };

/**
 * Crime and jail. Fictional gameplay. `baseSuccess` is the chance a first pickpocket attempt works; every point of criminality
 * (wanted level) lowers it by `penaltyPerPoint` down to `minSuccess` and makes sentences longer. A success adds
 * `criminalityPerSuccess`, an arrest adds `criminalityPerArrest`. Serving a full sentence takes `reliefPerSentence` off.
 * Local simulation only: a multiplayer server must roll the dice, set sentences and own the clock (see game/crime.ts).
 */
export const CRIME = {
  baseSuccess: 0.5, penaltyPerPoint: 0.02, minSuccess: 0.15,
  criminalityPerSuccess: 1, criminalityPerArrest: 2, reliefPerSentence: 1, maxCriminality: 30,
  walletRange: [2000, 12000] as [number, number],
  /** A successful theft takes this share of the NPC's wallet. */
  takeShare: [0.5, 1] as [number, number],
  sentenceBaseMinutes: 10, sentencePerPointMinutes: 5, maxSentenceMinutes: 120,
  cooldownSeconds: 20,
} as const;
