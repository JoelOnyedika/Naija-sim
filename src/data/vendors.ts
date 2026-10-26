import { npcRegistry, type NpcProfile } from './npcs';
import type { Appearance } from '@/types/game';
import type { PlacedItem } from '@/types/game';

/**
 * The people who work at the stalls, counters and desks of each venue. They stand behind their own prop all day (they never wander),
 * have a name tag, can be talked to and messaged, and sell or run what is in front of them. `defId` is the prop they stand behind;
 * when a venue has several of one prop the names are used in turn.
 */
interface Vendor { names: string[]; role: string; greeting: string; starter: string }
const V = (names: string[], role: string, greeting: string, starter: string): Vendor => ({ names, role, greeting, starter });
export const VENDORS: Record<string, Vendor> = {
  v_stall: V(['Baba Tunde', 'Iya Ibeji', 'Mallam Bashir', 'Mama Joy', 'Alhaji Sule', 'Iya Basira', 'Oga Kingsley'], 'Market trader', 'Customer! Come, come, see better price!', 'Last price, no be small thing. How much you dey carry?'),
  v_foodstuff_stall: V(['Mama Chioma'], 'Sells foodstuff', 'My dear, fresh tomatoes today!', 'Pepper don cost this season. You don notice?'),
  v_fabric_rack: V(['Alhaji Dansiru', 'Alhaja Rukayat', 'Mama Kemi'], 'Fabric seller', 'Oga, come and see Ankara!', 'Na Ankara for owambe or lace for wedding?'),
  v_fruit_stand: V(['Auntie Bisi', 'Auntie Ngozi'], 'Fruit seller', 'Sweet watermelon, sweet pineapple!', 'You wan buy for house or you wan chop now?'),
  v_hawker: V(['Auntie Ronke', 'Mama Nonso', 'Auntie Hauwa'], 'Roasted corn and ube', 'Hot corn, hot ube. Fresh!', 'Pepper or no pepper for your own?'),
  v_food_counter: V(['Mama Put', 'Mama Nkechi'], 'Runs the buka', 'Welcome! Wetin you go chop?', 'Amala, eba or rice today?'),
  v_grill: V(['Mallam Garba', 'Suya Joe', 'Mallam Idris'], 'Suya man', 'Suya dey ready, extra yaji!', 'Beef, chicken or ram?'),
  v_drinks_fridge: V(['Auntie Sade'], 'Sells cold drinks', 'Cold zobo, cold Fanta!', 'This heat no be small thing, eh?'),
  v_drinks_bar: V(['Sule', 'Bartender Dayo', 'Bartender Ife'], 'Barman', 'Welcome. Cold one?', 'Who you dey support for the match?'),
  v_gadget_stall: V(['Chidi', 'Emeka Phones', 'Tobi Gadgets', 'Ahmed'], 'Phone seller', 'Boss, fresh UK used! Come see.', 'Which phone you dey use now? I fit change am.'),
  v_pc_desk: V(['Engr. Bisola', 'Dev Amara', 'Engr. Tunde', 'Dev Kunle'], 'Computer instructor', 'Sit down, make we write some code.', 'You know Python or JavaScript?'),
  v_hackathon_board: V(['Judge Folake'], 'Hackathon judge', 'Registration is open. Team or solo?', 'Bring a real problem and build for it.'),
  v_ceo_booth: V(['Mr. Adewale'], 'CEO of OneNaija', 'Young person, tell me what you are building.', 'Anyone can talk. Show me traction.'),
  v_teller: V(['Teller Ngozi', 'Teller Yusuf', 'Teller Amina'], 'Bank teller', 'Good afternoon. How can I help?', 'Network is slow today, please bear with us.'),
  v_gov_desk: V(['Mrs. Okafor', 'Mr. Bello'], 'Civil servant', 'Next! Where is your file?', 'Come back tomorrow, the oga is not around.'),
  v_commissioner: V(['Commissioner Adeyemi'], 'State Commissioner', 'Yes? Do you have an appointment?', 'Young people must be part of the plan for Lagos.'),
  v_checkin: V(['Agent Tosin', 'Agent Chika', 'Agent Femi'], 'Airline agent', 'Passport and ticket, please.', 'Is that your only bag?'),
  v_duty_free: V(['Nkem'], 'Duty-free seller', 'Perfume, chocolate, whisky. All duty free!', 'Travelling for business or for fun?'),
  v_taxi_rank: V(['Baba Taxi'], 'Taxi driver', 'Oga, where you dey go?', 'Traffic go dey. Na so Lagos be.'),
  v_customs_desk: V(['Officer Bala'], 'Customs officer', 'Where is your clearing form?', 'Every container must be checked, no exception.'),
  v_pallet: V(['Foreman Musa', 'Dockhand Ikenna', 'Dockhand Yau', 'Dockhand Bode'], 'Dock foreman', 'Eh! Lift am well, no break anything.', 'Day shift or night shift, which one hard?'),
  v_loading_bay: V(['Foreman Chuks'], 'Loading bay foreman', 'Trailer don come! Who wan work?', 'Pay dey, but carry well, make your back no spoil.'),
  v_reception: V(['Concierge Zainab', 'Concierge Tayo'], 'Hotel concierge', 'Welcome! Can I help you with anything?', 'The pool is open till nine tonight.'),
  v_sales_desk: V(['Mr. Emeka'], 'Car sales rep', 'My brother, which car catch your eye?', 'For this price, na steal. Make I show you the specs.'),
  v_conference_desk: V(['Ms. Adaobi'], 'Summit organiser', 'Welcome to the summit. Please wear your badge.', 'The keynote starts soon. Do you have a card?'),
  v_betting_counter: V(['Sir Kola'], 'Runs the betting shop', 'Which games you dey play today?', 'Small stake, small risk. Na so I dey tell people.'),
  v_popcorn: V(['Tayo', 'Chinedu'], 'Popcorn seller', 'Sweet or salty popcorn?', 'You don see the new Nollywood movie?'),
  v_coffee_bar: V(['Barista Femi'], 'Barista', 'Coffee or cappuccino?', 'Long day? Make I give you a strong one.'),
  v_pulpit: V(['Pastor Emmanuel'], 'Pastor', 'Peace be unto you, my child.', 'Come, take a seat. God is good.'),
  v_food_court: V(['Cashier Bukky'], 'Food court cashier', 'Jollof or fried rice today?', 'Chapman is on special.'),
  v_art_talk: V(['Artist Kehinde'], 'Painter', 'Welcome. Art is just honest colour.', 'What does Lagos look like to you?'),
  v_kiosk: V(['Kiosk Sade', 'Baba Kiosk'], 'Sells snacks', 'Biscuit, sweet, water. Everything dey!', 'You don chop?'),
  v_boardroom: V(['Mrs. Ladipo'], 'Investor', 'Sit. Tell me about the numbers.', 'I invest in people before ideas.'),
  v_open_mic: V(['MC Poet'], 'Open mic host', 'Next on the mic could be you!', 'Spoken word, rap or comedy?'),
};

const SKIN = ['#8D5524', '#6B4226', '#C68642', '#4A2C17', '#A0673B', '#7A4A2A'];
const COLORS = ['#C4552D', '#1F4E47', '#E9B949', '#3A5BA0', '#8A3F6A', '#2B2F32', '#F4F1EA', '#2F8F8A', '#B8892F'];
const FEMALE = /^(mama|iya|auntie|alhaja|mrs|ms|teller ngozi|agent chika|nkem|cashier|concierge zainab|barista femi$|judge folake|commissioner adeyemi$)/i;
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** The vendor standing behind each prop in this venue (same people every time for the same venue copy). */
export interface VendorSpot { profile: NpcProfile; x: number; z: number; yaw: number }
export function vendorSpots(kind: string, items: PlacedItem[], sizeOf: (defId: string) => { w: number; d: number }, room?: { w: number; d: number }): VendorSpot[] {
  const used = new Map<string, number>(), out: VendorSpot[] = [];
  for (const it of items) {
    const v = VENDORS[it.defId]; if (!v) continue;
    const n = used.get(it.defId) ?? 0; used.set(it.defId, n + 1);
    const name = n < v.names.length ? v.names[n] : `${v.names[n % v.names.length]} ${Math.floor(n / v.names.length) + 1}`, h = hash(`${it.uid}:${name}`), size = sizeOf(it.defId);
    const th = (it.rotation * Math.PI) / 2, sn = Math.sin(th), cs = Math.cos(th), back = size.d / 2 + 0.55, side = size.w / 2 + 0.55;
    // behind the prop; if that is outside the room (a counter against a wall), stand beside it instead
    const at = (lx: number, lz: number) => ({ x: it.x + lx * cs + lz * sn, z: it.z - lx * sn + lz * cs });
    const inside = (q: { x: number; z: number }) => q.x > 0.4 && q.z > 0.4 && q.x < (room?.w ?? 99) - 0.4 && q.z < (room?.d ?? 99) - 0.4;
    const spot = [at(0, -back), at(side, 0), at(-side, 0)].find(inside) ?? at(0, -back);
    const x = spot.x, z = spot.z;
    const woman = FEMALE.test(name);
    const appearance: Appearance = {
      skin: SKIN[h % SKIN.length], hairStyle: woman ? (['braids', 'bun', 'afro'] as const)[h % 3] : (['lowcut', 'fade', 'bald'] as const)[h % 3], hairColor: '#1B1B1B',
      top: woman ? 'shirt' : (['kaftan', 'shirt', 'tee'] as const)[h % 3], topColor: COLORS[(h >>> 3) % COLORS.length],
      bottom: woman ? (h % 2 ? 'skirt' : 'trousers') : 'trousers', bottomColor: COLORS[(h >>> 6) % COLORS.length], shoes: 'sandals', accessory: 'none',
    } as Appearance;
    const profile: NpcProfile = { id: `npc:vendor:${it.uid}`, name, appearance, wallet: 6000 + (h % 8) * 1000, greeting: v.greeting, role: v.role, starter: v.starter, venue: kind };
    npcRegistry.set(profile.id, profile);
    out.push({ profile, x, z, yaw: th });
  }
  return out;
}
