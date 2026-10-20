import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { getFurniture } from '@/data/items';
import { beginMove } from '@/game/buy';
import { interactWith } from '@/game/interactions';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import type { PlacedItem } from '@/types/game';
import { getTransform } from '@/world/placement';
import { FurnitureModel } from '../models/registry';

function Pip({ y }: { y: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2.4) * 0.05; ref.current.rotation.y += 0.03; } });
  return <mesh ref={ref} position={[0, y, 0]}><octahedronGeometry args={[0.07]} /><meshStandardMaterial color="#FFC21A" emissive="#FFC21A" emissiveIntensity={0.9} /></mesh>;
}

/** Furniture + built-in fixtures. Tap to use (Home) or to pick up (Buy mode). */
export function PlacedLayer({ items }: { items: PlacedItem[] }) {
  const mode = useUiStore((s) => s.mode);
  const draftUid = useEditorStore((s) => s.draft?.uid);
  const hasDraft = useEditorStore((s) => !!s.draft);
  return (
    <group>
      {items.map((item) => {
        if (item.uid === draftUid) return null;
        const def = getFurniture(item.defId);
        if (!def) return null;
        // live pets and toys are drawn by PetLayer in Home mode; in Buy mode they are plain items you can move
        if ((def.pet || def.toy) && mode !== 'buy') return null;
        const t = getTransform(def, item);
        const onClick = (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          if (mode === 'buy') {
            if (hasDraft || item.fixed) return;
            e.stopPropagation(); beginMove(item.uid);
          } else { e.stopPropagation(); interactWith(item); }
        };
        return (
          <group key={item.uid} position={t.position} rotation={[0, t.rotationY, 0]} onClick={onClick}>
            <FurnitureModel modelKey={def.model} />
            {mode !== 'buy' && def.use && def.placement.surface === 'floor' && <Pip y={def.height + 0.3} />}
          </group>
        );
      })}
    </group>
  );
}
