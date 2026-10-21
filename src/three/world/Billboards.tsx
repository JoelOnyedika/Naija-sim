import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, MeshStandardMaterial, BoxGeometry, CylinderGeometry, TextureLoader } from 'three';
import { MAP } from '@/data/balance';
import { resolveCreative } from '@/game/ads/providers';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAdsStore } from '@/stores/adsStore';
import { useAdsUiStore } from '@/stores/adsUiStore';
import { useBillboardStore } from '@/stores/billboardStore';
import { useUiStore } from '@/stores/uiStore';
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
  const submissions = useAdsStore((s) => s.submissions);
  const consent = useSettingsStore((s) => s.adConsent);
  // Which creative to show comes from the provider layer (game/ads/providers.ts): player advertiser first, then any
  // network provider that is genuinely available, then the board's default artwork.
  const { creative } = useMemo(() => resolveCreative({ def, submissions, now: Date.now(), override, consent }), [def, submissions, override, consent]);
  const [w, h] = SIZE[def.format];
  const content = creative.kind === 'text' ? creative.content : def.content;
  const tex = useMemo(() => panelTexture(content, w / h), [content, w, h]);
  const ad = creative.kind === 'image' ? creative : null;
  // an image creative replaces the default artwork; the image keeps its own proportions inside the board
  const adTex = useMemo(() => { if (!ad) return null; const t = new TextureLoader().load(ad.dataUrl); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t; }, [ad?.dataUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => adTex?.dispose(), [adTex]);
  const aw = ad ? Math.min(w, h * (ad.width / ad.height)) : w, ah = ad ? aw / (ad.width / ad.height) : h;
  const y = 1.0;
  const open = (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6 || useUiStore.getState().mode !== 'map') return; e.stopPropagation(); useAdsUiStore.getState().openSheet({ type: 'billboard', slotId: def.id }); };
  const light = [-w * 0.4, 0, w * 0.4];
  return (
    <group position={[def.position[0], 0.07, def.position[1]]} rotation={[0, def.rotationY, 0]} scale={MAP.billboardScale} onClick={open}
      onPointerOver={() => { if (useUiStore.getState().mode === 'map') document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      {[-w * 0.32, w * 0.32].map((x) => <mesh key={x} geometry={POST} material={FRAME_MAT} position={[x, y / 2, -0.04]} scale={[1, y, 1]} castShadow />)}
      <mesh geometry={FRAME} material={FRAME_MAT} position={[0, y + h / 2, -0.03]} scale={[w + 0.1, h + 0.1, 0.06]} castShadow />
      <mesh position={[0, y + h / 2, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={ad ? undefined : tex} color={ad ? '#14171C' : '#FFFFFF'} toneMapped={false} />
      </mesh>
      {ad && adTex && <mesh position={[0, y + h / 2, 0.004]}><planeGeometry args={[aw, ah]} /><meshBasicMaterial map={adTex} toneMapped={false} /></mesh>}
      {/* lamps along the top edge */}
      {light.map((x) => (<group key={x} position={[x, y + h + 0.1, 0.1]}><mesh><boxGeometry args={[0.1, 0.04, 0.1]} /><meshStandardMaterial color="#2A2F36" /></mesh><mesh position={[0, -0.03, 0.04]}><sphereGeometry args={[0.03, 8, 6]} /><meshBasicMaterial color="#FFF3C4" /></mesh></group>))}
    </group>
  );
}

/** Renders every billboard of a state. Cheap by design: shared geometry and frame material, one tiny texture per distinct ad. */
export function Billboards({ list }: { list: BillboardDefinition[] }) {
  return <>{list.map((b) => <Board key={b.id} def={b} />)}</>;
}
