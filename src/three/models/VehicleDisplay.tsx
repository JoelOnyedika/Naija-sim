import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group, Object3D } from 'three';
import { VEHICLE_MODELS } from '@/data/showroom';
import type { VehicleDef } from '@/data/vehicles';
import { B, Cyl } from './primitives';

/** Cached loads so a model is fetched once. `null` means it failed: the placeholder is used and we do not retry every frame. */
const cache = new Map<string, Promise<Object3D | null>>();
export function loadVehicleModel(url: string): Promise<Object3D | null> {
  let p = cache.get(url);
  if (!p) {
    p = import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new Promise<Object3D | null>((res) => new GLTFLoader().load(url, (g) => res(g.scene), undefined, () => res(null)))).catch(() => null);
    cache.set(url, p);
  }
  return p;
}

/** The stand-in car: simple but readable body shapes per vehicle type. It is a placeholder and the showroom says so. */
function Placeholder({ v }: { v: VehicleDef }) {
  const c = v.color, dark = '#15181B';
  const wheels: [number, number][] = v.type === 'keke' ? [[0, 0.95], [-0.42, -0.7], [0.42, -0.7]] : [[-0.5, 1.2], [0.5, 1.2], [-0.5, -1.2], [0.5, -1.2]];
  const tall = v.type === 'suv' || v.type === 'truck' ? 0.5 : 0.38;
  return (
    <group>
      {wheels.map(([x, z]) => <Cyl key={`${x}${z}`} r={v.type === 'keke' ? 0.22 : 0.3} h={0.2} rot={[0, 0, Math.PI / 2]} pos={[x, v.type === 'keke' ? 0.22 : 0.3, z]} color={dark} rough={0.8} seg={16} />)}
      {v.type === 'keke' ? (
        <group><B size={[0.95, 0.7, 1.6]} pos={[0, 0.7, -0.1]} color={c} rough={0.5} radius={0.1} /><B size={[1.0, 0.06, 1.7]} pos={[0, 1.2, -0.1]} color={dark} rough={0.6} /></group>
      ) : (
        <group>
          <B size={[1.1, tall, v.type === 'sport' ? 3.8 : 3.9]} pos={[0, 0.45 + tall / 2, 0]} color={c} metal={0.3} rough={0.35} radius={0.12} />
          {v.type !== 'truck' && <B size={[0.95, 0.4, v.type === 'sport' ? 1.6 : 2.0]} pos={[0, 0.45 + tall + 0.17, v.type === 'sport' ? -0.1 : -0.15]} color="#9FC4D6" metal={0.2} rough={0.2} radius={0.1} />}
          {v.type === 'truck' && <><B size={[1.05, 0.45, 1.2]} pos={[0, 0.45 + tall + 0.2, 0.6]} color="#9FC4D6" metal={0.2} rough={0.2} radius={0.08} /><B size={[1.05, 0.3, 1.5]} pos={[0, 0.45 + tall + 0.05, -1.1]} color={dark} rough={0.6} radius={0.04} /></>}
        </group>
      )}
    </group>
  );
}

/** One car on a podium. Slowly turns (cheap: one rotation per frame, only while the showroom is open). A real GLB replaces the placeholder if it loads. */
export function VehicleDisplay({ v, selected }: { v: VehicleDef; selected?: boolean }) {
  const g = useRef<Group>(null);
  const url = VEHICLE_MODELS[v.id];
  const [model, setModel] = useState<Object3D | null>(null);
  useEffect(() => { let live = true; if (url) void loadVehicleModel(url).then((m) => { if (live && m) setModel(m.clone(true)); }); return () => { live = false; }; }, [url]);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += Math.min(dt, 0.1) * (selected ? 0.8 : 0.35); });
  return <group ref={g} scale={0.8}>{model ? <primitive object={model} /> : <Placeholder v={v} />}</group>;
}
