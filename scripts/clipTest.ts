import { ANIM, BONES, ClipPlayer, RIFLE, UNARMED, blend, weightsFor } from '../src/three/character/clips';
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
console.log('Baked Mixamo clips');
ok(BONES.length === 19 && BONES.every((b) => b.startsWith('DEF-')), 'the clips drive 19 bones of the body skeleton');
const names = Object.keys(ANIM.clips);
for (const n of ['Idle', 'Walking', 'Running', 'PR_Idle_Aim', 'PR_Walk_F', 'PR_Run_F', 'PR_Sprint_F']) ok(names.includes(n), `clip ${n} is present`);
ok(names.every((n) => ANIM.clips[n].frames.every((f) => f.length === BONES.length * 4 && f.every(Number.isFinite))), 'every frame has a finite rotation for every bone');
ok(names.every((n) => ANIM.clips[n].frames.every((f) => BONES.every((_, b) => Math.abs(Math.hypot(f[b * 4], f[b * 4 + 1], f[b * 4 + 2], f[b * 4 + 3]) - 1) < 1e-2))), 'rotations are unit quaternions');
// no pops, also across the loop seam
const ang = (a: number[], b: number[], o: number) => 2 * Math.acos(Math.min(1, Math.abs(a[o] * b[o] + a[o + 1] * b[o + 1] + a[o + 2] * b[o + 2] + a[o + 3] * b[o + 3])));
for (const n of ['Walking', 'Running', 'PR_Walk_F', 'PR_Run_F', 'PR_Sprint_F', 'Idle', 'PR_Idle_Aim']) {
  const fr = ANIM.clips[n].frames; let worst = 0, seam = 0;
  fr.forEach((f, i) => { const g = fr[(i + 1) % fr.length]; for (let b = 0; b < BONES.length; b++) { const a = ang(f, g, b * 4); worst = Math.max(worst, a); if (i === fr.length - 1) seam = Math.max(seam, a); } });
  ok(worst < 1.3 && seam < 0.9, `${n}: no bone jumps more than 1.3 rad between frames (largest ${worst.toFixed(2)}, at the loop seam ${seam.toFixed(2)})`);
}
console.log('Choosing clips by speed');
for (const kit of [UNARMED, RIFLE]) for (const s of [0, 0.3, 1, 1.5, 2.5, 3.5, 5, 7, 12]) { const { layers } = weightsFor(s, kit); const sum = layers.reduce((a, l) => a + l.w, 0); if (Math.abs(sum - 1) > 1e-6 || !layers.every((l) => ANIM.clips[l.clip])) { ok(false, `weights at ${s} m/s`); } }
ok(true, 'weights always add up to 1 and name real clips');
ok(weightsFor(0, UNARMED).layers[0].clip === 'Idle' && weightsFor(0, RIFLE).layers[0].clip === 'PR_Idle_Aim', 'standing: idle (rifle idle when armed)');
ok(weightsFor(ANIM.ratio * 1.62, UNARMED).layers.some((l) => l.clip === 'Walking' && l.w > 0.99), 'at the walk clip\'s own ground speed it plays the walk alone');
ok(weightsFor(9, RIFLE).layers.length === 1 && weightsFor(9, RIFLE).layers[0].clip === 'PR_Sprint_F', 'very fast with the rifle: sprint');
console.log('Playing');
const p = new ClipPlayer(); let dy = 0;
for (let i = 0; i < 200; i++) dy = p.update(1 / 60, 1.5, UNARMED);
ok(p.q.every(Number.isFinite) && Math.abs(dy) < 0.2, 'walking for 3 seconds gives a finite pose with a sane hip bob');
for (let i = 0; i < 300; i++) p.update(1 / 60, 0, UNARMED);
ok(Math.abs(p.speed) < 0.05, 'stopping eases to standing');
const a = new Float32Array(BONES.length * 4), b = new Float32Array(BONES.length * 4);
blend([{ clip: 'Idle', w: 0.5 }, { clip: 'Walking', w: 0.5 }], () => 0.3, a, b);
ok(a.every(Number.isFinite), 'blending two clips stays finite');
console.log(fails ? `\n${fails} check(s) failed` : '\nAll clip checks passed'); process.exit(fails ? 1 : 0);
