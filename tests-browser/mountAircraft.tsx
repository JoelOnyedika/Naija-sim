// TEST-ONLY helper (the game never imports this): mounts one aircraft in a bare 3D view so screenshots do not depend on the game flow.
import { Canvas } from '@react-three/fiber';
import { createRoot, type Root } from 'react-dom/client';
import { AIRCRAFT, defaultLivery, type Livery } from '@/data/aircraft';
import { AircraftModel } from '@/three/models/aircraft';

let root: Root | null = null;
export function mountAircraft(id: string, az: number, el: number, name = 'JOEL', patch: Partial<Livery> = {}, w = 520, h = 360) {
  const def = AIRCRAFT.find((a) => a.id === id)!, lv = { ...defaultLivery(def, name), ...patch };
  let d = document.getElementById('air'); if (!d) { d = document.createElement('div'); d.id = 'air'; document.body.appendChild(d); }
  d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:linear-gradient(#9fc3e8,#e8f0f3)`;
  root?.unmount(); root = createRoot(d);
  const r = 9.5, x = r * Math.cos(el) * Math.sin(az), y = r * Math.sin(el) + 1.3, z = r * Math.cos(el) * Math.cos(az);
  root.render(
    <Canvas camera={{ position: [x, y, z], fov: 38, near: 0.1, far: 100 }} onCreated={({ camera }) => camera.lookAt(0, 1.4, 0)} gl={{ preserveDrawingBuffer: true }}>
      <hemisphereLight args={['#fff4dc', '#9a8d78', 0.9]} /><directionalLight position={[6, 10, 7]} intensity={1.7} /><ambientLight intensity={0.25} />
      <AircraftModel def={def} livery={lv} />
    </Canvas>,
  );
}
