import type { ComponentType } from 'react';
import { DiscoLight, BedsideTable, Bathtub, CoffeeTable, Jacuzzi, Speaker, WallShelf, Washbasin } from './extras';
import { Ac, Fan, Fridge, Generator, Tv } from './appliances';
import { Bucket, Plant, Rug, Shower, WallFrame } from './decor';
import { Cabinet, Cooker, Desk, Dispenser, GamingSetup, KingBed, Lamp, Piano, Toilet, Wardrobe, Bookshelf } from './more';
import { Chair, Sofa, Table } from './seating';
import { Bed, FoamMattress } from './sleeping';

/**
 * Furniture model registry: FurnitureDef.model → component.
 * To use real art later, replace an entry with a component that calls drei's useGLTF().
 */
export const MODELS: Record<string, ComponentType> = {
  bed: Bed, foam_mattress: FoamMattress, king_bed: KingBed, chair: Chair, sofa: Sofa, table: Table, tv: Tv, fridge: Fridge,
  generator: Generator, fan: Fan, ac: Ac, rug: Rug, wall_frame: WallFrame, bucket: Bucket, shower: Shower, plant: Plant,
  wardrobe: Wardrobe, bookshelf: Bookshelf, cooker: Cooker, cabinet: Cabinet, toilet: Toilet, desk: Desk,
  gaming_setup: GamingSetup, piano: Piano, lamp: Lamp, dispenser: Dispenser,
  bathtub: Bathtub, jacuzzi: Jacuzzi, washbasin: Washbasin, speaker: Speaker, bedside_table: BedsideTable, coffee_table: CoffeeTable, wall_shelf: WallShelf, disco_light: DiscoLight,
};

export function FurnitureModel({ modelKey }: { modelKey: string }) {
  const Model = MODELS[modelKey];
  return Model ? <Model /> : null;
}
