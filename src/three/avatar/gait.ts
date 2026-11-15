/**
 * The walking and running cycle (pure maths, no three.js), so it can be tested. One gait cycle is u = 0..1 for each leg: u = 0 is heel
 * strike (the leg is furthest forward), u = 0.5 is the other leg's heel strike. Angles are the rig's: a hanging limb's rotation.x is
 * NEGATIVE when it swings forward, the knee bends with a POSITIVE rotation, and a positive ankle rotation points the toes down.
 *
 * What it models, in order of how much it matters for looking natural:
 *  - the knee bends: a little after heel strike (loading) and a lot while the leg swings through (the foot clears the ground);
 *  - the pelvis rises and falls twice per cycle (highest over the standing leg, lowest at double support) and shifts to the standing side;
 *  - the arm swings opposite to the same-side leg, with the elbow bending more on the forward swing;
 *  - the foot rolls: heel first, flat, then toes off, instead of staying rigid;
 *  - stride length follows speed (the cycle rate is tied to metres per second, so feet do not skate).
 */
const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** A smooth bump that wraps round the cycle (a gaussian on the circle). */
const bump = (u: number, centre: number, width: number) => { let d = u - centre; d -= Math.round(d); return Math.exp(-(d * d) / (2 * width * width)); };

/** Gait cycles per second for a given speed (m/s): about 0.93 Hz (a relaxed walk) at 1.7 m/s, faster as you speed up. */
export const cadence = (speed: number) => clamp(0.52 * speed + 0.05, 0.5, 2.0);
/** How big the movements are compared with a normal walk (1 at 1.7 m/s). Above about 3.4 m/s it becomes a jog. */
export const stride = (speed: number) => clamp(speed / 1.7, 0.6, 1.8);
export const isRun = (speed: number) => speed > 3.4;

export interface LegPose { hip: number; knee: number; ankle: number }
export function legPose(u: number, speed: number): LegPose {
  const A = stride(speed), run = isRun(speed) ? 1 : 0;
  const hip = -(0.12 + 0.36 * A * Math.cos(TAU * u)) - run * 0.08;
  // knee: slight give after heel strike, then a big bend as the leg swings through (u about 0.7), more when running
  const knee = 0.07 + 0.2 * A * bump(u, 0.13, 0.07) + (0.78 + 0.35 * (A - 1) + run * 0.35) * bump(u, 0.72, 0.11);
  // ankle: heel strike (toes up), foot flat in stance, push off (toes down) at about u = 0.58, then lift to clear the ground
  const flat = -(hip + knee);
  const ankle = flat * 0.85 - 0.14 * bump(u, 0.02, 0.05) + 0.42 * bump(u, 0.6, 0.07) - 0.1 * bump(u, 0.85, 0.08);
  return { hip, knee, ankle };
}
export interface ArmPose { swing: number; elbow: number }
/** `u` is the phase of the SAME-side leg; the arm moves against it. */
export function armPose(u: number, speed: number): ArmPose {
  const A = stride(speed), c = Math.cos(TAU * u), run = isRun(speed) ? 1 : 0;
  return { swing: 0.42 * A * c * (1 - run * 0.1), elbow: -(0.22 + 0.4 * Math.max(0, -c) * A + run * 0.55) };
}
export interface BodyPose { y: number; x: number; roll: number; lean: number }
/** The pelvis: bob (twice per cycle), side shift and roll (once per cycle), and a forward lean that grows with speed. */
export function bodyPose(u: number, speed: number): BodyPose {
  const A = stride(speed), run = isRun(speed) ? 1 : 0;
  return { y: 0.024 * A * (0.5 - 0.5 * Math.cos(2 * TAU * u)) - 0.012 * A, x: 0.014 * Math.sin(TAU * u), roll: 0.03 * Math.sin(TAU * u), lean: 0.035 * A + run * 0.1 };
}
