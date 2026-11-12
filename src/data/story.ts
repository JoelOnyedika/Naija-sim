import type { Effects } from '@/types/game';

/**
 * The UNILAG story (data only). Rules are in game/story.ts, state in stores/storyStore.ts, the dialogue overlay in
 * features/game/StoryDialogue.tsx. It is data-driven on purpose: the open world will reuse the same nodes, flags and actions with
 * a server deciding the dice. Tone: campus humour first, creeping menace second. It never glorifies violence; it is a dark story
 * with consequences, and refusing is a real ending.
 */
export type Flag = boolean | number | string;
export type Flags = Record<string, Flag>;

// ---------------------------------------------------------------------------------------------------- tuning
export const STORY = {
  /** Real minutes on campus before the recruiter story may start (after missions 1 and 2). */
  campusMinutesBeforeRecruit: 15,
  /** Campus tasks done between two "blending in" scenes. */
  tasksBetweenScenes: 2,
  /** Real minutes between pressure scenes after a refusal. */
  pressureEveryMinutes: 6,
  /** Refusals before the hostel harassment scene. */
  harassAfterRefusals: 3,
  /** "Tell me more" can be asked this many times. */
  moreMax: 2,
  /** The initiation is at 22:00 (night), at least this many game minutes after the invitation, and open for the window after it. */
  initiationHour: 22, initiationLeadMinutes: 120, initiationWindowMinutes: 240,
  /** Missed it once: one more offer. Twice: the story ends quietly. */
  maxMissed: 2,
  /** Health and energy lost in the beating scene, and how long happiness stays low (game minutes). */
  beating: { health: -30, energy: -40, happiness: -20 },
  /** Starting rank and reputation of a new member. */
  startRank: 1, startReputation: 5, maxRank: 3,
} as const;

// ---------------------------------------------------------------------------------------------------- missions
export interface MissionStep { id: string; label: string; /** campus event that completes it ("campus:attend_lecture") */ event: string; /** times needed */ count?: number }
export interface Mission { id: string; title: string; blurb: string; steps: MissionStep[]; reward: { money: number; social?: number; charisma?: number; skill?: { id: 'communication' | 'business' | 'finance' | 'creativity' | 'teaching'; xp: number } }; /** flag set when it is done */ flag?: string }
export const MISSIONS: Mission[] = [
  { id: 'welcome', title: 'Welcome, Fresher', blurb: 'Get registered and sit your first lecture.', flag: 'registered',
    steps: [{ id: 'adviser', label: 'Meet your course adviser', event: 'campus:meet_adviser' }, { id: 'queue', label: 'Join the registration queue', event: 'campus:reg_queue' }, { id: 'register', label: 'Register your courses', event: 'campus:register_courses' }, { id: 'lecture', label: 'Attend your first lecture', event: 'campus:attend_lecture' }],
    reward: { money: 15_000, skill: { id: 'communication', xp: 6 } } },
  { id: 'feet', title: 'Find Your Feet', blurb: 'Make friends. Nobody survives campus alone.', flag: 'has_friends',
    steps: [{ id: 'football', label: 'Play football on the field', event: 'campus:football' }, { id: 'food', label: 'Buy food at the cafeteria', event: 'campus:eat' }, { id: 'mates', label: 'Talk to two coursemates', event: 'campus:coursemate', count: 2 }],
    reward: { money: 10_000, social: 4 } },
  { id: 'assign', title: 'Assignment Season', blurb: 'Study, submit and face your first exam.', flag: 'grade_set',
    steps: [{ id: 'study', label: 'Study in the library', event: 'campus:study' }, { id: 'submit', label: 'Submit an assignment', event: 'campus:submit_assignment' }, { id: 'exam', label: 'Write the exam', event: 'campus:exam' }],
    reward: { money: 0, skill: { id: 'business', xp: 6 } } },
];
/** After the three missions: a repeating hub. Every round needs this many of these events and pays out. */
export const CAMPUS_LIFE = { title: 'Campus Life', blurb: 'SUG errands, selling handouts, tutoring for pay.', events: ['campus:sug_errand', 'campus:sell_handouts', 'campus:tutor'], perRound: 3, reward: 12_000 };

// ---------------------------------------------------------------------------------------------------- exam
export const EXAM = {
  questions: 8, secondsPerQuestion: 10,
  /** Chance a peek is caught: first peek 20%, then +20% for each one before it, capped. */
  peekBase: 0.2, peekStep: 0.2, peekMax: 0.9,
  /** Share of right answers needed for each grade, best first. */
  grades: [{ grade: 'First', min: 0.875, pay: 40_000 }, { grade: '2:1', min: 0.75, pay: 25_000 }, { grade: '2:2', min: 0.625, pay: 15_000 }, { grade: 'Third', min: 0.5, pay: 8_000 }, { grade: 'Fail', min: 0, pay: 0 }] as const,
  /** What being caught costs. */
  caught: { happiness: -10, charisma: -2, social: -3 },
} as const;
export type Grade = (typeof EXAM.grades)[number]['grade'];

// ---------------------------------------------------------------------------------------------------- dialogue
export type StoryAction =
  | 'giftDrink' | 'trust' | 'more' | 'join' | 'refuse' | 'later' | 'standFirm' | 'securityHelp'
  | 'enterForest' | 'tryLeave' | 'beating' | 'becomeMember' | 'rebook' | 'endStory';
export interface Choice { id: string; label: string; next?: string; set?: Flags; fx?: Effects; action?: StoryAction; hideIf?: string; showIf?: string; /** small grey note under the label */ hint?: string }
export interface Node {
  id: string; speaker: string; /** emoji badge used as the portrait */ badge: string; where: 'campus' | 'forest';
  lines: string[]; /** replaces `lines` when this flag is set (the first match wins) */ alt?: { flag: string; lines: string[] }[];
  choices?: Choice[]; /** after the last line, if there are no choices */ next?: string;
  /** applied when the node opens */ set?: Flags; fx?: Effects; action?: StoryAction; scene?: 'beating';
}
const DAYO = 'Senior Dayo', FRIENDS = 'Dayo’s guys';

export const NODES: Node[] = [
  // ---------------- 5.1 meet
  { id: 'meet', speaker: DAYO, badge: '😎', where: 'campus', lines: ['Ah! Fresher! I dey watch you since.', 'The way you dey carry yourself, e dey sweet me.'],
    choices: [{ id: 'polite', label: 'Thank you, Senior.', set: { dayo_polite: true }, next: 'meet_drink' }, { id: 'curious', label: 'Who are you?', set: { dayo_curious: true }, next: 'meet_drink' }, { id: 'rude', label: 'I am busy.', set: { dayo_rude: true }, next: 'meet_drink' }] },
  { id: 'meet_drink', speaker: DAYO, badge: '😎', where: 'campus', action: 'giftDrink', set: { met_dayo: true },
    lines: ['Ha, relax. Na Dayo be my name, everybody dey call me Alpha.', 'Take this drink. Cold one. No pay.', 'Make I introduce you to my guys. Real ones. Come sit with us.'] },
  // ---------------- 5.2 blending in
  { id: 'hang1', speaker: FRIENDS, badge: '🍗', where: 'campus', lines: ['Pablo: “Fresher! Sit down. Seaman, share the rice.”', 'Baron: “Dayo says you are cool. Free food for cool people.”'],
    choices: [{ id: 'eat', label: 'Eat with them', fx: { hunger: 25, happiness: 6, social: 4 }, action: 'trust', set: { hang1: true } }, { id: 'thanks', label: 'Thank them, but you must go', set: { hang1: true } }] },
  { id: 'hang2', speaker: FRIENDS, badge: '📝', where: 'campus', lines: ['Seaman: “I hear you are stressing over assignment. Easy! Baron does these for fun.”', 'Pablo: “And there is a party Saturday. You are invited.”'],
    choices: [{ id: 'accept', label: 'Accept the help', fx: { social: 5, happiness: 4 }, action: 'trust', set: { hang2: true, accepted_help: true } }, { id: 'own', label: 'I do my own work', set: { hang2: true, own_work: true } }] },
  { id: 'hang3', speaker: FRIENDS, badge: '🛡️', where: 'campus', lines: ['A senior called Kayode was pushing you around in the queue.', 'Pablo stepped in: “Leave am. That one is with us.” Kayode went quiet and left.', 'Baron: “Nobody go touch you again. That is what family is for.”'],
    choices: [{ id: 'thank', label: 'Thank them', fx: { social: 4, happiness: 5 }, action: 'trust', set: { hang3: true } }, { id: 'handled', label: 'I had it handled', set: { hang3: true }, action: 'trust' }] },
  // ---------------- 5.3 the offer
  { id: 'offer', speaker: DAYO, badge: '🕶️', where: 'campus',
    lines: ['Alpha, I like the way you dey. We want you for the brotherhood.', 'Real family, real connection. Nobody go touch you again.'],
    alt: [{ flag: 'dayo_rude', lines: ['You were short with me before. I let am pass.', 'But I see you now. We want you for the brotherhood. Last time I go ask nicely.'] }, { flag: 'caught_cheating', lines: ['I hear they caught you for exam hall. Hmm. Wahala.', 'I can fix your result. Small thing. We take care of our own. Come join the brotherhood.'] }, { flag: 'good_grade', lines: ['Your result is sweet. Oga at the top.', 'After school, connections na everything. The brotherhood has people everywhere. Join us.'] }],
    choices: [{ id: 'join', label: 'Join', action: 'join', next: 'joined' }, { id: 'more', label: 'Tell me more', action: 'more', hideIf: 'more_maxed' }, { id: 'no', label: 'No, thanks', action: 'refuse', next: 'refused' }, { id: 'later', label: 'Later', action: 'later', next: 'later_ack' }] },
  { id: 'more1', speaker: DAYO, badge: '🕶️', where: 'campus', next: 'offer',
    lines: ['We are brothers. We look out for each other. Parties, connections, protection.', 'There is an initiation. A small thing. You go see.', 'One thing: once you are in, you are in. We no dey play with that.'] },
  { id: 'more2', speaker: DAYO, badge: '🕶️', where: 'campus', next: 'offer',
    lines: ['Rules? Be loyal. Keep quiet. Answer when we call.', 'The brotherhood sometimes do things people no go like. But we are family.', 'Think well. Then tell me.'] },
  { id: 'joined', speaker: DAYO, badge: '😎', where: 'campus', lines: ['Good. Good! I knew you had sense.', 'It happens {when}. Come alone. Wear black. Meet me at {pin}.', 'If you no show, I no go ask twice. Remember.'] },
  { id: 'refused', speaker: DAYO, badge: '😐', where: 'campus', lines: ['Ha. No wahala. No hard feelings.', 'My door dey open if you change your mind.'] },
  { id: 'later_ack', speaker: DAYO, badge: '🙂', where: 'campus', lines: ['Later is fine. Think am. I no dey rush you.', 'But remember who looked after you.'] },
  // ---------------- pressure after refusals
  { id: 'pressure1', speaker: DAYO, badge: '😏', where: 'campus', lines: ['Hey, my friend. Remember that rice? That drink? Those favours?', 'Not that I am counting. But brothers do not count. Brothers share.'],
    choices: [{ id: 'standfirm', label: 'I told you, no.', action: 'standFirm' }, { id: 'think', label: 'Let me think about it.', action: 'later', next: 'offer' }] },
  { id: 'pressure2', speaker: FRIENDS, badge: '👀', where: 'campus', lines: ['Seaman: “Some people say you think you are better than us.”', 'Pablo: “Rumours spread fast on campus. We can help them stop.”', 'Baron: “Just talk to Dayo again.”'],
    choices: [{ id: 'standfirm', label: 'People can say what they like.', action: 'standFirm' }, { id: 'talk', label: 'Fine, I will talk to Dayo.', action: 'later', next: 'offer' }] },
  { id: 'harass', speaker: FRIENDS, badge: '📣', where: 'campus', lines: ['In the hostel corridor, Pablo and Seaman block the way, shouting so everybody hears:', '“See the proud fresher! Dayo offered you family and you rejected it!”', 'Doors open. People stare. Nobody touches you, but everyone is listening.'],
    choices: [{ id: 'firm', label: 'Stand firm. Say no again.', action: 'standFirm' }, { id: 'security', label: 'Call campus security', action: 'securityHelp' }, { id: 'giveIn', label: 'Fine. I will join.', action: 'join', next: 'joined' }] },
  // ---------------- missed initiation
  { id: 'missed', speaker: DAYO, badge: '😒', where: 'campus', lines: ['You no show. I wait for you.', 'I do not like to be disrespected. But I am patient. One more chance.'],
    choices: [{ id: 'rebook', label: 'Give me another time', action: 'rebook', next: 'joined' }, { id: 'forget', label: 'Forget it', action: 'endStory', next: 'refused' }] },
  // ---------------- the walk to the forest
  { id: 'follow', speaker: DAYO, badge: '🌙', where: 'campus', lines: ['You came. Good. Wear that black well.', 'Follow me. No questions. No phone.'],
    choices: [{ id: 'follow', label: 'Follow him', action: 'enterForest' }, { id: 'backout', label: 'Back out', action: 'refuse', next: 'refused' }] },
  // ---------------- the forest
  { id: 'forest_start', speaker: 'The Circle', badge: '🔥', where: 'forest', lines: ['Twelve robed figures stand in a ring around a fire. Nobody speaks.', 'The only sound is the fire and a slow drum. Dayo, in a red sash, steps forward.'],
    choices: [{ id: 'on', label: 'Step into the circle', next: 'oath' }, { id: 'leave', label: 'Try to leave', action: 'tryLeave' }] },
  { id: 'oath', speaker: DAYO, badge: '🩸', where: 'forest', lines: ['Repeat after me. I will be loyal to my brothers.', 'I will keep what I see here. I will answer when I am called.', 'Anybody who breaks this oath answers to the fire.'],
    choices: [{ id: 'swear', label: 'Swear the oath', next: 'test1' }, { id: 'leave', label: 'Try to leave', action: 'tryLeave' }] },
  { id: 'test1', speaker: DAYO, badge: '🔥', where: 'forest', lines: ['First test. Show us what you are made of.'],
    choices: [{ id: 'still', label: 'Stay still', fx: { energy: -5 }, set: { t1: 'still' }, next: 'test2' }, { id: 'answer', label: 'Answer the question', fx: { energy: -3, charisma: 1 }, set: { t1: 'answer' }, next: 'test2' }, { id: 'stick', label: 'Hold the fire stick', fx: { health: -5, charisma: 1 }, set: { t1: 'stick' }, next: 'test2' }] },
  { id: 'test2', speaker: DAYO, badge: '🔥', where: 'forest', lines: ['Second test. Silence is also an answer.'],
    choices: [{ id: 'steady', label: 'Keep your eyes on the fire', fx: { energy: -4 }, set: { t2: 'steady' }, next: 'beating' }, { id: 'nod', label: 'Nod and say nothing', fx: { energy: -3 }, set: { t2: 'nod' }, next: 'beating' }, { id: 'hold', label: 'Hold your ground', fx: { health: -3 }, set: { t2: 'hold' }, next: 'beating' }] },
  { id: 'beating', speaker: 'The Circle', badge: '🥁', where: 'forest', scene: 'beating', action: 'beating', next: 'named', lines: ['The drum speeds up. The circle tightens.', 'Blow after blow. You hold on.', 'Then silence. The fire pops. You are still standing.'] },
  { id: 'named', speaker: DAYO, badge: '👑', where: 'forest', action: 'becomeMember', lines: ['Welcome, brother. From tonight your name is {nick}.', 'Rank one. Everything starts here. The circle cheers.', 'A member hands you a black bracelet. “Wear it. Everybody who knows will know.”'] },
];
export const NODE = (id: string): Node | undefined => NODES.find((n) => n.id === id);

/** Where the initiation meets (shown in the Tasks panel and the phone reminder). */
export const INITIATION_PIN = 'the UNILAG back gate';
export const ALIASES = ['Eagle', 'Baron Jr.', 'Viper', 'Scorpion', 'Lion', 'Cobra'];
/** The black bracelet and other things a member owns, for the Inventory in the profile. */
export const MEMBER_ITEMS = [{ id: 'bracelet', name: 'Black bracelet', glyph: '⚫' }] as const;
