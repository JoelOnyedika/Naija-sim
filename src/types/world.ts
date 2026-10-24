import type { AdsConfig } from './ads';
/**
 * World content types. Everything a state (Lagos, Abuja, ...) provides is described here as DATA.
 * Core systems (houses, map, placement, saves) only read these types: they never mention a state by name.
 */

export type ZoneKind =
  | 'bedroom' | 'living' | 'parlour' | 'kitchen' | 'bathroom' | 'corridor'
  | 'balcony' | 'terrace' | 'garage' | 'parking' | 'compound' | 'garden'
  | 'waterfront' | 'neighbour' | 'security';

export type FloorKind = 'cement' | 'tile' | 'wood' | 'marble' | 'terrazzo' | 'paving' | 'grass' | 'concrete' | 'water' | 'dirt' | 'ceramic' | 'diamond';

/** A rectangular area of a property (a room, a yard, a garage bay row...). x = east, z = south. */
export interface Zone {
  id: string;
  kind: ZoneKind;
  label: string;
  x0: number; z0: number; x1: number; z1: number;
  floor: FloorKind;
  /** Walled (rooms) vs open-air (yards, garages, balconies). */
  indoor: boolean;
  /** Can the player place furniture here? */
  furnishable: boolean;
}

/** A doorway between two zones. Door position is computed from their shared edge. */
export interface Connection {
  a: string; b: string;
  /** Open-plan: no wall between the two indoor zones (they read as one room). */
  open?: boolean;
}

export type WindowStyle = 'louvre' | 'burglar' | 'sash' | 'glass' | 'panoramic';
export interface WindowSpec {
  wall: 'back' | 'left';
  /** Position along the wall: x for back windows, z for left windows. */
  along: number;
  width: number; height: number; sill: number;
  style: WindowStyle;
}

export interface Palette { wall: string; trim: string; accent: string }
export type WallFinish = 'rough' | 'painted' | 'render' | 'marble';
export type FenceKind = 'none' | 'zinc' | 'brick' | 'ironbar';

export type DecorKind =
  | 'tree' | 'palm' | 'drum' | 'clothesline' | 'gate' | 'pillar' | 'awning' | 'hedge'
  | 'bench' | 'generatorHouse' | 'lamppost' | 'jetty' | 'boat' | 'planter' | 'stairs' | 'rail';
export interface Decor {
  kind: DecorKind;
  x: number; z: number;
  rotation?: number;
  scale?: number;
  /** Length / width for stretched decor (awning, hedge, rail, jetty). */
  w?: number; d?: number;
}

/** Furniture that is part of the building (toilet, cooker). Not movable, not saved. */
export interface FixtureSpec { defId: string; x: number; z: number; rotation: number }

export interface Plot {
  x0: number; z0: number; x1: number; z1: number;
  ground: FloorKind;
  fence: FenceKind;
}

/** The 3D environment of a property, described procedurally. */
export interface PropertyLayout {
  id: string;
  plot: Plot;
  zones: Zone[];
  connections: Connection[];
  wallHeight: number;
  windows: WindowSpec[];
  palette: Palette;
  finish: WallFinish;
  decor: Decor[];
  fixtures: FixtureSpec[];
  /** Reliable public power? (Hook for future NEPA/generator gameplay.) */
  publicPower: boolean;
}

export type PropertyCategory = 'starter' | 'midLevel' | 'upperClass' | 'luxury';

export interface PropertyDefinition {
  id: string;
  stateId: string;
  areaId: string;
  name: string;
  category: PropertyCategory;
  price: number;
  /** Starter housing counts "rooms", everything else counts bedrooms. */
  unit: 'rooms' | 'bedrooms';
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  garageBays: number;
  parkingSpaces: number;
  layoutId: string;
  description: string;
  /** Button label flavour. Both result in ownership (renting is not implemented). */
  cta: 'move_in' | 'buy';
  /** 1 (basic) .. 10 (ultra luxury). Used for progression and sorting. */
  luxuryLevel: number;
}

export type AreaClass = 'lowIncome' | 'workingClass' | 'midIncome' | 'affluent' | 'ultraLuxury';

export interface AreaDefinition {
  id: string;
  stateId: string;
  name: string;
  tagline: string;
  description: string;
  positioning: AreaClass;
  propertyIds: string[];
  mapData: { position: [number, number]; radius: number; color: string };
}

export interface LandmarkDefinition {
  id: string;
  stateId: string;
  areaId?: string;
  name: string;
  tagline: string;
  description: string;
  category: 'government' | 'transport' | 'club' | 'market' | 'park' | 'culture' | 'business' | 'food' | 'beach' | 'bank' | 'tech' | 'shopping' | 'entertainment' | 'recreation';
  /** Short list of things to do here (shown on the map card). */
  activities?: string[];
  position: [number, number];
  /** Key into the state's scene model registry (see content/<state>/scene). */
  modelId: string;
  icon: string;
  /** Mock "visit" effects. */
  visit: { cost: number; seconds: number; effects: Partial<Record<string, number>>; taskEvent?: string };
}

/**
 * A replaceable advertising board in the world. Content is plain data so it can later come from anywhere
 * (a CMS, a purchase flow): `imageUrl` and `linkUrl` are reserved for that and are not used yet. Only the
 * text-and-colour layout renders today. There is no ad service behind this.
 */
export interface BillboardDefinition {
  id: string;
  stateId: string;
  areaId?: string;
  /** World position on the map (x, z) and the angle it faces. */
  position: [number, number];
  rotationY: number;
  /** 'wide' = 3:1 roadside board, 'standard' = 2:1. */
  format: 'wide' | 'standard';
  content: BillboardContent;
}
export interface BillboardContent {
  advertiser: string;
  headline: string;
  subline?: string;
  bg: string; fg: string; accent: string;
  /** Reserved for future ad content: a texture and a destination. Not loaded today. */
  imageUrl?: string;
  linkUrl?: string;
  /** Free-form metadata for a future ad system (campaign id, dates, ...). */
  meta?: Record<string, string>;
}

/** What a stretch of land is for. Drives the look of the district (buildings, density, props) in the state's scene. */
export type DistrictKind = 'dense' | 'market' | 'estate' | 'business' | 'civic' | 'airport' | 'industrial' | 'resort';
/** A rectangle of land. Everything not covered by a slab is water. */
export interface LandSlab {
  id: string; name: string; kind: DistrictKind; areaId?: string;
  /** Short map label for districts that are not one of the state's named areas (airport, port, ...). */
  label?: string;
  cx: number; cz: number; w: number; d: number;
  ground: string;
  /** Random-building density 0..1 and tallest building height. 0 = leave empty (airport, port). */
  density: number; tall: number; tin?: boolean;
  /** Local street grid spacing in metres of map units; omitted = no local streets. */
  streets?: number;
}
export type RoadClass = 'major' | 'secondary' | 'local';
export interface RoadNode { id: string; x: number; z: number }
/** A road between two nodes. `bridge` edges cross water and are drawn with pillars; `cable` adds a pylon. */
export interface RoadEdge { a: string; b: string; cls: RoadClass; name?: string; bridge?: boolean; cable?: boolean; buses?: number }
/** The playable city: land, roads and the water around it. Future cities ship their own MapLayout. */
export interface MapLayout {
  slabs: LandSlab[];
  nodes: RoadNode[];
  edges: RoadEdge[];
  /** Extent of the sea that can host Sea Ads (and the camera limits): x0,x1,z0,z1. */
  sea: { x0: number; x1: number; z0: number; z1: number };
}

export interface StateMapData {
  /** How much wider the map is than the camera's default framing: the map camera starts this much further out. */
  viewScale?: number;
  layout?: MapLayout;
  center: [number, number];
  billboards?: BillboardDefinition[];
  /** Half-size of the playable map, used for camera limits. */
  bounds: number;
  landmarks: LandmarkDefinition[];
}

export interface StateVisualData {
  /** Key into the world scene registry (three/world/sceneRegistry.ts). */
  sceneId: string;
  skyTop: string;
  skyBottom: string;
  accent: string;
}


export interface StateDefinition {
  id: string;
  name: string;
  country: string;
  tagline: string;
  areas: AreaDefinition[];
  properties: PropertyDefinition[];
  layouts: PropertyLayout[];
  mapData: StateMapData;
  /** Advertising prices, durations, upload limits and rules for this state's map (see types/ads.ts). */
  ads?: AdsConfig;
  visualData: StateVisualData;
  /** Property ids a new life can start in, per life type. */
  startingProperties: { lapo: string[]; nepo: string[] };
  /** Retired property ids -> the property that replaces them, so old saves keep a valid home. */
  legacyPropertyIds?: Record<string, string>;
}
