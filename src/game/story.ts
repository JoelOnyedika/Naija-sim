import { sfx } from '@/audio/sfx';
import { fmtGame } from '@/core/gameTime';
import { formatNaira } from '@/core/format';
import { castDef } from '@/data/cast';
import { npcRegistry, type NpcProfile } from '@/data/npcs';
import { ALIASES, CAMPUS_LIFE, EXAM, INITIATION_PIN, MISSIONS, NODE, SPOTS, STORY, lineText, lineWho, type Choice, type Flags, type Line, type Mission, type Node, type Stage, type StoryAction } from '@/data/story';
import { useAgberoStore } from '@/stores/agberoStore';
import { useCastStore } from '@/stores/castStore';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useLoanStore } from '@/stores/loanStore';
import { useObjectiveStore, type Objective } from '@/stores/objectiveStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { useStoryStore } from '@/stores/storyStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { direct, nav, playerDirective, releaseAll, runtime, yawTo } from '@/world/actors';
import { isFree, type Pt } from '@/world/navigation';
import { standoff } from '@/world/arrangement';
import { livePlayer } from '@/world/npcLive';
import { fighterNow, oddsRun } from './agbero';
import { isJailed } from './crime';
import { beginScene, currentRun, endInteraction, frame, glanceAt, playBeat, setSpeaker, startFollow, startGroup, startTalk } from './interact';
import { notify } from './notify';
import { finish, startExam, type ExamState } from './exam';
import { addHeat } from './weapons';

/**
 * The story engine: missions, the exam, and the guided UNILAG story. The plot is a list of STAGES (data/story.ts) and each stage sets one
 * visible objective (objectiveStore), puts the right people in the venue (castStore) and waits for the player to do the next obvious thing.
 * There are no random rolls and no hidden waiting periods. Scenes run through the reusable interaction system (game/interact.ts), which
 * handles walking up, facing, sitting, following and the camera. Every dice roll takes `rnd` (a server owns real dice in multiplayer).
 */
const S = () => useStoryStore.getState();
const nowGame = () => useClockStore.getState().minutes;
const venueKind = () => useInteriorStore.getState().current?.kind;
const onCampus = () => venueKind() === 'university';
const inForest = () => venueKind() === 'initiation';
const BAYO_PEER = 'npc:cast:bayo';

// ------------------------------------------------------------------------------------------------ text
export function initiationLabel(at: number | null, now = nowGame()): string {
  if (at === null) return '';
  const d = Math.floor(at / 1440) - Math.floor(now / 1440), t = fmtGame(at).split(', ')[1] ?? '';
  return d <= 0 ? `tonight at ${t}` : d === 1 ? `tomorrow night at ${t}` : `on ${fmtGame(at)}`;
}
export const fill = (text: string): string => text.replace('{when}', initiationLabel(S().initiationAt)).replace('{pin}', INITIATION_PIN).replace('{nick}', S().confraternity.alias || 'Eagle');
const rawLines = (n: Node, flags: Flags): Line[] => n.alt?.find((x) => flags[x.flag])?.lines ?? n.lines;
/** The text of every line of a node (variants applied). Flags like tone_overwhelmed come from a choice that stored tone = overwhelmed. */
export function nodeLines(n: Node, flags: Flags = withTone(S().flags)): string[] { return rawLines(n, withTone(flags)).map((l) => fill(lineText(l))); }
/** Who says line `i`: a cast id or "player". */
export const lineSpeaker = (n: Node, i: number, flags: Flags = withTone(S().flags)): string => { const l = rawLines(n, flags)[i]; return l === undefined ? n.speaker : lineWho(n, l); };
const withTone = (f: Flags): Flags => (f.tone ? { ...f, [`tone_${f.tone}`]: true } : f);
export const visibleChoices = (n: Node, flags: Flags = S().flags): Choice[] => (n.choices ?? []).filter((c) => !(c.hideIf && flags[c.hideIf]) && !(c.showIf && !flags[c.showIf]));

// ------------------------------------------------------------------------------------------------ clock on campus
export function syncCampusClock(nowMs = Date.now()) {
  const s = S();
  if (onCampus() && s.campusSince === null) s.set({ campusSince: nowMs });
  else if (!onCampus() && s.campusSince !== null) s.set({ campusSeconds: s.campusSeconds + Math.max(0, (nowMs - s.campusSince) / 1000), campusSince: null });
}
export const campusSecondsNow = (nowMs = Date.now()) => S().campusSeconds + (S().campusSince !== null ? Math.max(0, (nowMs - S().campusSince!) / 1000) : 0);

// ------------------------------------------------------------------------------------------------ missions
export const currentMission = (): Mission | null => MISSIONS[S().mission] ?? null;
export const inHub = () => S().mission >= MISSIONS.length;
export const stepCount = (id: string) => S().steps[id] ?? 0;
export const missionProgress = (m: Mission) => m.steps.map((st) => ({ ...st, done: stepCount(st.id) >= (st.count ?? 1), have: Math.min(stepCount(st.id), st.count ?? 1), need: st.count ?? 1 }));

function pay(r: Mission['reward'], label: string) {
  if (r.money) useEconomyStore.getState().credit(r.money, label, 'reward');
  useStatsStore.getState().apply({ social: r.social, charisma: r.charisma });
  if (r.skill) useSkillStore.getState().add(r.skill.id, r.skill.xp);
}
const rewardText = (r: Mission['reward']) => [r.money ? formatNaira(r.money) : '', r.social ? `+${r.social} Social` : '', r.skill ? `+${r.skill.xp} ${r.skill.id} XP` : ''].filter(Boolean).join(', ');

/** A campus task finished (event "campus:xxx", fired from the activity runner through game/tasks.ts). Returns what it changed, for tests. */
export function onCampusEvent(event: string): { completed?: string; stepDone?: string; hubRound?: boolean } {
  if (!event.startsWith('campus:')) return {};
  const s = S(); const out: { completed?: string; stepDone?: string; hubRound?: boolean } = {};
  s.set({ tasksDone: s.tasksDone + 1, tasksSinceScene: s.tasksSinceScene + 1 });
  if (event === 'campus:exam' && s.grade && (s.grade === 'First' || s.grade === '2:1')) s.setFlags({ good_grade: true });
  const m = currentMission();
  if (m) {
    const st = m.steps.find((x) => event === x.event && stepCount(x.id) < (x.count ?? 1));
    if (st) {
      S().set({ steps: { ...S().steps, [st.id]: stepCount(st.id) + 1 } }); out.stepDone = st.id;
      if (stepCount(st.id) >= (st.count ?? 1)) toast(`${m.title}: ${st.label} ✓`, 'good');
      if (missionProgress(m).every((x) => x.done)) {
        pay(m.reward, `Mission: ${m.title}`); if (m.flag) S().setFlags({ [m.flag]: true });
        S().set({ mission: S().mission + 1 }); out.completed = m.id; sfx.reward();
        toast(`Mission done: ${m.title}${rewardText(m.reward) ? ` (${rewardText(m.reward)})` : ''}`, 'good');
        onMissionDone();
      }
    }
  } else if ((CAMPUS_LIFE.events as readonly string[]).includes(event)) {
    const n = S().hubCount + 1;
    if (n >= CAMPUS_LIFE.perRound) { useEconomyStore.getState().credit(CAMPUS_LIFE.reward, 'Campus Life round', 'reward'); S().set({ hubCount: 0, hubRounds: S().hubRounds + 1 }); out.hubRound = true; sfx.reward(); toast(`Campus Life round done (${formatNaira(CAMPUS_LIFE.reward)})`, 'good'); }
    else S().set({ hubCount: n });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ exam
export function beginExam(rnd: () => number = Math.random) { if (S().exam) return; S().set({ exam: startExam(rnd) }); }
/** The exam sheet reports the final state: pay, grade, flags, and the campus event (only when not caught). */
export function concludeExam(state: ExamState): ReturnType<typeof finish> {
  const r = finish(state); S().set({ exam: null });
  if (r.caught) {
    useStatsStore.getState().apply(EXAM.caught); S().setFlags({ caught_cheating: true });
    toast('Caught cheating! The invigilator took your script.', 'bad'); sfx.error(); return r;
  }
  S().set({ grade: r.grade });
  if (r.pay) useEconomyStore.getState().credit(r.pay, `Exam result: ${r.grade}`, 'reward');
  toast(`Result: ${r.grade} (${r.score}/${state.qs.length})${r.pay ? ` +${formatNaira(r.pay)}` : ''}`, r.grade === 'Fail' ? 'bad' : 'good');
  onCampusEvent('campus:exam');
  return r;
}

// ------------------------------------------------------------------------------------------------ objectives and stages
const MAP_LANDMARK = 'lagos.unilag';
/** The one objective for the current stage (or null when there is none). Rebuilt from the stage, so it survives a reload. */
export function objectiveFor(stage: Stage = S().stage): Objective | null {
  const s = S();
  switch (stage) {
    case 'talk_bayo': return { id: 'talk_bayo', title: 'TALK TO SENIOR BAYO', instruction: 'Find Senior Bayo near the university cafeteria.', target: { kind: 'npc', castId: 'bayo', venue: 'university', verb: 'Talk to Senior Bayo' }, landmarkId: MAP_LANDMARK } as Objective;
    case 'declined': return s.flags.soft_reoffer ? ({ id: 'talk_bayo_opt', title: 'TALK TO SENIOR BAYO', instruction: 'Optional. He is by the cafeteria if you changed your mind.', target: { kind: 'npc', castId: 'bayo', venue: 'university', verb: 'Talk to Senior Bayo' }, landmarkId: MAP_LANDMARK, optional: true } as Objective) : null;
    case 'missed': return { id: 'talk_bayo_missed', title: 'TALK TO SENIOR BAYO', instruction: 'Optional. He may give you one more chance.', target: { kind: 'npc', castId: 'bayo', venue: 'university', verb: 'Talk to Senior Bayo' }, landmarkId: MAP_LANDMARK, optional: true } as Objective;
    case 'meeting': return s.initiationAt === null ? null : { id: 'meet_bayo', title: 'MEET SENIOR BAYO', instruction: `Be at ${INITIATION_PIN} ${initiationLabel(s.initiationAt)}. Come alone.`, target: { kind: 'point', venue: 'university', x: SPOTS.gate.x, z: SPOTS.gate.z, label: 'Back gate' }, at: s.initiationAt, until: s.initiationAt + STORY.initiationWindowMinutes, landmarkId: MAP_LANDMARK } as Objective;
    case 'follow': return { id: 'follow_bayo', title: 'FOLLOW BAYO', instruction: 'Stay close to Senior Bayo. Do not ask questions.', target: { kind: 'npc', castId: 'bayo', venue: 'university', verb: 'Follow Bayo' }, landmarkId: MAP_LANDMARK } as Objective;
    default: return null;
  }
}
/** Put the objective card, markers and map highlight in line with the stage. A finished objective shows a completion banner. */
export function syncObjective() {
  const o = useObjectiveStore.getState(), next = objectiveFor(), prev = o.current;
  if (prev && (!next || prev.id !== next.id)) o.complete(prev.optional ? undefined : `Objective complete: ${prev.title}`);
  if (next && (!prev || prev.id !== next.id)) useObjectiveStore.getState().set(next);
}
const RECRUIT: Record<Stage, 'none' | 'met' | 'offered' | 'invited' | 'member' | 'ended'> = { arrival: 'none', watcher: 'none', talk_bayo: 'met', declined: 'offered', missed: 'offered', meeting: 'invited', follow: 'invited', initiation: 'invited', member: 'member', ended: 'ended' };
/** Move the plot to a stage: save it, set the objective and put the right people in the venue. */
export function goStage(stage: Stage) {
  S().set({ stage, recruit: RECRUIT[stage] });
  syncObjective(); ensureCast();
}

// ------------------------------------------------------------------------------------------------ the cast in the venue
const spawn = (id: string, venue: string, at: Pt, face?: Pt) => { if (!useCastStore.getState().present[id]) useCastStore.getState().spawn(id, venue, at, face ? yawTo(at, face) : 0); };
const centreOfCampus: Pt = { x: 12, z: 8 };
function registerPeers() {
  if (npcRegistry.has(BAYO_PEER)) return;
  const d = castDef('bayo')!;
  const p: NpcProfile = { id: BAYO_PEER, name: d.name, appearance: d.appearance, wallet: 0, greeting: d.greeting, role: d.role, starter: 'My guy!', venue: 'university' } as NpcProfile;
  npcRegistry.set(p.id, p);
}
/** Make sure the people this stage needs are standing in the campus. Safe to call any time; it never duplicates anyone. */
export function ensureCast() {
  if (!onCampus()) return;
  const stage = S().stage, c = useCastStore.getState();
  if (stage === 'watcher') { const me = { x: livePlayer.x || 12, z: livePlayer.z || 8 }; spawn('tobi', 'university', watchSpot(me), me); }
  else if (c.present.tobi && !watcherLeaving) c.despawn('tobi');
  if (stage === 'talk_bayo' || stage === 'declined' || stage === 'missed') spawn('bayo', 'university', SPOTS.bayoHome, centreOfCampus);
  else if (stage === 'follow') spawn('bayo', 'university', { x: SPOTS.gate.x + 1.3, z: SPOTS.gate.z - 0.4 }, SPOTS.gate);
  else if (c.present.bayo && !groupRunning && !arriving && !currentRun() && !S().dialogue) c.despawn('bayo'); // never remove someone in the middle of a scene
}
/** Where the watching student stands: a spot 5 to 14 m from the player (so he is on screen), else the nearest one. */
export function watchSpot(me: Pt): Pt {
  const d = (p: Pt) => Math.hypot(p.x - me.x, p.z - me.z), ok = SPOTS.watchSpots.filter((p) => d(p) >= 5 && d(p) <= 14);
  return (ok.length ? ok : [...SPOTS.watchSpots]).sort((a, b) => (ok.length ? d(a) - d(b) : d(b) - d(a)))[0];
}
let watcherLeaving = false, watcherStart = 0, groupRunning = false, arriving = false, restored = false;

/** Called whenever the player enters or leaves a venue: clears the old scene and sets up the new one. */
export function onVenueChange() {
  endInteraction(); releaseAll(); useCastStore.getState().clear(); watcherLeaving = false; groupRunning = false; arriving = false; watcherStart = 0;
  S().set({ dialogue: null });
  if (onCampus()) { if (S().recruit === 'invited') S().setFlags({ follow_shown: false }); ensureCast(); }
  else if (inForest() && S().stage === 'initiation') setTimeout(() => { if (inForest()) startForestScene(); }, 900);
}
export const onEnterCampus = onVenueChange;

// ------------------------------------------------------------------------------------------------ talking to someone
const POSE: Record<string, Record<string, 'idle' | 'gesture' | 'listen' | 'give' | 'crossed'>> = { test1: { still: 'idle', answer: 'gesture', stick: 'give' }, test2: { steady: 'idle', nod: 'listen', hold: 'crossed' } };
/** The player tapped a person (or the interaction prompt): if they are the objective, walk up and start the scene. */
export function requestTalkTo(id: string): boolean {
  const s = S(); if (s.dialogue || s.exam) return false;
  if (id === 'bayo') {
    const go = (node: string, style: 'standard' | 'cinematic') => startTalk('bayo', { presentation: style, shot: 'two', onReady: () => openNode(node) });
    if (s.stage === 'talk_bayo') return go('bayo_intro', 'cinematic');
    if (s.stage === 'declined') return go('reoffer', 'standard');
    if (s.stage === 'missed') return go('missed', 'standard');
    if (s.stage === 'follow') return go('follow_intro', 'cinematic');
    return false;
  }
  toast(castDef(id)?.greeting ?? '...', 'info'); return false;
}

// ------------------------------------------------------------------------------------------------ dialogue
function focusLine(n: Node, line: number) {
  const who = lineSpeaker(n, line);
  setSpeaker(who === 'player' ? 'player' : who === 'narrator' ? null : who);
  if (n.style === 'cinematic') frame(n.shot === 'close' ? 'close' : n.shot ?? 'auto', who === 'player' ? undefined : who);
}
export function openNode(id: string): boolean {
  const n = NODE(id); if (!n) return false;
  S().set({ dialogue: { nodeId: id, line: 0 } });
  if (n.set) S().setFlags(n.set);
  if (n.fx) useStatsStore.getState().apply(n.fx);
  if (n.scene === 'beating') showBeating();
  if (n.action) runAction(n.action);
  focusLine(n, 0);
  return true;
}
/** Close the dialogue. The scene (camera, poses) ends with it, unless a follow-up scene has just started. */
export function closeDialogue(keepScene = false) {
  const was = S().dialogue; S().set({ dialogue: null });
  if (!keepScene) afterScene();
  if (was && inForest() && S().recruit === 'member') returnToCampus();
}
/** Tap to continue: next line, then the node's `next`, its `then` action, or close. */
export function advanceLine(rnd: () => number = Math.random) {
  const d = S().dialogue; if (!d) return; const n = NODE(d.nodeId); if (!n) { closeDialogue(); return; }
  const lines = nodeLines(n);
  if (d.line < lines.length - 1) { S().set({ dialogue: { ...d, line: d.line + 1 } }); focusLine(n, d.line + 1); return; }
  if (visibleChoices(n).length) return; // waiting for a choice
  if (n.next) openNode(n.next);
  else if (n.then) { S().set({ dialogue: null }); runAction(n.then, rnd); }
  else closeDialogue();
}
/** Skip: jump to the last line of this node (choices appear there). Never skips a choice. */
export function skipDialogue() {
  const d = S().dialogue; if (!d) return; const n = NODE(d.nodeId); if (!n) return;
  const last = nodeLines(n).length - 1; if (d.line < last) { S().set({ dialogue: { ...d, line: last } }); focusLine(n, last); }
}
export function choose(choiceId: string, rnd: () => number = Math.random) {
  const d = S().dialogue; if (!d) return; const n = NODE(d.nodeId); const c = n && visibleChoices(n).find((x) => x.id === choiceId); if (!n || !c) return;
  if (c.set) S().setFlags(c.set);
  if (c.fx) useStatsStore.getState().apply(c.fx);
  const pose = POSE[n.id]?.[c.id]; if (pose) { playerDirective.hold = true; playerDirective.lock = true; playerDirective.action = pose; }
  S().set({ dialogue: null });
  const handled = c.action ? runAction(c.action, rnd, c) : undefined;
  if (handled === 'stay') return;
  if (c.next) openNode(c.next);
  else { afterScene(); if (inForest() && S().recruit === 'member') returnToCampus(); }
}

// ------------------------------------------------------------------------------------------------ actions
function runAction(a: StoryAction, rnd: () => number = Math.random, _c?: Choice): void | 'stay' {
  const s = S();
  switch (a) {
    case 'more': { const n = s.moreAsked + 1; s.set({ moreAsked: n }); if (n >= STORY.moreMax) s.setFlags({ more_maxed: true }); openNode(n === 1 ? 'invite_more1' : 'invite_more2'); return 'stay'; }
    case 'accept': acceptInvitation(); break;
    case 'decline': s.set({ refusedCount: s.refusedCount + 1 }); goStage('declined'); break;
    case 'rebook': acceptInvitation(); break;
    case 'endStory': s.setFlags({ story_missed: true }); goStage('ended'); break;
    case 'meetOthers': meetOthers(); return 'stay';
    case 'startFollow': followToForest(); return 'stay';
    case 'backOut': goStage('declined'); break;
    case 'enterForest': enterForest(); return 'stay';
    case 'stepIn': stepIntoCircle(); break;
    case 'tryLeave': return tryLeave(rnd);
    case 'beating': break; // the effect is shown by the scene node, the numbers are applied once in showBeating
    case 'handshake': break;
    case 'becomeMember': becomeMember(rnd); break;
    case 'giveBracelet': playBeat('give', 'bayo', 1800, () => { endInteraction(); returnToCampus(); }); break;
  }
}

/** The next 22:00 at least `lead` game minutes ahead. */
export function scheduleInitiation(now: number): number {
  let t = Math.floor(now / 1440) * 1440 + STORY.initiationHour * 60;
  while (t < now + STORY.initiationLeadMinutes) t += 1440;
  return t;
}
export const initiationOpen = (now = nowGame()) => { const t = S().initiationAt; return t !== null && now >= t && now <= t + STORY.initiationWindowMinutes; };

/** The player said yes: book the meeting, send a real phone message from Bayo and set the objective. */
function acceptInvitation() {
  const at = scheduleInitiation(nowGame()); registerPeers();
  S().set({ initiationAt: at }); S().setFlags({ joined_offer: true, follow_shown: false, notified_time: false });
  const when = initiationLabel(at), text = `${when.charAt(0).toUpperCase()}${when.slice(1)}. Meet me at ${INITIATION_PIN}. Come alone, wear something black, and tell nobody.`;
  usePhoneStore.getState().say(BAYO_PEER, 'them', text);
  notify({ title: 'Senior Bayo', body: text, icon: '💬', appId: 'messages' });
  goStage('meeting');
}
function softReoffer() {
  registerPeers(); S().set({ reoffers: S().reoffers + 1 }); S().setFlags({ soft_reoffer: true });
  const text = 'No pressure, my guy. The offer is still open if you want to talk. I am around the cafeteria.';
  usePhoneStore.getState().say(BAYO_PEER, 'them', text); notify({ title: 'Senior Bayo', body: text, icon: '💬', appId: 'messages' });
  syncObjective();
}
function onMissionDone() {
  const s = S();
  if (s.stage === 'arrival' && s.mission >= 1) goStage('watcher');
  else if (s.stage === 'declined' && s.reoffers < STORY.maxReoffers && !s.flags.soft_reoffer) softReoffer();
}

/** The group scene: Bayo introduces the others. They walk to their places (benches first), some sit, some stand, and the camera frames them. */
function meetOthers() {
  S().set({ dialogue: null }); groupRunning = true;
  for (const o of SPOTS.others) spawn(o.id, 'university', o, SPOTS.groupCentre);
  const ids = ['bayo', ...SPOTS.others.map((o) => o.id)];
  startGroup(ids, SPOTS.groupCentre, { seats: [...SPOTS.seats], seed: 21, isFree: (p) => (nav.grid ? isFree(nav.grid, p) : true), presentation: 'cinematic', onReady: () => { openNode('group_chat'); } });
}
/** A scene is over: release everyone, put the group back, and make the venue match the stage again. */
function afterScene() { endInteraction(); settleGroup(); ensureCast(); }
/** After the group scene: the ones standing go back to their spots; the ones sitting stay on the bench. */
function settleGroup() {
  if (!groupRunning) return; groupRunning = false;
  if (S().stage === 'meeting') { for (const o of SPOTS.others) useCastStore.getState().despawn(o.id); useCastStore.getState().despawn('bayo'); return; }
  direct('bayo', { goal: SPOTS.bayoHome, face: null, yaw: Math.PI, speed: 1.4 });
}

function followToForest() {
  S().set({ dialogue: null });
  startFollow('bayo', SPOTS.gateOut, { onArrive: () => enterForest(), onCancel: () => { toast('You stopped following Bayo.', 'info'); } });
}
function enterForest() {
  S().set({ dialogue: null }); endInteraction(); goStage('initiation');
  import('./interiors').then(({ enterInterior }) => { enterInterior('initiation', { force: true, name: 'The forest' }); });
}
function returnToCampus() { import('./interiors').then(({ enterInterior }) => enterInterior('university', { force: true, landmarkId: 'lagos.unilag' })); }

// ------------------------------------------------------------------------------------------------ the forest
export const FOREST = { cx: 10, cz: 10, ringR: 5.2, named: { seaman: 2, pablo: 5, baron: 9 } as Record<string, number>, ringCount: 12 };
export const ringPoint = (i: number, r = FOREST.ringR): { x: number; z: number; yaw: number } => { const a = (i / FOREST.ringCount) * Math.PI * 2; const x = FOREST.cx + Math.sin(a) * r, z = FOREST.cz + Math.cos(a) * r; return { x, z, yaw: Math.atan2(FOREST.cx - x, FOREST.cz - z) }; };
export function startForestScene() {
  if (!inForest()) return;
  const c = useCastStore.getState();
  c.spawn('bayo', 'initiation', { x: FOREST.cx, z: FOREST.cz - 3.6 }, 0);
  for (const [id, i] of Object.entries(FOREST.named)) { const p = ringPoint(i); c.spawn(id, 'initiation', p, p.yaw); direct(id, { action: 'chant', yaw: p.yaw }); }
  beginScene(['bayo', ...Object.keys(FOREST.named)], { x: FOREST.cx, z: FOREST.cz }); // shots keep the fire behind the people
  // Bayo walks up to the player (inside the circle) to begin
  const me = { x: livePlayer.x || FOREST.cx, z: livePlayer.z || FOREST.cz + 4 };
  direct('bayo', { goal: standoff({ x: me.x, z: me.z }, { x: FOREST.cx, z: FOREST.cz - 3.6 }, 2.1), face: me, action: 'idle', speed: 1.4 });
  setTimeout(() => { if (inForest() && !S().dialogue) openNode('forest_start'); }, 2200);
}
function stepIntoCircle() {
  import('@/stores/actorStore').then(({ useActorStore }) => useActorStore.getState().walkTo(FOREST.cx, FOREST.cz + 1.9));
  playerDirective.hold = true; playerDirective.face = { x: FOREST.cx, z: FOREST.cz }; playerDirective.action = 'idle';
  direct('bayo', { goal: { x: FOREST.cx, z: FOREST.cz - 2.4 }, action: 'gesture', speed: 1.2 });
}
/** Try to leave before the oath: the run odds decide. Failing keeps you in the circle. */
export function tryLeave(rnd: () => number = Math.random): 'stay' | void {
  const win = rnd() < oddsRun(fighterNow(), 1, 3);
  if (win) {
    S().set({ dialogue: null, refusedCount: S().refusedCount + 1, initiationAt: null }); S().setFlags({ left_initiation: true });
    endInteraction(); toast('You pushed through the circle and ran. They let you go.', 'good'); goStage('declined'); returnToCampus(); return 'stay';
  }
  useStatsStore.getState().apply({ health: -3, happiness: -4 });
  toast('The circle closes. You cannot get out.', 'bad'); sfx.error();
  S().set({ dialogue: { nodeId: 'oath', line: 0 } }); return 'stay';
}
/** A stylised, non-graphic scene: the screen shakes and a red vignette pulses (features/game/StoryDialogue.tsx), the circle tightens, health and energy drop. */
function showBeating() {
  useStatsStore.getState().apply({ health: STORY.beating.health, energy: STORY.beating.energy, happiness: STORY.beating.happiness });
  S().set({ beating: true }); sfx.error(); setTimeout(() => S().set({ beating: false }), 4200);
  for (const [id, i] of Object.entries(FOREST.named)) { const p = ringPoint(i, 3.5); direct(id, { goal: p, yaw: p.yaw, action: 'chant', speed: 2 }); }
}
function becomeMember(rnd: () => number = Math.random) {
  const alias = ALIASES[Math.floor(rnd() * ALIASES.length)];
  S().set({ initiationAt: null, items: Array.from(new Set([...S().items, 'bracelet'])), confraternity: { member: true, rank: STORY.startRank, reputation: STORY.startReputation, alias, joinedAt: nowGame() } });
  S().setFlags({ member: true }); goStage('member');
  registerPeers(); notify({ title: 'Brotherhood', body: 'A member added you to the group. Business is open.', icon: '⚫', appId: 'brotherhood' });
  sfx.reward(); addHeat(5);
  for (const [id, i] of Object.entries(FOREST.named)) { const p = ringPoint(i); direct(id, { goal: p, yaw: p.yaw, action: 'chant', speed: 1.6 }); }
  // Bayo steps up to the new member and they shake hands
  const me = { x: livePlayer.x, z: livePlayer.z }; direct('bayo', { goal: { x: me.x, z: me.z - 1.25 }, face: me, action: 'idle', speed: 1.5 });
  setTimeout(() => playBeat('handshake', 'bayo', 1500), 1600);
}
export const promote = () => { const c = S().confraternity; if (!c.member || c.rank >= STORY.maxRank) return false; S().set({ confraternity: { ...c, rank: c.rank + 1, reputation: c.reputation + 10 } }); return true; };

// ------------------------------------------------------------------------------------------------ the story clock
const blocked = () => !!S().dialogue || !!S().exam || isJailed() || !!useAgberoStore.getState().active || !!useLoanStore.getState().visit || useUiStore.getState().mode !== 'home';
/** Put a saved game back into a state it can continue from (scenes are not saved: a reload in the forest returns to the invitation). */
export function restoreStory() {
  restored = true; const s = S();
  s.set({ dialogue: null, exam: null, beating: false });
  if (s.stage === 'initiation' && !inForest()) goStage(s.initiationAt !== null ? 'follow' : 'meeting' as Stage);
  else if (s.stage === 'initiation' && s.initiationAt === null) goStage('declined');
  else syncObjective();
  if ((s.stage === 'meeting' || s.stage === 'follow') && s.initiationAt === null) goStage('declined');
}
/** Called every simulation step: starts the scenes the current stage is waiting for. `nowMs` and `nowMin` are injectable for tests. */
export function stepStory(nowMs = Date.now(), nowMin = nowGame()) {
  if (!restored) restoreStory();
  syncCampusClock(nowMs);
  const s = S(); if (!onCampus() || blocked()) return;
  // arrival: the introductory tasks are done, so someone starts to notice the player. No waiting.
  if (s.stage === 'arrival' && s.mission >= 1) { goStage('watcher'); }
  if (S().stage === 'watcher') {
    const t = useCastStore.getState().present.tobi; if (!t) { ensureCast(); return; }
    if (!watcherStart) { watcherStart = nowMs; notify({ title: 'Campus', body: 'Someone seems to have noticed you around campus.', icon: '👀' }); direct('tobi', { face: { x: livePlayer.x, z: livePlayer.z }, action: 'crossed' }); glanceAt('tobi', 2600); }
    const r = runtime.get('tobi'), near = r ? Math.hypot(r.x - livePlayer.x, r.z - livePlayer.z) < STORY.watcherNear : false;
    if (!watcherLeaving && (nowMs - watcherStart > STORY.watcherSeconds * 1000 || near)) { watcherLeaving = true; direct('tobi', { goal: SPOTS.watcherExit, speed: 1.5, face: null, action: 'idle' }); }
    if (watcherLeaving && r && Math.hypot(r.x - SPOTS.watcherExit.x, r.z - SPOTS.watcherExit.z) < 0.7) { useCastStore.getState().despawn('tobi'); watcherLeaving = false; watcherStart = 0; goStage('talk_bayo'); }
    return;
  }
  // meeting: in the window and at the gate, Bayo walks up to the player and the objective becomes "follow"
  if (s.stage === 'meeting' && initiationOpen(nowMin) && livePlayer.set) {
    const atGate = Math.hypot(livePlayer.x - SPOTS.gate.x, livePlayer.z - SPOTS.gate.z) < 3.4;
    if (atGate && !useCastStore.getState().present.bayo) { spawn('bayo', 'university', SPOTS.bayoArrives, { x: livePlayer.x, z: livePlayer.z }); direct('bayo', { goal: { x: livePlayer.x - 1.2, z: livePlayer.z - 0.2 }, speed: 1.6, action: 'idle' }); arriving = true; }
    const r = runtime.get('bayo');
    if (arriving && r && r.arrived) { arriving = false; direct('bayo', { goal: null, face: { x: livePlayer.x, z: livePlayer.z } }); goStage('follow'); }
  }
}
/** Called from the game loop even off campus: the meeting time, its reminder and what happens if it is missed. */
export function stepStoryClock(nowMin = nowGame()) {
  const s = S(); if ((s.stage !== 'meeting' && s.stage !== 'follow') || s.initiationAt === null) return;
  if (s.stage === 'meeting' && nowMin >= s.initiationAt && !s.flags.notified_time) { s.setFlags({ notified_time: true }); notify({ title: 'Senior Bayo', body: `Time reach. Come to ${INITIATION_PIN} now.`, icon: '💬', appId: 'messages' }); }
  if (nowMin > s.initiationAt + STORY.initiationWindowMinutes) {
    const missed = s.missed + 1; registerPeers();
    s.setFlags({ follow_shown: false, notified_time: false });
    if (missed >= STORY.maxMissed) { s.set({ missed, initiationAt: null }); s.setFlags({ story_missed: true }); goStage('ended'); toast('You missed the meeting again. Bayo has stopped replying.', 'info'); }
    else { s.set({ missed, initiationAt: null }); usePhoneStore.getState().say(BAYO_PEER, 'them', 'You no show. I waited. If you still want to talk, come and find me.'); goStage('missed'); toast('You missed the meeting.', 'bad'); }
  }
}
