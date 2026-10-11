export type StatKey = 'hunger' | 'thirst' | 'bladder' | 'happiness' | 'energy' | 'hygiene' | 'health' | 'social' | 'charisma';
export type Stats = Record<StatKey, number>;
export const STAT_KEYS: StatKey[] = ['hunger', 'thirst', 'bladder', 'happiness', 'energy', 'hygiene', 'health', 'social', 'charisma'];
export type Effects = Partial<Record<StatKey, number>> & { money?: number };

export type LifeTypeId = 'lapo' | 'nepo';
export type PhoneType = 'ios' | 'android';

export interface PlacedItem {
  uid: string;
  defId: string;
  x: number;
  z: number;
  /** Quarter turns 0..3. */
  rotation: number;
  /** Wall-mounted items only. `wallC` is the wall's coordinate (z for back walls, x for left walls). */
  wall?: 'back' | 'left';
  along?: number;
  wallC?: number;
  /** Runtime only: built into the property (toilet, cooker...). Never saved, cannot be moved. */
  fixed?: boolean;
}

export type HairStyle = 'bald' | 'lowcut' | 'fade' | 'afro' | 'braids' | 'dreads' | 'bun';
export type TopStyle = 'tee' | 'shirt' | 'hoodie' | 'jacket' | 'kaftan' | 'jersey';
/** `dress` is a one-piece: it replaces the top as well. */
export type BottomStyle = 'jeans' | 'shorts' | 'trousers' | 'skirt' | 'dress';
export type ShoeStyle = 'sneakers' | 'boots' | 'sandals' | 'barefoot';
export type Accessory = 'none' | 'glasses' | 'cap' | 'chain';
export interface Appearance {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoes: ShoeStyle;
  shoeColor: string;
  accessory: Accessory;
}
