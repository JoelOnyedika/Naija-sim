import { armPose, bodyPose, cadence, legPose } from './gait';
import { isReaction, reactionPose } from './reaction';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { MathUtils } from 'three';
import type { Appearance } from '@/types/game';
import { toSpec } from '../character/build';
import { BODY_URL } from '../character/bodyAsset';
import { buildRiggedCharacter } from '../character/rigged';

useGLTF.preload(BODY_URL);

/** What the avatar is doing with its hands. Drives the arm poses below; positions/poses come from the walker. */
export type ActionKind = 'idle' | 'eat' | 'cook' | 'type' | 'dance' | 'shower' | 'pushup' | 'tv' | 'read' | 'piano' | 'drink' | 'wash'
  | 'work' | 'lift' | 'hammer' | 'sweep' | 'talk' | 'pray' | 'cheer' | 'swing' | 'curl'
  // social and ceremony poses, used by the character-interaction system (game/interact.ts)
  | 'listen' | 'handshake' | 'give' | 'chant' | 'wave' | 'crossed' | 'gesture'
  // hard-scene body language (three/avatar/reaction.ts)
  | 'stagger' | 'cower' | 'shiver' | 'kneel' | 'beaten' | 'punch' | 'kick' | 'point' | 'brace';
export interface Motion { moving: boolean; lying: boolean; sitting: boolean; action?: ActionKind; bathing?: boolean; bubble?: string | null; /** metres per second while moving: sets the stride (default 1.7, a normal walk) */ speed?: number }

/**
 * The low-poly person (see ../character/build.ts). The model is rebuilt only when the appearance changes; `motion` lets a
 * parent drive walk / sit / lie poses. The pose code below is the existing simple procedural motion, applied to the new rig's joints.
 */
export function Avatar({ appearance: a, motion }: { appearance: Appearance; motion?: MutableRefObject<Motion> }) {
  const key = JSON.stringify(a);
  const gltf = useGLTF(BODY_URL); // the rigged body; suspends the first time, then it is cached
  const rig = useMemo(() => buildRiggedCharacter(toSpec(a), gltf as never), [key, gltf]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => { const f = a.frame; rig.root.scale.set(f?.w ?? 1, f?.h ?? 1, f?.w ?? 1); }, [rig, a.frame?.w, a.frame?.h]); // NPC body proportions (one scale, no extra geometry)
  const smooth = useRef([{ x: 0, f: -0.18, z: 0.06 }, { x: 0, f: -0.18, z: -0.06 }]);
  const seedOf = useRef(Math.random() * 10); // so two people in the same scene never move in step
  const gait = useRef({ phase: 0, blend: 0 }); // phase in cycles; blend 0 (standing) .. 1 (walking), so starting and stopping ease in and out
  const legs = [rig.hipL, rig.hipR], knees = [rig.kneeL, rig.kneeR], feet = [rig.footL, rig.footR], arms = [rig.shoulderL, rig.shoulderR], fores = [rig.elbowL, rig.elbowR];
  const body = { current: rig.body };
  useFrame(({ clock }, dtRaw) => {
    const b = body.current; if (!b) return;
    const m = motion?.current ?? { moving: false, lying: false, sitting: false };
    const t = clock.getElapsedTime(), dt = Math.min(dtRaw, 0.1);
    const sp = m.speed ?? 1.7, g = gait.current, walking = m.moving && !m.sitting && !m.lying;
    g.blend += ((walking ? 1 : 0) - g.blend) * (1 - Math.exp(-dt * 9));
    if (walking) g.phase = (g.phase + dt * cadence(sp)) % 1;
    const gb = g.blend;
    const rx = !m.moving && !m.lying && isReaction(m.action) ? reactionPose(m.action, t, seedOf.current) : null; // a hard-scene pose, if one is playing
    // hands: an action only shows while standing still or sitting (never mid-stride, never lying down)
    const act: ActionKind | undefined = m.moving || m.lying ? undefined : m.action;
    const lp = Math.sin(t * 2) * 0.5 + 0.5; // 0..1 and back, the rhythm of lifting
    [0, 1].forEach((i) => {
      const s = i === 0 ? 1 : -1; // legs[0] is the left leg (-x)
      const l = legs[i], k = knees[i], r = arms[i], fo = fores[i];
      const side = i === 0 ? -1 : 1; // arms[0] is the left arm (x < 0), arms[1] the right
      const u = (g.phase + (i === 0 ? 0 : 0.5)) % 1, lp2 = legPose(u, sp), ap = armPose(u, sp);
      if (l) l.rotation.x = rx ? rx.hip[i] : m.sitting ? -1.4 : lp2.hip * gb;
      if (k) k.rotation.x = rx ? rx.knee[i] : m.sitting ? 1.45 : lp2.knee * gb;
      const ft = feet[i]; if (ft) ft.rotation.x = rx ? -(rx.hip[i] + rx.knee[i]) * 0.6 : m.sitting ? 0 : lp2.ankle * gb;
      // target arm pose: relaxed by default, overridden per action
      let tx = m.sitting ? -0.55 : m.lying ? 0 : ap.swing * gb, tf = -0.18 + (ap.elbow + 0.18) * gb, tz = side * 0.06;
      void s;
      const ph = i * Math.PI;
      switch (act) {
        case 'eat': if (side === 1) { tx = -0.95; tf = -1.65 - Math.sin(t * 2.6) * 0.45; } else { tx = -0.35; tf = -0.5; } break;
        case 'drink': if (side === 1) { tx = -1.0; tf = -2.15 + Math.sin(t * 1.3) * 0.08; } break;
        case 'cook': tx = -0.9 + Math.sin(t * 4 + ph) * 0.08; tf = -0.6 + (side === 1 ? Math.sin(t * 5) * 0.2 : 0); break;
        case 'type': tx = -1.05; tf = -0.75 + Math.sin(t * 11 + i * 1.7) * 0.12; break;
        case 'piano': tx = -1.0; tf = -0.35 + Math.sin(t * 7 + ph) * 0.2; break;
        case 'read': tx = -1.1; tf = -1.45; break;
        case 'wash': tx = -1.0; tf = -1.0 + Math.sin(t * 6 + ph) * 0.25; break;
        case 'shower': tx = -2.5 + Math.sin(t * 4 + ph) * 0.2; tf = -0.9; tz = side * 0.12; break;
        case 'dance': tx = -2.3 + Math.sin(t * 5 + ph) * 0.6; tf = -0.4; tz = side * 0.3; break;
        // ---- working animations (data/activities picks one per activity through world/animations.ts; 'work' is the default)
        case 'work': tx = -0.75 + Math.sin(t * 2.2 + ph) * 0.12; tf = -0.9 + Math.sin(t * 3.1 + ph * 1.3) * 0.28; break;
        case 'lift': tx = -0.4 - lp * 1.5; tf = -0.5 - lp * 0.45; break;
        case 'hammer': if (side === 1) { tx = -2.0 + Math.sin(t * 5) * 0.7; tf = -0.6 - (Math.sin(t * 5) * 0.5 + 0.5) * 0.9; } else { tx = -0.9; tf = -0.8; } break;
        case 'sweep': tx = -0.95 + Math.sin(t * 3 + ph) * 0.1; tf = -0.4; tz = side * 0.06 + Math.sin(t * 3) * 0.28; break;
        case 'talk': if (side === 1) { tx = -0.9 + Math.sin(t * 3.2) * 0.35; tf = -1.0 + Math.sin(t * 4.1) * 0.4; tz = side * 0.2; } else { tx = -0.5; tf = -0.5 + Math.sin(t * 2) * 0.15; } break;
        case 'listen': if (side === 1) { tx = -0.7; tf = -2.0 + Math.sin(t * 0.9) * 0.1; } else { tx = -0.35; tf = -0.9; } break; // a hand at the chin
        case 'handshake': if (side === 1) { tx = -1.45; tf = -0.25 + Math.sin(t * 7) * 0.14; } break;
        case 'give': tx = -1.3; tf = -0.3 - Math.sin(t * 2) * 0.04; tz = side * 0.1; break;
        case 'chant': tx = -2.55 + Math.sin(t * 3.5) * 0.25; tf = -0.25; tz = side * 0.22; break; // both hands up, together
        case 'wave': if (side === 1) { tx = -2.7; tf = -0.5 + Math.sin(t * 8) * 0.5; tz = 0.2; } break;
        case 'crossed': tx = -0.8; tf = -1.95; tz = -side * 0.28; break;
        case 'gesture': if (side === 1) { tx = -1.0 + Math.sin(t * 2.3 + 1) * 0.3; tf = -0.9 + Math.sin(t * 3.3) * 0.5; tz = 0.15; } else { tx = -0.35 + Math.sin(t * 1.7) * 0.2; tf = -0.7 + Math.sin(t * 2.1) * 0.3; } break;
        case 'pray': tx = -0.95; tf = -1.9; tz = -side * 0.15; break;
        case 'cheer': tx = -2.7 + Math.sin(t * 6 + ph) * 0.35; tf = -0.2; tz = side * 0.35; break;
        case 'swing': if (side === 1) { tx = -1.2 + Math.sin(t * 4) * 1.2; tf = -0.3; } else { tx = -0.6; tf = -0.4; } break;
        case 'curl': tx = -0.3; tf = -0.2 - (Math.sin(t * 2.4) * 0.5 + 0.5) * 1.9; break;
        case 'pushup': tx = -1.3; tf = -0.05 - (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.9; break;
        default: break;
      }
      if (rx) { tx = rx.arm[i][0]; tf = rx.arm[i][1]; tz = rx.arm[i][2]; }
      const sm = smooth.current[i], k2 = rx ? 0.35 : m.moving ? 0.35 : 0.18;
      sm.x += (tx - sm.x) * k2; sm.f += (tf - sm.f) * k2; sm.z += (tz - sm.z) * k2;
      if (r) { r.rotation.x = sm.x; r.rotation.z = sm.z; }
      if (fo) fo.rotation.x = sm.f;
    });
    const pushing = act === 'pushup';
    // body lean and sway for the working animations: bowing to pray, stooping to lift, leaning into a sweep
    const lean = act === 'lift' ? 0.32 * (1 - lp) : act === 'sweep' ? 0.2 : act === 'pray' ? 0.2 + Math.sin(t * 0.8) * 0.04 : act === 'hammer' ? 0.08 : 0;
    const nod = act === 'listen' ? Math.sin(t * 1.4) * 0.04 : act === 'chant' ? -0.12 : 0;
    const sway = act === 'dance' ? Math.sin(t * 2.5) * 0.1 : act === 'sweep' ? Math.sin(t * 3) * 0.1 : act === 'talk' ? Math.sin(t * 1.8) * 0.03 : act === 'cheer' ? Math.sin(t * 6) * 0.05 : act === 'swing' ? Math.sin(t * 4) * 0.06 : 0;
    const bp = bodyPose(g.phase, sp), kk = rx ? 0.4 : 0.15;
    b.rotation.x = MathUtils.lerp(b.rotation.x, rx ? rx.body.x : m.lying ? -Math.PI / 2 : pushing ? 1.3 : lean + nod + bp.lean * gb, kk);
    b.rotation.z = MathUtils.lerp(b.rotation.z, rx ? rx.body.z : sway + bp.roll * gb, rx ? 0.4 : 0.2);
    b.rotation.y = MathUtils.lerp(b.rotation.y, rx ? rx.body.rotY : 0, 0.3);
    b.position.x = MathUtils.lerp(b.position.x, rx ? rx.body.posX : bp.x * gb, 0.25);
    if (rig.head) { rig.head.rotation.x = MathUtils.lerp(rig.head.rotation.x, rx ? rx.head.x : 0, 0.35); rig.head.rotation.z = MathUtils.lerp(rig.head.rotation.z, rx ? rx.head.z : 0, 0.35); }
    const y = rx ? rx.body.posY : m.lying ? 0.7 : m.sitting ? -0.3 : pushing ? 0.17 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.09 : 0;
    const bob = act === 'cheer' ? Math.abs(Math.sin(t * 6)) * 0.04 : act === 'lift' ? -0.06 * (1 - lp) : act === 'dance' ? Math.abs(Math.sin(t * 5)) * 0.07 : m.moving || m.lying || pushing ? 0 : Math.sin(t * 1.6) * 0.006;
    b.position.y = MathUtils.lerp(b.position.y, y + (rx ? 0 : bob + bp.y * gb), rx ? 0.4 : 0.3);
    rig.sync?.(); // joint angles -> the rigged body's bones
  });
  return <primitive object={rig.root} />;
}
