import { CRIME } from './balance';
import type { Accessory, Appearance, BottomStyle, HairStyle, ShoeStyle, TopStyle } from '@/types/game';

/** NPC people for public interiors. Deterministic from the visit's seed, so the same visit always meets the same people. */
export interface NpcProfile { id: string; name: string; appearance: Appearance; wallet: number; greeting: string }
const NAMES = ['Tunde', 'Ngozi', 'Emeka', 'Aisha', 'Chidi', 'Funke', 'Bola', 'Kemi', 'Ibrahim', 'Yetunde', 'Obinna', 'Zainab', 'Segun', 'Amaka', 'Dayo', 'Halima', 'Kunle', 'Nneka', 'Wale', 'Titi'];
const GREETINGS = ['How far?', 'E kaaro!', 'Wetin dey happen?', 'Oga, good day.', 'Na so o!', 'God abeg, this place sweet.', 'I dey hustle small.', 'You don chop?'];
const SKIN = ['#8D5524', '#6B4226', '#C68642', '#4A2C17', '#A0673B', '#7A4A2A'];
const HAIR: HairStyle[] = ['lowcut', 'fade', 'afro', 'braids', 'bun', 'dreads', 'bald'];
const TOPS: TopStyle[] = ['tee', 'shirt', 'hoodie', 'jacket', 'kaftan', 'jersey'];
const BOTTOMS: BottomStyle[] = ['jeans', 'shorts', 'trousers', 'skirt', 'dress'];
const SHOES: ShoeStyle[] = ['sneakers', 'boots', 'sandals'];
const ACC: Accessory[] = ['none', 'none', 'glasses', 'cap', 'chain'];
const COLORS = ['#C4552D', '#1F4E47', '#E9B949', '#3A5BA0', '#8A3F6A', '#2B2F32', '#F4F1EA', '#2F8F8A', '#B8892F'];

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, l: readonly T[]): T => l[Math.floor(r() * l.length)];

/** Everyone ever generated, so a tap on an NPC can find them by id. */
export const npcRegistry = new Map<string, NpcProfile>();

export function makeNpcs(kind: string, seed: number, count: number): NpcProfile[] {
  const out: NpcProfile[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng(seed * 31 + i * 977 + kind.length * 13);
    const dress = r() < 0.2;
    const p: NpcProfile = {
      id: `npc:${kind}:${seed}:${i}`, name: NAMES[(seed + i * 7) % NAMES.length],
      appearance: { skin: pick(r, SKIN), hairStyle: pick(r, HAIR), hairColor: '#1B1B1B', top: pick(r, TOPS), topColor: pick(r, COLORS), bottom: dress ? 'dress' : pick(r, BOTTOMS), bottomColor: pick(r, COLORS), shoes: pick(r, SHOES), shoeColor: '#2B2F32', accessory: pick(r, ACC) },
      wallet: Math.round((CRIME.walletRange[0] + r() * (CRIME.walletRange[1] - CRIME.walletRange[0])) / 500) * 500,
      greeting: pick(r, GREETINGS),
    };
    npcRegistry.set(p.id, p); out.push(p);
  }
  return out;
}
