/**
 * SIMULATED players. Nigeria Life has no multiplayer yet, so every "player" you can find, message, hire or be hired by is a
 * scripted character defined here. The UI labels them "Simulated player". When real accounts exist, this list is replaced
 * by a server lookup and the rest of the code keeps its shape (ids stay `p:<username>`).
 */
export interface ServiceDef { category: string; from: number; blurb: string }
export interface PlayerDef {
  id: string; username: string; name: string; avatar: string; city: string; bio: string;
  /** If false, a first message from you is a request they never accept. */
  acceptsStrangers: boolean;
  /** What they send when they contact you (arrives as a message request or a chat, depending on your privacy setting). */
  opener: string;
  lines: string[];
  /** Services they offer on Hustle (stated prices, no ratings). */
  services: ServiceDef[];
}
const p = (username: string, name: string, avatar: string, city: string, bio: string, acceptsStrangers: boolean, opener: string, lines: string[], services: ServiceDef[] = []): PlayerDef => ({ id: `p:${username}`, username, name, avatar, city, bio, acceptsStrangers, opener, lines, services });

export const HUSTLE_CATEGORIES = ['Decorating', 'DJ and music', 'Driving', 'Cooking and catering', 'Event planning', 'Tailoring', 'Repairs', 'Hair and beauty', 'Delivery', 'Design'] as const;

export const PLAYERS: PlayerDef[] = [
  p('lekki_larry', 'Larry O.', '🧑🏾‍💼', 'Lagos', 'Interior decorator. Lekki and Ikoyi.', true, 'Good day! I saw your place on the map. I do interiors, interested?', ['Send me the room size and I will quote.', 'I can start this week.'], [{ category: 'Decorating', from: 25000, blurb: 'Rooms styled with what you already own.' }]),
  p('dj_kele', 'DJ Kele', '🎧', 'Lagos', 'Weddings, house parties, Quilox nights.', true, 'Yo! Need a DJ for your next owambe?', ['Tell me the date and the vibe.', 'Afrobeats, amapiano, highlife, all day.'], [{ category: 'DJ and music', from: 40000, blurb: 'A full night of music and a mic.' }]),
  p('ada_cooks', 'Ada N.', '👩🏾‍🍳', 'Abuja', 'Small chops, jollof, party trays.', true, 'Hello dear, I do catering. Anything for your guests?', ['How many people are we feeding?', 'Jollof, fried rice and chicken, the full package.'], [{ category: 'Cooking and catering', from: 30000, blurb: 'Party trays for 10 to 100 guests.' }]),
  p('okada_musa', 'Musa B.', '🏍️', 'Lagos', 'Fast deliveries and city rides.', true, 'Boss, if you have anything to move, I am free now.', ['I know all the shortcuts.', 'Send the address.'], [{ category: 'Delivery', from: 3000, blurb: 'Parcels across Lagos, same day.' }, { category: 'Driving', from: 8000, blurb: 'Rides and errands.' }]),
  p('bisi_events', 'Bisi A.', '💃🏾', 'Lagos', 'Weddings, naming ceremonies, launches.', false, 'Hi! I help people plan events. Do you have one coming up?', ['Let me know your budget first.'], [{ category: 'Event planning', from: 60000, blurb: 'Plan, vendors and day-of coordination.' }]),
  p('tailor_kunle', 'Kunle T.', '🧵', 'Lagos', 'Aso-ebi and kaftans, delivered on time.', true, 'Good afternoon. I sew native wear. Need anything?', ['Bring your measurements.', 'Give me one week.'], [{ category: 'Tailoring', from: 20000, blurb: 'Native wear and alterations.' }]),
  p('femi_fixes', 'Femi E.', '🔧', 'Lagos', 'Phones, laptops, generators.', true, 'Hey, I fix electronics at Computer Village. Anything broken?', ['Bring it in and I will check.', 'Diagnosis is free.'], [{ category: 'Repairs', from: 10000, blurb: 'Phones, laptops and small appliances.' }]),
  p('halima_hair', 'Halima S.', '💇🏾‍♀️', 'Abuja', 'Braids, wigs, makeup.', true, 'Hi love! Booking this week, want a slot?', ['I do house calls in Wuse.', 'Send me a style you like.'], [{ category: 'Hair and beauty', from: 15000, blurb: 'Hair and makeup, at home or in studio.' }]),
  p('engr_chidi', 'Chidi U.', '👷🏾', 'Port Harcourt', 'Engineer. Builds, repairs, designs.', false, 'Hello, I do small renovation jobs. Interested?', ['Send photos of the place.'], [{ category: 'Repairs', from: 35000, blurb: 'Plumbing, wiring and small renovations.' }]),
  p('pixel_tola', 'Tola P.', '🎨', 'Lagos', 'Logos, flyers, social media designs.', true, 'Hi! Need a logo or a flyer? I turn around fast.', ['What is the brand name?', 'Two revisions are included.'], [{ category: 'Design', from: 12000, blurb: 'Logos, flyers and social posts.' }]),
  p('amaka_ride', 'Amaka I.', '🚗', 'Abuja', 'Private driver, airport runs.', true, 'Good morning, I drive in Abuja. Need a ride or a driver?', ['Airport pickups are my speciality.'], [{ category: 'Driving', from: 10000, blurb: 'Airport runs and day hire.' }]),
  p('yemi_decor', 'Yemi D.', '🪴', 'Lagos', 'Plants, lighting and small spaces.', true, 'Hi, I make small rooms feel bigger. Want ideas?', ['Lighting changes everything.'], [{ category: 'Decorating', from: 18000, blurb: 'Small-space styling and plants.' }]),
];
export const getPlayer = (id: string) => PLAYERS.find((x) => x.id === id);
