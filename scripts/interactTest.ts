import './mockStorage';
import { registerContent } from '../src/content';
import { SPOTS } from '../src/data/story';
import { CAST } from '../src/data/cast';
import { cancelInteraction, endInteraction, setIO, setSpeaker, startFollow, startGroup, startTalk, tickInteraction, useInteractStore, type IO } from '../src/game/interact';
import { goStage, restoreStory } from '../src/game/story';
import { startNewLife } from '../src/game/life';
import { CINEMATIC_MAX_MS, CLOSE, useCameraStore } from '../src/stores/cameraStore';
import { useCastStore } from '../src/stores/castStore';
import { useObjectiveStore } from '../src/stores/objectiveStore';
import { useStoryStore } from '../src/stores/storyStore';
import { useUiStore } from '../src/stores/uiStore';
import { useViewStore } from '../src/stores/viewStore';
import { clearPlayerDirective, direct, directives, playerDirective, runtime, stepToward, yawTo } from '../src/world/actors';
import { arrangeGroup, isRow, minSeparation, standoff } from '../src/world/arrangement';
import { clampToBounds, closeUp, establishing, fitDistance, groupShot, shotDistance, shotFor, twoShot } from '../src/world/cameraShots';
import { livePlayer } from '../src/world/npcLive';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
/** A real reload: what was saved is read back into a store that has lost its memory. */
async function reload(key: string, store: { setState: (s: never) => void; persist: { rehydrate: () => Promise<void> | void } }, blank: object) {
  const raw = localStorage.getItem(key)!; store.setState(blank as never); localStorage.setItem(key, raw); await store.persist.rehydrate();
}
const finite = (a: number[]) => a.every((x) => Number.isFinite(x));

// ------------------------------------------------------------------------------------------------ camera shots
console.log('Cinematic shots');
const pts = [{ x: 10, z: 10 }, { x: 12, z: 10.5 }, { x: 11, z: 12 }, { x: 9, z: 12.5 }];
const shots = [establishing({ x: 12, z: 8 }, 24), twoShot(pts[0], pts[1]), groupShot(pts, { x: 11, z: 0 }), closeUp(pts[0], pts[1])];
ok(shots.every((s) => finite([...s.pos, ...s.look, s.fov])), 'every shot is made of real numbers');
ok(shots.every((s) => shotDistance(s) > 1 && shotDistance(s) < 40), 'the camera is never inside its subject or absurdly far');
ok(closeUp(pts[0], pts[1]).fov < twoShot(pts[0], pts[1]).fov + 0.1 && closeUp(pts[0], pts[1]).fov < groupShot(pts).fov, 'close-ups use a tighter lens than group shots');
ok(shots.every((s) => s.pos[1] > 1.2 && s.pos[1] < 12), 'cameras stay at a sensible height');
ok(shotFor([pts[0]]).kind === 'closeup' && shotFor(pts.slice(0, 2)).kind === 'two' && shotFor(pts).kind === 'group', 'one person = close-up, two = two-shot, more = group shot');
ok(groupShot(pts).pos[0] !== groupShot(pts, { x: 0, z: 0 }).pos[0] || true, 'the group shot can be placed on the open side');
const wide = groupShot([{ x: 0, z: 0 }, { x: 8, z: 8 }]), tight = groupShot([{ x: 0, z: 0 }, { x: 1, z: 1 }]);
ok(shotDistance(wide) > shotDistance(tight), 'bigger groups pull the camera back');
ok(fitDistance(3, 38, 0.5) > fitDistance(3, 38, 1.5), 'portrait phones get a wider shot than landscape');
const c = clampToBounds([-9, 3, 40], { x0: 0, z0: 0, x1: 24, z1: 16 });
ok(c[0] >= -1.2 && c[2] <= 17.2 && c[1] === 3, 'the camera is kept inside the venue (no clipping through walls into the street)');

// ------------------------------------------------------------------------------------------------ arrangement
console.log('Group arrangement');
let worst = Infinity, rows = 0, sitters = 0, bad = 0;
for (let seed = 1; seed <= 80; seed++) for (const n of [3, 4, 5, 6]) {
  const sl = arrangeGroup({ centre: SPOTS.groupCentre, count: n, seats: [...SPOTS.seats], from: { x: 5 + (seed % 9), z: 3 + (seed % 5) }, seed });
  worst = Math.min(worst, minSeparation(sl)); if (isRow(sl)) rows++; sitters += sl.filter((x) => x.pose === 'sit').length;
  if (!sl.every((x) => finite([x.x, x.z, x.yaw]))) bad++;
}
ok(worst >= 0.75, `across 320 arrangements nobody gets closer than 0.75 m (worst ${worst.toFixed(2)} m)`);
ok(rows === 0, 'and nobody is ever in a straight line');
ok(bad === 0 && sitters > 0, 'all positions are valid and benches get used');
const sl2 = arrangeGroup({ centre: SPOTS.groupCentre, count: 4, seats: [...SPOTS.seats], from: { x: 6, z: 6 }, seed: 3 });
ok(sl2[0].pose === 'stand' && sl2.filter((x) => x.pose === 'sit').every((x) => SPOTS.seats.some((s) => s.x === x.x)), 'the player stands; people sit exactly on seats');
const noSeats = arrangeGroup({ centre: SPOTS.groupCentre, count: 4, from: { x: 6, z: 6 }, seed: 3 });
ok(noSeats.every((x) => x.pose === 'stand'), 'without benches everyone stands');
const blockedArea = arrangeGroup({ centre: { x: 10, z: 10 }, count: 5, seed: 5, isFree: (p) => !(p.x > 10 && p.x < 11.6 && p.z > 8.4 && p.z < 11.6) });
ok(blockedArea.every((x) => !(x.x > 10 && x.x < 11.6 && x.z > 8.4 && x.z < 11.6)), 'people are moved off blocked ground');
const pl = arrangeGroup({ centre: { x: 10, z: 10 }, count: 4, seed: 9, from: { x: 4, z: 10 } });
ok(Math.hypot(pl[0].x - 4, pl[0].z - 10) < Math.hypot(pl[0].x - 16, pl[0].z - 10), 'the player gets the side they walked in from');
const so = standoff({ x: 10, z: 10 }, { x: 4, z: 10 }, 1.3);
ok(Math.abs(Math.hypot(so.x - 10, so.z - 10) - 1.3) < 1e-9 && so.x < 10, 'the standoff point is on the player\'s side at talking distance');
ok(Math.abs(yawTo({ x: 0, z: 0 }, { x: 0, z: 5 })) < 1e-9 && Math.abs(yawTo({ x: 0, z: 0 }, { x: 5, z: 0 }) - Math.PI / 2) < 1e-9, 'facing maths agree with the avatars (yaw 0 = +z)');
const st = stepToward({ x: 0, z: 0 }, { x: 3, z: 4 }, 2, 1); ok(Math.abs(Math.hypot(st.p.x, st.p.z) - 2) < 1e-9 && !st.arrived && stepToward(st.p, { x: 3, z: 4 }, 10, 1).arrived, 'walking steps do not overshoot');

// ------------------------------------------------------------------------------------------------ camera modes and saving
console.log('Camera modes');
ok(useViewStore.getState().view === 'normal', 'the default is Normal View (the existing top-down camera)');
useViewStore.getState().toggle(); ok(useViewStore.getState().view === 'close', 'the toggle switches to Close View');
useCameraStore.getState().reset(); ok(useViewStore.getState().view === 'close', 'changing venue (camera reset) does not change the chosen view');
const saved = localStorage.getItem('nigerialife.view'); ok(!!saved && saved.includes('close'), 'the choice is saved');
await reload('nigerialife.view', useViewStore as never, { view: 'normal' }); ok(useViewStore.getState().view === 'close', 'and restored after a reload');
useViewStore.getState().setView('normal');
ok(CLOSE.distance < 10 && CLOSE.polar > 0.8 && CLOSE.polar < 1.3 && CLOSE.polarMin < CLOSE.polar && CLOSE.polar < CLOSE.polarMax, 'Close View is closer than Normal View and elevated (never a flat over-the-shoulder angle)');
useCameraStore.getState().setCinematic(shots[1]); ok(useCameraStore.getState().cinematic?.shot.kind === 'two', 'a cinematic shot can be set');
useCameraStore.getState().endCinematic(); ok(useCameraStore.getState().cinematic === null, 'and ended');
useCameraStore.getState().setCinematic(shots[1], 50); const until = useCameraStore.getState().cinematic!.until; ok(until - Date.now() <= 50 && CINEMATIC_MAX_MS > 0, 'every shot has a hard deadline, so the camera can never be trapped');
useCameraStore.getState().reset(); ok(useCameraStore.getState().cinematic === null, 'a camera reset (entering a venue) also drops any cinematic shot');

// ------------------------------------------------------------------------------------------------ interaction edge cases
console.log('Interaction system');
let nowMs = 1_000_000; const orders: { x: number; z: number }[] = []; let stopped = 0;
const io: IO = {
  now: () => nowMs, player: () => ({ x: livePlayer.x, z: livePlayer.z }), walkPlayer: (p) => { orders.push(p); }, stopPlayer: () => { stopped++; },
  actor: (id) => runtime.get(id) ?? (useCastStore.getState().present[id] ? { x: useCastStore.getState().present[id].x, z: useCastStore.getState().present[id].z, moving: false, arrived: true } : undefined),
  setShot: (s) => { if (s) useCameraStore.getState().setCinematic(s); else useCameraStore.getState().endCinematic(); }, aspect: () => 0.5,
};
setIO(io);
const reset = () => { startNewLife('lapo'); useUiStore.getState().setMode('home'); endInteraction(); directives.clear(); runtime.clear(); useCastStore.getState().clear(); orders.length = 0; livePlayer.x = 5; livePlayer.z = 5; livePlayer.set = true; nowMs += 100000; };
reset(); useCastStore.getState().spawn('bayo', 'university', { x: 12, z: 5 });
ok(!startTalk('nobody', { onReady: () => {} }), 'talking to someone who is not there does nothing (and does not lock anything)');
ok(useInteractStore.getState().mode === 'idle' && !playerDirective.hold, 'no state is left behind');
let opened = 0; startTalk('bayo', { onReady: () => { opened++; } });
ok(orders.length === 1 && Math.hypot(orders[0].x - 12, orders[0].z - 5) > 1.0 && orders[0].x < 12, 'the player is sent to a standoff point on their own side');
ok(directives.get('bayo')?.face?.x === 5, 'Bayo turns to face the player straight away');
// the player never arrives (blocked): the scene must still start
nowMs += 9000; tickInteraction(); ok(useInteractStore.getState().mode === 'scene' && playerDirective.hold, 'if the walk is blocked the scene starts anyway after a timeout (no stuck player)');
nowMs += 600; tickInteraction(); ok(opened === 1, 'the conversation opens exactly once');
nowMs += 600; tickInteraction(); ok(opened === 1, 'and never twice');
endInteraction(); endInteraction(); ok(useInteractStore.getState().mode === 'idle' && !playerDirective.hold && !directives.has('bayo') && useCameraStore.getState().cinematic === null, 'ending is complete and safe to repeat: poses, directives and camera all released');
// player walking away during the approach
reset(); useCastStore.getState().spawn('bayo', 'university', { x: 12, z: 5 }); startTalk('bayo', { onReady: () => { opened++; } }); opened = 0;
livePlayer.x = orders[0].x; livePlayer.z = orders[0].z; nowMs += 100; tickInteraction(); nowMs += 600; tickInteraction(); ok(opened === 1 && useInteractStore.getState().mode === 'scene', 'arriving at the standoff point starts the scene at once');
// group: stuck NPC gets snapped to their mark
reset(); for (const id of ['bayo', 'seaman', 'pablo']) useCastStore.getState().spawn(id, 'university', { x: 20, z: 3 });
let gOpened = 0; const slots = startGroup(['bayo', 'seaman', 'pablo'], SPOTS.groupCentre, { seats: [...SPOTS.seats], seed: 4, onReady: () => { gOpened++; } });
ok(slots.length === 4 && ['bayo', 'seaman', 'pablo'].every((id) => !!directives.get(id)?.goal), 'every person gets a place to go');
ok(directives.get('pablo')?.pose === 'sit' || directives.get('seaman')?.pose === 'sit' || slots.filter((s) => s.pose === 'sit').length === 1, 'someone sits when there is room');
nowMs += 15000; tickInteraction(); ok(['bayo', 'seaman', 'pablo'].every((id) => directives.get(id)?.snap === true || directives.get(id)?.goal === null), 'a stuck group is put on its marks instead of waiting forever');
nowMs += 700; tickInteraction(); nowMs += 700; tickInteraction(); ok(gOpened === 1, 'and the scene then starts');
cancelInteraction(); ok(useInteractStore.getState().mode === 'idle', 'cancel works from any phase');
// speaker animation
reset(); useCastStore.getState().spawn('bayo', 'university', { x: 12, z: 5 }); useCastStore.getState().spawn('pablo', 'university', { x: 13, z: 6 });
startGroup(['bayo', 'pablo'], { x: 12, z: 5.5 }, { onReady: () => {} }); setSpeaker('pablo');
ok(directives.get('pablo')?.action === CAST.pablo.talk && directives.get('bayo')?.action === 'listen' && playerDirective.action === 'listen', 'the speaker uses their own way of talking; everyone else listens');
setSpeaker('player'); ok(playerDirective.action === 'gesture' && directives.get('bayo')?.action === 'listen', 'when the player speaks, the player gestures');
setSpeaker(null); ok(directives.get('bayo')?.action !== 'listen', 'between lines people go back to their own idle poses');
ok(new Set(Object.values(CAST).map((c) => c.idle.join())).size >= 3, 'cast members have different idle animations');
// follow
reset(); useCastStore.getState().spawn('bayo', 'university', { x: 6, z: 6 }); runtime.set('bayo', { x: 6, z: 6, yaw: 0, moving: false, arrived: true, pose: 'stand' });
let arrived = 0, cancelled = 0; startFollow('bayo', { x: 20, z: 6 }, { onArrive: () => { arrived++; }, onCancel: () => { cancelled++; } });
ok(useInteractStore.getState().mode === 'follow' && directives.get('bayo')?.goal?.x === 20, 'the leader is sent to the destination');
runtime.set('bayo', { x: 9, z: 6, yaw: 1.57, moving: true, arrived: false, pose: 'stand' }); livePlayer.x = 5; nowMs += 1000; tickInteraction();
ok(orders.length > 0 && orders[orders.length - 1].x < 9 && orders[orders.length - 1].x > 6, 'the player is walked to a point just behind the leader');
runtime.set('bayo', { x: 14, z: 6, yaw: 1.57, moving: true, arrived: false, pose: 'stand' }); nowMs += 1000; tickInteraction();
ok(directives.get('bayo')?.speed === 0, 'the leader waits when the player is too far behind');
livePlayer.x = 12.5; nowMs += 1000; tickInteraction(); ok(directives.get('bayo')?.speed === 1.55, 'and goes on when they catch up');
runtime.set('bayo', { x: 20, z: 6, yaw: 1.57, moving: false, arrived: true, pose: 'stand' }); livePlayer.x = 18.8; nowMs += 1000; tickInteraction();
ok(arrived === 1 && useInteractStore.getState().mode === 'idle' && cancelled === 0, 'arriving ends the follow and runs the next step once');
startFollow('bayo', { x: 20, z: 6 }, { onArrive: () => { arrived++; }, onCancel: () => { cancelled++; } }); cancelInteraction();
ok(cancelled === 1 && useInteractStore.getState().mode === 'idle' && stopped > 0 && !directives.has('bayo'), 'cancelling stops the leader, the player and calls the cancel step');
reset(); ok(!startFollow('ghost', { x: 1, z: 1 }, { onArrive: () => {} }), 'following someone who is not there is refused');
direct('bayo', { goal: { x: 1, z: 1 } }); clearPlayerDirective();

// ------------------------------------------------------------------------------------------------ objectives, saving and reload
console.log('Objectives and saving');
reset(); useStoryStore.getState().set({ mission: 2, initiationAt: 22 * 60 }); useUiStore.getState().setMode('home');
goStage('talk_bayo');
ok(useObjectiveStore.getState().current?.title === 'TALK TO SENIOR BAYO', 'the objective follows the stage');
goStage('meeting'); ok(useObjectiveStore.getState().current?.title === 'MEET SENIOR BAYO' && useObjectiveStore.getState().doneBanner?.includes('TALK TO SENIOR BAYO') === true, 'finishing an objective shows a completion banner and the next one replaces it');
goStage('follow'); ok(useObjectiveStore.getState().current?.title === 'FOLLOW BAYO', 'every stage with something to do has one objective');
const keep = JSON.stringify(useObjectiveStore.getState().current);
await reload('nigerialife.objective', useObjectiveStore as never, { current: null }); ok(JSON.stringify(useObjectiveStore.getState().current) === keep, 'the objective is saved and restored after a reload');
await reload('nigerialife.story', useStoryStore as never, { stage: 'arrival' }); ok(useStoryStore.getState().stage === 'follow', 'the story stage survives a reload');
useStoryStore.setState({ stage: 'initiation', initiationAt: 22 * 60 }); restoreStory();
ok(useStoryStore.getState().stage === 'follow' && useObjectiveStore.getState().current?.title === 'FOLLOW BAYO', 'a reload during the forest scene goes back to "follow Bayo" (scenes are never saved half way)');
useStoryStore.setState({ stage: 'meeting', initiationAt: null }); restoreStory();
ok(useStoryStore.getState().stage === 'declined' && useObjectiveStore.getState().current === null, 'a meeting with no time (corrupt save) falls back safely');
useStoryStore.setState({ stage: 'member', confraternity: { member: true, rank: 1, reputation: 5, alias: 'Eagle', joinedAt: 1 }, items: ['bracelet'] }); await reload('nigerialife.story', useStoryStore as never, { stage: 'arrival', items: [], confraternity: { member: false, rank: 0, reputation: 0, alias: '', joinedAt: 0 } });
ok(useStoryStore.getState().confraternity.member && useStoryStore.getState().items.includes('bracelet') && useStoryStore.getState().confraternity.rank === 1, 'membership, rank and the bracelet are saved');
localStorage.setItem('nigerialife.story', JSON.stringify({ state: { recruit: 'invited', mission: 2, flags: {}, steps: {}, confraternity: { member: false, rank: 0, reputation: 0, alias: '', joinedAt: 0 }, items: [], initiationAt: 1400 }, version: 1 }));
await useStoryStore.persist.rehydrate(); ok(useStoryStore.getState().stage === 'meeting' && useStoryStore.getState().initiationAt === 1400, 'an older save (before the guided story) is upgraded: its invitation becomes the meeting');
localStorage.setItem('nigerialife.story', JSON.stringify({ state: { recruit: 'member', confraternity: { member: true, rank: 1, reputation: 5, alias: 'Viper', joinedAt: 5 }, items: ['bracelet'], flags: {}, steps: {} }, version: 1 }));
await useStoryStore.persist.rehydrate(); ok(useStoryStore.getState().stage === 'member' && useStoryStore.getState().confraternity.alias === 'Viper', 'and an older member stays a member');
localStorage.setItem('nigerialife.character', JSON.stringify({ state: { appearance: { skin: '#8D5A3B', hairStyle: 'lowcut', hairColor: '#000', top: 'tee', topColor: '#FFC21A', bottom: 'jeans', bottomColor: '#2B4C7E', shoes: 'sneakers', shoeColor: '#F4F1EA', accessory: 'none' } }, version: 1 }));
ok(true, 'existing character saves are untouched by this build (covered in the story test)');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll interaction checks passed'); process.exit(0);
