import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import { getFurniture } from '@/data/items';
import { moveDraft } from '@/game/buy';
import { useEditorStore } from '@/stores/editorStore';
import type { PropertyLayout } from '@/types/world';
import { WALL_T, wallPieces, windowsOnPiece, type WallPiece } from '@/world/layoutGeometry';
import { B } from '../models/primitives';
import { wallTexture, wallpaperTexture } from '../textures';
import { isFinishable, useHomeFinishes } from './useHomeFinishes';
import { FadeGroup } from './FadeGroup';
import { WindowUnit } from './Windows';

interface Opening { c: number; w: number; sill: number; h: number; window?: ReturnType<typeof windowsOnPiece>[number]; door?: boolean }
interface Rect { cx: number; cy: number; w: number; h: number }

/** Solid rectangles of a wall between u0..u1 once the openings are cut out. */
function rects(u0: number, u1: number, height: number, openings: Opening[]): Rect[] {
  const mk = (x0: number, x1: number, y0: number, y1: number): Rect => ({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
  const out: Rect[] = [];
  let cur = u0;
  for (const o of [...openings].sort((a, b) => a.c - b.c)) {
    const l = Math.max(u0, o.c - o.w / 2), r = Math.min(u1, o.c + o.w / 2);
    if (l > cur) out.push(mk(cur, l, 0, height));
    if (o.sill > 0) out.push(mk(l, r, 0, o.sill));
    if (o.sill + o.h < height) out.push(mk(l, r, o.sill + o.h, height));
    cur = r;
  }
  if (cur < u1) out.push(mk(cur, u1, 0, height));
  return out;
}

function Piece({ piece, layout }: { piece: WallPiece; layout: PropertyLayout }) {
  const T = WALL_T;
  const flip = piece.o === 'v' ? -1 : 1;
  const u0 = piece.o === 'h' ? piece.a : -piece.b, u1 = piece.o === 'h' ? piece.b : -piece.a;
  const tex = useMemo(() => {
    const t = wallTexture(layout.palette.wall, layout.finish).clone();
    t.repeat.set(Math.max(1, (piece.b - piece.a) / 2), Math.max(1, piece.height / 2)); t.needsUpdate = true;
    return t;
  }, [layout.palette.wall, layout.finish, piece.a, piece.b, piece.height]);

  // Interior-only finish: thin panels on the room side(s) of each solid wall rectangle. The outside face keeps the
  // house's own look, openings stay open, and furniture is never touched.
  const wallFin = useHomeFinishes(layout.id).wall;
  const finTex = useMemo(() => {
    if (!wallFin) return null;
    const t = (wallFin.pattern ? wallpaperTexture(wallFin.color, wallFin.accent ?? '#999999', wallFin.pattern) : wallTexture(wallFin.color, wallFin.finish)).clone();
    t.repeat.set(Math.max(1, (piece.b - piece.a) / 2), Math.max(1, piece.height / 2)); t.needsUpdate = true; return t;
  }, [wallFin, piece.a, piece.b, piece.height]);
  const panelSides = [piece.hi && isFinishable(piece.hi) ? 1 : 0, piece.lo && isFinishable(piece.lo) ? -1 : 0].filter(Boolean) as number[];

  const openings: Opening[] = [
    ...windowsOnPiece(layout, piece).map((w) => ({ c: flip * w.along, w: w.width, sill: w.sill, h: w.height, window: w })),
    ...piece.doors.map((d) => ({ c: flip * d, w: 0.95, sill: 0, h: piece.tall ? 2.1 : piece.height + 1, door: true })),
  ];
  const rs = rects(u0, u1, piece.height, openings);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const { draft } = useEditorStore.getState();
    if (!draft || e.delta > 6) return;
    if (getFurniture(draft.defId)?.placement.surface !== 'wall') return;
    e.stopPropagation();
    moveDraft(e.point.x, e.point.z);
  };

  const group = piece.o === 'h'
    ? { position: [0, 0, piece.c] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
    : { position: [piece.c, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] };
  const len = u1 - u0;

  // A tall wall drops to curb height while the camera is on its outer side, so orbiting behind the house never walls you out.
  const outward = !piece.lo ? -1 : !piece.hi ? 1 : 0;
  const hideWhenBehind = (cam: { position: { x: number; z: number } }) => {
    if (!piece.tall || !outward) return false;
    const cam1 = piece.o === 'h' ? cam.position.z : cam.position.x;
    return (cam1 - piece.c) * outward > 0;
  };

  return (
    <group {...group}>
      <FadeGroup hide={hideWhenBehind} minScale={0.16}>
      {rs.map((r, i) => (
        <mesh key={i} position={[r.cx, r.cy, 0]} onClick={onClick} castShadow receiveShadow>
          <boxGeometry args={[r.w, r.h, T]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
      ))}
      {finTex && panelSides.map((side) => rs.map((r, i) => (
        <mesh key={`f${side}${i}`} position={[r.cx, r.cy, side * (T / 2 + 0.007)]} receiveShadow>
          <boxGeometry args={[r.w, r.h, 0.012]} />
          <meshStandardMaterial map={finTex} roughness={wallFin?.finish === 'marble' ? 0.3 : 0.92} />
        </mesh>
      )))}
      {openings.filter((o) => o.window).map((o, i) => (
        <group key={`w${i}`} position={[o.c, o.sill + o.h / 2, 0]}>
          <WindowUnit width={o.w} height={o.h} style={o.window!.style} T={T} trim={layout.palette.trim} />
        </group>
      ))}
      {openings.filter((o) => o.door).map((o, i) => {
        const dh = piece.tall ? 2.1 : piece.height;
        return (
          <group key={`d${i}`} position={[o.c, 0, 0]}>
            {[-0.5, 0.5].map((s) => <B key={s} size={[0.06, dh, T + 0.04]} pos={[s * 0.95, dh / 2, 0]} color={layout.palette.trim} rough={0.6} radius={0.008} shadow={false} />)}
            {piece.tall && <B size={[1.07, 0.06, T + 0.04]} pos={[0, dh + 0.03, 0]} color={layout.palette.trim} rough={0.6} radius={0.008} shadow={false} />}
          </group>
        );
      })}
      {/* cap / skirting */}
      <B size={[len, 0.04, T + 0.02]} pos={[(u0 + u1) / 2, piece.height + 0.02, 0]} color={layout.palette.trim} rough={0.6} radius={0.005} shadow={false} />
      {piece.tall && <B size={[len, 0.1, T + 0.05]} pos={[(u0 + u1) / 2, 0.05, 0]} color={layout.palette.trim} rough={0.6} radius={0.005} shadow={false} />}
      </FadeGroup>
    </group>
  );
}

export function Walls({ layout }: { layout: PropertyLayout }) {
  const pieces = useMemo(() => wallPieces(layout), [layout]);
  return <group>{pieces.map((p, i) => <Piece key={`${p.o}${p.c}${p.a}${i}`} piece={p} layout={layout} />)}</group>;
}
