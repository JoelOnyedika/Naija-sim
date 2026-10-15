import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import { MathUtils, type BufferGeometry, type Group, type Material } from 'three';
import type { Appearance } from '@/types/game';
import * as P from './parts';
import { BODY, material, mix, shade } from './parts';

/** What the avatar is doing with its hands. Drives the arm poses below; positions/poses come from the walker. */
export type ActionKind = 'idle' | 'eat' | 'cook' | 'type' | 'dance' | 'shower' | 'pushup' | 'tv' | 'read' | 'piano' | 'drink' | 'wash';
export interface Motion { moving: boolean; lying: boolean; sitting: boolean; action?: ActionKind; bathing?: boolean; bubble?: string | null }
type V3 = [number, number, number];

/** One shared-geometry mesh. `dispose={null}`: geometry and materials are cached and reused by every avatar. */
function Part({ g, m, pos, rot, scale, shadow = true }: { g: BufferGeometry; m: Material; pos?: V3; rot?: V3; scale?: V3; shadow?: boolean }) {
  return <mesh geometry={g} material={m} position={pos} rotation={rot} scale={scale} castShadow={shadow} dispose={null} />;
}

// ---------------------------------------------------------------- hair
function Hair({ a }: { a: Appearance }) {
  const hair = material(a.hairColor, 0.9);
  const strands = (n: number, len: number, r: number, spread: number, key: string, y = -0.02, rad = 0.108) =>
    Array.from({ length: n }, (_, i) => {
      const ang = Math.PI + (((i + 0.5) / n) - 0.5) * spread * 2; // fan around the back, never across the face
      const l = len * (0.82 + 0.18 * Math.sin(i * 2.3));
      return (
        <group key={i} rotation={[0, ang, 0]}>
          <Part g={P.hairStrand(Math.round(l * 100) / 100, r, key)} m={hair} pos={[0, y, rad]} rot={[-0.1, 0, 0]} />
        </group>
      );
    });
  switch (a.hairStyle) {
    case 'bald': return null;
    case 'lowcut': return <Part g={P.hairCap(0.1165, 0.5, 'low')} m={hair} pos={[0, 0.006, -0.006]} rot={[-0.55, 0, 0]} />;
    case 'fade':
      return (
        <>
          <Part g={P.hairCap(0.12, 0.47, 'fadeTop')} m={hair} pos={[0, 0.008, -0.004]} rot={[-0.46, 0, 0]} />
          <Part g={P.hairCap(0.1175, 0.62, 'fadeBand')} m={material(mix(a.skin, a.hairColor, 0.5), 0.9)} pos={[0, 0.004, -0.004]} rot={[-0.46, 0, 0]} />
        </>
      );
    case 'afro': return <Part g={P.afroPuff()} m={material(a.hairColor, 1)} pos={[0, 0.05, -0.04]} rot={[-0.62, 0, 0]} />;
    case 'bun':
      return (
        <>
          <Part g={P.hairCap(0.1165, 0.5, 'low')} m={hair} pos={[0, 0.006, -0.006]} rot={[-0.55, 0, 0]} />
          <Part g={P.bun()} m={hair} pos={[0, 0.13, -0.065]} />
          <Part g={P.cuff(0.05, 0.008)} m={material(shade(a.hairColor, 0.25), 0.8)} pos={[0, 0.098, -0.06]} rot={[0.5, 0, 0]} />
        </>
      );
    case 'braids':
      return (<><Part g={P.hairCap(0.12, 0.58, 'brd')} m={hair} pos={[0, 0.004, -0.004]} rot={[-0.46, 0, 0]} />{strands(16, 0.3, 0.013, 2.2, 'braid')}</>);
    case 'dreads':
      return (<><Part g={P.hairCap(0.121, 0.58, 'locs')} m={hair} pos={[0, 0.004, -0.004]} rot={[-0.46, 0, 0]} />{strands(14, 0.26, 0.02, 2.3, 'loc', -0.01, 0.112)}</>);
  }
}

// ---------------------------------------------------------------- face + accessories
function Face({ a }: { a: Appearance }) {
  const skin = material(a.skin, 0.62), dark = material('#1A1411', 0.4), white = material('#F7F4EE', 0.4), lip = material(shade(a.skin, -0.35), 0.5);
  const brow = material(a.hairStyle === 'bald' ? shade(a.skin, -0.6) : mix(a.hairColor, '#000000', 0.2), 0.9);
  return (
    <>
      <Part g={P.head()} m={skin} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part g={P.ear()} m={skin} pos={[s * 0.108, 0.0, -0.005]} />
          <Part g={P.eyeWhite()} m={white} pos={[s * 0.04, 0.012, 0.098]} shadow={false} />
          <Part g={P.iris()} m={dark} pos={[s * 0.04, 0.012, 0.104]} shadow={false} />
          <Part g={P.brow()} m={brow} pos={[s * 0.041, 0.04, 0.1]} rot={[0.1, 0, -s * 0.12]} shadow={false} />
        </group>
      ))}
      <Part g={P.nose()} m={skin} pos={[0, 0.002, 0.098]} />
      <Part g={P.mouth()} m={lip} pos={[0, -0.046, 0.087]} rot={[0.12, 0, 0]} shadow={false} />
    </>
  );
}

function Accessory({ a }: { a: Appearance }) {
  switch (a.accessory) {
    case 'glasses': {
      const frame = material('#15181D', 0.3, false, 0.4);
      return (
        <>
          {[-1, 1].map((s) => (<group key={s}><Part g={P.lensRing()} m={frame} pos={[s * 0.04, 0.012, 0.112]} shadow={false} /><Part g={P.slab(0.006, 0.006, 0.1)} m={frame} pos={[s * 0.1, 0.014, 0.062]} shadow={false} /></group>))}
          <Part g={P.slab(0.02, 0.005, 0.005)} m={frame} pos={[0, 0.02, 0.114]} shadow={false} />
        </>
      );
    }
    case 'cap': {
      const c = material(a.topColor, 0.8);
      return (
        <>
          <Part g={P.hairCap(0.128, 0.5, 'cap')} m={c} pos={[0, 0.012, -0.004]} rot={[-0.18, 0, 0]} />
          <Part g={P.capBrim()} m={material(shade(a.topColor, -0.15), 0.8)} pos={[0, 0.06, 0.1]} rot={[0.12, 0, 0]} />
        </>
      );
    }
    default: return null;
  }
}

// ---------------------------------------------------------------- clothing
/** Rounded shoulder in the garment colour, so no bare deltoid pokes out above a sleeve. */
function ShoulderCap({ m, o }: { m: Material; o: number }) {
  return <Part g={P.shoulderCap(o)} m={m} />;
}

function TopGarment({ a, arm }: { a: Appearance; arm: 'torso' | 'sleeve' | 'fore' }) {
  const c = material(a.topColor, 0.82, true), trim = material(shade(a.topColor, 0.35), 0.7, true), dark = material(shade(a.topColor, -0.4), 0.8, true);
  if (a.bottom === 'dress') {
    if (arm === 'torso') return (<><Part g={P.torsoGarment(0.011, 0.99, 0, 'dress')} m={c} /><Part g={P.ring(0.076, 0.009, 'neck')} m={trim} pos={[0, 1.452, 0]} /></>);
    if (arm === 'sleeve') return <><ShoulderCap m={c} o={0.011} /><Part g={P.sleeve(0.07, 0.011, 0.012, 'cap')} m={c} /></>;
    return null;
  }
  switch (a.top) {
    case 'tee':
      if (arm === 'torso') return (<><Part g={P.torsoGarment(0.012, 0.93, 0.012, 'tee')} m={c} /><Part g={P.ring(0.076, 0.009, 'neck')} m={dark} pos={[0, 1.452, 0]} /></>);
      return arm === 'sleeve' ? <><ShoulderCap m={c} o={0.012} /><Part g={P.sleeve(0.13, 0.012, 0.014, 'tee')} m={c} /></> : null;
    case 'shirt':
      if (arm === 'torso') {
        const ys = [1.33, 1.24, 1.15, 1.06, 0.97];
        return (<>
          <Part g={P.torsoGarment(0.011, 0.92, 0.014, 'shirt')} m={c} />
          <Part g={P.ring(0.078, 0.012, 'collar')} m={trim} pos={[0, 1.455, 0]} />
          {ys.map((y) => <Part key={y} g={P.button()} m={dark} pos={[0, y, P.torsoFrontZ(y) + 0.016]} shadow={false} />)}
        </>);
      }
      if (arm === 'sleeve') return <><ShoulderCap m={c} o={0.011} /><Part g={P.sleeve(BODY.upperArm, 0.011, 0.006, 'shirt')} m={c} /></>;
      return <><Part g={P.foreSleeve(0.22, 0.011, 0.002, 'shirt')} m={c} /><Part g={P.cuff(0.044, 0.006)} m={trim} pos={[0, -0.215, 0]} /></>;
    case 'hoodie':
      if (arm === 'torso') return (<>
        <Part g={P.torsoGarment(0.022, 0.88, 0.008, 'hoodie')} m={c} />
        <Part g={P.hood()} m={c} pos={[0, 1.465, -0.075]} rot={[0.35, 0, 0]} />
        <Part g={P.pocket()} m={dark} pos={[0, 0.99, P.torsoFrontZ(0.99) + 0.022]} rot={[-0.1, 0, 0]} />
        <Part g={P.cuff(0.158, 0.012)} m={dark} pos={[0, 0.885, 0]} scale={[1, 1, 0.66]} />
      </>);
      if (arm === 'sleeve') return <><ShoulderCap m={c} o={0.02} /><Part g={P.sleeve(BODY.upperArm, 0.02, 0.01, 'hoodie')} m={c} /></>;
      return <><Part g={P.foreSleeve(0.25, 0.02, 0.004, 'hoodie')} m={c} /><Part g={P.cuff(0.05, 0.01)} m={dark} pos={[0, -0.248, 0]} /></>;
    case 'jacket':
      if (arm === 'torso') return (<>
        <Part g={P.torsoGarment(0.03, 0.9, 0.006, 'jacket')} m={c} />
        <Part g={P.ring(0.082, 0.015, 'jcol')} m={dark} pos={[0, 1.452, 0]} />
        <Part g={P.slab(0.012, 0.52, 0.01)} m={material('#C8CDD3', 0.3, false, 0.6)} pos={[0, 1.17, P.torsoFrontZ(1.17) + 0.034]} shadow={false} />
        <Part g={P.ring(0.072, 0.007, 'tee-in')} m={material('#F4F1EA', 0.8, true)} pos={[0, 1.462, 0]} />
      </>);
      if (arm === 'sleeve') return <><ShoulderCap m={c} o={0.03} /><Part g={P.sleeve(BODY.upperArm, 0.03, 0.01, 'jacket')} m={c} /></>;
      return <><Part g={P.foreSleeve(0.25, 0.028, 0.004, 'jacket')} m={c} /><Part g={P.cuff(0.062, 0.008)} m={dark} pos={[0, -0.248, 0]} /></>;
    case 'kaftan': {
      const gold = material('#E5B93C', 0.4, true, 0.5);
      if (arm === 'torso') return (<>
        <Part g={P.torsoGarment(0.03, 0.5, 0.12, 'kaftan')} m={c} />
        <Part g={P.ring(0.08, 0.01, 'ktrim')} m={gold} pos={[0, 1.452, 0]} />
        <Part g={P.slab(0.035, 0.9, 0.008)} m={gold} pos={[0, 0.98, P.torsoFrontZ(1.0) + 0.036]} rot={[-0.03, 0, 0]} shadow={false} />
        <Part g={P.ring(0.3, 0.008, 'khem')} m={gold} pos={[0, 0.505, 0]} />
      </>);
      if (arm === 'sleeve') return <><ShoulderCap m={c} o={0.03} /><Part g={P.sleeve(0.3, 0.03, 0.07, 'kaftan')} m={c} /></>;
      return <Part g={P.foreSleeve(0.08, 0.03, 0.05, 'kaftan')} m={c} />;
    }
    case 'jersey':
      if (arm === 'torso') return (<>
        <Part g={P.torsoGarment(0.014, 0.9, 0.004, 'jersey')} m={c} />
        <Part g={P.ring(0.078, 0.013, 'vcol')} m={material('#FFFFFF', 0.7, true)} pos={[0, 1.452, 0]} />
        <Part g={P.slab(0.14, 0.17, 0.008)} m={material('#FFFFFF', 0.7)} pos={[0, 1.15, -P.torsoFrontZ(1.15) - 0.018]} shadow={false} />
        <Part g={P.slab(0.02, 0.4, 0.006)} m={material('#FFFFFF', 0.7)} pos={[-0.152, 1.14, 0]} shadow={false} />
        <Part g={P.slab(0.02, 0.4, 0.006)} m={material('#FFFFFF', 0.7)} pos={[0.152, 1.14, 0]} shadow={false} />
      </>);
      if (arm === 'sleeve') return (<><ShoulderCap m={c} o={0.014} /><Part g={P.sleeve(0.14, 0.014, 0.014, 'jersey')} m={c} /><Part g={P.cuff(0.056, 0.007)} m={material('#FFFFFF', 0.7)} pos={[0, -0.138, 0]} /></>);
      return null;
  }
}

function LegGarment({ a, part }: { a: Appearance; part: 'thigh' | 'calf' }) {
  const c = material(a.bottomColor, 0.85, true);
  const b = a.bottom;
  if (b === 'skirt' || b === 'dress') return null;
  if (b === 'shorts') return part === 'thigh' ? <Part g={P.legGarment(0.27, 0.101, 0.094, 'shorts')} m={c} /> : null;
  const loose = b === 'trousers';
  if (part === 'thigh') return <Part g={P.legGarment(BODY.thigh, loose ? 0.108 : 0.1, loose ? 0.09 : 0.074, b)} m={c} />;
  return <Part g={P.legGarment(BODY.calf, loose ? 0.09 : 0.073, loose ? 0.064 : 0.05, b + 'c')} m={c} />;
}

function Bottom({ a }: { a: Appearance }) {
  const c = material(a.bottomColor, 0.85, true), band = material(shade(a.bottomColor, -0.3), 0.7, true);
  switch (a.bottom) {
    case 'skirt':
      return (<><Part g={P.skirt(0.56, 0.27)} m={c} /><Part g={P.ring(0.158, 0.012, 'waist')} m={band} pos={[0, 1.035, 0]} /></>);
    case 'dress':
      return (<><Part g={P.skirt(0.5, 0.3, 'dress')} m={material(a.topColor, 0.85, true)} /><Part g={P.ring(0.157, 0.011, 'dwaist')} m={material(shade(a.topColor, -0.35), 0.7, true)} pos={[0, 1.02, 0]} /></>);
    case 'shorts':
      return (<><Part g={P.pelvis(0.012, 0.86, 1.04, 'shorts')} m={c} /><Part g={P.ring(0.158, 0.012, 'waist')} m={band} pos={[0, 1.035, 0]} /></>);
    default:
      return (<>
        <Part g={P.pelvis(a.bottom === 'trousers' ? 0.02 : 0.012, 0.86, 1.04, a.bottom)} m={c} />
        <Part g={P.ring(0.16, 0.012, 'waist')} m={band} pos={[0, 1.035, 0]} />
        {a.bottom === 'trousers' && <Part g={P.slab(0.03, 0.02, 0.012)} m={material('#D9B54A', 0.3, false, 0.7)} pos={[0, 1.02, P.torsoFrontZ(1.02) + 0.03]} shadow={false} />}
      </>);
  }
}

function Shoe({ a }: { a: Appearance }) {
  const skin = material(a.skin, 0.65), col = material(a.shoeColor, 0.7);
  switch (a.shoes) {
    case 'sneakers': return (<><Part g={P.shoeUpper('sneaker')} m={col} /><Part g={P.shoeSole()} m={material('#F4F1EA', 0.6)} /></>);
    case 'boots': return (<><Part g={P.shoeUpper('boot')} m={col} /><Part g={P.shoeSole()} m={material('#15181D', 0.7)} /></>);
    case 'sandals': return (<><Part g={P.shoeUpper('sandal')} m={skin} scale={[0.92, 1.5, 0.95]} /><Part g={P.shoeSole()} m={col} /><Part g={P.slab(0.085, 0.012, 0.05)} m={col} pos={[0, 0.058, 0.06]} shadow={false} /></>);
    default: return <Part g={P.shoeUpper('sandal')} m={skin} scale={[0.92, 1.9, 0.95]} />;
  }
}

// ---------------------------------------------------------------- avatar
/** Stylised low-poly person. `motion` lets a parent drive walk / sit / lie poses. */
export function Avatar({ appearance: a, motion }: { appearance: Appearance; motion?: MutableRefObject<Motion> }) {
  const body = useRef<Group>(null);
  const legs = [useRef<Group>(null), useRef<Group>(null)], knees = [useRef<Group>(null), useRef<Group>(null)], arms = [useRef<Group>(null), useRef<Group>(null)];
  const fores = [useRef<Group>(null), useRef<Group>(null)];
  const smooth = useRef([{ x: 0, f: -0.18, z: 0.06 }, { x: 0, f: -0.18, z: -0.06 }]);
  useFrame(({ clock }) => {
    const b = body.current; if (!b) return;
    const m = motion?.current ?? { moving: false, lying: false, sitting: false };
    const t = clock.getElapsedTime();
    const swing = m.moving ? Math.sin(t * 9) * 0.6 : 0;
    // hands: an action only shows while standing still or sitting (never mid-stride, never lying down)
    const act: ActionKind | undefined = m.moving || m.lying ? undefined : m.action;
    [0, 1].forEach((i) => {
      const s = i === 0 ? 1 : -1; // legs[0] is the left leg (-x)
      const l = legs[i].current, k = knees[i].current, r = arms[i].current, fo = fores[i].current;
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
        case 'pushup': tx = -1.3; tf = -0.05 - (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.9; break;
        default: break;
      }
      const sm = smooth.current[i], k2 = m.moving ? 0.5 : 0.18;
      sm.x += (tx - sm.x) * k2; sm.f += (tf - sm.f) * k2; sm.z += (tz - sm.z) * k2;
      if (r) { r.rotation.x = sm.x; r.rotation.z = sm.z; }
      if (fo) fo.rotation.x = sm.f;
    });
    const pushing = act === 'pushup';
    b.rotation.x = MathUtils.lerp(b.rotation.x, m.lying ? -Math.PI / 2 : pushing ? 1.3 : 0, 0.15);
    b.rotation.z = MathUtils.lerp(b.rotation.z, act === 'dance' ? Math.sin(t * 2.5) * 0.1 : 0, 0.2);
    const y = m.lying ? 0.7 : m.sitting ? -0.3 : pushing ? 0.17 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.09 : 0;
    const bob = act === 'dance' ? Math.abs(Math.sin(t * 5)) * 0.07 : m.moving || m.lying || pushing ? 0 : Math.sin(t * 1.6) * 0.006;
    b.position.y = MathUtils.lerp(b.position.y, y + bob, 0.15);
  });
  const skin = material(a.skin, 0.62);
  return (
    <group ref={body}>
      <Part g={P.torso()} m={skin} />
      <Part g={P.neck()} m={skin} />
      <TopGarment a={a} arm="torso" />
      <Bottom a={a} />

      <group position={[0, BODY.headY + 0.012, 0]} scale={1.1}>
        <Face a={a} /><Hair a={a} /><Accessory a={a} />
      </group>
      {a.accessory === 'chain' && (<><Part g={P.ring(0.105, 0.005, 'chain')} m={material('#E5B93C', 0.3, false, 0.8)} pos={[0, 1.375, 0.012]} /><Part g={P.pendant()} m={material('#E5B93C', 0.3, false, 0.8)} pos={[0, 1.29, P.torsoFrontZ(1.29) + 0.014]} /></>)}

      {[-1, 1].map((s, i) => (
        <group key={`arm${s}`} ref={arms[i]} position={[s * BODY.shoulderX, BODY.shoulderY, 0]} rotation={[0, 0, s * 0.06]}>
          <Part g={P.deltoid()} m={skin} />
          <Part g={P.upperArm()} m={skin} />
          <TopGarment a={a} arm="sleeve" />
          <group ref={fores[i]} position={[0, -BODY.upperArm, 0]} rotation={[-0.18, 0, 0]}>
            <Part g={P.foreArm()} m={skin} />
            <TopGarment a={a} arm="fore" />
            <group position={[0, -BODY.forearm, 0]}>
              <Part g={P.hand()} m={skin} />
              <Part g={P.thumb()} m={skin} pos={[s * 0.034, -0.025, 0.012]} rot={[0.2, 0, s * 0.5]} />
            </group>
          </group>
        </group>
      ))}

      {[-1, 1].map((s, i) => (
        <group key={`leg${s}`} ref={legs[i]} position={[s * BODY.hipX, BODY.hipY, 0]}>
          <Part g={P.thigh()} m={skin} />
          <LegGarment a={a} part="thigh" />
          <group ref={knees[i]} position={[0, -BODY.thigh, 0]}>
            <Part g={P.calf()} m={skin} />
            <LegGarment a={a} part="calf" />
            <group position={[0, -BODY.calf + 0.0, 0]}><group position={[0, -0.048, 0]}><Shoe a={a} /></group></group>
          </group>
        </group>
      ))}
    </group>
  );
}
