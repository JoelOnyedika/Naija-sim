import type { SkillId } from '@/stores/skillStore';

/**
 * Career catalogue. Add a career by adding one `career(...)` line: nothing else needs to change. Every number a shift needs
 * (length, energy, requirements, promotion pace) is derived from the career's `tier` (how demanding it is) and the rank, by
 * the formulas in `rankOf`, so balance is tuned in one place. Salaries are per shift, in naira, and are examples.
 */
export interface RankDef {
  title: string; salary: number; seconds: number; energyCost: number; hungerCost: number;
  /** Charisma (a stat) needed to hold this rank. */
  minCharisma: number;
  /** Skill level (of the career's skill) needed to hold this rank. */
  minSkillLevel: number;
  /** Shifts worked at THIS rank before the next rank can be requested. */
  shiftsToNext: number;
}
export interface CareerDef {
  id: string; name: string; glyph: string; sector: string; employer: string; blurb: string;
  skill: SkillId;
  /** Informal work anyone can start without applying (street trading, labour). Formal careers need an application. */
  openHire: boolean;
  charismaGain: number; skillXpPerShift: number;
  ranks: RankDef[];
}

const rankOf = (tier: number, i: number, title: string, salary: number): RankDef => ({
  title, salary,
  seconds: Math.min(60, 20 + tier * 8 + i * 3),
  energyCost: Math.min(40, 14 + tier * 3 + i * 2),
  hungerCost: 5 + tier * 2,
  minCharisma: tier * 4 + i * 2,
  minSkillLevel: i < 2 ? 1 : Math.min(5, 1 + Math.floor(i / 2)),
  shiftsToNext: 3 + i * 2,
});

function career(id: string, name: string, glyph: string, sector: string, employer: string, blurb: string, skill: SkillId, tier: number, openHire: boolean, ranks: [string, number][]): CareerDef {
  return { id, name, glyph, sector, employer, blurb, skill, openHire, charismaGain: 0.3 + tier * 0.1, skillXpPerShift: 7 + tier, ranks: ranks.map(([t, s], i) => rankOf(tier, i, t, s)) };
}

export const SECTORS = ['Street & informal', 'Retail & hospitality', 'Transport & logistics', 'Trades & industry', 'Technology', 'Finance', 'Health', 'Creative & media', 'Education & public service', 'Sports & fitness', 'Aviation & energy'] as const;

export const CAREERS: CareerDef[] = [
  // Street & informal (open hire)
  career('pos', 'POS Agent', '💳', 'Street & informal', 'Mama Ife Cash Point', 'Withdrawals and transfers from a roadside kiosk.', 'finance', 0, true, [['POS Agent', 6500], ['Senior POS Agent', 9000], ['Kiosk Owner-Operator', 14000]]),
  career('shayi', 'Street Food Vendor', '🍳', 'Street & informal', 'Roadside stall', 'Shayi, tea, bread and fried egg for the morning rush.', 'cooking', 0, true, [['Shayi and Egg Vendor', 5500], ['Mama Put Vendor', 8500], ['Canteen Owner', 15000]]),
  career('domestic', 'Domestic Work', '🧹', 'Street & informal', 'Private households', 'Cleaning, laundry and cooking for busy families.', 'cooking', 0, true, [['Domestic Helper', 7000], ['Head Housekeeper', 11000], ['Household Manager', 20000]]),
  career('agric', 'Agriculture', '🌾', 'Street & informal', 'Ogun Farm Settlement', 'From the farm to the market.', 'business', 0, true, [['Farm Hand', 7500], ['Farm Supervisor', 13000], ['Farm Manager', 26000], ['Agribusiness Operator', 48000]]),
  // Retail & hospitality
  career('shop', 'Retail and Shopkeeping', '🛒', 'Retail & hospitality', 'Alaba Provisions', 'Run the counter. Customers will haggle.', 'business', 0, true, [['Shop Attendant', 8000], ['Shop Supervisor', 14000], ['Store Manager', 28000], ['Retail Area Manager', 55000]]),
  career('hospitality', 'Hospitality', '🏨', 'Retail & hospitality', 'Ikeja Grand Hotel', 'Make guests feel at home.', 'communication', 1, true, [['Hotel Attendant', 9000], ['Receptionist', 15000], ['Front Desk Supervisor', 26000], ['Hotel Manager', 60000]]),
  career('hair', 'Hair Styling and Beauty', '💇🏾', 'Retail & hospitality', 'Glam Studio, Surulere', 'Braids, weaves and a full beauty chair.', 'creativity', 1, true, [['Salon Apprentice', 6000], ['Hair Stylist', 14000], ['Senior Stylist', 26000], ['Salon Owner', 55000]]),
  career('fashion', 'Fashion and Tailoring', '🧵', 'Retail & hospitality', 'Balogun Tailors', 'Aso-ebi, kaftans and wedding orders.', 'creativity', 1, true, [["Tailor's Apprentice", 6500], ['Tailor', 15000], ['Fashion Designer', 32000], ['Fashion House Owner', 80000]]),
  career('chef', 'Chef and Catering', '👨🏾‍🍳', 'Retail & hospitality', 'Lekki Catering Co.', 'Jollof for a hundred guests.', 'cooking', 2, false, [['Kitchen Assistant', 9000], ['Line Cook', 16000], ['Chef', 30000], ['Head Chef', 60000], ['Executive Chef', 110000]]),
  career('events', 'Event Planning', '🎉', 'Retail & hospitality', 'Owambe Events Ltd', 'Weddings, naming ceremonies and launches.', 'business', 2, false, [['Event Assistant', 10000], ['Event Planner', 25000], ['Lead Planner', 48000], ['Events Director', 95000]]),
  // Transport & logistics
  career('rider', 'Logistics and Delivery', '🏍️', 'Transport & logistics', 'Swift Dispatch', 'Beat the traffic with a parcel on your back.', 'driving', 1, true, [['Dispatch Rider', 12000], ['Senior Rider', 16000], ['Dispatch Supervisor', 24000], ['Logistics Coordinator', 38000]]),
  career('keke', 'Keke Riding', '🛺', 'Transport & logistics', 'Oshodi Park Union', 'Full tricycle, every trip.', 'driving', 1, true, [['Keke Driver', 18000], ['Fleet Keke Operator', 26000], ['Keke Fleet Owner', 40000]]),
  // Trades & industry
  career('construction', 'Construction', '🏗️', 'Trades & industry', 'Eko Builders', 'Blocks, concrete and deadlines.', 'fitness', 1, true, [['Site Labourer', 10000], ['Bricklayer', 16000], ['Site Foreman', 28000], ['Construction Manager', 52000]]),
  career('security', 'Security', '🛡️', 'Trades & industry', 'Sentinel Guards', 'Gate duty and patrols.', 'fitness', 1, true, [['Security Guard', 9000], ['Senior Guard', 13000], ['Security Supervisor', 21000], ['Head of Security', 36000]]),
  career('civileng', 'Civil Engineering', '📐', 'Trades & industry', 'Third Mainland Projects', 'Roads, bridges and drainage.', 'business', 3, false, [['Graduate Engineer', 22000], ['Site Engineer', 45000], ['Project Engineer', 80000], ['Chief Engineer', 150000]]),
  // Technology
  career('tech', 'Technology and Software', '💻', 'Technology', 'Yaba Tech Hub', 'Ship features, survive stand-ups.', 'coding', 3, false, [['Intern', 15000], ['Junior Developer', 65000], ['Developer', 95000], ['Senior Developer', 150000], ['Technical Lead', 230000], ['Engineering Manager', 330000], ['Technology Executive', 500000]]),
  // Finance
  career('bank', 'Banking and Finance', '🏦', 'Finance', 'Eko Trust Bank', 'Smile. Count. Repeat.', 'finance', 2, false, [['Entry-Level Staff', 14500], ['Banking Officer', 21000], ['Relationship Officer', 28500], ['Senior Officer', 42000], ['Branch Manager', 85000], ['Regional Manager', 190000]]),
  career('trading', 'Trading and Financial Markets', '📈', 'Finance', 'Marina Securities', 'Read the market before it moves.', 'finance', 3, false, [['Trading Assistant', 20000], ['Junior Trader', 38000], ['Market Trader', 70000], ['Senior Trader', 130000], ['Head of Trading', 260000]]),
  career('realestate', 'Real Estate', '🏘️', 'Finance', 'Seun Properties', 'Show flats, close deals.', 'business', 2, false, [['Agent Trainee', 10000], ['Property Agent', 26000], ['Senior Agent', 50000], ['Agency Director', 110000]]),
  // Health
  career('nursing', 'Nursing', '🩺', 'Health', 'Lagos General Hospital', 'Long shifts, steady hands.', 'communication', 2, false, [['Student Nurse', 14000], ['Staff Nurse', 30000], ['Senior Nurse', 48000], ['Nurse Manager', 85000], ['Chief Nursing Officer', 150000]]),
  career('medicine', 'Medicine', '⚕️', 'Health', 'Lagos General Hospital', 'From house officer to consultant.', 'communication', 4, false, [['House Officer', 35000], ['Medical Officer', 60000], ['Registrar', 110000], ['Consultant', 220000]]),
  // Creative & media
  career('dj', 'Music and DJ Work', '🎧', 'Creative & media', 'Quilox Nights', 'Read the crowd, keep the floor full.', 'creativity', 1, false, [['Party DJ', 9000], ['Club Resident DJ', 24000], ['Headline DJ', 70000], ['Touring Artist', 160000]]),
  career('content', 'Content Creation', '📱', 'Creative & media', 'Your own channel', 'Skits, reviews and street interviews.', 'creativity', 1, true, [['Starter Creator', 6000], ['Rising Creator', 20000], ['Influencer', 60000], ['Media Brand Owner', 150000]]),
  career('broadcast', 'Broadcasting', '🎙️', 'Creative & media', 'Eko FM', 'On air in five, four, three...', 'communication', 2, false, [['Studio Assistant', 11000], ['Presenter', 28000], ['Senior Presenter', 50000], ['Head of Programmes', 95000]]),
  career('production', 'Production Management', '🎬', 'Creative & media', 'Nollywood Studios', 'Keep the shoot on time and on budget.', 'creativity', 2, false, [['Production Assistant', 11000], ['Production Coordinator', 24000], ['Producer', 55000], ['Executive Producer', 120000]]),
  // Education & public service
  career('teaching', 'Teaching', '📚', 'Education & public service', 'Government College', 'Shape the next generation.', 'teaching', 2, false, [['Teaching Assistant', 12000], ['Teacher', 24000], ['Senior Teacher', 38000], ['Head Teacher', 60000], ['School Principal', 100000]]),
  career('civil', 'Civil Service', '🏛️', 'Education & public service', 'Lagos State Secretariat', 'Memos, files and long meetings.', 'communication', 2, false, [['Clerical Officer', 12000], ['Executive Officer', 22000], ['Principal Officer', 36000], ['Director', 70000], ['Permanent Secretary', 130000]]),
  // Sports & fitness
  career('fitcoach', 'Fitness Coaching', '🏋️', 'Sports & fitness', 'iFitness', 'Spot, motivate, repeat.', 'fitness', 1, false, [['Gym Attendant', 9000], ['Fitness Coach', 20000], ['Personal Trainer', 35000], ['Head Coach', 65000]]),
  career('football', 'Football', '⚽', 'Sports & fitness', 'Lagos United', 'From the academy to the national team.', 'fitness', 3, false, [['Academy Trainee', 8000], ['Local League Player', 25000], ['Professional Player', 90000], ['Star Striker', 300000]]),
  // Aviation & energy
  career('aviation', 'Aviation', '✈️', 'Aviation & energy', 'Naija Air', 'Cabin to cockpit.', 'communication', 3, false, [['Ground Crew', 18000], ['Cabin Crew', 35000], ['First Officer', 90000], ['Captain', 220000]]),
  career('airport', 'Airport Operations', '🛄', 'Aviation & energy', 'Murtala Muhammed Airport', 'Baggage, gates and turnaround.', 'communication', 2, false, [['Ground Handler', 14000], ['Baggage Supervisor', 22000], ['Operations Officer', 40000], ['Airport Manager', 90000]]),
  career('oilgas', 'Oil and Gas', '🛢️', 'Aviation & energy', 'Niger Delta Energy', 'Offshore rotations and safety drills.', 'business', 3, false, [['Rig Hand', 25000], ['Technician', 50000], ['Drilling Engineer', 100000], ['Operations Manager', 210000]]),
];
export const getCareer = (id: string) => CAREERS.find((c) => c.id === id);
