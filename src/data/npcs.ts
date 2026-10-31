import { CRIME } from './balance';
import type { Accessory, Appearance, BeardStyle, BottomStyle, HairStyle, ShoeStyle, TopStyle } from '@/types/game';

/** NPC people for public interiors. Deterministic from the visit's seed, so the same visit always meets the same people. */
export interface NpcProfile { id: string; name: string; appearance: Appearance; wallet: number; greeting: string; /** What they do, shown on their profile (Nigerian jobs fit the place). */ role: string; /** A conversation starter in their own voice. */ starter: string; venue: string }
const NAMES = ['Tunde', 'Ngozi', 'Emeka', 'Aisha', 'Chidi', 'Funke', 'Bola', 'Kemi', 'Ibrahim', 'Yetunde', 'Obinna', 'Zainab', 'Segun', 'Amaka', 'Dayo', 'Halima', 'Kunle', 'Nneka', 'Wale', 'Titi'];
const GREETINGS = ['How far?', 'E kaaro!', 'Wetin dey happen?', 'Oga, good day.', 'Na so o!', 'God abeg, this place sweet.', 'I dey hustle small.', 'You don chop?'];
const ROLES: Record<string, string[]> = {
  market: ['Hawking pure water', 'Selling Ankara', 'Foodstuff trader', 'Okada rider on break', 'Tailor', 'Agbada seller', 'Provision shop owner', 'Plantain seller'],
  church: ['Choir member', 'Church usher', 'Youth leader', 'Sunday school teacher', 'Prayer warrior', 'Deaconess'],
  gallery: ['Art student', 'Gallery guide', 'Painter', 'Art collector', 'Curator', 'Photographer'],
  stadium: ['Football coach', 'Groundsman', 'Ticket seller', 'Die-hard fan', 'Referee', 'Sports journalist'],
  club: ['Event DJ', 'Bottle girl', 'Promoter', 'Bouncer', 'Content creator', 'Bartender'],
  showroom: ['Car dealer', 'Mechanic', 'Test-drive fan', 'Fleet manager', 'Car enthusiast', 'Taxi driver'],
  viewing: ['Arsenal fan', 'Chelsea fan', 'Agbero', 'Football analyst', 'Betting punter', 'Pool champion'],
  eatery: ['Runs a buka', 'Bukateria cook', 'Student on a budget', 'Delivery rider', 'Food blogger', 'Regular customer'],
  bank: ['Bank teller', 'Customer in the queue', 'Loan officer', 'POS agent', 'Accountant', 'Small business owner'],
  mall: ['Shop attendant', 'Influencer', 'Window shopper', 'Cashier', 'Security guard', 'Student on a date'],
  cinema: ['Movie buff', 'Nollywood actor', 'Cinema usher', 'Film student', 'Popcorn seller', 'Film critic'],
  concert: ['Afrobeat drummer', 'Backup singer', 'Superfan', 'Sound engineer', 'Promoter', 'Dancer'],
  hotel: ['Concierge', 'Tourist', 'Hotel manager', 'Business traveller', 'Pool attendant', 'Wedding planner'],
  techhub: ['Frontend developer', 'Product designer', 'Startup founder', 'Hackathon judge', 'Phone repairer', 'Data analyst'],
  park: ['Jogger', 'Poet', 'Yoga teacher', 'Photographer', 'Picnic mum', 'Street artist'],
  beach: ['Boat man', 'Lifeguard', 'Roasted corn seller', 'Surfer', 'Tourist', 'Beach photographer'],
  recreation: ['Tennis coach', 'Club member', 'Golfer', 'Lifeguard', 'Board member', 'Personal trainer'],
  government: ['Civil servant', 'Applicant', 'Security officer', 'Clerk', 'Youth corper', 'Contractor'],
  business: ['Investor', 'Consultant', 'Startup CEO', 'Lawyer', 'Analyst', 'Executive assistant'],
  airport: ['Traveller', 'Porter', 'Airline staff', 'Taxi driver', 'Customs officer', 'Duty-free seller'],
  port: ['Dock worker', 'Clearing agent', 'Truck driver', 'Customs officer', 'Crane operator', 'Importer'],
  jail: ['Fellow inmate'],
};
const STARTERS = ['Who is your favourite Afrobeats artist? Talk true.', 'Jollof: Naija or Ghana? Choose carefully.', 'Arsenal or Chelsea? Do not lie.', 'Island or Mainland, which one do you like more?', 'NEPA took light in my area yesterday. Na so e be?', 'Danfo or Bolt, which one has less wahala?', 'Amala or pounded yam? Pick one.', 'You don chop today?'];
const SKIN = ['#8D5524', '#6B4226', '#C68642', '#4A2C17', '#A0673B', '#7A4A2A'];
const HAIR_M: HairStyle[] = ['lowcut', 'fade', 'afro', 'dreads', 'bald', 'cornrows', 'twists'];
const HAIR_F: HairStyle[] = ['braids', 'bun', 'afro', 'cornrows', 'twists', 'dreads'];
const BEARDS: BeardStyle[] = ['none', 'none', 'none', 'stubble', 'moustache', 'goatee', 'full'];
const EYES = ['#2A1A10', '#2A1A10', '#5A3A1E', '#3E5C3A'];
const TOPS: TopStyle[] = ['tee', 'shirt', 'hoodie', 'jacket', 'kaftan', 'jersey'];
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
    const femme = r() < 0.48, dress = femme && r() < 0.4;
    const p: NpcProfile = {
      id: `npc:${kind}:${seed}:${i}`, name: NAMES[(seed + i * 7) % NAMES.length],
      appearance: { body: femme ? 'femme' : 'masc', eye: pick(r, EYES), beard: femme ? 'none' : pick(r, BEARDS), skin: pick(r, SKIN), hairStyle: pick(r, femme ? HAIR_F : HAIR_M), hairColor: '#1B1B1B', top: pick(r, TOPS), topColor: pick(r, COLORS), bottom: dress ? 'dress' : femme ? pick(r, ['jeans', 'skirt', 'trousers', 'shorts'] as BottomStyle[]) : pick(r, ['jeans', 'shorts', 'trousers'] as BottomStyle[]), bottomColor: pick(r, COLORS), shoes: pick(r, SHOES), shoeColor: '#2B2F32', accessory: pick(r, ACC) },
      wallet: Math.round((CRIME.walletRange[0] + r() * (CRIME.walletRange[1] - CRIME.walletRange[0])) / 500) * 500,
      greeting: pick(r, GREETINGS), role: pick(r, ROLES[kind] ?? ['Visitor']), starter: pick(r, STARTERS), venue: kind,
    };
    npcRegistry.set(p.id, p); out.push(p);
  }
  return out;
}
