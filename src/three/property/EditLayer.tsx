import { useEffect } from 'react';
import { DoubleSide } from 'three';
import { getFurniture } from '@/data/items';
import { moveDraft } from '@/game/buy';
import { useEditorStore } from '@/stores/editorStore';
import { extents, getTransform } from '@/world/placement';
import { TintContext } from '../models/primitives';
import { FurnitureModel } from '../models/registry';

/** The ghost (green = valid, red = invalid) and the invisible floor that catches drags and taps. */
export function EditLayer() {
  const draft = useEditorStore((s) => s.draft);
  const dragging = useEditorStore((s) => s.dragging);
  const setDragging = useEditorStore((s) => s.setDragging);

  useEffect(() => {
    const up = () => useEditorStore.getState().setDragging(false);
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  if (!draft) return null;
  const def = getFurniture(draft.defId);
  if (!def) return null;
  const t = getTransform(def, draft.pose);
  const { hw, hd } = extents(def, draft.pose.rotation);
  const color = draft.valid ? '#22c55e' : '#ef4444';
  return (
    <>
      <group position={t.position} rotation={[0, t.rotationY, 0]}>
        <TintContext.Provider value={draft.valid ? 'valid' : 'invalid'}>
          <group onPointerDown={(e) => { e.stopPropagation(); setDragging(true); }}><FurnitureModel modelKey={def.model} /></group>
        </TintContext.Provider>
      </group>
      {def.placement.surface === 'floor' && (
        <mesh position={[draft.pose.x, 0.03, draft.pose.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[hw * 2, hd * 2]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}
      <mesh
        position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => { if (!dragging) return; e.stopPropagation(); moveDraft(e.point.x, e.point.z); }}
        onClick={(e) => { if (e.delta > 6) return; moveDraft(e.point.x, e.point.z); }}
      >
        <planeGeometry args={[240, 240]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} />
      </mesh>
    </>
  );
}
