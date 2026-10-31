import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Color, DoubleSide, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { carModelUrl } from '@/data/showroom';
import type { VehicleDef } from '@/data/vehicles';
import { Vehicle } from './vehicles';

/**
 * The player's own cars: real GLB models from public/models/cars/ (baked to 4.5 m long, centred, wheels on the floor, front toward +z,
 * the same as the procedural cars, so they drop in anywhere a Vehicle goes). Only cars the player owns or is shown (garage, showroom,
 * the road) use these; every other car on screen stays procedural so traffic stays cheap.
 */
const LOCAL_ONLY = false; // no Draco decoder is fetched from the internet: our files are not Draco-compressed
export const preloadCar = (model: string) => { try { useGLTF.preload(carModelUrl(model), LOCAL_ONLY); } catch { /* preload is only a head start */ } };

/** The car body takes the car's colour; glass, tyres and rims keep sensible looks whatever the file shipped with. */
function tune(root: Object3D, color: string, made: Material[]) {
  root.traverse((o: Object3D) => {
    const m = o as Mesh; if (!m.isMesh) return;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((src) => {
      const mat = src.clone() as MeshStandardMaterial; made.push(mat);
      if (mat.name === 'MAT_BODY') { mat.color = new Color(color); mat.metalness = 0.3; mat.roughness = 0.35; }
      else if (mat.name === 'MAT_GLASS' || mat.name === 'GLASS') { mat.color = new Color('#10181F'); mat.transparent = true; mat.opacity = 0.72; mat.metalness = 0.2; mat.roughness = 0.08; mat.side = DoubleSide; mat.depthWrite = false; }
      else if (mat.name === 'MAT_TIRE') { mat.color = new Color('#15171A'); mat.roughness = 0.9; mat.metalness = 0; }
      return mat;
    });
    m.material = Array.isArray(m.material) ? mats : mats[0];
  });
}

function CarModel({ model, color }: { model: string; color: string }) {
  const { scene } = useGLTF(carModelUrl(model), LOCAL_ONLY) as unknown as { scene: Object3D };
  const { obj, made } = useMemo(() => { const made: Material[] = []; const obj = scene.clone(true); tune(obj, color, made); return { obj, made }; }, [scene, color]);
  useEffect(() => () => { made.forEach((m) => m.dispose()); }, [made]);
  return <primitive object={obj} />;
}

/** If the file is missing or broken, show the procedural car instead of crashing the whole scene. */
class Guard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn('[cars] model failed to load, using the procedural car', e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * The one component to draw one of the player's cars anywhere (garage, showroom, road). Cars with a GLB use it (the procedural car
 * shows for the split second it loads, or if it fails); cars without one use the procedural body. `placeholder` lets the showroom
 * keep its more detailed stand-in.
 */
export function PlayerCar({ def, placeholder }: { def: Pick<VehicleDef, 'type' | 'color' | 'model'>; placeholder?: ReactNode }) {
  const stand = placeholder ?? <Vehicle body={def.type} color={def.color} />;
  if (!def.model) return <>{stand}</>;
  return <Guard fallback={stand}><Suspense fallback={stand}><CarModel model={def.model} color={def.color} /></Suspense></Guard>;
}
