import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D, type Group } from 'three';
import { B, Cyl } from '@/three/models/primitives';

/**
 * Murtala Muhammed International Airport, laid out on the 'airport' land slab (x -34.5..-0.5, z -48..-34): two parallel
 * east-west runways at the north, a taxiway and the apron in front of the terminal (the terminal itself is the
 * 'lagos.mmia' landmark), connector taxiways, parked aircraft, and one aircraft landing and one taking off in a loop.
 * Landside (the road to the terminal) is the south edge; airside is north of the terminal.
 */
const X0 = -33, X1 = -3, Y = 0.082;
const RUNWAYS = [{ z: -46.3, name: 'R1' }, { z: -43.7, name: 'R2' }];
const TAXI_Z = -41.9, APRON = { x: -14, z: -40.3, w: 14, d: 1.8 };
const CONNECTORS = [-31, -22, -14, -5];

function Jet({ scale = 1 }: { scale?: number }) { // nose along +z
  return (
    <group scale={scale}>
      <Cyl r={0.13} h={1.5} pos={[0, 0.2, 0]} rot={[Math.PI / 2, 0, 0]} color="#F4F6F8" seg={12} />
      <B size={[1.7, 0.03, 0.34]} pos={[0, 0.18, -0.05]} color="#E9EDF0" radius={0.01} />
      <B size={[0.55, 0.03, 0.2]} pos={[0, 0.2, -0.65]} color="#E9EDF0" radius={0.01} />
      <B size={[0.03, 0.28, 0.24]} pos={[0, 0.36, -0.65]} color="#0B8F4D" radius={0.01} />
      {[-0.4, 0.4].map((x) => <Cyl key={x} r={0.05} h={0.28} pos={[x, 0.1, 0.0]} rot={[Math.PI / 2, 0, 0]} color="#C9CED3" seg={8} />)}
    </group>
  );
}

function Dashes() {
  const ref = useRef<InstancedMesh>(null);
  const per = Math.floor((X1 - X0) / 0.9);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new Object3D(); let i = 0;
    for (const rw of RUNWAYS) for (let k = 0; k < per; k++) { o.position.set(X0 + 0.6 + k * 0.9, Y + 0.014, rw.z); o.scale.set(0.45, 0.01, 0.05); o.rotation.set(0, 0, 0); o.updateMatrix(); m.setMatrixAt(i++, o.matrix); }
    m.instanceMatrix.needsUpdate = true;
  }, [per]);
  return <instancedMesh ref={ref} args={[undefined, undefined, per * RUNWAYS.length]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#F1EEE4" /></instancedMesh>;
}

/** One aircraft on a looping approach/departure along a runway. t: 0..1 over `period` seconds; invisible between flights. */
function Flight({ z, dir, period, offset }: { z: number; dir: 1 | -1; period: number; offset: number }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const f = g.current; if (!f) return;
    const t = (((clock.getElapsedTime() / period + offset) % 1) + 1) % 1;
    const len = X1 - X0;
    let x: number, y: number, pitch: number, vis = true;
    if (dir === 1) { // take-off: accelerate along the runway, rotate, climb out east past the map edge
      if (t < 0.5) { const u = t / 0.5; x = X0 + 1 + u * u * (len * 0.8); y = 0; pitch = 0; }
      else if (t < 0.85) { const u = (t - 0.5) / 0.35; x = X0 + 1 + len * 0.8 + u * 14; y = u * u * 5; pitch = 0.22; }
      else { x = 0; y = 0; pitch = 0; vis = false; }
    } else { // landing: descend from the east, touch down near the east end, roll out west and stop
      if (t < 0.4) { const u = t / 0.4; x = X1 + 14 - u * 14; y = 4.5 * (1 - u) * (1 - u); pitch = -0.12; }
      else if (t < 0.8) { const u = (t - 0.4) / 0.4; x = X1 - (1 - (1 - u) * (1 - u)) * len * 0.6; y = 0; pitch = 0; }
      else { x = 0; y = 0; pitch = 0; vis = false; }
    }
    f.visible = vis;
    f.position.set(x, 0.1 + y, z);
    f.rotation.set(0, dir * Math.PI / 2, 0);
    f.children[0].rotation.x = -pitch * dir; // nose up on climb / nose down on approach
  });
  return <group ref={g} visible={false}><group><Jet scale={1.2} /></group></group>;
}

export function Airport() {
  return (
    <group>
      {RUNWAYS.map((rw) => (
        <group key={rw.name}>
          <mesh position={[(X0 + X1) / 2, Y, rw.z]}><boxGeometry args={[X1 - X0 + 1.5, 0.02, 0.95]} /><meshStandardMaterial color="#2B2E33" roughness={0.95} /></mesh>
          {[X0 - 0.2, X1 + 0.2].map((x) => <mesh key={x} position={[x, Y + 0.012, rw.z]}><boxGeometry args={[0.18, 0.01, 0.8]} /><meshBasicMaterial color="#F1EEE4" /></mesh>)}
        </group>
      ))}
      <Dashes />
      <mesh position={[(X0 + X1) / 2, Y, TAXI_Z]}><boxGeometry args={[X1 - X0, 0.02, 0.42]} /><meshStandardMaterial color="#3A3D42" roughness={0.95} /></mesh>
      {CONNECTORS.map((x) => <mesh key={x} position={[x, Y, (TAXI_Z + RUNWAYS[1].z) / 2]}><boxGeometry args={[0.42, 0.02, Math.abs(RUNWAYS[1].z - TAXI_Z) + 0.4]} /><meshStandardMaterial color="#3A3D42" roughness={0.95} /></mesh>)}
      <mesh position={[APRON.x, Y, APRON.z]}><boxGeometry args={[APRON.w, 0.02, APRON.d]} /><meshStandardMaterial color="#6C7077" roughness={0.95} /></mesh>
      {[-18.5, -15.5, -12.5, -9.5].map((x) => <group key={x} position={[x, 0.1, APRON.z]} rotation={[0, Math.PI, 0]}><Jet scale={1.1} /></group>)}
      <Flight z={RUNWAYS[0].z} dir={1} period={28} offset={0} />
      <Flight z={RUNWAYS[1].z} dir={-1} period={28} offset={0.5} />
    </group>
  );
}
