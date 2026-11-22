import { armPose, bodyPose, cadence, legPose } from './gait';
import { isReaction, reactionPose } from './reaction';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { CylinderGeometry, Group, Matrix4, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, BoxGeometry, DoubleSide } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ANIM, ClipPlayer, RIFLE, UNARMED } from '../character/clips';
import type { Appearance } from '@/types/game';
import { toSpec } from '../character/build';
import { BODY_URL } from '../character/bodyAsset';
import { buildRiggedCharacter } from '../character/rigged';

useGLTF.preload(BODY_URL);

/** The one gun. Model space: origin = right-hand grip, +z barrel, +y up (see public/models/weapons/CREDITS.md). */
export const AK_URL = '/models/weapons/ak47.glb';
/** Where the muzzle is in the body's space while the rifle clips play, and which way the barrel points (yaw, radians, from the body's front): for tracers and for turning the body to aim. Fitted to the retargeted clips by tools/bakeAnims.ts. */
export const AK_MUZZLE = { body: ANIM.gun.muzzleBody as [number, number, number], yaw: ANIM.gun.barrelYaw };

/** The rifle rides in the right hand bone, so it follows every Mixamo clip. The grip transform comes from the retargeted rifle-aim pose (right palm on the grip, barrel toward the left hand). */
function HeldAK({ rig }: { rig: ReturnType<typeof buildRiggedCharacter> }) {
  const gltf = useGLTF(AK_URL);
  useEffect(() => {
    const hand = rig.bone?.(ANIM.gun.bone); if (!hand) return;
    const g = gltf.scene.clone(true), holder = new Group();
    holder.position.set(...(ANIM.gun.pos as [number, number, number])); holder.quaternion.set(ANIM.gun.quat[0], ANIM.gun.quat[1], ANIM.gun.quat[2], ANIM.gun.quat[3]); holder.add(g); hand.add(holder);
    return () => { hand.remove(holder); };
  }, [gltf, rig]);
  return null;
}

/** What a street hawker carries on the head: a basin of oranges, a tray of bread, a stack of pure-water sachets. */
export type HeadCargo = 'oranges' | 'bread' | 'water';
function cargoMesh(kind: HeadCargo): Group {
  const g = new Group(), mat = (c: string, r = 0.7, extra: { side?: typeof DoubleSide; transparent?: boolean; opacity?: number } = {}) => new MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const add = (geo: Mesh['geometry'], m: MeshStandardMaterial, x: number, y: number, z: number) => { const o = new Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const pad = new Mesh(new TorusGeometry(0.1, 0.04, 6, 12), mat('#C23B3B', 0.9)); pad.rotation.x = Math.PI / 2; pad.position.y = 0.03; g.add(pad); // the cloth ring she carries it on
  if (kind === 'oranges') {
    const basin = new Mesh(new CylinderGeometry(0.3, 0.22, 0.13, 14, 1, true), mat('#3E6FB0', 0.4, { side: DoubleSide })); basin.position.y = 0.1; g.add(basin);
    add(new CylinderGeometry(0.22, 0.22, 0.012, 14), mat('#3E6FB0', 0.4), 0, 0.045, 0); add(new TorusGeometry(0.3, 0.014, 5, 16), mat('#F4F4F2', 0.5), 0, 0.165, 0).rotation.x = Math.PI / 2;
    const fruit = new SphereGeometry(0.058, 8, 6), om = mat('#F08A1C', 0.6);
    for (let i = 0; i < 19; i++) { const ring = i < 9 ? 0.2 : i < 16 ? 0.11 : 0, a = i * 2.4, h = i < 9 ? 0.14 : i < 16 ? 0.2 : 0.26; add(fruit, om, Math.cos(a) * ring, h, Math.sin(a) * ring); }
  } else if (kind === 'bread') {
    add(new RoundedBoxGeometry(0.62, 0.035, 0.4, 2, 0.012), mat('#8A5A2B', 0.8), 0, 0.06, 0);
    const loaf = new RoundedBoxGeometry(0.16, 0.1, 0.34, 3, 0.04), lm = mat('#D9A55B', 0.75);
    for (const [x, y] of [[-0.22, 0.13], [-0.07, 0.13], [0.08, 0.13], [0.23, 0.13], [-0.15, 0.225], [0.0, 0.225], [0.15, 0.225], [-0.07, 0.32], [0.08, 0.32]]) add(loaf, lm, x, y, 0);
  } else {
    const pack = new RoundedBoxGeometry(0.4, 0.15, 0.3, 3, 0.03), pm = mat('#DCE9F2', 0.25, { transparent: true, opacity: 0.88 });
    for (const y of [0.12, 0.27, 0.42]) { add(pack, pm, 0, y, 0); add(new BoxGeometry(0.2, 0.05, 0.003), mat('#2B7BD4', 0.5), 0, y, 0.152); }
  }
  return g;
}
function HeadLoad({ rig, kind }: { rig: ReturnType<typeof buildRiggedCharacter>; kind: HeadCargo }) {
  useEffect(() => {
    const head = rig.bone?.('DEF-head'); if (!head) return;
    const g = cargoMesh(kind), holder = new Group(); holder.add(g);
    rig.root.updateMatrixWorld(true); head.updateWorldMatrix(true, false);
    // place it on the crown in the base pose, then express that in the head bone's own frame so it rides every head movement
    // all in the character's own space (the character itself may be anywhere in the scene): head-relative = inverse(head in rig space) x the spot on the crown
    const headInRig = new Matrix4().copy(rig.root.matrixWorld).invert().multiply(head.matrixWorld);
    holder.applyMatrix4(headInRig.invert().multiply(new Matrix4().makeTranslation(0, rig.height - 0.04, -0.035)));
    head.add(holder); return () => { head.remove(holder); g.traverse((o) => { const m = o as Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as MeshStandardMaterial).dispose(); } }); };
  }, [rig, kind]);
  return null;
}

/** What the avatar is doing with its hands. Drives the arm poses below; positions/poses come from the walker. */
export type ActionKind = 'idle' | 'eat' | 'cook' | 'type' | 'dance' | 'shower' | 'pushup' | 'tv' | 'read' | 'piano' | 'drink' | 'wash'
  | 'work' | 'lift' | 'hammer' | 'sweep' | 'talk' | 'pray' | 'cheer' | 'swing' | 'curl'
  // social and ceremony poses, used by the character-interaction system (game/interact.ts)
  | 'listen' | 'handshake' | 'give' | 'chant' | 'wave' | 'crossed' | 'gesture'
  // hard-scene body language (three/avatar/reaction.ts)
  | 'stagger' | 'cower' | 'shiver' | 'kneel' | 'beaten' | 'punch' | 'kick' | 'point' | 'brace'
  // two-handed rifle hold (works while walking and running)
  | 'rifle';
export interface Motion { moving: boolean; lying: boolean; sitting: boolean; action?: ActionKind; bathing?: boolean; bubble?: string | null; /** metres per second while moving: sets the stride (default 1.7, a normal walk) */ speed?: number }

/**
 * The low-poly person (see ../character/build.ts). The model is rebuilt only when the appearance changes; `motion` lets a
 * parent drive walk / sit / lie poses. The pose code below is the existing simple procedural motion, applied to the new rig's joints.
 */
export function Avatar({ appearance: a, motion, held, cargo }: { appearance: Appearance; motion?: MutableRefObject<Motion>; /** goods carried on the head (street hawkers) */ cargo?: HeadCargo | null; /** a gun in the hands (only 'ak47' exists): use with motion.action = 'rifle' */ held?: 'ak47' | null }) {
  const key = JSON.stringify(a);
  const gltf = useGLTF(BODY_URL); // the rigged body; suspends the first time, then it is cached
  const rig = useMemo(() => buildRiggedCharacter(toSpec(a), gltf as never), [key, gltf]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => { const f = a.frame; rig.root.scale.set(f?.w ?? 1, f?.h ?? 1, f?.w ?? 1); }, [rig, a.frame?.w, a.frame?.h]); // NPC body proportions (one scale, no extra geometry)
  const smooth = useRef([{ x: 0, f: -0.18, z: 0.06 }, { x: 0, f: -0.18, z: -0.06 }]);
  const seedOf = useRef(Math.random() * 10); // so two people in the same scene never move in step
  const player = useRef(new ClipPlayer());
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
    const act: ActionKind | undefined = m.lying || (m.moving && m.action !== 'rifle') ? undefined : m.action;
    // Mixamo clips (idle / walk / run, and the rifle set when the gun is up) whenever the body is not doing a seated, lying, reaction or hand-activity pose
    // Mixamo only for moving and for the rifle: standing around unarmed is the plain neutral stance, not the Mixamo idle
    if (rig.playPose && !m.sitting && !m.lying && !rx && (act === 'rifle' || (m.moving && (act === undefined || act === 'idle')))) {
      const dy = player.current.update(dt, walking ? Math.max(0.6, sp) : 0, act === 'rifle' ? RIFLE : UNARMED);
      rig.playPose(player.current.q, dy); b.rotation.set(0, 0, 0); b.position.set(0, 0, 0); return;
    }
    rig.leavePose?.();
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
  return (<>
    <primitive object={rig.root} />
    {held === 'ak47' && <Suspense fallback={null}><HeldAK rig={rig} /></Suspense>}
    {cargo && <HeadLoad rig={rig} kind={cargo} />}
  </>);
}
