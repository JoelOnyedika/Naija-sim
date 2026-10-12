import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { BoxGeometry, CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { getVehicle } from '@/data/vehicles';
import { useVehicleStore } from '@/stores/vehicleStore';
import type { FloorKind, PropertyLayout, Zone } from '@/types/world';
import { carSlots, carportBounds, parkingSignPos, type CarSlot } from '@/world/layoutGeometry';
import { Vehicle } from '../models/vehicles';
import { floorTexture, skylineTexture } from '../textures';
import { Water } from '../world/Water';
import { DecorItem } from './Decor';
import { Fence } from './Fence';
import { Walls } from './Walls';
import { isFinishable, useHomeFinishes } from './useHomeFinishes';

const OUTER: Partial<Record<FloorKind, string>> = { dirt: '#8A7A60', paving: '#A9A59A', grass: '#7FA27A', concrete: '#9B9B96' };

function ZoneFloor({ zone, propertyId }: { zone: Zone; propertyId: string }) {
  const w = zone.x1 - zone.x0, d = zone.z1 - zone.z0;
  const fin = useHomeFinishes(propertyId).floor;
  const finish = isFinishable(zone) ? fin : undefined;
  const kind = finish?.floor ?? zone.floor;
  const tex = useMemo(() => {
    if (kind === 'water') return null;
    const t = floorTexture(kind).clone(); t.repeat.set(w / 2, d / 2); t.needsUpdate = true; return t;
  }, [kind, w, d]);
  const cx = (zone.x0 + zone.x1) / 2, cz = (zone.z0 + zone.z1) / 2;
  if (zone.floor === 'water') return <Water size={[w, d]} position={[cx, -0.12, cz]} />;
  return (
    <group>
      {zone.indoor && <mesh position={[cx, -0.08, cz]} receiveShadow><boxGeometry args={[w, 0.16, d]} /><meshStandardMaterial color="#B9AD94" roughness={1} /></mesh>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.003, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={tex ?? undefined} color={finish?.tint ?? '#ffffff'} roughness={finish?.rough ?? (kind === 'marble' ? 0.25 : 0.85)} metalness={kind === 'marble' ? 0.06 : 0} />
      </mesh>
    </group>
  );
}

/** Bay boundary: two side lines and a far-end line, inset so neighbouring bays keep their own lines. One shared geometry and material. */
const LINE_GEO = new BoxGeometry(1, 0.01, 1);
const LINE_MAT = new MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.9 });
function BayLines({ slot }: { slot: CarSlot }) {
  const t = 0.07, i = 0.06, hw = slot.width / 2 - i, hl = slot.length / 2 - i;
  const lines: [number, number, number, number][] = [[-hw, 0, t, 2 * hl], [hw, 0, t, 2 * hl], [0, hl, 2 * hw, t]];
  return (
    <group position={[slot.x, 0.012, slot.z]}>
      {lines.map(([x, z, w, d], k) => <mesh key={k} geometry={LINE_GEO} material={LINE_MAT} position={[x, 0, z]} scale={[w, 1, d]} />)}
    </group>
  );
}

/**
 * Simple framed carport over the bays: posts, a perimeter rail, and transparent glass for the roof and the two far sides
 * (the house side and the front stay open). It is built from the bay zones only and knows nothing about the vehicles, so
 * replacing the placeholder cars with GLB models never touches it.
 */
const FRAME_MAT = new MeshStandardMaterial({ color: '#1E3A5F', roughness: 0.6 });
const GLASS_MAT = new MeshStandardMaterial({ color: '#A8D4EA', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false });
const BOX = new BoxGeometry(1, 1, 1);
function Carport({ layout }: { layout: PropertyLayout }) {
  const b = carportBounds(layout);
  if (!b) return null;
  const H = 2.5, t = 0.1, w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const xs = [b.x0 + t / 2, ...layout.zones.filter((z) => z.kind === 'parking').slice(1).map((z) => z.x0), b.x1 - t / 2];
  const bar = (key: string, pos: [number, number, number], size: [number, number, number], mat = FRAME_MAT) => (
    <mesh key={key} geometry={BOX} material={mat} position={pos} scale={size} castShadow={mat === FRAME_MAT} />
  );
  return (
    <group>
      {xs.flatMap((x, i) => [b.z0 + t / 2, b.z1 - t / 2].map((z, j) => bar(`p${i}${j}`, [x, H / 2, z], [t, H, t])))}
      {bar('rb', [cx, H, b.z0 + t / 2], [w, t, t])}{bar('rf', [cx, H, b.z1 - t / 2], [w, t, t])}
      {bar('rl', [b.x0 + t / 2, H, cz], [t, t, d])}{bar('rr', [b.x1 - t / 2, H, cz], [t, t, d])}
      {bar('roof', [cx, H + 0.02, cz], [w, 0.03, d], GLASS_MAT)}
      {bar('gx', [b.x1 - t / 2, H / 2, cz], [0.02, H - 0.1, d - t], GLASS_MAT)}
      {bar('gz', [cx, H / 2, b.z0 + t / 2], [w - t, H - 0.1, 0.02], GLASS_MAT)}
    </group>
  );
}

/** Blue "P" sign beside the parking extension. Shows how many owned cars did not fit in the bays. One small texture, shared. */
let pTex: CanvasTexture | null = null;
function parkingTexture() {
  if (pTex) return pTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1D4ED8'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(3, 3, 58, 58);
  g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 32, 36);
  pTex = new CanvasTexture(c); pTex.colorSpace = SRGBColorSpace;
  return pTex;
}
function ParkingSign({ layout }: { layout: PropertyLayout }) {
  const pos = parkingSignPos(layout);
  const owned = useVehicleStore((s) => s.owned.length);
  const extra = Math.max(0, owned - carSlots(layout).length);
  if (!pos) return null;
  return (
    <group position={[pos.x, 0, pos.z]}>
      <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.05, 1.6, 0.05]} /><meshStandardMaterial color="#6B7280" roughness={0.6} /></mesh>
      <mesh position={[0, 1.75, 0]}><boxGeometry args={[0.5, 0.5, 0.05]} /><meshStandardMaterial map={parkingTexture()} roughness={0.7} /></mesh>
      {extra > 0 && (
        <Html position={[0.9, 1.75, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(15,23,42,.88)', color: '#fff', font: '600 11px sans-serif', padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            <span style={{ background: '#2563EB', borderRadius: 3, padding: '0 4px', marginRight: 5 }}>P</span>+{extra} in storage
          </div>
        </Html>
      )}
    </group>
  );
}

function Vehicles({ layout }: { layout: PropertyLayout }) {
  const owned = useVehicleStore((s) => s.owned);
  const slots = useMemo(() => carSlots(layout), [layout]);
  return (
    <group>
      {owned.slice(0, slots.length).map((id, i) => {
        const v = getVehicle(id); const s = slots[i];
        if (!v) return null;
        return <group key={id} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0]}><Vehicle body={v.type} color={v.color} /></group>;
      })}
    </group>
  );
}

/** Renders a whole property from its layout data. Works for any state's layouts. */
export function PropertyEnvironment({ layout }: { layout: PropertyLayout }) {
  const { plot } = layout;
  const w = plot.x1 - plot.x0, d = plot.z1 - plot.z0;
  const groundTex = useMemo(() => { const t = floorTexture(plot.ground === 'water' ? 'concrete' : plot.ground).clone(); t.repeat.set(w / 2, d / 2); t.needsUpdate = true; return t; }, [plot.ground, w, d]);
  const sky = useMemo(() => skylineTexture(), []);
  const cx = (plot.x0 + plot.x1) / 2, cz = (plot.z0 + plot.z1) / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.2, cz]} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial color={OUTER[plot.ground] ?? '#9A9484'} roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial map={groundTex} roughness={0.95} /></mesh>
      {layout.zones.map((z) => <ZoneFloor key={z.id} zone={z} propertyId={layout.id} />)}
      {carSlots(layout).map((sl) => <BayLines key={sl.id} slot={sl} />)}
      <Walls layout={layout} />
      <Fence layout={layout} />
      {layout.decor.map((dec, i) => <DecorItem key={i} d={dec} />)}
      <Vehicles layout={layout} />
      <Carport layout={layout} />
      <ParkingSign layout={layout} />
      <mesh position={[cx, 6, plot.z0 - 14]}><planeGeometry args={[110, 34]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
      <mesh position={[plot.x0 - 14, 6, cz]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[110, 34]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
    </group>
  );
}
