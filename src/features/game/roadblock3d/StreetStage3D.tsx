import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoxGeometry, BufferAttribute, CanvasTexture, Color, Float32BufferAttribute, SphereGeometry, BackSide, SRGBColorSpace, type InstancedMesh, type Object3D as O3, Object3D, type Sprite } from 'three';
import { BOSS_LOOK, lookFor, type RoadChoice } from '@/data/agbero';
import { CarMesh, Danfo, Keke, Okada } from '@/features/travel/vehicles3d';
import { glassTexture, wallTexture } from '@/features/travel/textures';
import { crowdLook } from '@/features/travel/people';
import { useCharacterStore } from '@/stores/characterStore';
import { Hero } from '../HeroArt';
import { Thug } from '../Thug';

/**
 * The roadblock as a stage: flat 2D drawings (the player and the crew) standing in a real 3D Lagos street at dusk, with perspective,
 * depth, a skyline, palms, lamp posts glowing, a real 3D danfo, keke, okada and a car parked behind. The people are the same SVG art as
 * the flat version, turned into textures once and drawn as camera-facing sprites. Costs about 30 draw calls.
 */
const toTexture = (node: JSX.Element, w: number, h: number): Promise<CanvasTexture> => new Promise((resolve, reject) => {
  const svg = renderToStaticMarkup(node).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'), img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3; c.getContext('2d')!.drawImage(img, 0, 0, w * 3, h * 3); const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; resolve(t); };
  img.onerror = () => reject(new Error('sprite texture failed'));
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const SLOTS: Record<number, [number, number, number][]> = { 1: [[1.4, 0, 0.6]], 2: [[0.5, 0, 0.7], [2.5, 0, -0.5]], 3: [[-0.1, 0, 0.8], [1.6, 0, -0.8], [3.1, 0, 0.4]] };

function Billboard({ tex, h, aspect, pos, spriteRef }: { tex: CanvasTexture; h: number; aspect: number; pos: [number, number, number]; spriteRef: (s: Sprite | null) => void }) {
  return <sprite ref={spriteRef} position={pos} scale={[h * aspect, h, 1]} center={[0.5, 0.04] as never}><spriteMaterial map={tex} transparent alphaTest={0.02} /></sprite>;
}

/** The sunset: a gradient dome, a big low sun, and a skyline of lit towers, all unlit so they stay cheap. */
function Backdrop() {
  const dome = useMemo(() => {
    const g = new SphereGeometry(90, 24, 14), p = g.attributes.position, col = new Float32Array(p.count * 3), top = new Color('#3F4A9A'), mid = new Color('#C9617E'), hor = new Color('#FFB066'), c = new Color();
    for (let i = 0; i < p.count; i++) { const t = Math.max(0, Math.min(1, p.getY(i) / 90)); if (t < 0.25) c.copy(hor).lerp(mid, t / 0.25); else c.copy(mid).lerp(top, (t - 0.25) / 0.75); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new Float32BufferAttribute(col, 3)); return g;
  }, []);
  const towers = useMemo(() => {
    const r = rng(31), out: { x: number; z: number; w: number; h: number; glass: boolean }[] = [];
    for (let i = 0; i < 26; i++) out.push({ x: -34 + i * 2.7 + r() * 1.2, z: -20 - r() * 12, w: 2.4 + r() * 2.2, h: 8 + r() * 26, glass: r() < 0.45 });
    return out;
  }, []);
  const wall = useMemo(() => wallTexture(), []), glass = useMemo(() => glassTexture(), []);
  const geos = useMemo(() => towers.map((t) => { const g = new BoxGeometry(1, t.h, 1); g.translate(0, t.h / 2, 0); const uv = g.attributes.uv as BufferAttribute; for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); if (face === 2 || face === 3) continue; uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * (t.h / 3)); } return g; }), [towers]);
  return (
    <>
      <mesh geometry={dome}><meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} /></mesh>
      <mesh position={[9, 5.5, -60]}><circleGeometry args={[7, 32]} /><meshBasicMaterial color="#FFE2A8" fog={false} /></mesh>
      <mesh position={[9, 5.5, -60.5]}><circleGeometry args={[13, 32]} /><meshBasicMaterial color="#FFB066" transparent opacity={0.35} fog={false} depthWrite={false} /></mesh>
      {towers.map((t, i) => <mesh key={i} geometry={geos[i]} position={[t.x, 0, t.z]} scale={[t.w, 1, t.w]}><meshStandardMaterial map={t.glass ? glass : wall} color={t.glass ? '#E5F0FF' : '#F1D9B8'} emissive="#FFC77A" emissiveIntensity={0.18} roughness={0.8} /></mesh>)}
    </>
  );
}

/** Palms, lamp posts with warm glows, and low buildings along the far kerb: instanced. */
function Furniture() {
  const palms = useRef<InstancedMesh>(null), crowns = useRef<InstancedMesh>(null), lamps = useRef<InstancedMesh>(null), globes = useRef<InstancedMesh>(null), shops = useRef<InstancedMesh>(null);
  const spots = useMemo(() => ({ palms: [[-7.5, -8.4], [-2.2, -8.8], [5.5, -8.6], [9.5, -8.4], [-11, -6.4]] as [number, number][], lamps: [[-6, -7.6], [1.2, -7.6], [8.2, -7.6]] as [number, number][], shops: [[-9.5, -11.5, 4.6, 3.6, '#C9A27A'], [-4.2, -11.8, 5, 4.4, '#B9C7D6'], [1.4, -11.6, 4.8, 3.4, '#D9CBA8'], [6.8, -11.9, 5.2, 4.6, '#E2C9A0'], [12, -11.5, 4.4, 3.8, '#C9B896']] as [number, number, number, number, string][] }), []);
  useEffect(() => {
    const d = new Object3D();
    spots.palms.forEach(([x, z], i) => { d.position.set(x, 2.4, z); d.rotation.set(0, 0, (i % 2 ? 1 : -1) * 0.08); d.scale.set(1, 1, 1); d.updateMatrix(); palms.current?.setMatrixAt(i, d.matrix); d.position.set(x + (i % 2 ? -0.3 : 0.3), 5, z); d.rotation.set(0, i, 0); d.scale.set(1.9, 0.5, 1.9); d.updateMatrix(); crowns.current?.setMatrixAt(i, d.matrix); });
    spots.lamps.forEach(([x, z], i) => { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 2.3, z); d.updateMatrix(); lamps.current?.setMatrixAt(i, d.matrix); d.position.set(x + 0.55, 4.55, z); d.scale.set(1, 1, 1); d.updateMatrix(); globes.current?.setMatrixAt(i, d.matrix); });
    const c = new Color(); spots.shops.forEach(([x, z, w, h, col], i) => { d.rotation.set(0, 0, 0); d.position.set(x, h / 2, z); d.scale.set(w, h, 3); d.updateMatrix(); shops.current?.setMatrixAt(i, d.matrix); shops.current?.setColorAt(i, c.set(col)); });
    [palms, crowns, lamps, globes, shops].forEach((r) => { if (r.current) { r.current.instanceMatrix.needsUpdate = true; if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true; } });
  }, [spots]);
  return (
    <>
      <instancedMesh ref={palms} args={[undefined, undefined, spots.palms.length]}><cylinderGeometry args={[0.14, 0.22, 4.8, 7]} /><meshStandardMaterial color="#8A6B4A" /></instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, spots.palms.length]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#2F8A55" /></instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, spots.lamps.length]}><cylinderGeometry args={[0.07, 0.1, 4.6, 6]} /><meshStandardMaterial color="#4B4540" /></instancedMesh>
      <instancedMesh ref={globes} args={[undefined, undefined, spots.lamps.length]}><sphereGeometry args={[0.28, 10, 8]} /><meshBasicMaterial color="#FFE9A0" /></instancedMesh>
      <instancedMesh ref={shops} args={[undefined, undefined, spots.shops.length]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial vertexColors={false} color="#ffffff" roughness={0.9} /></instancedMesh>
    </>
  );
}

function Street({ crew, looks, choice, success, finale, onStats }: { crew: number; looks: number[]; choice: RoadChoice | null; success: boolean; finale: boolean; onStats?: (s: unknown) => void }) {
  const heroRef = useRef<Sprite | null>(null), men = useRef<(Sprite | null)[]>([]), t0 = useRef<number | null>(null), slots = SLOTS[Math.max(1, Math.min(3, crew))];
  const [bag, setBag] = useState<{ hero: CanvasTexture | null; men: CanvasTexture[] }>({ hero: null, men: [] });
  const key = `${crew}|${looks.join(',')}|${finale}`;
  useEffect(() => {
    let live = true;
    void Promise.all([toTexture(<Hero look={useCharacterStore.getState().appearance} />, 66, 95), ...slots.map((_, i) => toTexture(<Thug look={finale && i === 0 ? BOSS_LOOK : lookFor(looks[i] ?? i)} mood="idle" />, 87, 137))]).then(([hero, ...m]) => { if (live) setBag({ hero, men: m }); }).catch(() => undefined);
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const dust = useRef<(O3 | null)[]>([]);
  useFrame(({ clock, gl }) => {
    if (t0.current === null || !choice) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - (t0.current ?? 0), h = heroRef.current, e = clock.elapsedTime;
    if (h) {
      const x = choice === 'fight' ? Math.min(2.3, t * 2.3) : choice === 'run' ? -Math.min(9, t * 6.5) : 0;
      h.position.set(-2.9 + x, Math.abs(Math.sin(e * (choice === 'run' ? 14 : 3))) * (choice === 'run' ? 0.25 : 0.04), 1.3);
      (h.material as { rotation: number }).rotation = choice === 'fight' && !success && t > 0.5 ? -1.25 : choice === 'fight' && t < 0.6 ? Math.sin(e * 20) * 0.08 : 0;
    }
    men.current.forEach((m, i) => {
      if (!m) return; const s = slots[i], fall = choice === 'fight' && success && t > 0.7 + i * 0.25, attack = (choice === 'fight' || choice === 'run') && !fall, cheer = choice === 'fight' && !success && t > 0.5;
      const dx = choice === 'fight' ? -Math.min(1.5, t * 1.5) : choice === 'run' ? -Math.min(success ? 0.6 : 5, t * (success ? 0.6 : 4)) : 0;
      m.position.set(s[0] + dx + (attack ? Math.sin(e * 40 + i) * 0.02 : 0), s[1] + (fall ? -0.1 : Math.abs(Math.sin(e * (cheer ? 9 : 2) + i)) * (cheer ? 0.22 : 0.03)), s[2]);
      (m.material as { rotation: number }).rotation = fall ? 1.3 : attack ? Math.sin(e * 15 + i) * 0.1 : cheer ? Math.sin(e * 12 + i) * 0.12 : Math.sin(e * 1.6 + i) * 0.015;
    });
    dust.current.forEach((d, i) => { if (!d) return; const on = (choice === 'fight' && t < 1.6) || (choice === 'run' && t < 1.4), k = on ? ((t * 1.2 + i * 0.2) % 1) : 1; d.visible = on; d.position.set(choice === 'run' ? -2.9 + -Math.min(9, t * 6.5) + 0.6 : 0.6 + i * 0.5, 0.2 + k * 0.9, 1.3 + (i % 2) * 0.3); d.scale.setScalar(0.25 + k * 0.9); (d as unknown as { material: { opacity: number } }).material.opacity = 0.55 * (1 - k); });
    onStats?.(gl.info.render);
  });
  const { hero, men: mensT } = bag, fx = { choice };
  void fx;
  return (
    <>
      <fog attach="fog" args={['#F0A06A', 16, 52]} />
      <hemisphereLight args={['#FFD9A8', '#5B4A5E', 1.5]} /><directionalLight position={[8, 5, 6]} intensity={1.9} color="#FFB872" />
      <Backdrop />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}><planeGeometry args={[90, 44]} /><meshStandardMaterial color="#4A4F5A" roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -8.6]}><planeGeometry args={[90, 4.5]} /><meshStandardMaterial color="#B3A69A" roughness={1} /></mesh>
      <mesh position={[0, 0.09, -6.3]}><boxGeometry args={[90, 0.18, 0.4]} /><meshStandardMaterial color="#D8D3C8" /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-13 + i * 2.5, 0.02, -2.6]}><planeGeometry args={[1.3, 0.15]} /><meshBasicMaterial color="#E6E2D4" /></mesh>)}
      <Furniture />
      <group position={[-4.2, 0, -6.2]} rotation={[0, Math.PI * 0.12, 0]}><Danfo slogan={3} /></group>
      <group position={[4.8, 0, -4.8]} rotation={[0, -Math.PI * 0.55, 0]}><Keke driver={1} hex="#3FA66B" /></group>
      <group position={[8.6, 0, -2.4]} rotation={[0, -Math.PI * 0.35, 0]}><Okada rider={crowdLook(5)} /></group>
      <group position={[-8.6, 0, -3.2]} rotation={[0, Math.PI * 0.35, 0]}><CarMesh kind="sedan" hex="#2B4C7E" /></group>
      {[0, 1, 2].map((i) => <sprite key={i} ref={(d) => { dust.current[i] = d as unknown as O3; }} visible={false}><spriteMaterial color="#E9D8B8" transparent opacity={0.5} depthWrite={false} /></sprite>)}
      <mesh position={[-2.9, 0.012, 1.3]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.5, 16]} /><meshBasicMaterial color="#000" transparent opacity={0.3} /></mesh>
      {slots.map((s, i) => <mesh key={i} position={[s[0], 0.012, s[2]]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.75, 16]} /><meshBasicMaterial color="#000" transparent opacity={0.32} /></mesh>)}
      {hero && <Billboard tex={hero} h={2.3} aspect={0.69} pos={[-2.9, 0, 1.3]} spriteRef={(s) => { heroRef.current = s; }} />}
      {slots.map((s, i) => mensT[i] ? <Billboard key={i} tex={mensT[i]} h={3.1} aspect={0.64} pos={s} spriteRef={(m) => { men.current[i] = m; }} /> : null)}
    </>
  );
}

/** Drop-in for the flat Stage: same inputs. */
export default function StreetStage3D({ crew, looks, choice, success, finale = false, onStats, onFail }: { crew: number; looks: number[]; choice: RoadChoice | null; success: boolean; finale?: boolean; onStats?: (s: unknown) => void; onFail?: () => void }) {
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} camera={{ fov: 34, position: [0.6, 2.4, 12.8], near: 0.2, far: 120 }} onCreated={({ camera, gl }) => { camera.lookAt(0.6, 1.7, 0); gl.domElement.addEventListener('webglcontextlost', () => onFail?.()); }} gl={{ antialias: true }}>
        <Street crew={crew} looks={looks} choice={choice} success={success} finale={finale} onStats={onStats} />
      </Canvas>
    </div>
  );
}
