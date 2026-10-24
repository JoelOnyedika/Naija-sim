import type { ComponentType } from 'react';
import { DiscoLight, BedsideTable, Bathtub, CoffeeTable, Jacuzzi, Speaker, WallShelf, Washbasin, GymMat, Ibeta, SolarSystem } from './extras';
import { Ac, Fan, Fridge, Generator, Tv } from './appliances';
import { Bucket, Plant, Rug, Shower, WallFrame } from './decor';
import { Cabinet, Cooker, Desk, Dispenser, GamingSetup, KingBed, Lamp, Piano, Toilet, Wardrobe, Bookshelf } from './more';
import { PrinterStation, StandingDesk, StudentDesk, Workstation } from './computers';
import { KIT_MODELS } from './kit';
import { Chair, Sofa, Table } from './seating';
import { Bed, FoamMattress } from './sleeping';
import { Armchair, OfficeChair, DiningChair, Stool, SideTable, Locker, ShelfUnit, ShoeRack, RugRound, RugRunner, RugPersian, WallArtAbstract, WallPhotos, WallPanel, WallClock, WallMirror, NeonSign, RingLight, CameraTripod, DjDeck, BedsideLamp, PetBed, PetBowl } from './catalogue';
import { VAltar, VBars, VBleachers, VCellBed, VClubBar, VDjBooth, VKiosk, VPew, VPlinth, VPodium, VSacks, VSpeakerStack, VStall } from './venue';
import { PetBall, StaticCat, StaticDog, StaticLion } from './pets';

/**
 * Furniture model registry: FurnitureDef.model → component.
 * To use real art later, replace an entry with a component that calls drei's useGLTF().
 */
export const MODELS: Record<string, ComponentType> = {
  bed: Bed, foam_mattress: FoamMattress, king_bed: KingBed, chair: Chair, sofa: Sofa, table: Table, tv: Tv, fridge: Fridge,
  generator: Generator, fan: Fan, ac: Ac, rug: Rug, wall_frame: WallFrame, bucket: Bucket, shower: Shower, plant: Plant,
  wardrobe: Wardrobe, bookshelf: Bookshelf, cooker: Cooker, cabinet: Cabinet, toilet: Toilet, desk: Desk,
  ...KIT_MODELS,
  student_desk: StudentDesk, standing_desk: StandingDesk, workstation: Workstation, printer_station: PrinterStation,
  gaming_setup: GamingSetup, piano: Piano, lamp: Lamp, dispenser: Dispenser,
  bathtub: Bathtub, jacuzzi: Jacuzzi, washbasin: Washbasin, speaker: Speaker, gym_rug: GymMat, bedside_table: BedsideTable, coffee_table: CoffeeTable, wall_shelf: WallShelf, disco_light: DiscoLight, ibeta: Ibeta, solar_system: SolarSystem,
  pet_cat: StaticCat, pet_dog: StaticDog, pet_lion: StaticLion, pet_ball: PetBall,
  v_stall: VStall, v_sacks: VSacks, v_pew: VPew, v_altar: VAltar, v_plinth: VPlinth, v_bleachers: VBleachers, v_kiosk: VKiosk, v_club_bar: VClubBar, v_dj_booth: VDjBooth, v_speaker_stack: VSpeakerStack, v_podium: VPodium, v_cell_bed: VCellBed, v_bars: VBars,
  armchair: Armchair, office_chair: OfficeChair, dining_chair: DiningChair, stool: Stool, side_table: SideTable, locker: Locker, shelf_unit: ShelfUnit, shoe_rack: ShoeRack, rug_round: RugRound, rug_runner: RugRunner, rug_persian: RugPersian, wall_art_abstract: WallArtAbstract, wall_photos: WallPhotos, wall_panel: WallPanel, wall_clock: WallClock, wall_mirror: WallMirror, neon_sign: NeonSign, ring_light: RingLight, camera_tripod: CameraTripod, dj_deck: DjDeck, bedside_lamp: BedsideLamp, pet_bed: PetBed, pet_bowl: PetBowl,
};

export function FurnitureModel({ modelKey }: { modelKey: string }) {
  const Model = MODELS[modelKey];
  return Model ? <Model /> : null;
}
