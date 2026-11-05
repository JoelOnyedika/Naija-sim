import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CanvasTexture, Color, SRGBColorSpace, type Sprite } from 'three';
import { BOSS_LOOK, lookFor, type RoadChoice } from '@/data/agbero';
import { Person } from '../RoadBlock';
import { Thug } from '../Thug';

/**
 * EXPERIMENT: the same roadblock, but the people are flat 2D drawings standing in a real 3D street (a billboard sprite each), so
 * the camera has depth, the street has perspective and the crew stands at different distances. Costs about 4 sprites and a dozen
 * boxes: a handful of draw calls. The drawings are the same SVGs as the flat version, turned into textures once.
 */
const toTexture = (node: JSX.Element, w: number, h: number): Promise<CanvasTexture> => new Promise((resolve) => {
  const svg = renderToStaticMarkup(node).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'), img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.getContext('2d')!.drawImage(img, 0, 0, w * 2, h * 2); const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; resolve(t); };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});

const SLOTS: Record<number, [number, number, number][]> = { 1: [[1.2, 0, 0.5]], 2: [[0.6, 0, 0.5], [2.4, 0, -0.6]], 3: [[0.1, 0, 0.7], [1.6, 0, -0.7], [3.0, 0, 0.3]] }; // x, y, z (z toward the camera)

function Billboard({ tex, h, aspect, pos, spriteRef }: { tex: CanvasTexture | null; h: number; aspect: number; pos: [number, number, number]; spriteRef?: (s: Sprite | null) => void }) {
  if (!tex) return null;
  return <sprite ref={spriteRef} position={pos} scale={[h * aspect, h, 1]} center={[0.5, 0.04] as never}><spriteMaterial map={tex} transparent alphaTest={0.02} /></sprite>;
}

function Street({ crew, looks, choice, success, finale, onStats }: { crew: number; looks: number[]; choice: RoadChoice | null; success: boolean; finale: boolean; onStats?: (s: unknown) => void }) {
  const gl = useThree((s) => s.gl), tex = useRef<(CanvasTexture | null)[]>([]);
  const heroRef = useRef<Sprite | null>(null), men = useRef<(Sprite | null)[]>([]), t0 = useRef<number | null>(null);
  const slots = SLOTS[Math.max(1, Math.min(3, crew))];
  const [bag, setBag] = useState<{ hero: CanvasTexture | null; men: (CanvasTexture | null)[] }>({ hero: null, men: [] });
  const key = `${crew}|${looks.join(',')}|${finale}`;
  useEffect(() => {
    let live = true;
    void Promise.all([toTexture(<Person skin="#8B5A3C" shirt="#0B8F4D" />, 64, 100), ...slots.map((_, i) => toTexture(<Thug look={finale && i === 0 ? BOSS_LOOK : lookFor(looks[i] ?? i)} mood="idle" />, 87, 137))]).then(([hero, ...men]) => { if (live) setBag({ hero, men }); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  void tex; void gl;
  useFrame(({ clock }) => {
    if (t0.current === null || !choice) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - (t0.current ?? 0), h = heroRef.current;
    if (h) { const x = choice === 'fight' ? Math.min(2.2, t * 2.2) : choice === 'run' ? -Math.min(8, t * 6) : 0; h.position.set(-2.8 + x, Math.abs(Math.sin(clock.elapsedTime * (choice === 'run' ? 14 : 3))) * (choice === 'run' ? 0.25 : 0.04), 1.2); (h.material as { rotation: number }).rotation = choice === 'fight' && !success && t > 0.5 ? -1.2 : 0; }
    men.current.forEach((m, i) => { if (!m) return; const s = slots[i], fall = choice === 'fight' && success && t > 0.7 + i * 0.25; m.position.set(s[0] - (choice === 'fight' ? Math.min(1.4, t * 1.4) : 0) + Math.sin(clock.elapsedTime * 38 + i) * (fall ? 0 : 0.012), s[1] + (fall ? -0.1 : Math.abs(Math.sin(clock.elapsedTime * 2 + i)) * 0.03), s[2]); (m.material as { rotation: number }).rotation = fall ? 1.3 : 0; });
    onStats?.(gl.info.render);
  });
  const hero = bag.hero, mensT = bag.men;
  const building = (x: number, z: number, w: number, h: number, c: string) => <mesh key={`${x}${z}`} position={[x, h / 2, z]}><boxGeometry args={[w, h, 3]} /><meshStandardMaterial color={c} roughness={0.9} /></mesh>;
  return (
    <>
      <color attach="background" args={['#F2C58A']} /><fog attach="fog" args={['#F2C58A', 14, 40]} />
      <hemisphereLight args={['#FFE9C4', '#6F6A66', 1.7]} /><directionalLight position={[-4, 8, 6]} intensity={1.6} color="#FFD9A0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}><planeGeometry args={[60, 40]} /><meshStandardMaterial color="#4B5563" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -9]}><planeGeometry args={[60, 5]} /><meshStandardMaterial color="#9A9086" roughness={1} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-9 + i * 2.4, 0.02, -2.4]}><planeGeometry args={[1.2, 0.14]} /><meshBasicMaterial color="#E6E2D4" /></mesh>)}
      {[[-9, -12, 3, 7, '#D9B88A'], [-5.5, -12.5, 3.4, 11, '#C9B896'], [-1.5, -12, 3.6, 6, '#E2C9A0'], [2.5, -12.5, 3.2, 12, '#B9C7D6'], [6.5, -12, 3.4, 8, '#D9CBA8'], [10, -12.5, 3, 10, '#C9A27A']].map(([x, z, w, h, c]) => building(x as number, z as number, w as number, h as number, c as string))}
      {[-7, 0, 7].map((x) => <group key={x} position={[x, 0, -7.4]}><mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.06, 0.09, 4.4, 6]} /><meshStandardMaterial color="#4B4540" /></mesh><mesh position={[0.5, 4.3, 0]}><boxGeometry args={[1, 0.12, 0.3]} /><meshBasicMaterial color="#FFF3B0" /></mesh></group>)}
      <mesh position={[-0.2, 0.7, -3.6]}><boxGeometry args={[3.6, 1.4, 1.5]} /><meshStandardMaterial color="#E5A400" /></mesh><mesh position={[-0.2, 1.1, -2.84]}><boxGeometry args={[3.4, 0.14, 0.02]} /><meshBasicMaterial color="#222" /></mesh>
      <mesh position={[-2.8, 0.01, 1.2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.5, 16]} /><meshBasicMaterial color="#000" transparent opacity={0.28} /></mesh>
      {slots.map((s, i) => <mesh key={i} position={[s[0], 0.012, s[2]]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.7, 16]} /><meshBasicMaterial color="#000" transparent opacity={0.3} /></mesh>)}
      {hero && <Billboard tex={hero} h={1.9} aspect={0.64} pos={[-2.8, 0, 1.2]} spriteRef={(s) => { heroRef.current = s; }} />}
      {slots.map((s, i) => mensT[i] ? <Billboard key={i} tex={mensT[i]} h={2.7} aspect={0.64} pos={s} spriteRef={(m) => { men.current[i] = m; }} /> : null)}
    </>
  );
}

/** Drop-in for the flat Stage: same inputs. Resize handled by the parent's fixed height. */
export function StreetStage3D({ crew, looks, choice, success, finale = false, onStats }: { crew: number; looks: number[]; choice: RoadChoice | null; success: boolean; finale?: boolean; onStats?: (s: unknown) => void }) {
  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-2xl" style={{ background: new Color('#F2C58A').getStyle() }}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 34, position: [0.4, 2.1, 9.2], near: 0.2, far: 60 }} onCreated={({ camera }) => camera.lookAt(0.4, 1.2, 0)} gl={{ antialias: true }}>
        <Street crew={crew} looks={looks} choice={choice} success={success} finale={finale} onStats={onStats} />
      </Canvas>
    </div>
  );
}
