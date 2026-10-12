import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, MeshStandardMaterial, BoxGeometry, CylinderGeometry } from 'three';
import { useBillboardStore } from '@/stores/billboardStore';
import type { BillboardContent, BillboardDefinition } from '@/types/world';

/** Shared across every billboard: one frame/post geometry set and two materials. Only the printed panel differs. */
const POST = new CylinderGeometry(0.045, 0.055, 1, 8);
const FRAME = new BoxGeometry(1, 1, 1);
const FRAME_MAT = new MeshStandardMaterial({ color: '#2A2F36', roughness: 0.7, metalness: 0.2 });
const SIZE = { wide: [1.9, 0.66], standard: [1.4, 0.72] } as const;

const textures = new Map<string, CanvasTexture>();
/** Draw the board once per distinct content. Text and colour only: `imageUrl` is reserved for later and not loaded. */
function panelTexture(c: BillboardContent, aspect: number): CanvasTexture {
  const key = JSON.stringify([c.headline, c.subline, c.advertiser, c.bg, c.fg, c.accent, aspect]);
  let t = textures.get(key);
  if (t) return t;
  const w = 512, h = Math.round(512 / aspect);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!;
  g.fillStyle = c.bg; g.fillRect(0, 0, w, h);
  g.fillStyle = c.accent; g.fillRect(0, 0, 14, h); g.fillRect(0, h - 10, w, 10);
  g.textBaseline = 'top';
  g.fillStyle = c.accent; g.font = `700 ${Math.round(h * 0.11)}px system-ui, sans-serif`; g.fillText(c.advertiser.toUpperCase(), 34, h * 0.09);
  g.fillStyle = c.fg; g.font = `800 ${Math.round(h * 0.2)}px system-ui, sans-serif`;
  // wrap the headline to two lines at most
  const words = c.headline.split(' '); const lines: string[] = []; let line = '';
  for (const wd of words) { const next = line ? `${line} ${wd}` : wd; if (g.measureText(next).width > w - 60 && line) { lines.push(line); line = wd; } else line = next; }
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => g.fillText(l, 34, h * 0.28 + i * h * 0.22));
  if (c.subline) { g.fillStyle = c.fg; g.globalAlpha = 0.75; g.font = `500 ${Math.round(h * 0.11)}px system-ui, sans-serif`; g.fillText(c.subline, 34, h * 0.8); g.globalAlpha = 1; }
  t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  textures.set(key, t);
  return t;
}

function Board({ def }: { def: BillboardDefinition }) {
  const override = useBillboardStore((s) => s.overrides[def.id]);
  const content = useMemo(() => ({ ...def.content, ...override }), [def.content, override]);
  const [w, h] = SIZE[def.format];
  const tex = useMemo(() => panelTexture(content, w / h), [content, w, h]);
  const y = 1.0;
  return (
    <group position={[def.position[0], 0.07, def.position[1]]} rotation={[0, def.rotationY, 0]}>
      {[-w * 0.32, w * 0.32].map((x) => <mesh key={x} geometry={POST} material={FRAME_MAT} position={[x, y / 2, -0.04]} scale={[1, y, 1]} castShadow />)}
      <mesh geometry={FRAME} material={FRAME_MAT} position={[0, y + h / 2, -0.03]} scale={[w + 0.1, h + 0.1, 0.06]} castShadow />
      <mesh position={[0, y + h / 2, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Renders every billboard of a state. Cheap by design: shared geometry and frame material, one tiny texture per distinct ad. */
export function Billboards({ list }: { list: BillboardDefinition[] }) {
  return <>{list.map((b) => <Board key={b.id} def={b} />)}</>;
}
