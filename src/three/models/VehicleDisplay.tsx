import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { VehicleDef } from '@/data/vehicles';
import { PlayerCar } from './CarModel';

/** One car on a podium. Slowly turns (cheap: one rotation per frame, only while the showroom is open). Always the real model. */
export function VehicleDisplay({ v, selected }: { v: VehicleDef; selected?: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += Math.min(dt, 0.1) * (selected ? 0.8 : 0.35); });
  return <group ref={g} scale={0.88}><PlayerCar def={v} /></group>;
}
