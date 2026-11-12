import { sfx } from '@/audio/sfx';
import { fmtGame } from '@/core/gameTime';
import { formatNaira } from '@/core/format';
import { ALIASES, CAMPUS_LIFE, EXAM, INITIATION_PIN, MISSIONS, NODE, STORY, type Choice, type Flags, type Mission, type Node, type StoryAction } from '@/data/story';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useAgberoStore } from '@/stores/agberoStore';
import { useLoanStore } from '@/stores/loanStore';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { useStoryStore } from '@/stores/storyStore';
import { useUiStore, toast } from '@/stores/uiStore';
import { fighterNow, oddsRun } from './agbero';
import { isJailed } from './crime';
import { notify } from './notify';
import { finish, startExam, type ExamState } from './exam';
import { addHeat } from './weapons';

/**
 * The story engine: missions, the recruiter story, the initiation. Every dice roll takes `rnd` (a server owns real dice in the
 * multiplayer version). Pure rules where possible; the overlay (features/game/StoryDialogue.tsx) only shows what the store says.
 */
const S = () => useStoryStore.getState();
const nowGame = () => useClockStore.getState().minutes;
const onCampus = () => useInteriorStore.getState().current?.kind === 'university';
const inForest = () => useInteriorStore.getState().current?.kind === 'initiation';

// ------------------------------------------------------------------------------------------------ text
export function initiationLabel(at: number | null, now = nowGame()): string {
  if (at === null) return '';
  const d = Math.floor(at / 1440) - Math.floor(now / 1440), t = fmtGame(at).split(', ')[1] ?? '';
  return d <= 0 ? `tonight at ${t}` : d === 1 ? `tomorrow night at ${t}` : `on ${fmtGame(at)}`;
}
export const fill = (text: string): string => text.replace('{when}', initiationLabel(S().initiationAt)).replace('{pin}', INITIATION_PIN).replace('{nick}', S().confraternity.alias || 'Eagle');
export function nodeLines(n: Node, flags: Flags = S().flags): string[] { const a = n.alt?.find((x) => flags[x.flag]); return (a?.lines ?? n.lines).map(fill); }
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
  // Discovery: clue spots and asking around make the brotherhood findable. Two clues, or asking Dayo outright, start it at once.
  if (S().recruit === 'none') {
    if (event.startsWith('campus:clue_')) { const n = Number(S().flags.clues ?? 0) + 1; S().setFlags({ clues: n }); toast(clueText(event), 'info'); if (n >= STORY.discovery.cluesToStart) S().setFlags({ trigger_now: true }); }
    if (event === 'campus:ask_around') S().setFlags({ seeking: true, trigger_now: true });
  }
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
      }
    }
  } else if ((CAMPUS_LIFE.events as readonly string[]).includes(event)) {
    const n = S().hubCount + 1;
    if (n >= CAMPUS_LIFE.perRound) { useEconomyStore.getState().credit(CAMPUS_LIFE.reward, 'Campus Life round', 'reward'); S().set({ hubCount: 0, hubRounds: S().hubRounds + 1 }); out.hubRound = true; sfx.reward(); toast(`Campus Life round done (${formatNaira(CAMPUS_LIFE.reward)})`, 'good'); }
    else S().set({ hubCount: n });
  }
  return out;
}

const clueText = (e: string) => e === 'campus:clue_flyer' ? 'A plain black flyer: “Real family. Ask Dayo.”' : e === 'campus:clue_bracelets' ? 'Students with black bracelets stop talking when you pass.' : 'You overhear: “Saturday night. The old gate. Bring nobody.”';

/** The chance the story starts on one discovery roll. Hardship, clues and past choices move it; being rude to seniors lowers it. Pure (flags and money are inputs). */
export function discoveryChance(flags: Flags, money: number): number {
  const d = STORY.discovery; let p = d.baseChance;
  p += Number(flags.clues ?? 0) * d.clueBoost;
  if (money < d.brokeBelow) p += d.brokeBoost;
  if (flags.caught_cheating) p += d.cheatBoost;
  if (flags.good_grade) p += d.gradeBoost;
  if (flags.dayo_curious) p += d.curiousBoost;
  if (flags.dayo_rude) p += d.rudeBoost;
  return Math.max(0.005, Math.min(0.6, p));
}
/** Which harassment scene fits this many refusals (shouting, blocking and rumours, the final threat). */
export const harassNode = (refused: number): string | null => { const [a, b, c] = STORY.harassTiers; return refused >= c ? 'harass3' : refused >= b ? 'harass2' : refused >= a ? 'harass' : null; };

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

// ------------------------------------------------------------------------------------------------ dialogue
export function openNode(id: string): boolean {
  const n = NODE(id); if (!n) return false;
  S().set({ dialogue: { nodeId: id, line: 0 } });
  if (n.set) S().setFlags(n.set);
  if (n.fx) useStatsStore.getState().apply(n.fx);
  if (n.scene === 'beating') showBeating();
  if (n.action) runAction(n.action);
  return true;
}
export function closeDialogue() {
  const was = S().dialogue; S().set({ dialogue: null });
  // the initiation ends with the circle's cheer: walk back out to the campus
  if (was && inForest() && S().recruit === 'member') returnToCampus();
}
/** Tap to continue: next line, then the node's `next`, or close. */
export function advanceLine(rnd: () => number = Math.random) {
  const d = S().dialogue; if (!d) return; const n = NODE(d.nodeId); if (!n) { closeDialogue(); return; }
  const lines = nodeLines(n);
  if (d.line < lines.length - 1) { S().set({ dialogue: { ...d, line: d.line + 1 } }); return; }
  if (visibleChoices(n).length) return; // waiting for a choice
  if (n.next) openNode(n.next); else closeDialogue();
  void rnd;
}
export function choose(choiceId: string, rnd: () => number = Math.random) {
  const d = S().dialogue; if (!d) return; const n = NODE(d.nodeId); const c = n && visibleChoices(n).find((x) => x.id === choiceId); if (!n || !c) return;
  if (c.set) S().setFlags(c.set);
  if (c.fx) useStatsStore.getState().apply(c.fx);
  S().set({ dialogue: null });
  const handled = c.action ? runAction(c.action, rnd, c) : undefined;
  if (handled === 'stay') return;
  if (c.next) openNode(c.next);
  else if (inForest() && S().recruit === 'member') returnToCampus();
}

// ------------------------------------------------------------------------------------------------ actions
function runAction(a: StoryAction, rnd: () => number = Math.random, _c?: Choice): void | 'stay' {
  const s = S(), now = Date.now();
  switch (a) {
    case 'giftDrink': useStatsStore.getState().apply({ thirst: 30, happiness: 5 }); s.set({ recruit: s.recruit === 'none' ? 'met' : s.recruit }); toast('Dayo bought you a cold drink.', 'good'); break;
    case 'trust': s.set({ trust: s.trust + 1, recruit: 'blending' }); break;
    case 'more': { const n = s.moreAsked + 1; s.set({ moreAsked: n }); if (n >= STORY.moreMax) s.setFlags({ more_maxed: true }); openNode(n === 1 ? 'more1' : 'more2'); return 'stay'; }
    case 'join': s.set({ recruit: 'invited', initiationAt: scheduleInitiation(nowGame()) }); s.setFlags({ joined_offer: true }); break;
    case 'rebook': s.set({ recruit: 'invited', initiationAt: scheduleInitiation(nowGame()) }); break;
    case 'refuse': s.set({ refusedCount: s.refusedCount + 1, lastPressureAt: now, recruit: s.recruit === 'invited' ? 'offered' : s.recruit, initiationAt: null }); break;
    case 'later': s.set({ lastPressureAt: now }); break;
    case 'standFirm': s.set({ refusedCount: s.refusedCount + 1, lastPressureAt: now }); useStatsStore.getState().apply({ happiness: -3, charisma: 1 }); break;
    case 'securityHelp': s.set({ lastPressureAt: now + STORY.pressureEveryMinutes * 2 * 60_000 }); s.setFlags({ reported_security: true }); toast('Security chased them away. For now.', 'good'); break;
    case 'endStory': s.set({ recruit: 'ended', initiationAt: null }); s.setFlags({ story_missed: true }); break;
    case 'reportPolice': s.set({ recruit: 'ended', initiationAt: null }); s.setFlags({ reported_police: true, story_ended: true }); useStatsStore.getState().apply({ social: -3, happiness: 3 }); break;
    case 'rumours': useStatsStore.getState().apply({ charisma: -1, social: -3, happiness: -5 }); break;
    case 'enterForest': enterForest(); return 'stay';
    case 'tryLeave': return tryLeave(rnd);
    case 'beating': break; // the effect itself is shown by the scene, the numbers are applied once below
    case 'becomeMember': becomeMember(rnd); break;
  }
}

/** The next 22:00 at least `lead` game minutes ahead. */
export function scheduleInitiation(now: number): number {
  let t = Math.floor(now / 1440) * 1440 + STORY.initiationHour * 60;
  while (t < now + STORY.initiationLeadMinutes) t += 1440;
  notify({ title: 'Senior Dayo', body: `Initiation ${initiationLabel(t, now)}. Come alone. Wear black.`, icon: '🌙' });
  return t;
}
export const initiationOpen = (now = nowGame()) => { const t = S().initiationAt; return t !== null && now >= t && now <= t + STORY.initiationWindowMinutes; };

function enterForest() {
  S().set({ dialogue: null });
  import('./interiors').then(({ enterInterior }) => { enterInterior('initiation', { force: true, name: 'The forest' }); setTimeout(() => openNode('forest_start'), 900); });
}
function returnToCampus() { import('./interiors').then(({ enterInterior }) => enterInterior('university', { force: true, landmarkId: 'lagos.unilag' })); }

/** Try to leave before the oath: the run odds decide. Failing keeps you in the circle. */
export function tryLeave(rnd: () => number = Math.random): 'stay' | void {
  const win = rnd() < oddsRun(fighterNow(), 1, 3);
  if (win) {
    S().set({ dialogue: null, refusedCount: S().refusedCount + 1, lastPressureAt: Date.now(), recruit: 'offered', initiationAt: null }); S().setFlags({ left_initiation: true });
    toast('You pushed through the circle and ran. They let you go. For now.', 'good'); returnToCampus(); return 'stay';
  }
  useStatsStore.getState().apply({ health: -3, happiness: -4 }); S().set({ refusedCount: S().refusedCount + 1 });
  toast('The circle closes. You cannot get out.', 'bad'); sfx.error();
  S().set({ dialogue: { nodeId: 'oath', line: 0 } }); return 'stay';
}

/** A stylised, non-graphic scene: the screen shakes and a red vignette pulses (features/game/StoryDialogue.tsx), health and energy drop. */
function showBeating() {
  useStatsStore.getState().apply({ health: STORY.beating.health, energy: STORY.beating.energy, happiness: STORY.beating.happiness });
  S().set({ beating: true }); sfx.error(); setTimeout(() => S().set({ beating: false }), 4200);
}
function becomeMember(rnd: () => number = Math.random) {
  const alias = ALIASES[Math.floor(rnd() * ALIASES.length)];
  S().set({ recruit: 'member', initiationAt: null, items: Array.from(new Set([...S().items, 'bracelet'])), confraternity: { member: true, rank: STORY.startRank, reputation: STORY.startReputation, alias, joinedAt: nowGame() } });
  S().setFlags({ member: true });
  notify({ title: 'Brotherhood', body: 'A member added you to the group. Business is open.', icon: '⚫' });
  sfx.reward(); addHeat(5);
}
export const promote = () => { const c = S().confraternity; if (!c.member || c.rank >= STORY.maxRank) return false; S().set({ confraternity: { ...c, rank: c.rank + 1, reputation: c.reputation + 10 } }); return true; };

// ------------------------------------------------------------------------------------------------ the story clock
const blocked = () => !!S().dialogue || !!S().exam || isJailed() || !!useAgberoStore.getState().active || !!useLoanStore.getState().visit || useUiStore.getState().mode !== 'home';
/** Called every simulation step. Starts scenes when their conditions are met. `nowMs` and `nowMin` are injectable for tests. */
let lastRoll = 0;
export function stepStory(nowMs = Date.now(), nowMin = nowGame(), rnd: () => number = Math.random) {
  syncCampusClock(nowMs);
  const s = S(); if (!onCampus() || blocked()) return;
  const mins = campusSecondsNow(nowMs) / 60;
  if (s.recruit === 'none') {
    const d = STORY.discovery, secs = mins * 60;
    const force = !!s.flags.trigger_now || mins >= d.pityMinutes; // clues or asking around, or the pity timer: it is always findable
    const due = secs >= d.graceSeconds && nowMs - lastRoll >= d.checkEverySeconds * 1000;
    if (!force && !due) return;
    if (!force) { lastRoll = nowMs; if (rnd() >= discoveryChance(s.flags, useEconomyStore.getState().money)) return; }
    if (useEconomyStore.getState().money < d.brokeBelow) s.setFlags({ broke: true });
    s.setFlags({ trigger_now: false }); openNode('meet'); return;
  }
  if (s.recruit === 'met' || s.recruit === 'blending') {
    const scene = !s.flags.hang1 ? 'hang1' : !s.flags.hang2 ? 'hang2' : !s.flags.hang3 ? 'hang3' : null;
    if (scene && s.tasksSinceScene >= STORY.tasksBetweenScenes) { s.set({ tasksSinceScene: 0, recruit: 'blending' }); openNode(scene); }
    else if (!scene && s.tasksSinceScene >= 1) { s.set({ tasksSinceScene: 0, recruit: 'offered', lastPressureAt: 0 }); openNode('offer'); }
    return;
  }
  if (s.recruit === 'offered' && s.lastPressureAt && nowMs - s.lastPressureAt >= STORY.pressureEveryMinutes * 60_000) {
    const k = Number(s.flags.pressureN ?? 0); s.setFlags({ pressureN: k + 1 });
    if (s.initiationAt === null && s.missed > 0 && s.missed < STORY.maxMissed && !s.flags.missed_shown) { s.setFlags({ missed_shown: true }); openNode('missed'); return; }
    openNode(harassNode(s.refusedCount) ?? (k % 2 === 0 ? 'pressure1' : 'pressure2')); return;
  }
  if (s.recruit === 'invited' && s.initiationAt !== null) {
    if (initiationOpen(nowMin) && !s.flags.follow_shown) { s.setFlags({ follow_shown: true }); openNode('follow'); }
  }
}
/** Called from the game loop even off campus: the initiation window, notifications and missed meetings. */
export function stepStoryClock(nowMin = nowGame()) {
  const s = S(); if (s.recruit !== 'invited' || s.initiationAt === null) return;
  if (nowMin >= s.initiationAt && !s.flags.notified_time) { s.setFlags({ notified_time: true }); notify({ title: 'Senior Dayo', body: `Time reach. Come to ${INITIATION_PIN} now.`, icon: '🌙' }); }
  if (nowMin > s.initiationAt + STORY.initiationWindowMinutes) {
    const missed = s.missed + 1;
    s.setFlags({ follow_shown: false, notified_time: false, missed_shown: false });
    if (missed >= STORY.maxMissed) { s.set({ missed, recruit: 'ended', initiationAt: null }); s.setFlags({ story_missed: true }); toast('You missed the initiation again. Dayo has moved on.', 'info'); }
    else { s.set({ missed, recruit: 'offered', initiationAt: null, lastPressureAt: Date.now() - STORY.pressureEveryMinutes * 60_000 }); toast('You missed the initiation. Dayo is not happy.', 'bad'); }
  }
}
/** When the player walks into the campus during the window with the "follow" scene already used, allow it again. */
export function onEnterCampus() { if (S().recruit === 'invited') S().setFlags({ follow_shown: false }); }
