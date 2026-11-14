import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { MathUtils } from 'three';
import type { Appearance } from '@/types/game';
import { buildCharacter, toSpec } from '../character/build';

/** What the avatar is doing with its hands. Drives the arm poses below; positions/poses come from the walker. */
export type ActionKind = 'idle' | 'eat' | 'cook' | 'type' | 'dance' | 'shower' | 'pushup' | 'tv' | 'read' | 'piano' | 'drink' | 'wash'
  | 'work' | 'lift' | 'hammer' | 'sweep' | 'talk' | 'pray' | 'cheer' | 'swing' | 'curl'
  // social and ceremony poses, used by the character-interaction system (game/interact.ts)
  | 'listen' | 'handshake' | 'give' | 'chant' | 'wave' | 'crossed' | 'gesture';
export interface Motion { moving: boolean; lying: boolean; sitting: boolean; action?: ActionKind; bathing?: boolean; bubble?: string | null }

/**
 * The low-poly person (see ../character/build.ts). The model is rebuilt only when the appearance changes; `motion` lets a
 * parent drive walk / sit / lie poses. The pose code below is the existing simple procedural motion, applied to the new rig's joints.
 */
export function Avatar({ appearance: a, motion }: { appearance: Appearance; motion?: MutableRefObject<Motion> }) {
  const key = JSON.stringify(a);
  const rig = useMemo(() => buildCharacter(toSpec(a)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => { const f = a.frame; rig.root.scale.set(f?.w ?? 1, f?.h ?? 1, f?.w ?? 1); }, [rig, a.frame?.w, a.frame?.h]); // NPC body proportions (one scale, no extra geometry)
  const smooth = useRef([{ x: 0, f: -0.18, z: 0.06 }, { x: 0, f: -0.18, z: -0.06 }]);
  const legs = [rig.hipL, rig.hipR], knees = [rig.kneeL, rig.kneeR], arms = [rig.shoulderL, rig.shoulderR], fores = [rig.elbowL, rig.elbowR];
  const body = { current: rig.body };
  useFrame(({ clock }) => {
    const b = body.current; if (!b) return;
    const m = motion?.current ?? { moving: false, lying: false, sitting: false };
    const t = clock.getElapsedTime();
    const swing = m.moving ? Math.sin(t * 9) * 0.6 : 0;
    // hands: an action only shows while standing still or sitting (never mid-stride, never lying down)
    const act: ActionKind | undefined = m.moving || m.lying ? undefined : m.action;
    const lp = Math.sin(t * 2) * 0.5 + 0.5; // 0..1 and back, the rhythm of lifting
    [0, 1].forEach((i) => {
      const s = i === 0 ? 1 : -1; // legs[0] is the left leg (-x)
      const l = legs[i], k = knees[i], r = arms[i], fo = fores[i];
      const side = i === 0 ? -1 : 1; // arms[0] is the left arm (x < 0), arms[1] the right
      if (l) l.rotation.x = m.sitting ? -1.4 : swing * s;
      if (k) k.rotation.x = m.sitting ? 1.45 : m.moving ? Math.max(0, Math.sin(t * 9 + (i === 0 ? 1.6 : 4.7))) * 0.7 : 0;
      // target arm pose: relaxed by default, overridden per action
      let tx = m.sitting ? -0.55 : m.lying ? 0 : -swing * s * 0.8, tf = -0.18, tz = side * 0.06;
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
      const sm = smooth.current[i], k2 = m.moving ? 0.5 : 0.18;
      sm.x += (tx - sm.x) * k2; sm.f += (tf - sm.f) * k2; sm.z += (tz - sm.z) * k2;
      if (r) { r.rotation.x = sm.x; r.rotation.z = sm.z; }
      if (fo) fo.rotation.x = sm.f;
    });
    const pushing = act === 'pushup';
    // body lean and sway for the working animations: bowing to pray, stooping to lift, leaning into a sweep
    const lean = act === 'lift' ? 0.32 * (1 - lp) : act === 'sweep' ? 0.2 : act === 'pray' ? 0.2 + Math.sin(t * 0.8) * 0.04 : act === 'hammer' ? 0.08 : 0;
    const nod = act === 'listen' ? Math.sin(t * 1.4) * 0.04 : act === 'chant' ? -0.12 : 0;
    const sway = act === 'dance' ? Math.sin(t * 2.5) * 0.1 : act === 'sweep' ? Math.sin(t * 3) * 0.1 : act === 'talk' ? Math.sin(t * 1.8) * 0.03 : act === 'cheer' ? Math.sin(t * 6) * 0.05 : act === 'swing' ? Math.sin(t * 4) * 0.06 : 0;
    b.rotation.x = MathUtils.lerp(b.rotation.x, m.lying ? -Math.PI / 2 : pushing ? 1.3 : lean + nod, 0.15);
    b.rotation.z = MathUtils.lerp(b.rotation.z, sway, 0.2);
    const y = m.lying ? 0.7 : m.sitting ? -0.3 : pushing ? 0.17 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.09 : 0;
    const bob = act === 'cheer' ? Math.abs(Math.sin(t * 6)) * 0.04 : act === 'lift' ? -0.06 * (1 - lp) : act === 'dance' ? Math.abs(Math.sin(t * 5)) * 0.07 : m.moving || m.lying || pushing ? 0 : Math.sin(t * 1.6) * 0.006;
    b.position.y = MathUtils.lerp(b.position.y, y + bob, 0.15);
  });
  return <primitive object={rig.root} />;
}
