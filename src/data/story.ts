import type { Effects } from '@/types/game';

/**
 * The UNILAG story (data only). Rules are in game/story.ts, state in stores/storyStore.ts, the dialogue overlay in
 * features/game/StoryDialogue.tsx. It is a guided story: every step has a visible objective, a target and a place; nothing depends on
 * random rolls or hidden timers. Tone: campus warmth first, quiet menace second. Declining is always allowed and never punished.
 */
export type Flag = boolean | number | string;
export type Flags = Record<string, Flag>;

// ---------------------------------------------------------------------------------------------------- tuning
export const STORY = {
  /** Watcher: how long the student with the bracelet watches before leaving (real seconds), or until the player walks this close (metres). */
  watcherSeconds: 7, watcherNear: 4.5,
  /** "Tell me what kind of people" can be asked this many times. */
  moreMax: 2,
  /** The initiation is at 22:00 (night), at least this many game minutes after the invitation, and open for the window after it. */
  initiationHour: 22, initiationLeadMinutes: 120, initiationWindowMinutes: 240,
  /** Missed it once: one more offer. Twice: the story ends quietly. */
  maxMissed: 2,
  /** After declining, Bayo may mention it softly (a phone message, no pressure) when a mission is completed, at most this many times. */
  maxReoffers: 2,
  /** Health and energy lost in the beating scene, and how long happiness stays low (game minutes). */
  beating: { health: -30, energy: -40, happiness: -20 },
  /** Starting rank and reputation of a new member. */
  startRank: 1, startReputation: 5, maxRank: 3,
} as const;

/** The plot stages, in order. Saved with the game. `declined` and `missed` are quiet side branches that can return to `meeting`. */
export type Stage = 'arrival' | 'watcher' | 'talk_bayo' | 'declined' | 'meeting' | 'missed' | 'follow' | 'initiation' | 'member' | 'ended';

/** Where things happen on the campus (venue coordinates in metres). */
export const SPOTS = {
  /** places the watching student can stand: the one 5 to 14 m from the player is used, so he is always in view */
  watchSpots: [{ x: 20.0, z: 3.6 }, { x: 8.8, z: 9.6 }, { x: 19.6, z: 7.0 }, { x: 13.4, z: 9.4 }, { x: 5.0, z: 3.4 }],
  watcher: { x: 20.0, z: 3.6 }, watcherExit: { x: 11.2, z: 15.3 },
  bayoHome: { x: 19.9, z: 10.2 },
  groupCentre: { x: 17.6, z: 10.6 },
  seats: [{ id: 'b1a', x: 15.4, z: 10.1, yaw: Math.PI / 2 }, { id: 'b1b', x: 15.4, z: 11.1, yaw: Math.PI / 2 }, { id: 'b2a', x: 17.1, z: 13.2, yaw: Math.PI }, { id: 'b2b', x: 18.1, z: 13.2, yaw: Math.PI }],
  /** where the others wait before the group meeting, and the order they are introduced in */
  others: [{ id: 'seaman', x: 21.0, z: 9.0 }, { id: 'pablo', x: 20.6, z: 8.4 }, { id: 'baron', x: 21.2, z: 7.6 }],
  /** the meeting place ("the back gate") and the way out Bayo leads through */
  gate: { x: 10.4, z: 14.2 }, gateOut: { x: 10.4, z: 15.6 }, bayoArrives: { x: 6.2, z: 15.0 },
} as const;
export const INITIATION_PIN = 'the UNILAG back gate';

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
  | 'more' | 'accept' | 'decline' | 'rebook' | 'endStory' | 'meetOthers' | 'startFollow' | 'backOut'
  | 'enterForest' | 'stepIn' | 'tryLeave' | 'beating' | 'handshake' | 'giveBracelet' | 'becomeMember';
/** A line is plain text (said by the node's speaker) or `{ who, text }` with who = a cast id, "player" or "narrator" (no portrait, no one speaks). */
export type Line = string | { who: string; text: string };
export interface Choice { id: string; label: string; next?: string; set?: Flags; fx?: Effects; action?: StoryAction; hideIf?: string; showIf?: string; /** small grey note under the label */ hint?: string }
export interface Node {
  id: string; /** a cast id (bayo, seaman...) */ speaker: string;
  /** standard = a slim box at the bottom, the world stays visible; cinematic = letterbox, portrait, premium layout, closer camera */ style: 'standard' | 'cinematic';
  /** how the camera frames the scene while this node is open */ shot?: 'auto' | 'close' | 'two' | 'group';
  where: 'campus' | 'forest';
  lines: Line[]; /** replaces `lines` when this flag is set (the first match wins) */ alt?: { flag: string; lines: Line[] }[];
  choices?: Choice[]; /** after the last line, if there are no choices */ next?: string;
  /** applied when the node opens */ set?: Flags; fx?: Effects; action?: StoryAction; scene?: 'beating';
  /** runs when the last line is finished and there is no `next` */ then?: StoryAction;
}
const B = 'bayo';

export const NODES: Node[] = [
  // ---------------- stage 3: meeting Senior Bayo
  { id: 'bayo_intro', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['Ah, you must be the fresher everybody has been noticing.', 'Relax. I am Bayo. People call me Senior Bayo, but Bayo is fine.', 'I saw you registering earlier. First day is always wahala. How are you finding the place?'],
    choices: [{ id: 'fine', label: 'Fine, thank you.', set: { tone: 'friendly' }, next: 'bayo_intro2' }, { id: 'lot', label: 'It is a lot, honestly.', set: { tone: 'overwhelmed' }, next: 'bayo_intro2' }, { id: 'who', label: 'Who told you about me?', set: { tone: 'suspicious' }, next: 'bayo_intro2' }] },
  { id: 'bayo_intro2', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['Good. Campus is easier when you know people.', 'Come, let me introduce you to some friends. They are sitting just over there.'],
    alt: [{ flag: 'tone_overwhelmed', lines: ['I understand. We all felt like that. That is why people here look out for each other.', 'Come, let me introduce you to some friends. They are sitting just over there.'] }, { flag: 'tone_suspicious', lines: ['Ha, sharp eye. Nobody told me. I just notice people. It is a habit.', 'Come, let me introduce you to some friends. They are sitting just over there.'] }],
    then: 'meetOthers' },
  // ---------------- stage 4: meeting the others (a real group scene)
  { id: 'group_chat', speaker: B, style: 'cinematic', shot: 'group', where: 'campus',
    lines: [{ who: 'seaman', text: 'Bayo! You did not tell me you were bringing company. Sit, sit. Rice dey.' }, { who: B, text: 'Seaman, Pablo, Baron. This is our new friend.' }, { who: 'pablo', text: 'Welcome, welcome! Let me guess your course. Business. No? Engineering? Law?' }, { who: 'baron', text: 'Let the person breathe, Pablo.' }],
    choices: [{ id: 'hello', label: 'Nice to meet you all.', next: 'g_hello' }, { id: 'course', label: 'Which courses are you all in?', next: 'g_course' }, { id: 'here', label: 'Do you always sit here?', next: 'g_here' }] },
  { id: 'g_hello', speaker: 'seaman', style: 'cinematic', shot: 'group', where: 'campus', next: 'invite_start',
    lines: [{ who: 'seaman', text: 'The pleasure is ours. A person who greets properly is a rare thing.' }, { who: 'pablo', text: 'See? Politeness. I like this one.' }, { who: 'baron', text: 'Hm. Good.' }] },
  { id: 'g_course', speaker: 'pablo', style: 'cinematic', shot: 'group', where: 'campus', next: 'invite_start',
    lines: [{ who: 'pablo', text: 'Seaman is Mass Comm, I am Law, Baron is Engineering. Bayo is a professional senior.' }, { who: B, text: 'Somebody has to be.' }, { who: 'seaman', text: 'Do not mind them. We argue about everything. It is how we like each other.' }] },
  { id: 'g_here', speaker: 'seaman', style: 'cinematic', shot: 'group', where: 'campus', next: 'invite_start',
    lines: [{ who: 'seaman', text: 'Every day. This is our bench. Rent free, view of the cafeteria.' }, { who: 'baron', text: 'Seaman picked it. For the view of the jollof.' }, { who: 'pablo', text: 'He is not lying.' }] },
  // ---------------- stage 5: the invitation (the player decides)
  { id: 'invite_start', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['You know, we are not just friends who sit around and eat rice.', 'There is a group of people I think you should meet. Serious people. People who look out for each other.'],
    choices: [{ id: 'what', label: 'What kind of people?', action: 'more', hideIf: 'more_maxed' }, { id: 'yes', label: 'I am interested.', action: 'accept', next: 'invite_accept' }, { id: 'no', label: 'I am not interested.', action: 'decline', next: 'invite_decline' }] },
  { id: 'invite_more1', speaker: B, style: 'cinematic', shot: 'two', where: 'campus', next: 'invite_start',
    lines: ['People who have been through this place and came out the other side.', 'Parties, connections, somebody to call when things go wrong.'] },
  { id: 'invite_more2', speaker: B, style: 'cinematic', shot: 'two', where: 'campus', next: 'invite_start',
    lines: ['I cannot say too much out here. There is a private meeting. After that, you decide.', 'And one thing. Whatever you decide, nobody will hold it against you.'] },
  { id: 'invite_accept', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['Good. I knew you had sense.', 'I will send you a message with the time and the place. Come alone. Wear black if you can.'] },
  { id: 'invite_decline', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['No problem, my guy. No pressure at all.', 'The seat stays open if you change your mind. I am around the cafeteria most days.'] },
  { id: 'reoffer', speaker: B, style: 'standard', where: 'campus',
    lines: ['Back again. Did you think about it?'],
    choices: [{ id: 'yes', label: 'Yes, I am interested.', action: 'accept', next: 'invite_accept' }, { id: 'no', label: 'Still not interested.', next: 'reoffer_no' }] },
  { id: 'reoffer_no', speaker: B, style: 'standard', where: 'campus', lines: ['Fair enough. The door stays open. Enjoy school.'] },
  { id: 'missed', speaker: B, style: 'standard', where: 'campus',
    lines: ['You did not show up. I waited.', 'These things do not wait for people. But I can try again, once.'],
    choices: [{ id: 'again', label: 'Give me another chance.', action: 'rebook', next: 'invite_accept' }, { id: 'forget', label: 'Forget it.', action: 'endStory', next: 'missed_end' }] },
  { id: 'missed_end', speaker: B, style: 'standard', where: 'campus', lines: ['Alright. Take care of yourself.'] },
  // ---------------- stage 7: the walk to the forest
  { id: 'follow_intro', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['You came. Good.', 'From here we walk. No phone, no questions. Stay close to me.'],
    choices: [{ id: 'lead', label: 'Lead the way.', action: 'startFollow' }, { id: 'back', label: 'I changed my mind.', action: 'backOut', next: 'backout' }] },
  { id: 'backout', speaker: B, style: 'standard', where: 'campus', lines: ['Alright. Go back to class. No hard feelings.'] },
  // ---------------- stage 8: the initiation (in the forest)
  { id: 'forest_start', speaker: B, style: 'cinematic', shot: 'two', where: 'forest',
    lines: ['This is the place.', 'Twelve of us stand in this ring. Every one of us stood where you are standing.'],
    choices: [{ id: 'on', label: 'Step into the circle.', action: 'stepIn', next: 'oath' }, { id: 'leave', label: 'Try to leave.', action: 'tryLeave' }] },
  { id: 'oath', speaker: B, style: 'cinematic', shot: 'group', where: 'forest',
    lines: ['Repeat after me. I will be loyal to my brothers.', 'I will keep what I see here. I will answer when I am called.', 'Anybody who breaks this oath answers to the fire.'],
    choices: [{ id: 'swear', label: 'Swear the oath.', next: 'test1' }, { id: 'leave', label: 'Try to leave.', action: 'tryLeave' }] },
  { id: 'test1', speaker: B, style: 'cinematic', shot: 'close', where: 'forest', lines: ['First test. Show us what you are made of.'],
    choices: [{ id: 'still', label: 'Stay still.', fx: { energy: -5 }, set: { t1: 'still' }, next: 'test2' }, { id: 'answer', label: 'Answer the question.', fx: { energy: -3, charisma: 1 }, set: { t1: 'answer' }, next: 'test2' }, { id: 'stick', label: 'Hold the fire stick.', fx: { health: -5, charisma: 1 }, set: { t1: 'stick' }, next: 'test2' }] },
  { id: 'test2', speaker: B, style: 'cinematic', shot: 'close', where: 'forest', lines: ['Second test. Silence is also an answer.'],
    choices: [{ id: 'steady', label: 'Keep your eyes on the fire.', fx: { energy: -4 }, set: { t2: 'steady' }, next: 'beating' }, { id: 'nod', label: 'Nod and say nothing.', fx: { energy: -3 }, set: { t2: 'nod' }, next: 'beating' }, { id: 'hold', label: 'Hold your ground.', fx: { health: -3 }, set: { t2: 'hold' }, next: 'beating' }] },
  { id: 'beating', speaker: B, style: 'cinematic', shot: 'group', where: 'forest', scene: 'beating', action: 'beating', next: 'named',
    lines: [{ who: 'narrator', text: 'The drum speeds up. The circle tightens.' }, { who: 'narrator', text: 'Blow after blow. You hold on.' }, { who: 'narrator', text: 'Then silence. The fire pops. You are still standing.' }] },
  { id: 'named', speaker: B, style: 'cinematic', shot: 'two', where: 'forest', action: 'becomeMember', then: 'giveBracelet',
    lines: ['Welcome, brother. From tonight your name is {nick}.', 'Rank one. Everything starts here. The circle cheers.', 'Take this. Wear it. Everybody who knows will know.'] },
];
export const NODE = (id: string): Node | undefined => NODES.find((n) => n.id === id);
export const lineText = (l: Line): string => (typeof l === 'string' ? l : l.text);
export const lineWho = (n: Node, l: Line): string => (typeof l === 'string' ? n.speaker : l.who);

export const ALIASES = ['Eagle', 'Baron Jr.', 'Viper', 'Scorpion', 'Lion', 'Cobra'];
/** The black bracelet and other things a member owns, for the Inventory in the profile. */
export const MEMBER_ITEMS = [{ id: 'bracelet', name: 'Black bracelet', glyph: '⚫' }] as const;
