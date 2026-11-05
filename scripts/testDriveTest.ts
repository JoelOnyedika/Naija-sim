import { VEHICLES } from '../src/data/vehicles';
import { freshDrive, gradeDrive, kmh, makeCourse, specFor, stepDrive, trackTop, TRACK, type DriveInput, type Obstacle } from '../src/game/testDrive';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const spec = specFor(VEHICLES[0]);
const run = (inp: (s: ReturnType<typeof freshDrive>) => DriveInput, course: Obstacle[], max = 120) => { const s = freshDrive(); for (let i = 0; i < max * 60 && s.phase === 'run'; i++) stepDrive(s, inp(s), 1 / 60, spec, course); return s; };

console.log('Cars and the track');
ok(VEHICLES.every((v) => specFor(v).topKmh > 100 && trackTop(specFor(v)) >= 34 && trackTop(specFor(v)) <= 80), 'every car has sensible test-track speed');
ok(kmh(trackTop(specFor(VEHICLES[5])), specFor(VEHICLES[5])) === 410 && trackTop(specFor(VEHICLES[5])) > trackTop(specFor(VEHICLES[1])), 'the Agera shows 410 km/h and is faster than the Challenger');
const c1 = makeCourse(5), c2 = makeCourse(5), c3 = makeCourse(6);
ok(JSON.stringify(c1) === JSON.stringify(c2) && JSON.stringify(c1) !== JSON.stringify(c3), 'the same seed gives the same road');
ok(c1.length >= 8 && c1.every((o) => o.z > 100 && o.z < TRACK.finish), 'the road has obstacles, none near the start or in the stop zone');
const lanesBlockedAt = (course: Obstacle[]) => course.every((o) => course.filter((p) => Math.abs(p.z - o.z) < 8).map((p) => Math.round(p.x / 3)).filter((v, i, a) => a.indexOf(v) === i).length < 3);
ok([1, 2, 3, 4, 5, 6, 7, 8].every((s) => lanesBlockedAt(makeCourse(s))), 'a lane is always free');

console.log('Driving');
const empty: Obstacle[] = [];
let s = freshDrive(); for (let i = 0; i < 60 * 3; i++) stepDrive(s, { steer: 0, gas: 1, brake: 0 }, 1 / 60, spec, empty);
ok(s.v > 10 && s.z > 20, 'gas makes the car go');
const v0 = s.v; for (let i = 0; i < 60; i++) stepDrive(s, { steer: 0, gas: 0, brake: 1 }, 1 / 60, spec, empty);
ok(s.v < v0 * 0.5, 'brake slows it hard');
for (let i = 0; i < 60 * 30; i++) { s.z = 0; stepDrive(s, { steer: 0, gas: 1, brake: 0 }, 1 / 60, spec, empty); }
ok(s.v <= trackTop(spec) + 1e-6 && s.v > trackTop(spec) * 0.9, 'it reaches but never passes top speed');
s = freshDrive(); for (let i = 0; i < 60; i++) stepDrive(s, { steer: 1, gas: 1, brake: 0 }, 1 / 60, spec, empty);
ok(s.x > 0 && s.x <= TRACK.roadHalf, 'steering moves you across the road and the edge holds you in');
const slow = freshDrive(); slow.v = 30; const grass = freshDrive(); grass.v = 30; grass.x = TRACK.roadHalf;
stepDrive(slow, { steer: 0, gas: 0, brake: 0 }, 0.5, spec, empty); stepDrive(grass, { steer: 0, gas: 0, brake: 0 }, 0.5, spec, empty);
ok(grass.v < slow.v, 'the roadside slows you down');

console.log('Obstacles');
const wall: Obstacle[] = [{ z: 60, x: 0, w: 2.6, len: 7, kind: 'danfo', soft: false }];
let h = freshDrive(); h.v = 40; const vb = h.v; for (let i = 0; i < 60 * 3 && h.hits === 0; i++) stepDrive(h, { steer: 0, gas: 0, brake: 0 }, 1 / 60, spec, wall);
ok(h.hits === 1 && h.v < vb * 0.5, 'hitting a danfo is a crash that kills your speed');
const hole: Obstacle[] = [{ z: 60, x: 0, w: 1.8, len: 1.6, kind: 'pothole', soft: true }];
h = freshDrive(); h.v = 40; for (let i = 0; i < 60 * 3; i++) stepDrive(h, { steer: 0, gas: 0, brake: 0 }, 1 / 60, spec, hole);
ok(h.hits === 0 && h.jolts === 1, 'a pothole only jolts you and does not count as a crash');
h = freshDrive(); h.v = 40; for (let i = 0; i < 60 * 3; i++) stepDrive(h, { steer: 1, gas: 0, brake: 0 }, 1 / 60, spec, wall);
ok(h.hits === 0, 'steering around it is safe');
h = freshDrive(); h.v = 40; for (let i = 0; i < 60 * 8; i++) stepDrive(h, { steer: 0, gas: 0, brake: 0 }, 1 / 60, spec, [...wall, { ...wall[0], z: 61 }]);
ok(h.hits === 1, 'one crash is counted once, not every frame');

console.log('The run');
const clean = run((st) => ({ steer: 0, gas: st.z < TRACK.finish - 100 || st.v < 12 ? 1 : 0, brake: st.z > TRACK.finish - 15 ? 1 : 0 }), empty);
ok(clean.phase === 'done', 'braking to a stop after the line finishes the test');
const g = gradeDrive(clean, spec);
ok(clean.stopped && clean.hits === 0 && ['S', 'A'].includes(g.grade) && g.stoppedInZone && g.brakeMetres >= 0, `a clean stop in the zone grades ${g.grade} (${g.topKmh} km/h, ${g.seconds}s)`);
const wild = run(() => ({ steer: 0, gas: 1, brake: 0 }), empty);
ok(wild.crashedBarrier && gradeDrive(wild, spec).grade !== 'S' && !wild.stopped, 'flat out into the barrier is a crash and not a pass');
const bumps = run((st) => ({ steer: 0, gas: 1, brake: st.z > TRACK.finish - 150 ? 1 : 0 }), makeCourse(3));
ok(gradeDrive(bumps, spec).hits >= 1 && gradeDrive(bumps, spec).grade !== 'S', 'driving straight through the traffic costs you the top grade');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll test-drive checks passed');
