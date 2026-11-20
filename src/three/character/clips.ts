/**
 * Mixamo animation on the One Naija body. The clips were retargeted offline (tools/bakeAnims.ts) into local bone rotations of this body's own skeleton,
 * so playing them is only: pick clips by speed, sample, blend, write the bone rotations. Pure maths (no three.js), so it can be tested.
 */
import data from './animData.json';

export interface ClipData { duration: number; frames: number[][]; hipsY: number[] }
export interface AnimBank { fps: number; bones: string[]; ratio: number; clips: Record<string, ClipData>; gun: { pos: number[]; quat: number[]; muzzleBody: number[]; barrelYaw: number; bone: string } }
export const ANIM = data as unknown as AnimBank;
/** Leg length (hip to ankle) of the masculine body the clips were baked on; other bodies scale the hip bob by their own leg length over this. */
export const BAKED_LEG = 0.736;
export const BONES = ANIM.bones;
const NB = BONES.length;

export interface LocoSet { idle: string; walk: string; run: string; sprint?: string }
/** Unarmed and rifle sets. Authored speeds are the ground speed each clip travels at on the source rig (m/s), measured by the shooter project; this body is smaller (ANIM.ratio). */
export const UNARMED: { set: LocoSet; speed: Record<string, number> } = { set: { idle: 'Idle', walk: 'Walking', run: 'Running' }, speed: { Walking: 1.62, Running: 4.76 } };
export const RIFLE: { set: LocoSet; speed: Record<string, number> } = { set: { idle: 'PR_Idle_Aim', walk: 'PR_Walk_F', run: 'PR_Run_F', sprint: 'PR_Sprint_F' }, speed: { PR_Walk_F: 1.86, PR_Run_F: 4.64, PR_Sprint_F: 6.96 } };

export interface Layer { clip: string; w: number }
/** Which clips play at this ground speed (m/s), with weights that add up to 1: standing, walk, run, sprint, blended in between. */
export function weightsFor(speed: number, kit: typeof UNARMED): { layers: Layer[]; loco: number } {
  const nodes: { clip: string; at: number }[] = [{ clip: kit.set.idle, at: 0 }];
  for (const c of [kit.set.walk, kit.set.run, kit.set.sprint]) if (c) nodes.push({ clip: c, at: kit.speed[c] * ANIM.ratio });
  if (speed <= 0.02) return { layers: [{ clip: nodes[0].clip, w: 1 }], loco: 0 };
  let k = 0; while (k < nodes.length - 1 && speed > nodes[k + 1].at) k++;
  if (k >= nodes.length - 1) return { layers: [{ clip: nodes[nodes.length - 1].clip, w: 1 }], loco: 1 };
  const t = Math.min(1, Math.max(0, (speed - nodes[k].at) / (nodes[k + 1].at - nodes[k].at))), ease = t * t * (3 - 2 * t);
  return { layers: [{ clip: nodes[k].clip, w: 1 - ease }, { clip: nodes[k + 1].clip, w: ease }].filter((l) => l.w > 0.001), loco: k === 0 ? ease : 1 };
}

/** Writes the pose of `clip` at normalised phase 0..1 (looping) into out (4 numbers per baked bone); returns the hips height change. */
export function sample(clip: string, phase: number, out: Float32Array | number[]): number {
  const c = ANIM.clips[clip]; if (!c) return 0;
  const n = c.frames.length, p = (((phase % 1) + 1) % 1) * n, i = Math.floor(p) % n, j = (i + 1) % n, f = p - Math.floor(p);
  const A = c.frames[i], B = c.frames[j];
  for (let b = 0; b < NB; b++) {
    const o = b * 4; let dot = A[o] * B[o] + A[o + 1] * B[o + 1] + A[o + 2] * B[o + 2] + A[o + 3] * B[o + 3]; const s = dot < 0 ? -1 : 1;
    const x = A[o] * (1 - f) + B[o] * s * f, y = A[o + 1] * (1 - f) + B[o + 1] * s * f, z = A[o + 2] * (1 - f) + B[o + 2] * s * f, w = A[o + 3] * (1 - f) + B[o + 3] * s * f;
    const l = Math.hypot(x, y, z, w) || 1; out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l; out[o + 3] = w / l; dot = 0;
  }
  return c.hipsY[i] * (1 - f) + c.hipsY[j] * f;
}

/** Blends `layers` (weights add up to 1): per-bone normalised lerp. `phaseOf(clip)` says where each clip is in its cycle. */
export function blend(layers: Layer[], phaseOf: (clip: string) => number, out: Float32Array, tmp: Float32Array): number {
  let dy = 0, acc = 0;
  layers.forEach((l, k) => {
    if (k === 0) { dy = sample(l.clip, phaseOf(l.clip), out); acc = l.w; return; }
    const d2 = sample(l.clip, phaseOf(l.clip), tmp); acc += l.w; const t = l.w / acc; dy += (d2 - dy) * t;
    for (let b = 0; b < NB; b++) {
      const o = b * 4, dot = out[o] * tmp[o] + out[o + 1] * tmp[o + 1] + out[o + 2] * tmp[o + 2] + out[o + 3] * tmp[o + 3], s = dot < 0 ? -1 : 1;
      const x = out[o] * (1 - t) + tmp[o] * s * t, y = out[o + 1] * (1 - t) + tmp[o + 1] * s * t, z = out[o + 2] * (1 - t) + tmp[o + 2] * s * t, w = out[o + 3] * (1 - t) + tmp[o + 3] * s * t, l2 = Math.hypot(x, y, z, w) || 1;
      out[o] = x / l2; out[o + 1] = y / l2; out[o + 2] = z / l2; out[o + 3] = w / l2;
    }
  });
  return dy;
}

/** Per-person playback state: a smoothed speed, a walk phase shared by the moving clips (so feet stay in step while blending) and an idle clock. */
export class ClipPlayer {
  speed = 0; phase = Math.random(); idleT = Math.random() * 2;
  readonly q = new Float32Array(NB * 4); private tmp = new Float32Array(NB * 4);
  /** Advances by dt seconds. `target` = ground speed wanted (0 = standing). Returns the hips height change (metres, for the masculine body). */
  update(dt: number, target: number, kit: typeof UNARMED): number {
    this.speed += (target - this.speed) * (1 - Math.exp(-dt * 9));
    if (Math.abs(this.speed - target) < 0.02) this.speed = target;
    const { layers } = weightsFor(this.speed, kit);
    // cycles per second = weighted average over the moving clips of (rate / duration), rate = speed / the clip's own ground speed
    let hz = 0;
    for (const l of layers) { const a = kit.speed[l.clip]; if (!a) continue; const rate = Math.min(1.8, Math.max(0.5, this.speed / (a * ANIM.ratio))); hz += l.w * rate / ANIM.clips[l.clip].duration; }
    this.phase = (this.phase + hz * dt) % 1; this.idleT += dt;
    return blend(layers, (clip) => (kit.speed[clip] ? this.phase : this.idleT / ANIM.clips[clip].duration), this.q, this.tmp);
  }
}
