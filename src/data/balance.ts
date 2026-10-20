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
