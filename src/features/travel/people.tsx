import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, Float32BufferAttribute, MathUtils, MeshStandardMaterial, Object3D, type BufferGeometry, type InstancedMesh, type Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildCharacter, toSpec, type Rig } from '@/three/character/build';
import type { Appearance } from '@/types/game';

/**
 * Real people for the travel scene. They are the same sculpted low-poly characters used everywhere else (three/character/build.ts),
 * "baked": the rig is posed once, its ~60 meshes are merged into ONE mesh with vertex colours, and many copies are drawn with
 * instancing. So a crowd costs a handful of draw calls instead of thousands, and nobody is a box.
 */
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const SKIN = ['#F1C9A5', '#B77B4E', '#8A5A3C', '#6B4128', '#4A2C1B'];
const TOP = ['#E4572E', '#2B8C5B', '#8A63D2', '#FFC21A', '#2B4C7E', '#F4F1EA', '#C23B3B', '#19C3A6', '#E8A0BF'];
const BOTTOM = ['#1F2A44', '#2B2B2B', '#5B4636', '#2B4C7E', '#6B2D5C', '#C9B896'];

/** A spread of ordinary Lagos street people: a mix of body types, hair, clothes and colours. */
export function crowdLook(i: number): Appearance {
  const r = rng(1000 + i * 77), pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const femme = i % 2 === 0;
  return {
    skin: pick(SKIN), body: femme ? 'femme' : 'masc', eye: '#2A1A10', beard: !femme && r() < 0.3 ? 'stubble' : 'none',
    hairStyle: femme ? pick(['braids', 'afro', 'bun', 'cornrows', 'twists'] as const) : pick(['fade', 'lowcut', 'afro', 'dreads', 'bald'] as const), hairColor: '#17110D',
    top: femme ? pick(['tee', 'shirt', 'jacket'] as const) : pick(['tee', 'shirt', 'hoodie', 'kaftan', 'jersey'] as const), topColor: pick(TOP),
    bottom: femme ? (r() < 0.45 ? 'dress' : pick(['jeans', 'skirt', 'trousers'] as const)) : pick(['jeans', 'shorts', 'trousers'] as const), bottomColor: pick(BOTTOM),
    shoes: pick(['sneakers', 'sandals', 'boots'] as const), shoeColor: '#EDEDED', accessory: r() < 0.2 ? 'glasses' : 'none',
  };
}

export type PoseName = 'stride' | 'sit';
function setPose(rig: Rig, pose: PoseName) {
  if (pose === 'stride') {
    rig.hipL.rotation.x = 0.5; rig.hipR.rotation.x = -0.5; rig.kneeL.rotation.x = 0.05; rig.kneeR.rotation.x = 0.55;
    rig.shoulderL.rotation.x = -0.45; rig.shoulderR.rotation.x = 0.45; rig.elbowL.rotation.x = -0.25; rig.elbowR.rotation.x = -0.45;
  } else { // seated, hands forward on the handlebar or the lap
    rig.hipL.rotation.x = rig.hipR.rotation.x = -1.4; rig.kneeL.rotation.x = rig.kneeR.rotation.x = 1.45;
    rig.shoulderL.rotation.x = rig.shoulderR.rotation.x = -0.95; rig.elbowL.rotation.x = rig.elbowR.rotation.x = -0.35;
  }
}
const bakedMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, side: DoubleSide });
const cache = new Map<string, BufferGeometry>();

/** One merged mesh for a character in a pose. Geometry is shared and cached by look and pose. */
export function bakeCharacter(look: Appearance, pose: PoseName, lean = false): BufferGeometry {
  const key = `${JSON.stringify(look)}|${pose}|${lean}`; const hit = cache.get(key); if (hit) return hit;
  const rig = buildCharacter(toSpec(look)); setPose(rig, pose); if (pose === 'sit') rig.body.position.y = -0.3; rig.root.updateMatrixWorld(true);
  const parts: BufferGeometry[] = [];
  rig.root.traverse((o) => {
    const m = o as Mesh; if (!m.isMesh) return;
    // lean = the version for far-away crowds: skip the tiny parts (eyes, brows, nose, mouth, buttons, rings) nobody can see at that size
    if (lean) { m.geometry.computeBoundingSphere(); if ((m.geometry.boundingSphere?.radius ?? 1) * Math.max(m.scale.x, m.scale.y, m.scale.z) < 0.045) return; }
    let g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    const c = new Color((m.material as MeshStandardMaterial).color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new Float32BufferAttribute(col, 3)); parts.push(g);
  });
  const merged = mergeGeometries(parts, false)!; parts.forEach((p) => p.dispose()); rig.dispose();
  cache.set(key, merged); return merged;
}
export function disposeBakedPeople() { cache.forEach((g) => g.dispose()); cache.clear(); }

/** A seated person (rider, passenger, driver) drawn as one mesh. `y` lifts them onto a seat. */
export function SeatedPerson({ look, pos = [0, 0, 0], rot = 0, scale = 1 }: { look: Appearance; pos?: [number, number, number]; rot?: number; scale?: number }) {
  const g = useMemo(() => bakeCharacter(look, 'sit'), [look]);
  return <mesh geometry={g} material={bakedMat} position={pos} rotation={[0, rot, 0]} scale={scale} />;
}

/** A moving crowd of real people on the pavements, instanced per look. */
export function Crowd({ count, rain, speed, lanes, range }: { count: number; rain: boolean; speed: { current: number }; lanes: number[]; range: readonly [number, number] }) {
  const LOOKS = 8, dummy = useMemo(() => new Object3D(), []);
  const people = useMemo(() => {
    const r = rng(404);
    return Array.from({ length: count }, (_, i) => ({ look: i % LOOKS, x: lanes[Math.floor(r() * lanes.length)] + (r() - 0.5) * 0.5, z: range[0] + r() * (range[1] - range[0]), dir: r() < 0.5 ? 1 : -1, sp: 1 + r() * 0.7, ph: r() * 6, s: 0.94 + r() * 0.12, hasUmb: rain && r() < 0.7 }));
  }, [count, rain, lanes, range]);
  const groups = useMemo(() => Array.from({ length: LOOKS }, (_, v) => people.map((p, i) => ({ p, i })).filter((x) => x.p.look === v)), [people]);
  const geos = useMemo(() => Array.from({ length: LOOKS }, (_, v) => bakeCharacter(crowdLook(v), 'stride', true)), []);
  const meshes = useRef<(InstancedMesh | null)[]>([]), brella = useRef<InstancedMesh>(null);
  useEffect(() => { const c = new Color(); const cols = ['#E4572E', '#FFC21A', '#2B8C5B', '#8A63D2', '#2B4C7E', '#C23B3B', '#19C3A6']; people.forEach((_, i) => { brella.current?.setColorAt(i, c.set(cols[i % cols.length])); }); if (brella.current?.instanceColor) brella.current.instanceColor.needsUpdate = true; }, [people]);
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25), t = clock.elapsedTime, span = range[1] - range[0];
    people.forEach((p) => { p.z += (speed.current + p.dir * p.sp) * dt; if (p.z > range[1]) p.z -= span; if (p.z < range[0]) p.z += span; });
    groups.forEach((list, v) => {
      const m = meshes.current[v]; if (!m) return;
      list.forEach(({ p }, j) => { const bob = Math.abs(Math.sin(t * 7 + p.ph)) * 0.05; dummy.position.set(p.x, bob, p.z); dummy.rotation.set(0, p.dir > 0 ? 0 : Math.PI, Math.sin(t * 3.5 + p.ph) * 0.05); dummy.scale.setScalar(p.s); dummy.updateMatrix(); m.setMatrixAt(j, dummy.matrix); });
      m.instanceMatrix.needsUpdate = true;
    });
    if (brella.current) { people.forEach((p, i) => { dummy.position.set(p.x, p.hasUmb ? 2.15 + (i % 5) * 0.04 : -50, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); brella.current!.setMatrixAt(i, dummy.matrix); }); brella.current.instanceMatrix.needsUpdate = true; }
  });
  return (
    <>
      {groups.map((list, v) => list.length > 0 && <instancedMesh key={v} ref={(m) => { meshes.current[v] = m; }} args={[geos[v], bakedMat, list.length]} frustumCulled={false} />)}
      <instancedMesh ref={brella} args={[undefined, undefined, count]} frustumCulled={false}><coneGeometry args={[0.62, 0.28, 10, 1, true]} /><meshStandardMaterial roughness={0.7} side={DoubleSide} /></instancedMesh>
    </>
  );
}
void MathUtils;
