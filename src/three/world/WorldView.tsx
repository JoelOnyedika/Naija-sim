import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef } from 'react';
import { MOUSE, TOUCH, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MAP } from '@/data/balance';
import { getState } from '@/world/registry';
import { getScene } from './sceneRegistry';

interface Props {
  stateId: string;
  mode: 'landing' | 'map';
  selected?: { type: 'landmark' | 'area'; id: string } | { type: 'point'; x: number; z: number } | null;
  onSelectLandmark?: (id: string) => void;
  onSelectArea?: (id: string) => void;
  /** Dim and slow down (used behind login/signup). */
  calm?: boolean;
  /** Names toggle (map): neighbourhood and district labels, and every landmark name. */
  showNames?: boolean;
}

/** Camera tilt of the map (radians from straight up), set in data/balance.ts. The map is never rotated by the player. */
const MAP_POLAR = MAP.polar;

function Rig({ stateId, mode, selected, calm }: Pick<Props, 'stateId' | 'mode' | 'selected' | 'calm'>) {
  const state = getState(stateId)!;
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const focus = useRef(new Vector3(state.mapData.center[0], 0, state.mapData.center[1]));
  /** True while the camera glides to a selected place; any touch or drag by the player cancels it so panning never fights it. */
  const flying = useRef(false);
  const lim = state.mapData.layout?.sea;
  const K = state.mapData.viewScale ?? 1;

  useEffect(() => {
    const c = state.mapData.center;
    focus.current.set(c[0], 0, c[1]);
    flying.current = false;
    if (mode === 'map') {
      // top-down: straight above the centre, tilted back a touch so buildings read as 3D
      const r = 118 * K;
      camera.position.set(c[0], r * Math.cos(MAP_POLAR), c[1] + r * Math.sin(MAP_POLAR));
    } else {
      const r = 72;
      camera.position.set(c[0] + r * 0.55, r * 0.7, c[1] + r * 0.75);
    }
    controls.current?.target.copy(focus.current);
    controls.current?.update();
  }, [camera, state, mode, K]);

  useEffect(() => {
    if (mode !== 'map') return;
    if (!selected) { flying.current = false; return; }
    const pos = selected.type === 'point' ? ([selected.x, selected.z] as [number, number])
      : selected.type === 'landmark'
        ? state.mapData.landmarks.find((l) => l.id === selected.id)?.position
        : state.areas.find((a) => a.id === selected.id)?.mapData.position;
    if (pos) { focus.current.set(pos[0], 0, pos[1]); flying.current = true; }
  }, [selected, state, mode]);

  useEffect(() => {
    const c = controls.current; if (!c) return;
    const stop = () => { flying.current = false; };
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  useFrame(() => {
    const c = controls.current; if (!c || mode === 'landing') return;
    if (flying.current) {
      const before = c.target.clone();
      c.target.lerp(focus.current, 0.08);
      camera.position.add(c.target.clone().sub(before)); // move the camera with its target so the view glides, not tilts
      if (c.target.distanceToSquared(focus.current) < 0.01) flying.current = false;
    }
    if (lim) { // keep the view over the playable area
      const x = Math.min(lim.x1 - 10, Math.max(lim.x0 + 10, c.target.x)), z = Math.min(lim.z1 - 10, Math.max(lim.z0 + 10, c.target.z));
      if (x !== c.target.x || z !== c.target.z) { camera.position.x += x - c.target.x; camera.position.z += z - c.target.z; c.target.x = x; c.target.z = z; }
    }
    c.update();
  });

  if (mode === 'map') {
    return (
      <OrbitControls
        ref={controls} makeDefault enableDamping dampingFactor={0.12}
        enableRotate={false} enablePan enableZoom screenSpacePanning panSpeed={1.1} zoomSpeed={1.3}
        mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
        minDistance={6} maxDistance={140 * K} minPolarAngle={MAP_POLAR} maxPolarAngle={MAP_POLAR} minAzimuthAngle={0} maxAzimuthAngle={0}
      />
    );
  }
  return (
    <OrbitControls
      ref={controls} makeDefault enableDamping dampingFactor={0.1} autoRotate autoRotateSpeed={calm ? 0.25 : 0.45}
      enableZoom={false} enablePan={false} enableRotate minDistance={14} maxDistance={130} minPolarAngle={0.5} maxPolarAngle={1.22}
    />
  );
}

function Markers({ stateId, selected, onSelectLandmark, onSelectArea, showAreas, showNames }: Pick<Props, 'stateId' | 'selected' | 'onSelectLandmark' | 'onSelectArea'> & { showAreas: boolean; showNames: boolean }) {
  const state = getState(stateId)!;
  return (
    <>
      {state.mapData.landmarks.map((l, i) => {
        const sel = selected?.type === 'landmark' && selected.id === l.id;
        return (
          <Html key={l.id} position={[l.position[0], 3.4, l.position[1]]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onSelectLandmark?.(l.id); }}
              className={`group flex flex-col items-center transition-transform ${sel ? 'scale-125' : 'hover:scale-110'}`}
              style={{ animation: `bob 2.4s ease-in-out ${i * 0.2}s infinite` }}
              aria-label={l.name}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base shadow-glass sm:h-10 sm:w-10 sm:text-xl ring-2 ${sel ? 'bg-danfo ring-white' : 'bg-night/80 ring-danfo/80'} backdrop-blur`}>{l.icon}</span>
              <span className={`mt-1 whitespace-nowrap rounded-full bg-night/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur ${sel || showNames ? 'block' : 'hidden'}`}>{l.name}</span>
              <span className={`-mt-0.5 h-2 w-2 rotate-45 ${sel ? 'bg-danfo' : 'bg-danfo/80'}`} style={{ marginTop: -2 }} />
            </button>
          </Html>
        );
      })}
      {showAreas && (state.mapData.layout?.slabs ?? []).filter((s) => s.label).map((s) => (
        <Html key={s.id} position={[s.cx, 0.4, s.cz]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded-full bg-night/70 px-2 py-0.5 text-[10px] font-bold text-white/85 backdrop-blur">{s.label}</span>
        </Html>
      ))}
      {showAreas && state.areas.map((a) => (
        <Html key={a.id} position={[a.mapData.position[0], 0.6, a.mapData.position[1]]} center zIndexRange={[10, 0]}>
          <button onClick={(e) => { e.stopPropagation(); onSelectArea?.(a.id); }} className={`rounded-full px-2.5 py-1 text-[11px] font-bold shadow-glass backdrop-blur ${selected?.type === 'area' && selected.id === a.id ? 'bg-white text-night' : 'text-white'}`} style={{ background: selected?.type === 'area' && selected.id === a.id ? undefined : `${a.mapData.color}CC` }}>
            {a.name}
          </button>
        </Html>
      ))}
    </>
  );
}

/** Generic world renderer: looks the state's scene up in the registry and overlays markers from its data. */
export function WorldView(props: Props) {
  const state = getState(props.stateId);
  const Scene = state ? getScene(state.visualData.sceneId) : undefined;
  if (!state) return null;
  const { skyTop, skyBottom } = state.visualData;
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 42, near: 0.5, far: 520 * (state.mapData.viewScale ?? 1) }} gl={{ antialias: true }}>
      <color attach="background" args={[skyBottom]} />
      <fog attach="fog" args={[skyBottom, 170 * (state.mapData.viewScale ?? 1), 360 * (state.mapData.viewScale ?? 1)]} />
      <hemisphereLight args={[skyTop, '#C9B58A', 0.9]} />
      <directionalLight position={[30, 40, 20]} intensity={1.6} color="#FFE7B8" />
      <Suspense fallback={null}>{Scene && <Scene state={state} />}</Suspense>
      <Markers stateId={props.stateId} selected={props.selected} onSelectLandmark={props.onSelectLandmark} onSelectArea={props.onSelectArea} showAreas={props.mode === 'map' && !!props.showNames} showNames={!!props.showNames} />
      <Rig stateId={props.stateId} mode={props.mode} selected={props.selected} calm={props.calm} />
    </Canvas>
  );
}
