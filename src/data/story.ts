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
  beating: { health: -18, energy: -25, happiness: -20 }, jump: { health: -6, energy: -6, happiness: -5 }, gauntlet: { health: -10, energy: -12, happiness: -5 },
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
  | 'enterForest' | 'stepIn' | 'tryLeave' | 'beating' | 'handshake' | 'giveBracelet' | 'becomeMember' | 'blindfold' | 'unblind';
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
  /** applied when the node opens */ set?: Flags; fx?: Effects; action?: StoryAction; scene?: 'beating' | 'jump' | 'gauntlet';
  /** runs when the last line is finished and there is no `next` */ then?: StoryAction;
  /** how the people in the scene are placed and what they do while this node is open (game/story.ts stageScene) */ staging?: 'jump' | 'wake' | 'oath' | 'gauntlet' | 'beating' | 'named';
  /** the player's pose for given line numbers (a beating: kneel, then curled on the ground) */ player?: Partial<Record<number, 'idle' | 'kneel' | 'beaten' | 'stagger' | 'shiver' | 'brace' | 'cower'>>;
}
const B = 'bayo', N = (text: string): Line => ({ who: 'narrator', text }), L = (who: string, text: string): Line => ({ who, text });

export const NODES: Node[] = [
  // ---------------- stage 3: meeting Senior Bayo
  { id: 'bayo_intro', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['Ah ah! Na you be the fresher wey everybody don dey look since morning?', 'Relax, relax. Na Bayo be my name. Senior Bayo for people wey get respect. Just Bayo for people wey get sense.', 'I see you dey register just now. First day for this school na wahala, I know. Wetin you think so far?'],
    choices: [{ id: 'fine', label: 'E dey go small small, Senior.', set: { tone: 'friendly' }, next: 'bayo_intro2' }, { id: 'lot', label: 'Omo, e too much. I no sabi anything.', set: { tone: 'overwhelmed' }, next: 'bayo_intro2' }, { id: 'who', label: 'Who tell you about me?', set: { tone: 'suspicious' }, next: 'bayo_intro2' }] },
  { id: 'bayo_intro2', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['Make you no worry. Campus no hard when you know the right people.', 'Come, make I show you my guys. Dem dey siddon for there.'],
    alt: [{ flag: 'tone_overwhelmed', lines: ['I hear you. All of us pass through that one. Na why we dey look each other back for here.', 'Come, make I show you my guys. Dem dey siddon for there.'] }, { flag: 'tone_suspicious', lines: ['Ha! Sharp eye. Nobody tell me anything. I just dey observe, na my talent. Person wey dey observe, e dey live long.', 'Come, make I show you my guys. Dem dey siddon for there.'] }],
    then: 'meetOthers' },
  // ---------------- stage 4: meeting the others (a real group scene)
  { id: 'group_chat', speaker: B, style: 'cinematic', shot: 'group', where: 'campus',
    lines: [L('seaman', 'Bayo! You no tell me say you dey come with person o. Siddon, siddon! Rice still dey.'), L(B, 'Seaman, Pablo, Baron. Na our new guy be this.'), L('pablo', 'Ahn ahn! Welcome o! Make I guess your course. Law? No be Law. Business? Eh eh, you get face of Accounting!'), L('baron', 'Pablo, calm down. Make the person breathe.')],
    choices: [{ id: 'hello', label: 'Una well done. Nice to meet una.', next: 'g_hello' }, { id: 'course', label: 'Which course una dey read?', next: 'g_course' }, { id: 'here', label: 'Una dey siddon here every day?', next: 'g_here' }] },
  { id: 'g_hello', speaker: 'seaman', style: 'cinematic', shot: 'group', where: 'campus', next: 'invite_start',
    lines: [L('seaman', 'Chai! Person wey sabi greet! Na respect be that.'), L('pablo', 'Gbam! I like this one.'), L('baron', 'Hm. E good.')] },
  { id: 'g_course', speaker: 'pablo', style: 'cinematic', shot: 'group', where: 'campus', next: 'invite_start',
    lines: [L('pablo', 'Seaman na Mass Comm, I dey do Law, Baron na Engineering. Bayo na professional senior.'), L(B, 'Somebody must do am.'), L('seaman', 'No mind dem. We dey argue everything, na so we dey take love ourselves.')] },
  { id: 'g_here', speaker: 'seaman', style: 'cinematic', shot: 'group', where: 'campus', next: 'invite_start',
    lines: [L('seaman', 'Everyday! Na our bench be this. Free rent, with view of jollof.'), L('baron', 'Seaman choose am. For the jollof.'), L('pablo', 'E no lie.')] },
  // ---------------- stage 5: the invitation (the player decides)
  { id: 'invite_start', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['You know say we no be just guys wey dey siddon dey eat rice.', 'Some people dey wey I think say make you meet. Serious people. Wey dey look each other back when things hard.'],
    choices: [{ id: 'what', label: 'Which kind people be that?', action: 'more', hideIf: 'more_maxed' }, { id: 'yes', label: 'I dey interested.', action: 'accept', next: 'invite_accept' }, { id: 'no', label: 'No be my thing. I no dey interested.', action: 'decline', next: 'invite_decline' }] },
  { id: 'invite_more1', speaker: B, style: 'cinematic', shot: 'two', where: 'campus', next: 'invite_start',
    lines: ['People wey don waka this street reach the end, come back. Parties, connection, person to call when wahala show.', 'But e no be place for everybody.'] },
  { id: 'invite_more2', speaker: B, style: 'cinematic', shot: 'two', where: 'campus', next: 'invite_start',
    lines: ['I no fit talk plenty here. Wall get ear. Small meeting dey. After that one, na you go decide.', 'Whatever you decide, nobody go vex. Na promise. But if you enter, you don enter o.'] },
  { id: 'invite_accept', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['Good. I know say you get sense.', 'I go text you the time and the place. Come alone. Wear black. No tell anybody, even your roommate.'] },
  { id: 'invite_decline', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['No wahala, my guy. No pressure at all.', 'The seat still dey for you if you change mind. Na cafeteria I dey most days.'] },
  { id: 'reoffer', speaker: B, style: 'standard', where: 'campus',
    lines: ['Look who come back. You don think am?'],
    choices: [{ id: 'yes', label: 'Yes, I dey interested.', action: 'accept', next: 'invite_accept' }, { id: 'no', label: 'Still no be my thing.', next: 'reoffer_no' }] },
  { id: 'reoffer_no', speaker: B, style: 'standard', where: 'campus', lines: ['Fair enough. Door still dey open. Enjoy school.'] },
  { id: 'missed', speaker: B, style: 'standard', where: 'campus',
    lines: ['You no show. I wait you o.', 'These things no dey wait for person. But I fit try again, one time.'],
    choices: [{ id: 'again', label: 'Abeg, give me another chance.', action: 'rebook', next: 'invite_accept' }, { id: 'forget', label: 'Forget am.', action: 'endStory', next: 'missed_end' }] },
  { id: 'missed_end', speaker: B, style: 'standard', where: 'campus', lines: ['Alright. Take care of yourself.'] },
  // ---------------- stage 7: the walk to the gate
  { id: 'follow_intro', speaker: B, style: 'cinematic', shot: 'two', where: 'campus',
    lines: ['You come. Good boy.', 'From here we dey waka. No phone, no question, no look back. Stay close to me.'],
    choices: [{ id: 'lead', label: 'Lead the way.', action: 'startFollow' }, { id: 'back', label: 'Ah, I don change mind.', action: 'backOut', next: 'backout' }] },
  { id: 'backout', speaker: B, style: 'standard', where: 'campus', lines: ['Alright. Go back class. No bad feelings.'] },
  // ---------------- stage 8a: the jump at the gate
  { id: 'jump1', speaker: B, style: 'cinematic', shot: 'group', where: 'campus', staging: 'jump',
    lines: [N('The gate. Dark. Bayo suddenly stops walking.'), L(B, 'Siddon small. Make you no turn.'), N('Footsteps behind you. Many. Fast.'), L('rambo', 'Na am! Hold am!'), L('dragon', 'Cover im eye! Quick!')],
    choices: [{ id: 'bayo', label: 'Bayo! Wetin be this?!', next: 'jump2a' }, { id: 'run', label: 'Run!', next: 'jump2b' }, { id: 'still', label: 'Stay still.', next: 'jump2c' }] },
  { id: 'jump2a', speaker: B, style: 'cinematic', shot: 'group', where: 'campus', next: 'jump_blind', staging: 'jump',
    lines: [L(B, 'Relax. Na part of the process. Make you no fight am.'), L('rambo', 'Shut your mouth! Who tell you say you fit talk?')] },
  { id: 'jump2b', speaker: 'rambo', style: 'cinematic', shot: 'group', where: 'campus', next: 'jump_blind', staging: 'jump',
    lines: [L('rambo', 'Ah ah! E wan run! Where you wan go?'), L('konji', 'Hahaha! Hold am well! Na Olympic!')] },
  { id: 'jump2c', speaker: 'dragon', style: 'cinematic', shot: 'group', where: 'campus', next: 'jump_blind', staging: 'jump',
    lines: [L('dragon', 'Good. Na so.'), L('konji', 'This one dey cool. We go see if e go last.')] },
  { id: 'jump_blind', speaker: B, style: 'cinematic', shot: 'group', where: 'campus', scene: 'jump', action: 'blindfold', then: 'enterForest',
    lines: [N('A black cloth drops over your eyes.'), N('Hands everywhere. A fist drives into your ribs. You fold.'), N('They drag you. Gravel under your knees. Engine noise. Then cold air and wood smoke.')] },
  // ---------------- stage 8b: the forest
  { id: 'forest_wake', speaker: B, style: 'cinematic', shot: 'close', where: 'forest', staging: 'wake', action: 'unblind',
    lines: [N('Cold water crashes over your head. You gasp.'), N('Somebody rips off the blindfold. Fire. Robes. Twelve shapes staring at you.'), L('konji', 'Wake up! You dey sleep for where?'), L(B, 'Gerrup, fresher. Welcome to the real school.')],
    next: 'forest_start' },
  { id: 'forest_start', speaker: B, style: 'cinematic', shot: 'two', where: 'forest',
    lines: ['Look well. Na for here we dey make men.', 'Anybody wey step inside this circle no dey come out the same.'],
    choices: [{ id: 'on', label: 'Step into the circle.', action: 'stepIn', next: 'oath' }, { id: 'leave', label: 'Ah, make I comot.', action: 'tryLeave' }] },
  { id: 'oath', speaker: B, style: 'cinematic', shot: 'group', where: 'forest', staging: 'oath',
    lines: [L(B, 'Kneel for the fire. Talk am after me. Make e come from your belle.'), L(B, 'Na me Babylon! No be small boy!'), L('seaman', 'From Odego to Shawama, na we dey run am!'), L('pablo', 'Obara! Wida! No be by force, na by blood!'), L('baron', 'Who open mouth, mouth go close. Who run, fire go catch am.'), L(B, 'Swear for fire, for smoke, for the street wey born you. You no go sell your brother. You no go carry story. When dem call you, you go answer.')],
    choices: [{ id: 'swear', label: 'Swear the oath. Shout am.', next: 'test1' }, { id: 'leave', label: 'Ah, make I comot.', action: 'tryLeave' }] },
  { id: 'test1', speaker: B, style: 'cinematic', shot: 'close', where: 'forest',
    lines: [L(B, 'First test. Na for fire dem dey test gold.'), L('baron', 'Make you no flinch.')],
    choices: [{ id: 'still', label: 'Stand like wall.', fx: { energy: -5 }, set: { t1: 'still' }, next: 'test2' }, { id: 'answer', label: 'Answer the question.', fx: { energy: -3, charisma: 1 }, set: { t1: 'answer' }, next: 'test2' }, { id: 'stick', label: 'Hold the fire stick.', fx: { health: -5, charisma: 1 }, set: { t1: 'stick' }, next: 'test2' }] },
  { id: 'test2', speaker: 'baron', style: 'cinematic', shot: 'close', where: 'forest',
    lines: [L('baron', 'Second test. Silence na also answer.'), L('dragon', 'Even if your body wan shake, make your mouth stay shut.')],
    choices: [{ id: 'steady', label: 'Look the fire for eye.', fx: { energy: -4 }, set: { t2: 'steady' }, next: 'gauntlet' }, { id: 'nod', label: 'Nod. Talk nothing.', fx: { energy: -3 }, set: { t2: 'nod' }, next: 'gauntlet' }, { id: 'hold', label: 'Hold your ground.', fx: { health: -3 }, set: { t2: 'hold' }, next: 'gauntlet' }] },
  { id: 'gauntlet', speaker: 'dragon', style: 'cinematic', shot: 'group', where: 'forest', staging: 'gauntlet',
    lines: [N('Two lines of men. One path to the fire. Nobody is smiling.'), L('dragon', 'Run the line, small boy. Make you reach the fire.'), L('rambo', 'If you fall, you go crawl!')],
    choices: [{ id: 'run', label: 'Run the line.', fx: { energy: -4 }, set: { g1: 'run' }, next: 'gauntlet2' }, { id: 'walk', label: 'Walk am slowly.', fx: { charisma: 1 }, set: { g1: 'walk' }, next: 'gauntlet2' }, { id: 'cover', label: 'Cover your head. Move.', set: { g1: 'cover' }, next: 'gauntlet2' }] },
  { id: 'gauntlet2', speaker: 'dragon', style: 'cinematic', shot: 'group', where: 'forest', scene: 'gauntlet', staging: 'gauntlet', next: 'beating',
    lines: [N('Fists from both sides. Shoulders, ribs, back. Your legs nearly fold.'), L('rambo', 'Hold am! No let am stop!'), N('You reach the fire on your knees.')] },
  { id: 'beating', speaker: B, style: 'cinematic', shot: 'group', where: 'forest', scene: 'beating', staging: 'beating', action: 'beating', next: 'named',
    player: { 0: 'kneel', 1: 'beaten', 2: 'beaten', 3: 'beaten', 4: 'kneel' },
    lines: [N('The drum speeds up. The circle tightens.'), L('dragon', 'Make e hard! Make e no forget!'), N('Boots and fists. You curl up and count the drum.'), L('konji', 'Hahaha! E still dey breathe!'), L(B, 'Ehen! Enough!')] },
  { id: 'named', speaker: B, style: 'cinematic', shot: 'two', where: 'forest', staging: 'named', action: 'becomeMember', then: 'giveBracelet',
    lines: [L(B, 'Gerrup. Look me. You do well.'), L(B, 'From tonight, your name na {nick}. Rank one. Everything start from here.'), L('seaman', 'Welcome, brother! Chai, this one strong!'), L(B, 'Take this. Wear am. Anybody wey know, go know.')] },
];
export const NODE = (id: string): Node | undefined => NODES.find((n) => n.id === id);
export const lineText = (l: Line): string => (typeof l === 'string' ? l : l.text);
export const lineWho = (n: Node, l: Line): string => (typeof l === 'string' ? n.speaker : l.who);

export const ALIASES = ['Eagle', 'Baron Jr.', 'Viper', 'Scorpion', 'Lion', 'Cobra'];
/** The black bracelet and other things a member owns, for the Inventory in the profile. */
export const MEMBER_ITEMS = [{ id: 'bracelet', name: 'Black bracelet', glyph: '⚫' }] as const;
