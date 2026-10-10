/**
 * World content types. Everything a state (Lagos, Abuja, ...) provides is described here as DATA.
 * Core systems (houses, map, placement, saves) only read these types: they never mention a state by name.
 */

export type ZoneKind =
  | 'bedroom' | 'living' | 'parlour' | 'kitchen' | 'bathroom' | 'corridor'
  | 'balcony' | 'terrace' | 'garage' | 'parking' | 'compound' | 'garden'
  | 'waterfront' | 'neighbour' | 'security';

export type FloorKind = 'cement' | 'tile' | 'wood' | 'marble' | 'terrazzo' | 'paving' | 'grass' | 'concrete' | 'water' | 'dirt';

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
export interface Connection { a: string; b: string }

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
  category: 'club' | 'market' | 'park' | 'culture' | 'business' | 'food' | 'beach' | 'bank' | 'tech';
  position: [number, number];
  /** Key into the state's scene model registry (see content/<state>/scene). */
  modelId: string;
  icon: string;
  /** Mock "visit" effects. */
  visit: { cost: number; seconds: number; effects: Partial<Record<string, number>>; taskEvent?: string };
}

export interface StateMapData {
  center: [number, number];
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
  visualData: StateVisualData;
  /** Property ids a new life can start in, per life type. */
  startingProperties: { lapo: string[]; nepo: string[] };
}
