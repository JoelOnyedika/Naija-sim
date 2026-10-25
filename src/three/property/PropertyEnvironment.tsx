import { INTERIORS, type InteriorKind } from '@/data/interiors';
import { VenueDecor } from './VenueDecor';
import { VenueSurround } from './VenueSurround';
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { BoxGeometry, CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { getVehicle } from '@/data/vehicles';
import { useVehicleStore } from '@/stores/vehicleStore';
import type { PropertyLayout, Zone } from '@/types/world';
import { carSlots, carportBounds, houseBounds, parkingSignPos } from '@/world/layoutGeometry';
import { Vehicle } from '../models/vehicles';
import { floorTexture, skylineTexture } from '../textures';
import { Water } from '../world/Water';
import { DecorItem } from './Decor';
import { Fence } from './Fence';
import { Walls } from './Walls';
import { useZoneFloor } from './useHomeFinishes';

function ZoneFloor({ zone, layout }: { zone: Zone; layout: PropertyLayout }) {
  const w = zone.x1 - zone.x0, d = zone.z1 - zone.z0;
  const finish = useZoneFloor(layout, zone);
  const kind = finish?.floor ?? zone.floor;
  const vd = layout.id.startsWith('interior.') ? INTERIORS[layout.id.slice(9) as InteriorKind] : undefined; // venues can tint and polish their floor (a dark club, sand)
  const tex = useMemo(() => {
    if (kind === 'water') return null;
    const t = floorTexture(kind).clone(); t.repeat.set(w / 2, d / 2); t.needsUpdate = true; return t;
  }, [kind, w, d]);
  const cx = (zone.x0 + zone.x1) / 2, cz = (zone.z0 + zone.z1) / 2;
  if (zone.kind === 'parking') return null; // drawn by ParkingPad
  if (!zone.indoor && zone.floor === 'grass') return null; // open-air grass is the round ground disc (GroundDisc), never a square patch
  if (zone.floor === 'water') return <Water size={[w, d]} position={[cx, -0.12, cz]} />;
  return (
    <group>
      {zone.indoor && <mesh position={[cx, -0.08, cz]} receiveShadow><boxGeometry args={[w, 0.16, d]} /><meshStandardMaterial color="#B9AD94" roughness={1} /></mesh>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.003, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={tex ?? undefined} color={vd?.floorTint ?? finish?.tint ?? '#ffffff'} roughness={vd?.floorRough ?? finish?.rough ?? (kind === 'marble' ? 0.25 : kind === 'ceramic' || kind === 'diamond' ? 0.3 : 0.85)} metalness={kind === 'marble' ? 0.06 : 0} />
      </mesh>
    </group>
  );
}

const BOX = new BoxGeometry(1, 1, 1);

/**
 * The round ground the home sits on: a grass disc with a lighter outer ring and a little thickness, centred on the house.
 * Radius comes from the farthest corner of the plot (house + entrance + parking bays) plus a margin, so every home and every
 * parking layout stays on the grass while the edge stays visible as a circle. Zones only describe where things are; the
 * ground itself is not drawn from them.
 */
function GroundDisc({ layout }: { layout: PropertyLayout }) {
  const hb = houseBounds(layout), p = layout.plot;
  const radius = useMemo(() => {
    let far = 0;
    for (const x of [p.x0, p.x1]) for (const z of [p.z0, p.z1]) far = Math.max(far, Math.hypot(x - hb.cx, z - hb.cz));
    return far + 3;
  }, [p.x0, p.x1, p.z0, p.z1, hb.cx, hb.cz]);
  const grass = useMemo(() => { const t = floorTexture('grass').clone(); t.repeat.set(radius / 3, radius / 3); t.needsUpdate = true; return t; }, [radius]);
  return (
    <group position={[hb.cx, 0, hb.cz]}>
      <mesh position={[0, -0.3, 0]} receiveShadow><cylinderGeometry args={[radius + 0.9, radius + 0.9, 0.5, 96]} /><meshStandardMaterial color="#8C8268" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow><circleGeometry args={[radius + 0.9, 96]} /><meshStandardMaterial color="#B9CC9C" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><circleGeometry args={[radius, 96]} /><meshStandardMaterial map={grass} color="#E4F0D2" roughness={1} /></mesh>
    </group>
  );
}

/**
 * Compact parking pad beside the house (MVP look): a low tan slab with a green inset, one pad for all bays, flush with the
 * house side. Built from the bay zones only and knows nothing about vehicles, so swapping the placeholder cars for GLB
 * models never touches it.
 */
const PAD_BORDER = new MeshStandardMaterial({ color: '#A89A84', roughness: 0.95 });
const PAD_INSET = new MeshStandardMaterial({ color: '#8FB08C', roughness: 0.95 });
const PAD_H = 0.1;
const CAR_SCALE = 0.6; // placeholder cars are drawn small so they fit the compact bays
function ParkingPad({ layout }: { layout: PropertyLayout }) {
  const owned = useVehicleStore((s) => s.owned.length);
  const b = carportBounds(layout, owned); // only the bays that hold a car; no car, no pad
  if (!b) return null;
  const w = b.x1 - b.x0, d = b.z1 - b.z0, e = 0.22;
  return (
    <group>
      <mesh geometry={BOX} material={PAD_BORDER} position={[b.x0 + (w + e) / 2, PAD_H / 2, (b.z0 + b.z1) / 2]} scale={[w + e, PAD_H, d + 2 * e]} receiveShadow />
      <mesh geometry={BOX} material={PAD_INSET} position={[b.x0 + w / 2, PAD_H + 0.004, (b.z0 + b.z1) / 2]} scale={[w - 0.1, 0.01, d]} receiveShadow />
    </group>
  );
}

/** Thin trim rim along the open front and right edges of the house (like the MVP floor edge): shows where the house ends without blocking the view. */
function Rim({ layout }: { layout: PropertyLayout }) {
  const h = houseBounds(layout), t = 0.16, hh = 0.14;
  return (
    <group>
      <mesh geometry={BOX} position={[h.cx, hh / 2, h.z1 + t / 2]} scale={[h.w + t, hh, t]} receiveShadow><meshStandardMaterial color={layout.palette.trim} roughness={0.7} /></mesh>
      <mesh geometry={BOX} position={[h.x1 + t / 2, hh / 2, h.cz]} scale={[t, hh, h.d]} receiveShadow><meshStandardMaterial color={layout.palette.trim} roughness={0.7} /></mesh>
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
  const owned = useVehicleStore((s) => s.owned.length);
  const pos = owned > 0 ? parkingSignPos(layout, owned) : null;
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
        return <group key={id} position={[s.x, PAD_H, s.z]} rotation={[0, s.rotation, 0]} scale={CAR_SCALE}><Vehicle body={v.type} color={v.color} /></group>;
      })}
    </group>
  );
}

/** Renders a whole property from its layout data. Works for any state's layouts. */
export function PropertyEnvironment({ layout }: { layout: PropertyLayout }) {
  const { plot } = layout;
  const sky = useMemo(() => skylineTexture(), []);
  const cx = (plot.x0 + plot.x1) / 2, cz = (plot.z0 + plot.z1) / 2;
  const venue = layout.id.startsWith('interior.'); // public venues sit in a real 3D street, not on the home's lawn
  return (
    <group>
      {venue ? <><VenueSurround layout={layout} /><VenueDecor layoutId={layout.id} /></> : <GroundDisc layout={layout} />}
      {layout.zones.map((z) => <ZoneFloor key={z.id} zone={z} layout={layout} />)}
      <ParkingPad layout={layout} />
      <Rim layout={layout} />
      <Walls layout={layout} />
      <Fence layout={layout} />
      {layout.decor.map((dec, i) => <DecorItem key={i} d={dec} />)}
      <Vehicles layout={layout} />
      <ParkingSign layout={layout} />
      {!venue && <mesh position={[cx, 6, plot.z0 - 14]}><planeGeometry args={[110, 34]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>}
      {!venue && <mesh position={[plot.x0 - 14, 6, cz]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[110, 34]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>}
    </group>
  );
}
