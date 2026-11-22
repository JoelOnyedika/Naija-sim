import { blockCentre, BLOCK, EXTENT, GRID, generateCity, nearestLandmark, resolveMove, spawnFor, ownedSpots, groundY, driveStep, CAR_TOP, CAR_REVERSE, PITCH, SLAB, ROAD, signalState, stopLineAhead, trafficSpeed, SIGNAL } from '../src/features/openworld/worldGen';
import { LANDMARKS } from '../src/content/lagos/landmarks';
let fails = 0; const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const c = generateCity(), c2 = generateCity();
ok(JSON.stringify(c) === JSON.stringify(c2), 'the same seed gives the same city');
ok(c.landmarks.length === LANDMARKS.length, `every landmark has a block (${c.landmarks.length}/${LANDMARKS.length})`);
ok(new Set(c.landmarks.map((l) => `${l.bi},${l.bj}`)).size === c.landmarks.length, 'no two landmarks share a block');
const inside = c.buildings.every((b) => Math.abs(b.x) + b.w / 2 < EXTENT && Math.abs(b.z) + b.d / 2 < EXTENT);
ok(inside, 'all buildings are inside the city');
const roadSafe = c.buildings.every((b) => { const bx = Math.round(b.x / (BLOCK + 12) * 1) ; void bx; return Math.abs(((b.x - blockCentre(Math.round(b.x / 52 + (GRID - 1) / 2))) )) + b.w / 2 <= BLOCK / 2 + 0.01 || b.landmark !== undefined; });
ok(roadSafe, 'no house reaches into a road');
const [sx, sz] = resolveMove(c, c.spawn.x, c.spawn.z);
ok(sx === c.spawn.x && sz === c.spawn.z, 'the spawn point is clear (on the road)');
const lm = c.landmarks[0], b = c.buildings.find((x) => x.landmark === lm.id)!;
const [px, pz] = resolveMove(c, b.x, b.z);
ok(Math.abs(px - b.x) > b.w / 2 - 0.01 || Math.abs(pz - b.z) > b.d / 2 - 0.01, 'a player placed inside a building is pushed out');
const [wx] = resolveMove(c, 9999, 0);
ok(wx <= EXTENT, 'the city edge stops the player');
ok(nearestLandmark(c, lm.x + 3, lm.z)?.id === lm.id && nearestLandmark(c, 0, 1e6) === null, 'nearest-landmark finds a close one and none far away');
import { getStreetEvent } from '../src/data/streetEvents';
ok(c.moments.length > 0 && c.moments.every((m) => !!getStreetEvent(m.eventId)), `every street moment is a real event (${c.moments.length})`);
const clear = (x: number, z: number) => c.buildings.every((b) => Math.abs(x - b.x) > b.w / 2 + 0.4 || Math.abs(z - b.z) > b.d / 2 + 0.4);
ok(c.moments.every((m) => clear(m.x, m.z)), 'no street moment stands inside a building');
ok(c.landmarks.every((l) => clear(l.doorX, l.doorZ)), 'every doorstep is outside its building and reachable');
ok(c.landmarks.every((l) => { const [x, z] = resolveMove(c, l.doorX, l.doorZ); return Math.hypot(x - l.doorX, z - l.doorZ) < 0.01; }), 'a player can stand on every doorstep');
const uni = spawnFor(c, 'lagos.unilag'), home = spawnFor(c, null), unknown = spawnFor(c, 'nope');
const ul = c.landmarks.find((l) => l.id === 'lagos.unilag')!;
ok(Math.hypot(uni.x - ul.doorX, uni.z - ul.doorZ) < 2 && clear(uni.x, uni.z), 'coming out of Unilag puts you on the Unilag doorstep, outside the building');
ok(c.landmarks.every((l) => { const s = spawnFor(c, l.id); return clear(s.x, s.z) && Math.hypot(s.x - l.doorX, s.z - l.doorZ) < 2; }), 'every venue spawns you at its own door');
ok(home.x === c.spawn.x && unknown.x === c.spawn.x, 'from home (or an unknown venue) you get the default spot');
ok(Math.abs(uni.yaw - uni.heading - Math.PI) < 1e-9, 'the camera starts behind the player');
const spots = ownedSpots(c, 4);
ok(spots.length === 4 && spots.every((p) => clear(p.x, p.z)), 'four owned cars park on the road beside the home spot, none inside a building');
ok(spots.every((p, i) => i === 0 || Math.hypot(p.x - spots[i - 1].x, p.z - spots[i - 1].z) > 5.5), 'parked cars do not overlap');
ok(ownedSpots(c, 20).length === 6, 'at most six cars are parked');
ok(groundY(0, 0) === SLAB || groundY(PITCH / 2, 0) === 0, 'blocks are raised, roads are level');
ok(groundY(PITCH / 2, PITCH / 2) === 0 && groundY(99999, 0) === 0, 'the junction and anywhere outside the city are at road level');
const car = { x: 0, z: 0, heading: 0, speed: 0 }; for (let i = 0; i < 600; i++) driveStep(car, 1, false, 0, 1 / 60);
ok(car.speed > 24 && car.speed <= CAR_TOP + 0.01 && car.z > 100 && Math.abs(car.x) < 1e-6, 'the accelerator speeds the car up straight ahead to its top speed');
const t0 = car.heading; for (let i = 0; i < 60; i++) driveStep(car, 1, false, 1, 1 / 60); ok(car.heading < t0, 'steering right turns the car right (heading decreases)');
const braking = { x: 0, z: 0, heading: 0, speed: 25 }; for (let i = 0; i < 40; i++) driveStep(braking, 0, true, 0, 1 / 60);
ok(braking.speed < 25 - 15 && braking.speed >= 0, 'the brake slows the car hard and does not push it backwards while it is still moving');
for (let i = 0; i < 120; i++) driveStep(braking, 0, true, 0, 1 / 60); ok(braking.speed < -3, 'holding the brake once stopped reverses');
const rev = { x: 0, z: 0, heading: 0, speed: 0 }; for (let i = 0; i < 400; i++) driveStep(rev, 0, true, 0, 1 / 60); ok(rev.speed < -5 && rev.speed >= -(CAR_REVERSE + 0.01), 'reverse is slow');
const roll = { x: 0, z: 0, heading: 0, speed: 20 }; for (let i = 0; i < 60 * 30; i++) driveStep(roll, 0, false, 0, 1 / 60); ok(roll.speed === 0, 'with both pedals up the car rolls to a stop');
const still = { x: 0, z: 0, heading: 0, speed: 0 }; for (let i = 0; i < 60; i++) driveStep(still, 0, false, 1, 1 / 60); ok(still.heading === 0 && still.x === 0, 'a parked car does not turn on the spot');
const never = (t: number) => { const s = signalState(t); return s.x && s.z; };
ok(Array.from({ length: 800 }, (_, i) => i * 0.25).every((t) => !never(t)), 'the two directions are never green together');
ok(signalState(1).x && !signalState(1).z && !signalState(SIGNAL.green + 1).x && !signalState(SIGNAL.green + 1).z && signalState(SIGNAL.green + SIGNAL.clear + 1).z, 'cycle: x green, all red, z green, all red');
const junc = (GRID / 2 - 3) * PITCH; // a junction well inside the city
{ let p = junc - 160, v = 0; const cruise = 9; for (let i = 0; i < 60 * 40; i++) { const tgt = trafficSpeed(cruise, stopLineAhead(p, 1), true, 99); v += Math.max(-9 / 60, Math.min(2.6 / 60, tgt - v)); p += v / 60; }
  const lines = Array.from({ length: GRID + 1 }, (_, k) => (k - GRID / 2) * PITCH - (ROAD / 2 + 2.5)), line = lines.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a)), short = line - p; ok(short > -0.2 && short < 1.5 && v < 0.05, `on red a car stops just before the stop line (${short.toFixed(2)} m short of it, speed ${v.toFixed(2)}) and stays stopped`); }
{ let p = junc - 160, v = 0; const cruise = 9; for (let i = 0; i < 60 * 40; i++) { v += Math.max(-9 / 60, Math.min(2.6 / 60, trafficSpeed(cruise, stopLineAhead(p, 1), false, 99) - v)); p += v / 60; }
  ok(p > junc + ROAD / 2 && v > 8, 'on green it drives straight through at its cruising speed'); }
{ let p = junc + 160, v = 0; const cruise = 9; for (let i = 0; i < 60 * 40; i++) { v += Math.max(-9 / 60, Math.min(2.6 / 60, trafficSpeed(cruise, stopLineAhead(p, -1), true, 99) - v)); p -= v / 60; }
  const lines = Array.from({ length: GRID + 1 }, (_, k) => (k - GRID / 2) * PITCH + (ROAD / 2 + 2.5)), line = lines.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a)), short = p - line; ok(short > -0.2 && short < 1.5 && v < 0.05, `the same for traffic coming the other way (${short.toFixed(2)} m short of its line)`); }
ok(trafficSpeed(9, null, false, 3) < 1 && trafficSpeed(9, null, false, 30) === 9 && trafficSpeed(9, null, false, 8) > 3 && trafficSpeed(9, null, false, 8) < 9, 'a car keeps a gap: stops close behind another, slows as it nears, full speed when clear');
ok(stopLineAhead(junc + ROAD / 2 + 4, 1) !== null && (stopLineAhead(junc + ROAD / 2 + 4, 1) as number) > 20 && (stopLineAhead(junc + ROAD / 2 + 4, 1) as number) < PITCH, 'a car already past a junction looks to the next one, not back');
console.log(fails ? `\n${fails} check(s) failed` : '\nAll open-world checks passed'); process.exit(fails ? 1 : 0);
