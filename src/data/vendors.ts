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
  v_okada_rank: V(['Baba Rider', 'Segun Okada'], 'Okada rider', 'Oga, where you dey go? I fit carry you!', 'Traffic na my enemy, but I sabi the shortcuts.'),
  v_tailor: V(['Tailor Femi', 'Iya Tailor'], 'Tailor', 'Come, make I take your measurement!', 'Which owambe you wan sew for?'),
  v_pure_water: V(['Sachet Sola'], 'Pure water seller', 'Ice cold water! Ice cold!', 'This sun no be small thing.'),
  v_butcher: V(['Mallam Yakubu'], 'Butcher', 'Fresh meat today, oga!', 'You wan buy ram or goat?'),
  v_shoe_stall: V(['Chuks Shoes'], 'Shoe seller', 'Original! Straight from Aba!', 'Size 43? I get am.'),
  v_gen_repair: V(['Mechanic Ade'], 'Generator mechanic', 'Generator no wan start? Make I see am.', 'NEPA is my best customer.'),
  v_amala_pot: V(['Iya Amala'], 'Amala seller', 'Amala hot, ewedu sweet!', 'You want abula or gbegiri?'),
  v_zobo_stand: V(['Auntie Zobo'], 'Zobo seller', 'Cold zobo, cold kunu!', 'I add ginger for strength.'),
  v_dish_bay: V(['Dish Tunde'], 'Dish washer', 'Plates dey pile o!', 'This work no be joke.'),
  v_chicken_oven: V(['Roaster Ike'], 'Chicken roaster', 'Hot chicken, fresh from the oven!', 'Spicy or mild?'),
  v_atm: V(['Security Musa'], 'Bank security', 'Please queue. One person at a time.', 'Machine is slow today, abeg.'),
  v_customer_care: V(['Care Agent Ola', 'Care Agent Nkechi'], 'Customer care', 'Welcome. How may I help you?', 'Please hold while I check.'),
  v_loan_desk: V(['Mr. Bankole'], 'Loan officer', 'Have a seat. Tell me about your business.', 'Collateral is very important.'),
  v_pos_agent: V(['POS Kelechi'], 'POS agent', 'Withdraw, transfer, anything!', 'Network is playing games today.'),
  v_money_counter: V(['Cashier Ruth'], 'Cash officer', 'Do not distract me, I am counting.', 'One... two... start again.'),
  v_perfume_booth: V(['Perfume Lola'], 'Perfume seller', 'Try this one. It will follow you.', 'Oud or fresh?'),
  v_barber_chair: V(['Barber Kayode'], 'Barber', 'Sit down. Low cut, fade or afro?', 'My clippers never fail.'),
  v_hair_salon: V(['Stylist Amaka', 'Stylist Peace'], 'Hair stylist', 'Welcome! Braids or wig today?', 'This style go last three weeks.'),
  v_phone_shop: V(['Phone Wale'], 'Phone seller', 'Latest model, boss. Brand new!', 'Cash or transfer?'),
  v_kids_play: V(['Attendant Joy'], 'Play area attendant', 'Please watch your children.', 'Shoes off in the ball pit!'),
  v_ticket_booth: V(['Ticket Dami'], 'Ticket seller', 'Which movie, which time?', 'Seats are filling fast.'),
  v_snack_bar: V(['Snack Bisola'], 'Snack seller', 'Popcorn, chin chin, drinks!', 'Combo is cheaper.'),
  v_poster_wall: V(['Critic Efe'], 'Film critic', 'This one is a masterpiece. Or not.', 'Nollywood is rising.'),
  v_vip_lounge: V(['Host Sandra'], 'Lounge host', 'Welcome to the VIP lounge.', 'Can I get you a drink?'),
  v_usher_post: V(['Usher Taiwo'], 'Cinema usher', 'Row C, seat 12. This way.', 'No phones during the film, please.'),
  v_drum_circle: V(['Drummer Femi'], 'Talking drummer', 'Feel the beat, my brother!', 'Our drum can talk, you know.'),
  v_merch_table: V(['Merch Chiamaka'], 'Merch seller', 'Official merch, collector items!', 'The red one sells fastest.'),
  v_backstage_door: V(['Security Big Joe'], 'Security guard', 'Staff only. No pass, no entry.', 'Nobody passes me. Nobody.'),
  v_sound_desk: V(['Engineer Kunle'], 'Sound engineer', 'Do not touch anything, please.', 'Too much bass, or not enough?'),
  v_request_box: V(['Request Boy Tobi'], 'Request collector', 'Write your song here.', 'The band decides what to play.'),
  v_pool_bar: V(['Barman Seyi'], 'Pool barman', 'Something cold by the pool?', 'The mocktails are on me. Almost.'),
  v_spa_bed: V(['Therapist Mercy'], 'Spa therapist', 'Relax. Breathe in. Breathe out.', 'Your shoulders are very tight.'),
  v_bell_desk: V(['Bellhop Sunday'], 'Bellhop', 'May I take your bags, sir?', 'Welcome to the best hotel in Lagos.'),
  v_buffet: V(['Chef Obinna'], 'Chef', 'Eat well, eat plenty!', 'The jollof is my pride.'),
  v_wedding_stage: V(['MC Gbenga'], 'Wedding MC', 'Ladies and gentlemen, give it up!', 'Where is the bride? Where is the money?'),
  v_cowork_desk: V(['Community Manager Chika'], 'Community manager', 'Welcome to the hub. Wi-Fi is free.', 'We run events every Friday.'),
  v_repair_bench: V(['Technician Wale'], 'Phone technician', 'Cracked screen? I fix am in minutes.', 'Do not drop it in water again.'),
  v_startup_wall: V(['Founder Nneka'], 'Startup founder', 'We are hiring! Two spots left.', 'Traction beats talk.'),
  v_investor_corner: V(['Investor Tunji'], 'Angel investor', 'Pitch me in thirty seconds.', 'I invest in founders, not slides.'),
  v_podcast_booth: V(['Host Kemi'], 'Podcast host', 'We are live in three, two, one.', 'Your story is worth hearing.'),
  v_3d_printer: V(['Maker Ahmed'], '3D print technician', 'Watch the first layer, it is everything.', 'Plastic today, houses tomorrow.'),
  v_ayo_table: V(['Baba Ayo'], 'Ayo champion', 'Sit. Let me teach you a lesson.', 'This game is older than your grandfather.'),
  v_pullup_bars: V(['Coach Ben'], 'Fitness coach', 'One more rep! You can do it!', 'No pain, no gain.'),
  v_kite_spot: V(['Kite Boy Sam'], 'Kite seller', 'Wind is perfect today!', 'Let it go higher, higher!'),
  v_bike_rental: V(['Rental Dayo'], 'Bike rental man', 'Helmet is free. Brakes too.', 'Return it before sunset.'),
  v_art_easel: V(['Artist Bimpe'], 'Street painter', 'Lagos has the best colours.', 'Sit, I will paint you too.'),
  v_surf_stand: V(['Surf Instructor Gift'], 'Surf instructor', 'Wave is good today!', 'Paddle first, stand later.'),
  v_castle_zone: V(['Sand Kid Emeka'], 'Young sandcastle builder', 'I am building the biggest one!', 'Do not step on my tower!'),
  v_seafood_grill: V(['Fish Mama Ngozi'], 'Fish seller', 'Fresh from the sea this morning!', 'Pepper small or pepper plenty?'),
  v_shell_stall: V(['Shell Uncle Bayo'], 'Souvenir seller', 'Beautiful shells, genuine!', 'Take one home for luck.'),
  v_beach_pitch: V(['Referee Bola'], 'Beach referee', 'Teams, take your sides!', 'No handballs in the sand.'),
  v_gym_bench: V(['Trainer Kemi'], 'Personal trainer', 'Do not quit now!', 'Water first, always.'),
  v_sauna: V(['Attendant Hadiza'], 'Sauna attendant', 'Fifteen minutes only.', 'Drink water after.'),
  v_snooker: V(['Marker Segun'], 'Snooker marker', 'Rack them up!', 'Silence on the table.'),
  v_chess_table: V(['Grandmaster Pa Lawal'], 'Chess veteran', 'Your move, young man.', 'I have been waiting for a challenger.'),
  v_club_library: V(['Librarian Adunni'], 'Club librarian', 'Quiet, please.', 'The best books are in the back.'),
  v_passport_desk: V(['Officer Mrs. Eze'], 'Immigration officer', 'Where is your birth certificate?', 'Processing takes six weeks. Maybe.'),
  v_nysc_corner: V(['Corper Ayo'], 'Youth corper', 'Fall in! Fall in!', 'Our camp life was unforgettable.'),
  v_tax_desk: V(['Auditor Mr. Hassan'], 'Tax officer', 'Have you filed this year?', 'Everybody pays tax. Everybody.'),
  v_suggestion_box: V(['Clerk Mr. Ola'], 'Clerk', 'Drop your idea. We will read it.', 'The box is emptied every month.'),
  v_town_hall: V(['Moderator Mrs. Fashola'], 'Town hall moderator', 'One question per person, please.', 'Respect the time.'),
  v_trading_desk: V(['Trader Segun'], 'Stock trader', 'Market is moving. Watch the screen!', 'Buy low, sell high. Simple.'),
  v_networking_lounge: V(['Host Ifeoma'], 'Networking host', 'Meet someone new tonight.', 'The best deals start with a handshake.'),
  v_skyline_bar: V(['Mixologist Dele'], 'Bartender', 'Something special with a view?', 'The sunset is the best part.'),
  v_legal_desk: V(['Barrister Okoro'], 'Lawyer', 'Read before you sign.', 'Contracts decide who wins.'),
  v_press_wall: V(['Reporter Sade'], 'Journalist', 'A quick quote for the paper?', 'What is your story?'),
  v_security_gate: V(['Screener Mrs. Bako'], 'Airport screener', 'Belts and shoes in the tray.', 'Arms up, please.'),
  v_airline_lounge: V(['Host Funke'], 'Lounge host', 'Welcome, please make yourself comfortable.', 'Your flight will be called shortly.'),
  v_porter_cart: V(['Porter Baba Ade'], 'Airport porter', 'Oga, I carry your bag!', 'I know every gate here.'),
  v_exchange: V(['Teller Ibrahim'], 'Currency exchanger', 'Dollars, pounds, euros!', 'Rate changed since morning.'),
  v_airport_cafe: V(['Cafe Joy'], 'Cafe attendant', 'Jollof or meat pie?', 'Hot coffee for the early flight.'),
  v_fish_market: V(['Fisher Pa Gbenga'], 'Fisherman', 'Caught this morning!', 'The sea has been kind lately.'),
  v_forklift: V(['Driver Alhaji Tijani'], 'Forklift driver', 'Stand back! Stand back!', 'Weight limit is two tons.'),
  v_crane_desk: V(['Operator Mr. Udo'], 'Crane operator', 'Never stand under the load.', 'Slow and steady.'),
  v_dock_canteen: V(['Canteen Mama Rice'], 'Canteen cook', 'Rice and stew, hot hot!', 'Workers eat first.'),
  v_ferry_counter: V(['Ticketer Femi'], 'Ferry ticket seller', 'Next ferry in twenty minutes.', 'Hold your ticket tight.'),
  v_scoreboard: V(['Operator Dele'], 'Scoreboard operator', 'The score is what I say it is.', 'One more goal, please.'),
  v_ticket_gate: V(['Gateman Musa'], 'Gateman', 'Ticket, oga. Ticket!', 'No ticket, no entry.'),
  v_fan_zone: V(['Fan Zone Chinedu'], 'Merchandise seller', 'Super Eagles jersey! Original!', 'Wear green, win big.'),
  v_coach_bench: V(['Coach Amadi'], 'Football coach', 'Warm up, warm up!', 'Talent is nothing without discipline.'),
  v_vip_rope: V(['Bouncer Big Tony'], 'Club bouncer', 'Name on the list?', 'Not everyone gets in tonight.'),
  v_photo_booth: V(['Photographer Dayo'], 'Club photographer', 'Smile! Three, two, one!', 'You look fine, my guy.'),
  v_dj_requests: V(['DJ Spinz'], 'Club DJ', 'What song you wan hear?', 'The night is young!'),
  v_coat_check: V(['Attendant Peace'], 'Coat check', 'I will keep it safe.', 'Here is your number.'),
  v_wash_bay: V(['Wash Boy Sunny'], 'Car washer', 'I go make am shine like new!', 'No scratch on my watch.'),
  v_tyre_rack: V(['Vulcaniser Baba Tayo'], 'Vulcaniser', 'Tyre no good? I fix am.', 'Pressure is everything.'),
  v_trade_in: V(['Valuer Mr. Obi'], 'Car valuer', 'Let me look under the bonnet.', 'Nigerian used? Good price.'),
  v_insurance_desk: V(['Agent Mrs. Salami'], 'Insurance agent', 'Third party or comprehensive?', 'Do not drive without it.'),
  v_driving_sim: V(['Instructor Mr. Femi'], 'Driving instructor', 'Hands at ten and two.', 'Mirror, signal, manoeuvre.'),
  v_prayer_room: V(['Deaconess Grace'], 'Deaconess', 'Pray with all your heart.', 'God answers in his own time.'),
  v_sunday_school: V(['Teacher Mrs. Bello'], 'Sunday school teacher', 'Who can recite this verse?', 'Children, sit properly.'),
  v_bake_sale: V(['Baker Sister Folasade'], 'Church baker', 'Cake for the new building!', 'Every slice helps.'),
  v_usher_stand: V(['Usher Brother Paul'], 'Chief usher', 'Please be seated. Welcome.', 'Phones on silent, please.'),
  v_youth_corner: V(['Youth Leader Pastor Dami'], 'Youth leader', 'Come and join the band!', 'Youth fellowship is on Fridays.'),
  v_gift_shop: V(['Shop Attendant Ife'], 'Gift shop attendant', 'Postcards, prints, souvenirs!', 'Each print is numbered.'),
  v_art_class: V(['Instructor Mrs. Adebayo'], 'Art teacher', 'Hold the brush lightly.', 'There is no wrong colour.'),
  v_audio_guide: V(['Guide Bukola'], 'Gallery guide', 'Press play when you are ready.', 'Take your time.'),
  v_gallery_cafe: V(['Cafe Simi'], 'Cafe barista', 'Coffee and a pastry?', 'The cake is homemade.'),
  v_photo_exhibit: V(['Curator Mr. Ugo'], 'Curator', 'Each photo tells a story.', 'Look closely at the faces.'),
  v_foosball: V(['Champion Kunle'], 'Table football champion', 'Anybody wan challenge me?', 'I never lose at this table.'),
  v_fifa_corner: V(['FIFA Boy Deji'], 'FIFA player', 'Pick your team, I go pick mine.', 'You no fit beat me.'),
  v_jersey_stall: V(['Jersey Seller Ade'], 'Jersey seller', 'Original, no fake!', 'Which club you support?'),
  v_prediction_board: V(['Punter Baba Rufus'], 'Football punter', 'Write your prediction, e go happen.', 'I never miss on Saturday.'),
  v_suya_corner: V(['Suya Man Mallam Usman'], 'Suya man', 'Suya hot, oga! Extra pepper?', 'Beef or chicken?'),
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
      bottom: woman ? (h % 2 ? 'skirt' : 'trousers') : 'trousers', bottomColor: COLORS[(h >>> 6) % COLORS.length], shoes: 'sandals', shoeColor: '#2B2B2B', accessory: 'none',
    } as Appearance;
    const profile: NpcProfile = { id: `npc:vendor:${it.uid}`, name, appearance, wallet: 6000 + (h % 8) * 1000, greeting: v.greeting, role: v.role, starter: v.starter, venue: kind };
    npcRegistry.set(profile.id, profile);
    out.push({ profile, x, z, yaw: th });
  }
  return out;
}

/** What a vendor says when you start, buy, work, win, lose or just chat at their prop. */
export type VendorMoment = 'greet' | 'buy' | 'work' | 'win' | 'lose' | 'chat';
const LINES: Record<VendorMoment, string[]> = {
  greet: ['Welcome, oga!', 'Ah, my customer! Come!', 'Good to see you o!', 'How can I help you?', 'Wetin you wan do?'],
  buy: ['Thank you o! Come again.', 'Na so! Enjoy am.', 'God bless your hustle!', 'Ah, you get taste!', 'Your money is safe with me.'],
  work: ['Well done! Come back tomorrow.', 'You work hard. Respect!', 'This one na correct work.', 'Collect your money. Nobody cheat you.'],
  win: ['Ah! You are lucky today!', 'Oga, you win! Collect am.', 'See as you dey blow!', 'Chai! Na you biggest!'],
  lose: ['Sorry o. Try again.', 'Ah ah, that one pain me too.', 'No wahala, tomorrow is another day.', 'Next time na your time.'],
  chat: ['Hahaha! You sabi talk.', 'Na so e be o.', 'Come back any time.', 'You dey alright.'],
};
export const vendorLine = (m: VendorMoment) => LINES[m][Math.floor(Math.random() * LINES[m].length)];
