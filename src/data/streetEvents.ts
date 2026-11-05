import type { Effects } from '@/types/game';
import type { InteriorKind } from './interiors';
import type { SkillId } from '@/stores/skillStore';
import type { ChainId } from './circuits';

/**
 * Street moments: short Nigerian encounters that interrupt you while you live your life. Somebody stops you, you pick what to
 * say or do, and it changes your stats and naira. Pure data. The rules for when one appears are in game/streetEvents.ts.
 * In-game naira only, nothing here is real money.
 */
/** Money fields are signed naira: positive is paid to the player, negative is paid by the player. */
export interface EventRisk { winChance: number; winText: string; loseText: string; winEffects?: Effects; winMoney?: number; loseEffects?: Effects; loseMoney?: number }
export interface EventChoice {
  id: string; label: string;
  /** Naira the player pays up front. The button is disabled when they cannot afford it. */
  cost?: number;
  effects?: Effects; money?: number; skill?: { id: SkillId; xp: number };
  /** If set, the outcome is a dice roll and `text`/effects apply only when there is no risk block. */
  risk?: EventRisk;
  text: string;
  /** Extra daily-quest counter to bump, e.g. 'agbo' counts for "street:agbo". */
  tag?: string;
  /** Counts one step of a long story (Mama Agbo purchases, owambe parties), or ends it with this ending. */
  step?: ChainId; ending?: string;
}
export type EventPlace = 'home' | 'venue' | InteriorKind[];
export interface StreetEvent {
  id: string; icon: string; who: string; title: string; text: string;
  /** 'home': only in your own house. 'venue': in any public place. Or a list of venue kinds. */
  where: EventPlace;
  /** Game-clock hour window [from, to). Wraps midnight when from > to. */
  hours?: [number, number];
  lifeType?: 'lapo' | 'nepo';
  weight: number;
  /** Only appears while the player is at these levels (0 to 3) of a long story; `open` also needs the story not yet ended. */
  chain?: { id: ChainId; min?: number; max?: number; open?: boolean };
  /** Real minutes before this one can appear again. */
  cooldownMin: number;
  /** Real seconds the player has to answer. */
  seconds?: number;
  choices: EventChoice[];
  /** What happens if the player lets the timer run out. */
  ignore: { text: string; effects?: Effects };
}

/** How often moments appear (real seconds between the end of one and the start of the next). */
export const EVENT_PACING = { minGap: 100, maxGap: 220, firstDelay: 60, defaultSeconds: 25 };
const SKIP = (label = 'No, thank you'): EventChoice => ({ id: 'skip', label, text: 'You smile and keep moving.' });

export const STREET_EVENTS: StreetEvent[] = [
  // ---------- the market ----------
  { id: 'agbo_mama', icon: '🌿', who: 'Mama Agbo', title: 'Agbo for your body', text: '"My pikin, come drink agbo! E go wash your blood and clear your eyes. Only ₦500!"',
    where: ['market'], weight: 10, cooldownMin: 6, chain: { id: 'mama', max: 0 },
    choices: [
      { id: 'buy', label: 'Buy agbo (₦500)', cost: 500, effects: { health: 12, hygiene: 4, happiness: -4 }, text: 'Bitter! But your body feels clean. Mama Agbo smiles.', tag: 'agbo', step: 'mama' },
      { id: 'haggle', label: 'Haggle to ₦300', tag: 'agbo', step: 'mama', risk: { winChance: 0.55, winText: 'She hisses, then agrees. ₦300 agbo, enjoy.', loseText: 'She says "Last price na ₦500!" You pay and drink.', winEffects: { health: 12, hygiene: 4, happiness: -2, charisma: 1 }, loseEffects: { health: 12, hygiene: 4, happiness: -4 }, winMoney: -300, loseMoney: -500 }, text: '' },
      SKIP(),
    ], ignore: { text: 'Mama Agbo shakes her head and moves on to the next person.' } },
  { id: 'fabric_haggle', icon: '🧵', who: 'Alhaji Dansiru', title: 'Original Ankara!', text: '"Oga, see this Ankara! Original Holland wax. For you, ₦8,000, no problem!"',
    where: ['market'], weight: 7, cooldownMin: 8,
    choices: [
      { id: 'buy', label: 'Buy it (₦8,000)', cost: 8000, effects: { charisma: 3, happiness: 6 }, text: 'You look fresh in the new wrapper. Omo, correct!' },
      { id: 'haggle', label: 'Haggle hard', risk: { winChance: 0.5, winText: 'He sighs, "Take am, ₦4,500, you don win."', loseText: 'He gets offended: "You no get respect!" You leave embarrassed.', winEffects: { charisma: 3, happiness: 7 }, loseEffects: { social: -3, happiness: -3 }, winMoney: -4500 }, text: '' },
      SKIP('Not today'),
    ], ignore: { text: 'Alhaji Dansiru is already pushing his cloth on somebody else.' } },
  { id: 'excess_change', icon: '💱', who: 'Shop owner', title: 'Excess change', text: 'The shopkeeper gave you ₦2,000 too much change. He has not noticed.',
    where: ['market', 'mall'], weight: 5, cooldownMin: 12,
    choices: [
      { id: 'return', label: 'Return it', effects: { charisma: 3, social: 3 }, text: 'He is shocked and thanks you. "God go bless you!"' },
      { id: 'keep', label: 'Keep it quietly', money: 2000, effects: { charisma: -1 }, text: 'You pocket ₦2,000. Your conscience mutters a little.' },
    ], ignore: { text: 'You hesitate too long. He counts his money and spots the mistake himself.' } },
  { id: 'thief', icon: '🏃', who: 'Crowd', title: 'Thief! Thief!', text: 'Somebody screams. A boy is running with a woman\'s handbag, straight toward you!',
    where: ['market', 'mall', 'club', 'stadium'], weight: 6, cooldownMin: 10, seconds: 12,
    choices: [
      { id: 'chase', label: 'Chase him', risk: { winChance: 0.45, winText: 'You catch him and the bag goes back. The crowd claps for you!', loseText: 'He is too fast. You are out of breath.', winEffects: { charisma: 3, social: 4, energy: -6 }, loseEffects: { energy: -6, happiness: -2 }, winMoney: 1500 }, text: '' },
      { id: 'shout', label: 'Shout and point', effects: { social: 2 }, text: 'Others catch him because of your shout. Good teamwork.' },
      { id: 'ignore', label: 'Mind your business', text: 'Not your wahala. You walk on.' },
    ], ignore: { text: 'He ran past before you could do anything.' } },
  // ---------- hawkers, anywhere in public ----------
  { id: 'pure_water', icon: '💧', who: 'Pure-water girl', title: 'Pure water, pure water!', text: '"Cold pure water! ₦100 only, Oga, you go need am!"',
    where: 'venue', weight: 9, cooldownMin: 4, seconds: 15,
    choices: [
      { id: 'one', label: 'Buy 1 (₦100)', cost: 100, effects: { thirst: 15 }, text: 'Cold and sweet. Small thing, big relief.' },
      { id: 'three', label: 'Buy 3 (₦300)', cost: 300, effects: { thirst: 40, happiness: 2 }, text: 'You drink one and carry two. Wise.' },
      SKIP(),
    ], ignore: { text: 'She moves on to the next customer.' } },
  { id: 'suya_boy', icon: '🍢', who: 'Suya man', title: 'Suya wey sweet', text: '"Fresh suya, extra pepper! ₦1,500 and you go thank me!"',
    where: 'venue', hours: [17, 24], weight: 8, cooldownMin: 6,
    choices: [
      { id: 'one', label: 'Buy suya (₦1,500)', cost: 1500, effects: { hunger: 28, happiness: 7 }, text: 'The pepper hits. You dey fly. Mouth on fire, heart happy.' },
      { id: 'big', label: 'Double suya (₦3,000)', cost: 3000, effects: { hunger: 50, happiness: 10, thirst: -8 }, text: 'You eat like a king. Now you need water!' },
      SKIP('I just ate'),
    ], ignore: { text: 'The smoke clears and the suya man is gone.' } },
  { id: 'puff_puff', icon: '🍩', who: 'Auntie Ronke', title: 'Hot puff-puff', text: '"Puff-puff! Fresh from the oil! ₦500 for ten!"',
    where: ['park', 'stadium', 'viewing', 'beach', 'cinema'], weight: 7, cooldownMin: 6,
    choices: [
      { id: 'buy', label: 'Buy ten (₦500)', cost: 500, effects: { hunger: 14, happiness: 6 }, text: 'Soft, sweet and hot. You share one with a stranger.' },
      SKIP(),
    ], ignore: { text: 'She sells her last ones to somebody else.' } },
  { id: 'agbero_levy', icon: '🧢', who: 'Agbero', title: 'Ticket!', text: 'A man in a torn vest steps in front of you: "Oga, pay your ticket! ₦500 for parking, na the rule!"',
    where: ['market', 'viewing', 'stadium', 'mall', 'eatery', 'airport', 'port'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'pay', label: 'Pay ₦500', cost: 500, effects: { happiness: -2 }, text: 'He tears a paper and walks away. You still do not know what ticket.' },
      { id: 'argue', label: 'Argue back', risk: { winChance: 0.5, winText: 'You talk so well he gives up: "Ah, Oga, I no know say you be lawyer." No charge.', loseText: 'The argument grows. You pay ₦1,000 to make peace.', winEffects: { charisma: 3, social: 2 }, loseEffects: { happiness: -4 }, loseMoney: -1000 }, text: '' },
      { id: 'run', label: 'Walk away fast', effects: { energy: -4, happiness: -1 }, text: 'You lose him in the crowd. Your heart is pounding.' },
    ], ignore: { text: 'He shouts after you. You hurry away, embarrassed.', effects: { happiness: -2 } } },
  { id: 'lost_phone', icon: '📱', who: 'On the floor', title: 'A phone on the ground', text: 'You find a phone. The screen shows "Mum calling..." again and again.',
    where: ['park', 'mall', 'beach', 'airport', 'cinema', 'hotel'], weight: 5, cooldownMin: 12,
    choices: [
      { id: 'answer', label: 'Answer and return it', effects: { charisma: 3, social: 4 }, money: 2000, text: 'The owner arrives in tears and gives you ₦2,000 for your trouble.' },
      { id: 'keep', label: 'Switch it off and keep it', money: 6000, effects: { charisma: -2, happiness: -2 }, text: 'You sell it quickly for ₦6,000. You do not feel great about it.' },
    ], ignore: { text: 'Somebody else picks the phone up first.' } },
  { id: 'free_tasting', icon: '🥘', who: 'Promo girl', title: 'Free jollof tasting', text: '"Try our new jollof, completely free! Tell your friends!"',
    where: ['mall', 'airport', 'eatery'], weight: 6, cooldownMin: 10,
    choices: [
      { id: 'taste', label: 'Take a spoon', effects: { hunger: 10, happiness: 3 }, text: 'Smoky party jollof. Not bad at all.' },
      SKIP(),
    ], ignore: { text: 'She offers it to the next person.' } },
  { id: 'checkpoint', icon: '👮', who: 'Officer', title: 'Show me your ID', text: 'An officer waves you over: "Your ID dey look suspicious. Settle me small, make we close am."',
    where: ['port', 'airport', 'mall', 'bank'], weight: 5, cooldownMin: 14,
    choices: [
      { id: 'pay', label: 'Settle him (₦1,000)', cost: 1000, effects: { happiness: -3 }, text: 'He waves you through with a smile.' },
      { id: 'rights', label: 'Say you know your rights', risk: { winChance: 0.5, winText: 'You stay calm and polite. He lets you go with a nod.', loseText: 'He takes ₦1,000 "for delay" anyway.', winEffects: { charisma: 3, happiness: 2 }, loseEffects: { happiness: -4 }, loseMoney: -1000 }, text: '' },
    ], ignore: { text: 'He loses interest and waves another person over.' } },
  // ---------- church, gallery, stadium, club ----------
  { id: 'offering', icon: '🙏', who: 'Usher', title: 'Thanksgiving offering', text: '"Brother, special thanksgiving offering today. Anything you can give."',
    where: ['church'], weight: 10, cooldownMin: 6,
    choices: [
      { id: 'small', label: 'Give ₦1,000', cost: 1000, effects: { happiness: 6, social: 3 }, text: 'Peace settles on you. "God bless you."' },
      { id: 'big', label: 'Give ₦5,000', cost: 5000, effects: { happiness: 10, social: 5, charisma: 3 }, text: 'The usher bows. People nod as you pass.' },
      SKIP('Pass the basket'),
    ], ignore: { text: 'The basket moves on down the row.' } },
  { id: 'art_critic', icon: '🖼️', who: 'Art lover', title: 'What do you think?', text: '"Excuse me, what do you make of this piece? It is called Lagos at 3 AM."',
    where: ['gallery'], weight: 9, cooldownMin: 8,
    choices: [
      { id: 'deep', label: '"It speaks of hustle."', skill: { id: 'creativity', xp: 5 }, effects: { charisma: 2, social: 2 }, text: '"Exactly!" She talks with you for ten minutes.' },
      { id: 'draw', label: '"My nephew draws better."', effects: { happiness: 3, social: -2 }, text: 'She laughs, a little. Then she leaves.' },
    ], ignore: { text: 'She turns to another visitor and gets a more interesting answer.' } },
  { id: 'match_argument', icon: '⚽', who: 'Football fans', title: 'Messi or Ronaldo?', text: 'Two men argue loudly and turn to you: "You, answer! Who is the GOAT? Settle it!"',
    where: ['viewing', 'stadium'], weight: 10, cooldownMin: 6,
    choices: [
      { id: 'messi', label: 'Messi, obviously', effects: { social: 5, happiness: 4, energy: -3 }, text: 'Half the room cheers, the other half boos. Beautiful.' },
      { id: 'ronaldo', label: 'Ronaldo, no contest', effects: { social: 5, happiness: 4, energy: -3 }, text: 'Half the room cheers, the other half boos. Beautiful.' },
      { id: 'peace', label: '"Both are great"', effects: { charisma: 2, social: 1 }, text: 'Both men say you are fake. You keep your peace.' },
    ], ignore: { text: 'They argue past you for the next hour.' } },
  { id: 'match_bet', icon: '🎰', who: 'Betting agent', title: 'Tonight\'s match', text: '"Back the home team! ₦2,000 stake, double or nothing. Trust me, I know the coach."',
    where: ['viewing', 'stadium'], weight: 6, cooldownMin: 12,
    choices: [
      { id: 'bet', label: 'Stake ₦2,000', cost: 2000, risk: { winChance: 0.4, winText: 'GOAL in the 89th minute! You collect ₦4,000.', loseText: 'The coach lied. Your stake is gone.', winEffects: { happiness: 8, social: 3 }, loseEffects: { happiness: -6 }, winMoney: 4000 }, text: '' },
      SKIP('No, I know better'),
    ], ignore: { text: 'He finds another customer fast.' } },
  { id: 'club_vip', icon: '🍾', who: 'Bouncer', title: 'VIP table', text: '"Big man, I have one VIP table left. ₦20,000 and the whole club will see you."',
    where: ['club'], weight: 9, cooldownMin: 10,
    choices: [
      { id: 'vip', label: 'Take the table (₦20,000)', cost: 20000, effects: { social: 9, charisma: 4, happiness: 9 }, text: 'Sparklers, champagne and every eye on your table.' },
      { id: 'floor', label: 'Stay on the dance floor', effects: { social: 3, energy: -4, happiness: 4 }, text: 'You dance until your feet complain. Worth it.' },
    ], ignore: { text: 'The bouncer shrugs and gives the table to another big man.' } },
  { id: 'owambe_spray', icon: '🎊', who: 'MC', title: 'Spray the bride!', text: 'A wedding party passes by. The MC shouts: "Spray! Spray the bride! Who dey spray?"',
    where: ['park', 'hotel', 'stadium', 'club'], weight: 5, cooldownMin: 12,
    choices: [
      { id: 'spray', label: 'Spray ₦2,000', cost: 2000, effects: { charisma: 3, social: 5, happiness: 5 }, text: 'Naira notes everywhere. You get a shout-out on the mic.' },
      { id: 'dance', label: 'Just dance (free)', effects: { social: 3, happiness: 4, energy: -3 }, text: 'You dance with them for a minute. Nobody minds.' },
      SKIP(),
    ], ignore: { text: 'The party moves on without you.' } },
  { id: 'hackathon', icon: '🧑🏽‍💻', who: 'Organiser', title: 'Hackathon starting!', text: '"We need one more person! Five minutes to go. Come and build something."',
    where: ['techhub'], weight: 10, cooldownMin: 8,
    choices: [
      { id: 'join', label: 'Join the team', skill: { id: 'coding', xp: 12 }, effects: { energy: -8, social: 4, charisma: 1 }, text: 'You code like crazy for an hour and learn a lot.' },
      SKIP('Maybe next time'),
    ], ignore: { text: 'The team fills up without you.' } },
  { id: 'coconut', icon: '🥥', who: 'Coconut seller', title: 'Fresh coconut', text: '"Coconut water! Cold and fresh from the tree! ₦500 only."',
    where: ['beach'], weight: 10, cooldownMin: 5,
    choices: [
      { id: 'buy', label: 'Buy one (₦500)', cost: 500, effects: { thirst: 28, happiness: 4 }, text: 'Sweet and cold. Beach life.' },
      SKIP(),
    ], ignore: { text: 'He carries his cooler to the next group.' } },
  { id: 'horse_ride', icon: '🐎', who: 'Horse owner', title: 'Horse ride!', text: '"Ride the horse, Oga! ₦3,000 and you go feel like Shaka Zulu!"',
    where: ['beach'], weight: 6, cooldownMin: 10,
    choices: [
      { id: 'ride', label: 'Ride (₦3,000)', cost: 3000, effects: { happiness: 11, energy: -4, charisma: 1 }, text: 'You shout "Hiya!" and the horse ignores you. Still fun.' },
      SKIP(),
    ], ignore: { text: 'He leads the horse away.' } },
  // ---------- at home ----------
  { id: 'mama_call', icon: '👩🏾', who: 'Mama', title: 'Mama is calling', text: '"My pikin, have you eaten? Please don\'t skip meals. And call me more often!"',
    where: 'home', weight: 9, cooldownMin: 10,
    choices: [
      { id: 'talk', label: 'Talk for a while', effects: { happiness: 8, social: 3 }, text: 'Twenty minutes of prayers and gist. You feel loved.' },
      { id: 'busy', label: '"Mama, I dey busy."', effects: { happiness: -2 }, text: 'She says, "Okay o, God go bless your hustle." You feel a little guilty.' },
    ], ignore: { text: 'The call goes to voicemail. Mama will call again.', effects: { happiness: -1 } } },
  { id: 'egusi_aroma', icon: '🍲', who: 'Neighbour', title: 'Egusi aroma', text: 'Your neighbour knocks: "Come and eat! I made too much egusi and pounded yam."',
    where: 'home', hours: [12, 22], weight: 8, cooldownMin: 10,
    choices: [
      { id: 'eat', label: 'Go and eat', effects: { hunger: 30, happiness: 6, social: 4 }, text: 'Soft swallow, hot soup. You collect a second plate, shamelessly.' },
      SKIP('I just ate, thanks'),
    ], ignore: { text: 'The knocking stops. The smell stays.' } },
  { id: 'landlord_knock', icon: '🚪', who: 'Landlord', title: 'Knock knock', text: 'Your landlord is at the door: "Light bill contribution. ₦2,000 each for the compound, abeg."',
    where: 'home', weight: 6, cooldownMin: 15,
    choices: [
      { id: 'pay', label: 'Pay ₦2,000', cost: 2000, effects: { social: 2 }, text: 'He thanks you and promises to fix the gate. He will not.' },
      { id: 'hide', label: 'Pretend you are not home', risk: { winChance: 0.5, winText: 'The knocking stops. You hear him grumble down the corridor.', loseText: 'He hears your phone ring. "I know you are inside!" You pay ₦2,000.', winEffects: { happiness: 1 }, loseEffects: { happiness: -3, social: -1 }, loseMoney: -2000 }, text: '' },
    ], ignore: { text: 'He leaves a note on your door.' } },
  { id: 'scam_text', icon: '📩', who: 'Unknown number', title: 'You won ₦5,000,000!', text: 'A text: "CONGRATULATIONS! You won our mega draw. Send ₦1,000 processing fee to claim."',
    where: 'home', weight: 7, cooldownMin: 12,
    choices: [
      { id: 'send', label: 'Send the ₦1,000', cost: 1000, effects: { happiness: -6 }, text: 'No prize ever came. It was a scam. Lesson learned.' },
      { id: 'block', label: 'Block the number', skill: { id: 'finance', xp: 5 }, effects: { charisma: 1 }, text: 'You know that if something is too good to be true, it is. Blocked.' },
    ], ignore: { text: 'You scroll past. The number texts again tomorrow.' } },
  { id: 'data_finish', icon: '📶', who: 'Network', title: 'Your data don finish', text: 'A message: "You have used 100% of your data. Buy more to continue."',
    where: 'home', weight: 6, cooldownMin: 10,
    choices: [
      { id: 'buy', label: 'Buy 2GB (₦1,000)', cost: 1000, effects: { happiness: 3 }, text: 'Back online. You scroll for another hour.' },
      { id: 'wait', label: 'Use your neighbour\'s WiFi', effects: { happiness: -2, social: 1 }, text: 'The password is the neighbour\'s phone number. Slow, but free.' },
    ], ignore: { text: 'You stare at the loading circle and sigh.', effects: { happiness: -2 } } },
  { id: 'owambe_invite', icon: '💌', who: 'Chioma', title: 'Owambe this weekend', text: '"Babe, Tola\'s wedding on Saturday. Aso-ebi is ₦5,000. You are coming, abi?"',
    where: 'home', weight: 6, cooldownMin: 14,
    choices: [
      { id: 'yes', label: 'Buy the aso-ebi (₦5,000)', cost: 5000, effects: { charisma: 3, social: 6, happiness: 6 }, text: 'You will match everyone in the photo. Fashion sorted.' },
      { id: 'no', label: '"I no fit this time"', effects: { social: -2 }, text: 'She sends a sad emoji. You will make it up to her.' },
    ], ignore: { text: 'She leaves you on read. You also leave her on read.', effects: { social: -1 } } },
  // ---------- more for the quieter venues (v21) ----------
  { id: 'stadium_vuvuzela', icon: '📣', who: 'Ultras leader', title: 'Lead the chant!', text: 'The crowd goes quiet at a bad moment. The ultras leader hands you the megaphone: "You! Start the song!"',
    where: ['stadium'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'sing', label: 'Start the chant', risk: { winChance: 0.6, winText: 'The whole stand joins in. You feel ten feet tall.', loseText: 'Your voice cracks. Someone throws a groundnut at you.', winEffects: { charisma: 3, social: 5, energy: -3 }, loseEffects: { social: -2, happiness: -2 } }, text: '' },
      SKIP('Pass the megaphone'),
    ], ignore: { text: 'Somebody else grabs the megaphone and the chant starts without you.' } },
  { id: 'stadium_scalper', icon: '🎟️', who: 'Ticket scalper', title: 'VIP tickets, original!', text: '"Oga, VIP ticket, front row, only ₦6,000! Original, I swear on my mother."',
    where: ['stadium', 'concert', 'cinema'], weight: 6, cooldownMin: 12,
    choices: [
      { id: 'buy', label: 'Buy one (₦6,000)', cost: 6000, risk: { winChance: 0.6, winText: 'Real ticket. Front row, the best view in the house.', loseText: 'Fake ticket. The usher laughs at it.', winEffects: { happiness: 10, social: 3 }, loseEffects: { happiness: -8 } }, text: '' },
      SKIP('I will use the normal gate'),
    ], ignore: { text: 'He disappears into the crowd.' } },
  { id: 'club_dj', icon: '🎧', who: 'DJ', title: 'Shout-out?', text: 'The DJ leans over the booth: "Oya, ₦5,000 and I will shout your name on the mic for the whole club!"',
    where: ['club'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'pay', label: 'Pay for the shout-out (₦5,000)', cost: 5000, effects: { charisma: 3, social: 6, happiness: 6 }, text: '"Big man in the building!" The whole floor cheers.' },
      { id: 'dance', label: 'Request a song for free', risk: { winChance: 0.4, winText: 'He plays your song! The floor goes crazy.', loseText: '"Maybe next time, my guy."', winEffects: { social: 4, happiness: 6 }, loseEffects: { happiness: -1 } }, text: '' },
    ], ignore: { text: 'The DJ moves on to a bigger spender.' } },
  { id: 'club_dancefloor', icon: '💃', who: 'Dancer', title: 'Dance battle!', text: 'A confident stranger shuffles up: "You think you can dance? Show me what you have!"',
    where: ['club', 'concert', 'recreation'], weight: 7, cooldownMin: 8,
    choices: [
      { id: 'battle', label: 'Accept the battle', risk: { winChance: 0.5, winText: 'You bring the legwork! The crowd screams your name.', loseText: 'You slip mid-move. The whole circle laughs.', winEffects: { charisma: 3, social: 6, energy: -6 }, loseEffects: { social: -2, energy: -5, happiness: -2 } }, text: '' },
      SKIP('I am just here to vibe'),
    ], ignore: { text: 'They find someone else to challenge.' } },
  { id: 'airport_driver', icon: '🚕', who: 'Taxi man', title: 'Taxi! Taxi!', text: '"Oga, welcome to Lagos! Where you dey go? I give you good price... ₦15,000 only!"',
    where: ['airport'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'haggle', label: 'Haggle him down', risk: { winChance: 0.55, winText: 'He sighs and says "₦8,000, last price." You have a ride.', loseText: 'He refuses and you wait twenty minutes for another taxi.', winEffects: { charisma: 2, energy: -2 }, loseEffects: { energy: -4, happiness: -3 }, winMoney: -8000 }, text: '' },
      { id: 'pay', label: 'Pay and go (₦15,000)', cost: 15000, effects: { happiness: 2 }, text: 'Comfortable seats, loud music. Expensive, but easy.' },
      SKIP('I will use the bus'),
    ], ignore: { text: 'He shouts at the next traveller.' } },
  { id: 'airport_lost', icon: '🧳', who: 'Foreign visitor', title: 'Excuse me, please', text: 'A confused tourist shows you a map: "I am looking for the beach in Lekki. Can you help me?"',
    where: ['airport', 'hotel', 'port'], weight: 6, cooldownMin: 10,
    choices: [
      { id: 'help', label: 'Give directions', skill: { id: 'communication', xp: 6 }, effects: { charisma: 3, social: 3 }, money: 1000, text: 'She thanks you and tips ₦1,000. "Lagos people are the best!"' },
      { id: 'scam', label: 'Send her the wrong way', effects: { charisma: -2, happiness: 2 }, text: 'You feel bad about it as soon as she walks off.' },
    ], ignore: { text: 'She asks somebody else.' } },
  { id: 'port_crane', icon: '🏗️', who: 'Foreman', title: 'Extra hands needed', text: '"We have a container to unload before the ship leaves. ₦3,000 for 10 minutes of work. You in?"',
    where: ['port'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'work', label: 'Help unload', money: 3000, effects: { energy: -10, hygiene: -6 }, text: 'Heavy but honest work. You are tired and ₦3,000 richer.' },
      SKIP('I am not dressed for it'),
    ], ignore: { text: 'He finds someone else.' } },
  { id: 'port_fisherman', icon: '🐟', who: 'Fisherman', title: 'Fresh catch', text: '"Fresh tilapia, just landed! ₦2,000 for a big one, I can grill it for you right here."',
    where: ['port', 'beach'], weight: 7, cooldownMin: 8,
    choices: [
      { id: 'grill', label: 'Buy and grill (₦2,000)', cost: 2000, effects: { hunger: 40, happiness: 8 }, text: 'Smoky, juicy tilapia with pepper sauce. Perfect.' },
      SKIP(),
    ], ignore: { text: 'He sells it to a customer behind you.' } },
  { id: 'bank_queue', icon: '🏦', who: 'Bank officer', title: 'Long queue today', text: 'The queue is huge. A staff member whispers: "For ₦1,000 I can take you to the front."',
    where: ['bank'], weight: 8, cooldownMin: 10,
    choices: [
      { id: 'bribe', label: 'Pay to skip (₦1,000)', cost: 1000, effects: { energy: 2, happiness: 2 }, text: 'You jump the queue. People look at you. Awkward.' },
      { id: 'wait', label: 'Wait your turn', skill: { id: 'finance', xp: 3 }, effects: { energy: -4, charisma: 1 }, text: 'An hour later you are done. Patience is a virtue, they say.' },
    ], ignore: { text: 'You lose your place in the line.', effects: { happiness: -2 } } },
  { id: 'bank_pos', icon: '💳', who: 'POS agent', title: 'No network, boss', text: 'The ATM is out of service. A POS agent outside offers cash: "₦20,000, charge ₦500. Fast!"',
    where: ['bank', 'mall'], weight: 6, cooldownMin: 10,
    choices: [
      { id: 'take', label: 'Withdraw with POS (₦500 charge)', cost: 500, effects: { happiness: 2 }, text: 'You get your cash and he thanks you. Small charge, big relief.' },
      SKIP('I will find another ATM'),
    ], ignore: { text: 'He serves the next customer.' } },
  { id: 'hotel_summit', icon: '🤝', who: 'Executive', title: 'Business card exchange', text: 'A smartly dressed man holds out his hand: "I am looking for sharp young people for a project. Tell me about yourself."',
    where: ['hotel', 'business', 'techhub'], weight: 7, cooldownMin: 12,
    choices: [
      { id: 'pitch', label: 'Give your best pitch', risk: { winChance: 0.5, winText: 'He loves it! "Call my office on Monday." Doors open.', loseText: 'You ramble. He hands you a card and a polite smile.', winEffects: { charisma: 4, social: 4 }, loseEffects: { charisma: 1, happiness: -2 }, winMoney: 2500 }, text: '' },
      SKIP('Just networking, thanks'),
    ], ignore: { text: 'He shakes another hand.' } },
  { id: 'hotel_room', icon: '🛎️', who: 'Bellboy', title: 'Spa upgrade?', text: '"Sir, madam, we have a spa special today. One hour for ₦8,000. You will feel brand new!"',
    where: ['hotel'], weight: 6, cooldownMin: 12,
    choices: [
      { id: 'spa', label: 'Book the spa (₦8,000)', cost: 8000, effects: { happiness: 14, hygiene: 25, energy: 15 }, text: 'You walk out glowing. This is how rich people live.' },
      SKIP('Maybe later'),
    ], ignore: { text: 'He offers it to the next guest.' } },
  { id: 'cinema_snack', icon: '🍿', who: 'Cashier', title: 'Combo deal', text: '"Popcorn, drink and chocolate combo for only ₦4,000. Best value!"',
    where: ['cinema', 'mall'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'combo', label: 'Take the combo (₦4,000)', cost: 4000, effects: { hunger: 18, thirst: 25, happiness: 8 }, text: 'Movie, popcorn, cold drink. Cinema is peak.' },
      SKIP('I will sneak snacks in'),
    ], ignore: { text: 'The line moves on without you.' } },
  { id: 'cinema_spoiler', icon: '🎬', who: 'Loud viewer', title: 'Spoiler alert!', text: 'The man behind you whispers the ending of the movie, loudly, to his friend.',
    where: ['cinema'], weight: 6, cooldownMin: 10,
    choices: [
      { id: 'shush', label: 'Politely ask him to stop', effects: { charisma: 2, happiness: 3 }, text: 'He apologises. The rest of the film is quiet.' },
      { id: 'shout', label: 'Shout at him', effects: { social: -2, happiness: -2 }, text: 'Half the cinema stares at you. Not your best moment.' },
    ], ignore: { text: 'The ending is ruined anyway.', effects: { happiness: -3 } } },
  { id: 'gov_permit', icon: '📄', who: 'Clerk', title: 'The file is missing', text: 'The clerk looks through the shelves: "Your file is not here. But for ₦2,000 it can mysteriously appear."',
    where: ['government'], weight: 8, cooldownMin: 10,
    choices: [
      { id: 'pay', label: 'Pay (₦2,000)', cost: 2000, effects: { happiness: -2 }, text: 'The file appears in two minutes. Naija magic.' },
      { id: 'refuse', label: 'Refuse and wait', risk: { winChance: 0.5, winText: 'A senior officer overhears and sorts it out for free.', loseText: 'You wait two hours and come back tomorrow.', winEffects: { charisma: 3, happiness: 3 }, loseEffects: { energy: -6, happiness: -5 } }, text: '' },
    ], ignore: { text: 'The clerk calls "Next!"', effects: { happiness: -1 } } },
  { id: 'business_tower', icon: '💼', who: 'Intern', title: 'Can you mentor me?', text: 'A nervous intern catches you at the lift: "Excuse me, I admire your hustle. Can I ask you a few questions?"',
    where: ['business', 'techhub'], weight: 7, cooldownMin: 12,
    choices: [
      { id: 'mentor', label: 'Spare ten minutes', skill: { id: 'teaching', xp: 6 }, effects: { charisma: 3, social: 3, energy: -2 }, text: 'You give good advice. He writes it all down.' },
      SKIP('I am running late'),
    ], ignore: { text: 'The lift closes between you.' } },
  { id: 'eatery_extra', icon: '🍚', who: 'Mama Put', title: 'Extra meat?', text: '"My pikin, you want extra meat on top? Only ₦500 more. E go sweet you."',
    where: ['eatery', 'mall'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'extra', label: 'Add extra meat (₦500)', cost: 500, effects: { hunger: 22, happiness: 6 }, text: 'Hot rice, stew and a fat piece of beef. Heaven.' },
      SKIP('Just the rice, ma'),
    ], ignore: { text: 'She serves the next customer.' } },
  { id: 'park_football', icon: '⚽', who: 'Neighbourhood boys', title: 'We need one more!', text: 'A group of boys are short of one for a game. "Oga, join us! Na five-a-side!"',
    where: ['park', 'recreation', 'beach'], weight: 8, cooldownMin: 8,
    choices: [
      { id: 'play', label: 'Join the game', skill: { id: 'fitness', xp: 6 }, effects: { energy: -10, social: 5, happiness: 8, hygiene: -5 }, text: 'You score a header. They carry you around. Sweaty and happy.' },
      SKIP('Maybe next time'),
    ], ignore: { text: 'They pick a taller stranger.' } },
  { id: 'gallery_buy', icon: '🖼️', who: 'Young artist', title: 'Support a young artist?', text: '"These are my first paintings. A small one is ₦4,000. I promise it will be worth a lot one day."',
    where: ['gallery', 'park'], weight: 6, cooldownMin: 12,
    choices: [
      { id: 'buy', label: 'Buy a small painting (₦4,000)', cost: 4000, skill: { id: 'creativity', xp: 6 }, effects: { charisma: 2, happiness: 6 }, text: 'You feel like a patron of the arts. She is thrilled.' },
      SKIP('I love it but not today'),
    ], ignore: { text: 'She smiles and returns to her canvas.' } },

  // ---------- long stories: Mama Agbo, the regular customer ----------
  { id: 'mama_regular', icon: '🌿', who: 'Mama Agbo', title: 'My regular customer!', text: '\"Ah ah! See my customer! Come, I don keep your own bottle. For you, na ₦300 only.\"',
    where: ['market'], weight: 12, cooldownMin: 5, chain: { id: 'mama', min: 1, max: 1 },
    choices: [
      { id: 'buy', label: 'Buy the usual (₦300)', cost: 300, effects: { health: 13, hygiene: 4, charisma: 1 }, text: 'She wraps it with a smile. \"Na my pikin!\"', tag: 'agbo', step: 'mama' },
      { id: 'two', label: 'Buy two bottles (₦700)', cost: 700, effects: { health: 22, hygiene: 6, energy: 4 }, text: 'Two bottles and a free blessing. Your body feels brand new.', tag: 'agbo', step: 'mama' },
      SKIP(),
    ], ignore: { text: 'Mama Agbo shrugs. \"I go keep am for next time.\"' } },
  { id: 'mama_special', icon: '🍶', who: 'Mama Agbo', title: 'The special bottle', text: '\"For my regular customers only. Strong agbo, the one wey dey wake the dead. ₦1,500.\"',
    where: ['market'], weight: 12, cooldownMin: 5, chain: { id: 'mama', min: 2, max: 2 },
    choices: [
      { id: 'special', label: 'Take the special (₦1,500)', cost: 1500, effects: { health: 20, energy: 15, hygiene: 4, happiness: -3 }, text: 'It burns all the way down. Then you feel like you can lift a danfo.', tag: 'agbo', step: 'mama' },
      { id: 'gist', label: 'Sit and gist with her', effects: { social: 4, happiness: 3 }, text: 'She tells you who is getting married, who owes whom, and which wrapper is fake.', step: 'mama' },
      SKIP(),
    ], ignore: { text: 'Mama Agbo packs her bottles. \"Next time, my pikin.\"' } },
  { id: 'mama_recipe', icon: '📜', who: 'Mama Agbo', title: 'The family recipe', text: '\"You don come my stall plenty times. I want make you part of my family. Learn the recipe, or help me run the stall.\"',
    where: ['market'], weight: 20, cooldownMin: 3, seconds: 40, chain: { id: 'mama', min: 3, open: true },
    choices: [
      { id: 'recipe', label: 'Learn the recipe (₦15,000)', cost: 15000, effects: { charisma: 2, health: 10 }, text: 'She hands you a folded paper and a handful of roots. Every agbo you drink now hits harder.', ending: 'recipe' },
      { id: 'helper', label: 'Help run the stall', money: 8000, effects: { social: 5, happiness: 6 }, text: 'You carry bottles, count change and learn every gossip. She pays you well.', ending: 'helper' },
    ], ignore: { text: 'Mama Agbo waits, then smiles. \"The offer no go expire, my pikin.\"' } },

  // ---------- long stories: the owambe circuit ----------
  { id: 'owambe_asoebi', icon: '💌', who: 'A friend of a friend', title: 'Aso-ebi invitation', text: '\"Our owambe is Saturday! Aso-ebi is ready, just ₦8,000. Come and show face, jare.\"',
    where: 'venue', hours: [9, 22], weight: 7, cooldownMin: 8, chain: { id: 'owambe', max: 1 },
    choices: [
      { id: 'attend', label: 'Buy aso-ebi and go (₦8,000)', cost: 8000, effects: { social: 12, happiness: 10, energy: -8, charisma: 2 }, text: 'Jollof, small chops, a live band and aunties asking when you will marry. Great night.', step: 'owambe' },
      { id: 'gift', label: 'Send a gift envelope (₦2,000)', cost: 2000, effects: { social: 3 }, text: 'You send a gift and a prayer. They post your name in the thank-you list.' },
      SKIP('Maybe next time'),
    ], ignore: { text: 'The invite goes unread. Somebody else buys your aso-ebi.' } },
  { id: 'owambe_big', icon: '🎊', who: 'Auntie Bisi', title: 'Big owambe, big names', text: '\"Two thousand guests, a governor and a live Fuji band. Aso-ebi ₦6,000, and you are on my table.\"',
    where: 'venue', hours: [9, 22], weight: 9, cooldownMin: 8, chain: { id: 'owambe', min: 1, max: 2 },
    choices: [
      { id: 'attend', label: 'Buy aso-ebi and go (₦6,000)', cost: 6000, effects: { social: 14, happiness: 12, energy: -10, charisma: 2 }, text: 'You dance, you spray, you are on three different cameras. Everybody knows your face now.', step: 'owambe' },
      { id: 'dance', label: 'Crash the dance floor (free)', risk: { winChance: 0.5, winText: 'The crowd forms a circle round you. The MC screams your name.', loseText: 'You trip over an auntie\'s gele. Everybody saw.', winEffects: { social: 8, charisma: 2, happiness: 6, energy: -6 }, loseEffects: { happiness: -3, social: -2 } }, text: '', step: 'owambe' },
      SKIP(),
    ], ignore: { text: 'Auntie Bisi sighs and goes to find another guest.' } },
  { id: 'owambe_mic', icon: '🎤', who: 'The MC', title: 'Take the microphone', text: '\"Everybody knows you now. Be my co-MC tonight and I will pay you, or host your own owambe and let me hype it.\"',
    where: 'venue', hours: [9, 22], weight: 20, cooldownMin: 3, seconds: 40, chain: { id: 'owambe', min: 3, open: true },
    choices: [
      { id: 'mc', label: 'Be the MC', money: 15000, effects: { charisma: 5, social: 6 }, text: 'You take the mic and the hall is yours. They pay you at the end of the night.', ending: 'mc' },
      { id: 'host', label: 'Host your own owambe (₦25,000)', cost: 25000, effects: { social: 12, charisma: 3, happiness: 10 }, text: 'Your name is on the banner. Hundreds come, and they all say it was the party of the year.', ending: 'host' },
    ], ignore: { text: 'The MC hands the mic to somebody else, but the offer stands.' } },
];

export const getStreetEvent = (id: string) => STREET_EVENTS.find((e) => e.id === id);
