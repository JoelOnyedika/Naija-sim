import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D, SRGBColorSpace, TextureLoader, type Group } from 'three';
import { seaSlots, liveAds, slotAvailability } from '@/game/ads/slots';
import { useAdsStore } from '@/stores/adsStore';
import { useAdsUiStore } from '@/stores/adsUiStore';
import { useUiStore } from '@/stores/uiStore';
import type { AdSubmission, SeaSlot } from '@/types/ads';
import { getState } from '@/world/registry';

/**
 * Sea Ads in the 3D world: every LIVE sea ad floats on the water at its slot, and while the placement picker is open every
 * slot is shown as a marker (green round = free, red square = taken or reserved, gold ring = your choice). Positions are
 * the same slot objects the picker UI lists, so a selection always corresponds to a real place on the water.
 */
const WATER_Y = -0.25;
const RAFT_Y = WATER_Y + 0.1; // sits clear of the water plane: no z-fighting, visibly floating

function Raft({ ad, slot, phase }: { ad: AdSubmission; slot: SeaSlot; phase: number }) {
  const g = useRef<Group>(null);
  const tex = useMemo(() => { const t = new TextureLoader().load(ad.imageDataUrl); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t; }, [ad.imageDataUrl]);
  useEffect(() => () => tex.dispose(), [tex]);
  // fit the artwork inside the slot without stretching it
  const aspect = ad.imageWidth / ad.imageHeight;
  const w = Math.min(slot.w, slot.h * aspect), h = w / aspect;
  useFrame(({ clock }) => { const t = clock.getElapsedTime() + phase; if (g.current) { g.current.position.y = RAFT_Y + Math.sin(t * 0.9) * 0.018; g.current.rotation.z = Math.sin(t * 0.6) * 0.012; g.current.rotation.x = Math.cos(t * 0.7) * 0.01; } });
  const open = (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6 || useUiStore.getState().mode !== 'map') return; e.stopPropagation(); useAdsUiStore.getState().openSheet({ type: 'sea', submissionId: ad.id }); };
  return (
    <group ref={g} position={[slot.x, RAFT_Y, slot.z]} onClick={open} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[slot.w + 0.24, 0.1, slot.h + 0.24]} /><meshStandardMaterial color="#F4F1EA" roughness={0.6} /></mesh>
      <mesh position={[0, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * (slot.w / 2 + 0.12), -0.02, sz * (slot.h / 2 + 0.12)]}><cylinderGeometry args={[0.1, 0.1, 0.16, 10]} /><meshStandardMaterial color="#FF7A1A" roughness={0.5} /></mesh>)}
    </group>
  );
}

const CIRCLE = [0.62, 0.62, 0.05] as const;
function Markers({ slots, subs, selected, stateId }: { slots: SeaSlot[]; subs: AdSubmission[]; selected: string | null; stateId: string }) {
  const free = useRef<InstancedMesh>(null), taken = useRef<InstancedMesh>(null);
  const split = useMemo(() => {
    const now = Date.now(), a: SeaSlot[] = [], b: SeaSlot[] = [];
    for (const s of slots) (slotAvailability(subs, 'sea', s.id, now).state === 'available' ? a : b).push(s);
    return { a, b };
  }, [slots, subs]);
  useLayoutEffect(() => {
    const o = new Object3D(), col = new Color();
    const fill = (m: InstancedMesh | null, list: SeaSlot[], base: string, flat: readonly [number, number, number]) => {
      if (!m) return;
      list.forEach((s, i) => { o.position.set(s.x, RAFT_Y + 0.02, s.z); o.rotation.set(0, 0, 0); o.scale.set(...flat); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(s.id === selected ? '#FFC21A' : base)); });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };
    fill(free.current, split.a, '#22C55E', CIRCLE); fill(taken.current, split.b, '#EF4444', [0.95, 0.95, 0.05]);
  }, [split, selected]);
  const onFree = (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6 || e.instanceId === undefined) return; e.stopPropagation(); useAdsUiStore.getState().pick(split.a[e.instanceId]?.id ?? null); };
  void stateId;
  return (
    <group>
      <instancedMesh key={`f${split.a.length}`} ref={free} args={[undefined, undefined, Math.max(1, split.a.length)]} onClick={onFree}><cylinderGeometry args={[1, 1, 1, 20]} /><meshBasicMaterial transparent opacity={0.85} /></instancedMesh>
      <instancedMesh key={`t${split.b.length}`} ref={taken} args={[undefined, undefined, Math.max(1, split.b.length)]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial transparent opacity={0.85} /></instancedMesh>
      {selected && (() => { const s = slots.find((q) => q.id === selected); return s ? <mesh position={[s.x, RAFT_Y + 0.05, s.z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[s.w, s.h]} /><meshBasicMaterial color="#FFC21A" transparent opacity={0.45} depthWrite={false} /></mesh> : null; })()}
    </group>
  );
}

export function SeaAds({ stateId }: { stateId: string }) {
  const subs = useAdsStore((s) => s.submissions);
  const tick = useAdsStore((s) => s.tick);
  const picker = useAdsUiStore((s) => s.picker);
  const state = getState(stateId);
  const slots = useMemo(() => (state ? seaSlots(state) : []), [state]);
  const live = useMemo(() => liveAds(subs.filter((x) => x.stateId === stateId), 'sea', Date.now()), [subs, tick, stateId]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(slots.map((s) => [s.id, s])), [slots]);
  return (
    <group>
      {live.map((ad, i) => { const slot = byId.get(ad.slotId); return slot ? <Raft key={ad.id} ad={ad} slot={slot} phase={i * 1.7} /> : null; })}
      {picker && <Markers slots={slots} subs={subs} selected={picker.selected} stateId={stateId} />}
    </group>
  );
}
