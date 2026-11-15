import { armPose, bodyPose, cadence, isRun, legPose, stride } from '../src/three/avatar/gait';
import { REACTIONS, impact, impactSide, reactionPose, isReaction } from '../src/three/avatar/reaction';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const sample = <T,>(f: (u: number) => T, n = 240) => Array.from({ length: n }, (_, i) => f(i / n));
const finite = (xs: number[]) => xs.every((x) => Number.isFinite(x));

console.log('Walking cycle');
for (const speed of [0.95, 1.25, 1.7, 2.4, 3.8]) {
  const legs = sample((u) => legPose(u, speed)), knees = legs.map((l) => l.knee), hips = legs.map((l) => l.hip);
  ok(finite([...knees, ...hips, ...legs.map((l) => l.ankle)]), `speed ${speed}: every angle is a real number`);
  const kmax = Math.max(...knees), kmin = Math.min(...knees);
  ok(kmax > (speed > 3.4 ? 1.3 : 0.7) && kmax < 2.0, `speed ${speed}: the knee really bends in the swing (peak ${kmax.toFixed(2)} rad), not stiff-legged`);
  ok(kmin >= 0.05 && kmin < 0.2, `speed ${speed}: and never hyper-extends (min ${kmin.toFixed(2)})`);
  ok(Math.min(...hips) < -0.3 && Math.max(...hips) > -0.1 && Math.max(...hips) < 0.45, `speed ${speed}: the thigh swings forward at heel strike and back at push-off`);
  // smoothness: no pops between frames at 60 fps
  const step = (n: number) => 1 / (60 * (1 / cadence(speed)) * 1) * n; let maxJump = 0;
  for (let i = 0; i < 400; i++) { const a = legPose((i * step(1)) % 1, speed), b = legPose(((i + 1) * step(1)) % 1, speed); maxJump = Math.max(maxJump, Math.abs(a.knee - b.knee), Math.abs(a.hip - b.hip), Math.abs(a.ankle - b.ankle)); }
  ok(maxJump < (isRun(speed) ? 0.35 : 0.14), `speed ${speed}: no sudden jumps between frames (largest ${maxJump.toFixed(3)} rad)`);
}
const L = (u: number) => legPose(u, 1.7), R = (u: number) => legPose((u + 0.5) % 1, 1.7);
ok(Math.abs(L(0).hip - R(0.5).hip) < 1e-9 && L(0).hip < R(0).hip, 'the two legs are half a cycle apart: one forward while the other is back');
const pitch = (u: number) => { const l = legPose(u, 1.7); return l.hip + l.knee + l.ankle; }; // the foot's angle in the world: negative = toes up
ok(pitch(0.02) < -0.1 && pitch(0.6) > 0.3 && Math.abs(pitch(0.25)) < 0.2, 'the foot rolls: toes up at heel strike, flat in stance, toes down at push-off');
ok(cadence(0.95) < cadence(1.7) && cadence(1.7) < cadence(3.4) && Math.abs(cadence(1.7) - 0.93) < 0.05, 'a faster walk means more steps per second (about 0.93 cycles/s at a normal pace)');
ok(stride(0.95) < stride(1.7) && stride(1.7) === 1 && stride(3) > 1 && isRun(3.8) && !isRun(1.7), 'strides are shorter when slow, longer when fast; fast enough becomes a jog');
const arm0 = armPose(0, 1.7), arm5 = armPose(0.5, 1.7);
ok(arm0.swing > 0.3 && arm5.swing < -0.3, 'the arm swings opposite to the same-side leg');
ok(armPose(0.5, 1.7).elbow < armPose(0, 1.7).elbow && Math.min(...sample((u) => armPose(u, 1.7).elbow)) > -1.2, 'the elbow bends more on the forward swing, and never too far');
const bob = sample((u) => bodyPose(u, 1.7).y), range = Math.max(...bob) - Math.min(...bob);
ok(range > 0.015 && range < 0.06, `the pelvis bobs a natural amount (${(range * 100).toFixed(1)} cm)`);
const sway = sample((u) => bodyPose(u, 1.7).x); ok(Math.max(...sway) > 0.01 && Math.max(...sway) < 0.03, 'and shifts a little from side to side');
ok(bodyPose(0, 3.8).lean > bodyPose(0, 1.7).lean, 'a jog leans forward more than a walk');
const bobMin = sample((u) => bodyPose(u, 1.7).y); ok(bobMin[0] < bobMin[60] && bobMin[120] < bobMin[180], 'the pelvis is lowest at heel strike and highest at mid-stance (twice per cycle)');

console.log('Hard-scene body language');
ok(REACTIONS.length === 9 && REACTIONS.every((r) => isReaction(r)) && !isReaction('dance') && !isReaction(undefined), 'nine reaction poses: stagger, cower, shiver, kneel, beaten, punch, kick, point, brace');
for (const r of REACTIONS) {
  const poses = Array.from({ length: 120 }, (_, i) => reactionPose(r, i * 0.05, 3));
  const nums = poses.flatMap((p) => [...p.hip, ...p.knee, ...p.arm.flat(), p.body.x, p.body.y, p.body.z, p.body.rotY, p.body.posX, p.body.posY, p.head.x, p.head.z]);
  ok(finite(nums), `${r}: always real numbers`);
  ok(poses.every((p) => p.hip.every((h) => h > -2.3 && h < 1) && p.knee.every((k) => k > -0.1 && k < 2.7) && Math.abs(p.body.z) < 1.7 && Math.abs(p.body.rotY) < 0.6), `${r}: stays inside what the joints can do`);
}
const at = (r: Parameters<typeof reactionPose>[0], t = 0.3) => reactionPose(r, t, 1);
ok(at('kneel').knee[0] > 2.2 && at('kneel').body.posY < -0.3, 'kneeling folds the shins back and lowers the body');
ok(Math.abs(at('beaten').body.z) > 1.3 && at('beaten').body.posY > 0.1, 'beaten: curled up on the side, resting on the ground');
ok(at('cower').arm[0][0] < -2.3 && at('cower').body.x > 0.6 && at('cower').knee[0] > 1.8, 'cowering: crouched, hunched, arms over the head');
ok(at('shiver').arm[0][1] < -1.8 && at('shiver').arm[0][2] < 0 && at('shiver').arm[1][2] > 0, 'shivering: arms hugging the chest');
ok(at('stagger').arm[0][1] < -1.8 && at('stagger').body.x > 0.25, 'staggering: hands up to guard the head, folded forward');
const tremorSpread = (r: Parameters<typeof reactionPose>[0]) => { const zs = Array.from({ length: 200 }, (_, i) => reactionPose(r, i * 0.013, 2).body.z); return Math.max(...zs) - Math.min(...zs); };
ok(tremorSpread('shiver') > 0.02 && tremorSpread('shiver') < 0.12, 'a shiver is a fast small tremor, not a flop');
const headJ = Array.from({ length: 200 }, (_, i) => reactionPose('shiver', i * 0.013, 2).head.x); ok(Math.max(...headJ) - Math.min(...headJ) > 0.05, 'the head jitters (teeth chattering)');
// blows
const hits = Array.from({ length: 400 }, (_, i) => impact(i * 0.01, 2));
ok(Math.max(...hits) > 0.6 && Math.max(...hits) <= 1.0001 && Math.min(...hits) >= 0, 'each blow is a sharp spike that decays');
let spikes = 0; for (let i = 1; i < hits.length; i++) if (hits[i] > hits[i - 1] + 0.3) spikes++;
ok(spikes >= 4 && spikes <= 6, `about one blow every 0.8 s (${spikes} in 4 s)`);
ok(Array.from({ length: 40 }, (_, i) => impactSide(i * 0.9, 5)).some((x) => x === 1) && Array.from({ length: 40 }, (_, i) => impactSide(i * 0.9, 5)).some((x) => x === -1), 'blows knock the body left and right, not always the same way');
const a1 = Array.from({ length: 100 }, (_, i) => impact(i * 0.02, 1)), a2 = Array.from({ length: 100 }, (_, i) => impact(i * 0.02, 7));
ok(a1.some((v, i) => Math.abs(v - a2[i]) > 0.1), 'two people in the same scene are hit out of step');
ok(at('punch', 0.2).arm[0][0] !== at('punch', 0.9).arm[0][0], 'punching cycles (jab and cross)');
ok(Math.min(...Array.from({ length: 100 }, (_, i) => reactionPose('kick', i * 0.06, 1).hip[1])) < -1.0, 'a kick drives the leg forward');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll animation checks passed');
