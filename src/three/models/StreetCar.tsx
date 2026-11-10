import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { MeshStandardMaterial, type BufferGeometry, type InstancedMesh, type Material, type Mesh, type Object3D, type Texture } from 'three';
import { STREET_MODELS, streetCarUrl, type StreetModel } from '@/data/streetCars';

/**
 * Low-poly street cars (see data/streetCars.ts). Each GLB holds exactly two meshes: `body` (textured, takes the car's colour) and `trim`
 * (tyres, bumpers, wheel discs, with vertex colours). Both are drawn with shared geometry and shared materials, so one car is two draw calls
 * and a whole street of them is two instanced draw calls per model.
 */
const NO_DRACO = false; // our files are not Draco-compressed, so no decoder is fetched from the internet
export const preloadStreetCars = () => { for (const m of STREET_MODELS) { try { useGLTF.preload(streetCarUrl(m), NO_DRACO); } catch { /* a head start only */ } } };

interface Parts { body: BufferGeometry; trim: BufferGeometry; map: Texture | null; trimMat: Material; instMat: MeshStandardMaterial; tints: Map<string, MeshStandardMaterial> }
const built = new WeakMap<Object3D, Parts>();

function partsOf(scene: Object3D): Parts {
  const hit = built.get(scene); if (hit) return hit;
  let body: Mesh | null = null, trim: Mesh | null = null;
  scene.traverse((o) => { const m = o as Mesh; if (!m.isMesh) return; if (m.name === 'body') body = m; else if (m.name === 'trim') trim = m; });
  if (!body || !trim) throw new Error('street car file must hold a `body` and a `trim` mesh');
  const b = body as Mesh, t = trim as Mesh, map = (b.material as MeshStandardMaterial).map ?? null;
  const mk = (hex: string) => new MeshStandardMaterial({ map, color: hex, roughness: 0.5, metalness: 0.12 });
  const parts: Parts = { body: b.geometry, trim: t.geometry, map, trimMat: t.material as Material, instMat: mk('#ffffff'), tints: new Map() };
  built.set(scene, parts); return parts;
}
function useParts(model: StreetModel): Parts {
  const { scene } = useGLTF(streetCarUrl(model), NO_DRACO) as unknown as { scene: Object3D };
  return useMemo(() => partsOf(scene), [scene]);
}
const tinted = (p: Parts, hex: string) => { let m = p.tints.get(hex); if (!m) { m = new MeshStandardMaterial({ map: p.map, color: hex, roughness: 0.5, metalness: 0.12 }); p.tints.set(hex, m); } return m; };

function One({ model, color }: { model: StreetModel; color: string }) {
  const p = useParts(model);
  return <group><mesh geometry={p.body} material={tinted(p, color)} /><mesh geometry={p.trim} material={p.trimMat} /></group>;
}

/** If a file is missing or broken, draw the fallback (the old procedural car) instead of crashing the scene. */
class Guard extends Component<{ children: ReactNode; fallback: ReactNode; what: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn(`[street cars] ${this.props.what} failed to load, using the simple car`, e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** One street car, painted `color`. While the (small, local) file loads nothing is drawn; if it cannot load, `fallback` is drawn. */
export function StreetCar({ model, color, fallback = null, children }: { model: StreetModel; color: string; fallback?: ReactNode; children?: ReactNode }) {
  return <Guard fallback={fallback} what={model}><Suspense fallback={null}><One model={model} color={color} />{children}</Suspense></Guard>;
}

/** The two instanced meshes (body, trim) for `n` cars of one model. Colour each instance with setColorAt on the body mesh. */
function FleetMeshes({ model, n, refBody, refTrim }: { model: StreetModel; n: number; refBody: (m: InstancedMesh | null) => void; refTrim: (m: InstancedMesh | null) => void }) {
  const p = useParts(model);
  return <><instancedMesh ref={refBody} args={[p.body, p.instMat, n]} frustumCulled={false} /><instancedMesh ref={refTrim} args={[p.trim, p.trimMat, n]} frustumCulled={false} /></>;
}
export function StreetFleet({ model, n, refBody, refTrim, fallback }: { model: StreetModel; n: number; refBody: (m: InstancedMesh | null) => void; refTrim: (m: InstancedMesh | null) => void; fallback: ReactNode }) {
  return <Guard fallback={fallback} what={`${model} traffic`}><Suspense fallback={null}><FleetMeshes model={model} n={n} refBody={refBody} refTrim={refTrim} /></Suspense></Guard>;
}
