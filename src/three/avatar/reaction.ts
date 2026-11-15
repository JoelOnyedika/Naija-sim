/**
 * Poses for the hard scenes (pure maths, no three.js, so they can be tested): taking blows, cowering, shivering with cold and fear,
 * kneeling, lying curled up, and the people dishing it out. Everything is non-graphic body language: flinches, recoil, guarding the head,
 * trembling. Angles follow the rig: a hanging limb's rotation.x is negative when it swings FORWARD, the knee bends with a positive angle.
 *
 * `t` is time in seconds and `seed` makes two people in the same scene move out of step with each other.
 */
export type Reaction = 'stagger' | 'cower' | 'shiver' | 'kneel' | 'beaten' | 'punch' | 'kick' | 'point' | 'brace';
export const REACTIONS: readonly Reaction[] = ['stagger', 'cower', 'shiver', 'kneel', 'beaten', 'punch', 'kick', 'point', 'brace'];
export const isReaction = (a: string | undefined): a is Reaction => !!a && (REACTIONS as readonly string[]).includes(a);

export interface ReactionPose {
  hip: [number, number]; knee: [number, number];
  /** [x, forearm, z] per arm: left (index 0) then right */ arm: [[number, number, number], [number, number, number]];
  body: { x: number; y: number; z: number; rotY: number; posX: number; posY: number };
  head: { x: number; z: number };
}
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** A blow lands every ~0.8 s at slightly uneven times; the value jumps to 1 and decays fast, so the body snaps and then recovers. */
export function impact(t: number, seed = 0, period = 0.82): number {
  const k = Math.floor((t + seed * 0.37) / period), local = (t + seed * 0.37) - k * period;
  return Math.exp(-local * 7.5) * (0.65 + 0.35 * hash(k + seed * 3.1));
}
/** Which way the k-th blow knocks you (alternating, a little random). */
export const impactSide = (t: number, seed = 0, period = 0.82): number => (hash(Math.floor((t + seed * 0.37) / period) * 1.7 + seed) > 0.5 ? 1 : -1);
const tremor = (t: number, f: number, seed = 0) => Math.sin(t * f + seed) * 0.6 + Math.sin(t * f * 1.73 + seed * 2.1) * 0.4;

const base = (): ReactionPose => ({ hip: [0, 0], knee: [0, 0], arm: [[0, -0.18, 0.06], [0, -0.18, -0.06]], body: { x: 0, y: 0, z: 0, rotY: 0, posX: 0, posY: 0 }, head: { x: 0, z: 0 } });

export function reactionPose(r: Reaction, t: number, seed = 0): ReactionPose {
  const p = base(), im = impact(t, seed), side = impactSide(t, seed);
  switch (r) {
    case 'stagger': { // on your feet, taking blows: guard up, knees give, body folds and swings away from each hit
      const sw = im * side;
      p.hip = [-0.35 - im * 0.2, -0.2 + im * 0.15]; p.knee = [0.55 + im * 0.25, 0.5 + im * 0.2];
      p.arm = [[-1.5, -2.05 + im * 0.2, 0.35], [-1.55, -2.1 + im * 0.2, -0.35]];
      p.body = { x: 0.3 + im * 0.35, y: 0, z: sw * 0.3, rotY: sw * 0.25, posX: sw * 0.09, posY: -0.2 - im * 0.05 };
      p.head = { x: 0.15 + im * 0.3, z: sw * 0.2 }; break;
    }
    case 'brace': { // standing firm, fists clenched at the sides, shaking a little, braced for it
      p.hip = [-0.1, -0.1]; p.knee = [0.25, 0.25]; p.arm = [[0.1, -0.35, 0.1], [0.1, -0.35, -0.1]];
      p.body = { x: 0.06, y: 0, z: tremor(t, 22, seed) * 0.012, rotY: 0, posX: 0, posY: -0.05 }; p.head = { x: 0.12, z: 0 }; break;
    }
    case 'cower': { // down on your haunches, arms wrapped over the head, trembling
      const tr = tremor(t, 31, seed);
      p.hip = [-1.15, -1.15]; p.knee = [2.0, 2.0];
      p.arm = [[-2.7, -2.25 + tr * 0.05, 0.25], [-2.7, -2.25 - tr * 0.05, -0.25]];
      p.body = { x: 0.75, y: 0, z: tr * 0.035, rotY: 0, posX: 0, posY: -0.42 + im * -0.03 };
      p.head = { x: 0.5, z: 0 }; break;
    }
    case 'shiver': { // soaked and freezing: hunched, arms hugging the chest, the whole body trembling, head jittering
      const tr = tremor(t, 38, seed), tr2 = tremor(t, 51, seed + 1);
      p.hip = [-0.12, -0.08]; p.knee = [0.35 + tr2 * 0.04, 0.3 - tr2 * 0.04];
      p.arm = [[-0.95, -2.05 + tr * 0.06, -0.55], [-0.95, -2.05 - tr * 0.06, 0.55]];
      p.body = { x: 0.22, y: 0, z: tr * 0.022, rotY: tr2 * 0.02, posX: tr * 0.006, posY: -0.07 };
      p.head = { x: 0.2 + tr2 * 0.045, z: tr * 0.04 }; break;
    }
    case 'kneel': { // on both knees, upright, swaying, head down
      const sway = Math.sin(t * 1.2 + seed) * 0.03;
      p.hip = [-0.1, -0.1]; p.knee = [2.55, 2.55];
      p.arm = [[0.15, -0.5, 0.18], [0.15, -0.5, -0.18]];
      p.body = { x: 0.3 + im * 0.2, y: 0, z: sway + im * side * 0.12, rotY: 0, posX: 0, posY: -0.4 };
      p.head = { x: 0.45 + im * 0.2, z: sway }; break;
    }
    case 'beaten': { // curled up on the ground on one side, arms over the head, flinching with each blow
      const tr = tremor(t, 26, seed);
      p.hip = [-1.35, -1.1]; p.knee = [1.9, 1.7];
      p.arm = [[-2.6, -2.2, 0.3], [-2.3, -2.3, -0.3]];
      p.body = { x: 0.35, y: 0, z: 1.45 + im * 0.12, rotY: 0, posX: 0, posY: 0.2 - im * 0.015 + tr * 0.002 };
      p.head = { x: 0.4, z: 0.1 + im * 0.1 }; break;
    }
    case 'punch': { // a jab then a cross, leaning into it
      const c = (t * 2.2 + hash(seed) * 6.28) % 6.28, jab = Math.max(0, Math.sin(c)), cross = Math.max(0, Math.sin(c + Math.PI));
      p.hip = [-0.45, 0.2]; p.knee = [0.55, 0.3];
      p.arm = [[-1.25 - jab * 0.55, -0.5 + jab * 0.45 - 0.7, 0.05], [-1.25 - cross * 0.6, -0.5 + cross * 0.45 - 0.7, -0.05]];
      p.body = { x: 0.12 + (jab + cross) * 0.1, y: 0, z: 0, rotY: (cross - jab) * 0.35, posX: 0, posY: -0.07 }; p.head = { x: 0.05, z: 0 }; break;
    }
    case 'kick': { // a stamp: the right leg drives forward and down
      const c = (t * 1.8 + hash(seed) * 6.28) % 6.28, k = Math.max(0, Math.sin(c));
      p.hip = [-0.15, -0.3 - k * 1.1]; p.knee = [0.3, 0.45 - k * 0.3];
      p.arm = [[-0.6, -0.8, 0.5], [0.5, -0.6, -0.5]];
      p.body = { x: -0.12 * k + 0.1, y: 0, z: -0.1 * k, rotY: 0, posX: 0, posY: -0.04 }; p.head = { x: 0.15, z: 0 }; break;
    }
    case 'point': { // one arm out, straight at someone; chin up
      p.hip = [-0.05, -0.05]; p.knee = [0.1, 0.1];
      p.arm = [[0.05, -0.3, 0.12], [-1.55, -0.02, -0.08]];
      p.body = { x: -0.05, y: 0, z: 0, rotY: 0, posX: 0, posY: 0 }; p.head = { x: -0.08, z: 0 }; break;
    }
  }
  return p;
}
