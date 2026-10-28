import type { ComponentType } from 'react';
import { KIT } from '@/data/venueKit';
import { Awning, Counter, Glow, TexSign } from './kit';
import { B, Cyl, Sph } from './primitives';

/**
 * The shared "booth" look: every prop in data/venueKit2.ts is drawn from a small set of shapes in its own colours with its own
 * sign, so a new stall, desk, machine or mat is one data row and no new model code. Origin = floor centre, +z = front.
 */
type Look = NonNullable<(typeof KIT)[number]['look']>;
interface Spec { w: number; d: number; h: number; look: Look }

const Goods = ({ y, w, c }: { y: number; w: number; c: string[] }) => <>{Array.from({ length: Math.max(2, Math.floor(w / 0.7)) }).map((_, i) => <B key={i} size={[0.26, 0.2 + (i % 3) * 0.05, 0.24]} pos={[-w / 2 + 0.4 + i * 0.7, y + 0.1, 0.05]} color={c[i % c.length]} rough={0.6} radius={0.03} />)}</>;

function Booth({ w, d, h, look: l }: Spec) {
  const sign = l.sign;
  switch (l.v) {
    case 'counter':
      return (<group><Counter w={w} d={d} body={l.c1} top={l.c2} accent={l.c3} /><Goods y={1.08} w={w} c={[l.c3, l.c2, '#F4F1EA']} />{sign && <TexSign text={sign} pos={[0, h - 0.2, -d / 2 + 0.05]} w={Math.min(w - 0.2, 2.0)} h={0.34} bg={l.c1} fg={l.c3} />}</group>);
    case 'stall':
      return (<group>
        <B size={[w, 0.8, d]} pos={[0, 0.4, 0.05]} color={l.c1} rough={0.6} radius={0.03} /><Goods y={0.82} w={w} c={[l.c3, l.c2, '#E9B949']} />
        {[-w / 2 + 0.05, w / 2 - 0.05].map((x) => <B key={x} size={[0.05, h, 0.05]} pos={[x, h / 2, -d / 2 + 0.05]} color="#5A3A20" rough={0.7} />)}
        <Awning w={w + 0.1} y={h - 0.1} z={-0.05} a={l.c2} b={l.c3} />
        {sign && <TexSign text={sign} pos={[0, 0.55, d / 2 + 0.02]} w={Math.min(w - 0.3, 1.5)} h={0.3} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'board':
      return (<group>
        {[-w / 2 + 0.1, w / 2 - 0.1].map((x) => <B key={x} size={[0.07, h * 0.5, 0.07]} pos={[x, h * 0.25, 0]} color="#2A2D31" metal={0.5} rough={0.4} />)}
        <B size={[w, h * 0.6, 0.1]} pos={[0, h * 0.7, 0]} color={l.c1} rough={0.4} radius={0.03} />
        {[0, 1, 2].map((i) => <Glow key={i} pos={[-w * 0.1 + (i % 2) * 0.15, h * 0.7 - 0.05 - i * 0.2, 0.06]} size={[w * 0.6 - (i % 2) * 0.3, 0.07]} color={l.c3} intensity={0.9} />)}
        {sign && <TexSign text={sign} pos={[0, h * 0.7 + h * 0.24, 0.06]} w={Math.min(w - 0.3, 2.2)} h={0.34} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'desk':
      return (<group>
        <B size={[w, 0.08, d]} pos={[0, 0.85, 0]} color={l.c2} rough={0.35} radius={0.02} />
        <B size={[w - 0.2, 0.8, d - 0.1]} pos={[0, 0.4, 0]} color={l.c1} rough={0.5} radius={0.02} />
        <B size={[0.5, 0.34, 0.03]} pos={[w * 0.2, 1.22, -d * 0.2]} color="#0C0C10" rough={0.2} /><Glow pos={[w * 0.2, 1.22, -d * 0.2 + 0.02]} size={[0.44, 0.28]} color={l.c3} intensity={0.8} />
        <B size={[0.3, 0.05, 0.2]} pos={[-w * 0.2, 0.92, 0.1]} color="#F4F1EA" rough={0.9} />
        {sign && <TexSign text={sign} pos={[0, h - 0.25, -d / 2 + 0.05]} w={Math.min(w - 0.3, 1.8)} h={0.32} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'cart':
      return (<group>
        <B size={[w, 0.7, d]} pos={[0, 0.55, 0]} color={l.c1} rough={0.6} radius={0.04} /><B size={[w + 0.06, 0.05, d + 0.06]} pos={[0, 0.92, 0]} color={l.c2} rough={0.5} />
        {[[-w * 0.35, d * 0.5], [w * 0.35, d * 0.5]].map(([x, z]) => <Cyl key={x} r={0.2} h={0.06} rot={[0, 0, Math.PI / 2]} pos={[x, 0.2, z]} color="#15171A" seg={14} />)}
        <Cyl r={0.03} h={h - 0.9} pos={[0, 0.9 + (h - 0.9) / 2, -d * 0.2]} color="#5A3A20" seg={6} />
        {Array.from({ length: 8 }).map((_, i) => <B key={i} size={[0.7, 0.04, 0.34]} pos={[Math.cos((i * Math.PI) / 4) * 0.45, h - 0.12, -d * 0.2 + Math.sin((i * Math.PI) / 4) * 0.45]} rot={[0.25 * Math.sin((i * Math.PI) / 4), -(i * Math.PI) / 4, -0.25 * Math.cos((i * Math.PI) / 4)]} color={i % 2 ? l.c2 : l.c3} rough={0.9} />)}
        <Goods y={0.95} w={w} c={[l.c3, l.c2]} />
        {sign && <TexSign text={sign} pos={[0, 0.55, d / 2 + 0.02]} w={Math.min(w - 0.2, 1.1)} h={0.26} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'machine':
      return (<group>
        <B size={[w, h, d]} pos={[0, h / 2, 0]} color={l.c1} rough={0.4} radius={0.05} />
        <B size={[w * 0.7, h * 0.28, 0.04]} pos={[0, h * 0.68, d / 2 + 0.01]} color="#0C0C10" rough={0.2} /><Glow pos={[0, h * 0.68, d / 2 + 0.035]} size={[w * 0.64, h * 0.22]} color={l.c3} intensity={0.9} />
        {[-0.25, 0, 0.25].map((x) => <Sph key={x} r={0.05} pos={[x * w * 0.8, h * 0.4, d / 2 + 0.03]} color={l.c2} rough={0.4} />)}
        <B size={[w * 0.5, 0.08, 0.04]} pos={[0, h * 0.22, d / 2 + 0.02]} color={l.c2} rough={0.5} />
        {sign && <TexSign text={sign} pos={[0, h - 0.18, d / 2 + 0.03]} w={Math.min(w - 0.1, 1.2)} h={0.24} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'shelf':
      return (<group>
        <B size={[w, h, d * 0.5]} pos={[0, h / 2, -d * 0.25]} color={l.c1} rough={0.6} radius={0.03} />
        {[0.5, 1.0, 1.5].filter((y) => y < h - 0.2).map((y) => <group key={y}><B size={[w - 0.1, 0.04, d * 0.5]} pos={[0, y, -d * 0.2]} color={l.c2} rough={0.5} /><Goods y={y} w={w - 0.2} c={[l.c3, l.c2, '#F4F1EA']} /></group>)}
        {sign && <TexSign text={sign} pos={[0, h + 0.18, -d * 0.25]} w={Math.min(w - 0.1, 1.5)} h={0.28} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'mat':
      return (<group>
        <B size={[w, 0.03, d]} pos={[0, 0.03, 0]} color={l.c1} rough={1} radius={0.02} shadow={false} />
        <B size={[w - 0.25, 0.035, d - 0.25]} pos={[0, 0.034, 0]} color={l.c2} rough={1} radius={0.02} shadow={false} />
        {[[-w * 0.3, -d * 0.25], [w * 0.3, d * 0.25], [w * 0.25, -d * 0.3]].map(([x, z], i) => <Sph key={i} r={0.12} pos={[x, 0.15, z]} color={l.c3} rough={0.6} />)}
      </group>);
    case 'seats':
      return (<group>
        <B size={[w, 0.1, d]} pos={[0, 0.3, 0]} color={l.c1} rough={0.6} radius={0.05} />
        {[-1, 0, 1].slice(0, w > 2 ? 3 : 2).map((k) => <group key={k} position={[w > 2 ? k * (w / 3) : (k - 0.5) * (w / 2) + (w / 4), 0, 0]}><B size={[0.5, 0.14, 0.5]} pos={[0, 0.46, 0]} color={l.c2} rough={0.7} radius={0.06} /><B size={[0.5, 0.5, 0.1]} pos={[0, 0.76, -0.22]} color={l.c2} rough={0.7} radius={0.06} /></group>)}
        {sign && <TexSign text={sign} pos={[0, 1.55, -d / 2]} w={1.1} h={0.28} bg={l.c1} fg={l.c3} />}
        <Cyl r={0.04} h={1.2} pos={[w / 2 - 0.1, 0.9, -d / 2]} color="#2A2D31" seg={6} />
      </group>);
    case 'table':
      return (<group>
        <B size={[w, 0.08, d]} pos={[0, 0.8, 0]} color={l.c1} rough={0.45} radius={0.03} />
        {[[-w / 2 + 0.1, -d / 2 + 0.1], [w / 2 - 0.1, -d / 2 + 0.1], [-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]].map(([x, z]) => <B key={`${x}${z}`} size={[0.08, 0.76, 0.08]} pos={[x, 0.38, z]} color={l.c2} rough={0.6} />)}
        <Goods y={0.84} w={w} c={[l.c3, l.c2, '#F4F1EA']} />
        {sign && <TexSign text={sign} pos={[0, 1.4, -d / 2]} w={Math.min(w - 0.2, 1.2)} h={0.26} bg={l.c1} fg={l.c3} />}
      </group>);
    case 'statue':
      return (<group>
        <Cyl r={Math.min(w, d) * 0.4} h={0.3} pos={[0, 0.15, 0]} color={l.c1} rough={0.5} seg={16} />
        <B size={[0.5, h * 0.55, 0.3]} pos={[0, 0.3 + h * 0.27, 0]} color={l.c3} metal={0.4} rough={0.4} radius={0.1} /><Sph r={0.22} pos={[0, 0.35 + h * 0.58, 0]} color={l.c2} rough={0.6} />
        {sign && <TexSign text={sign} pos={[0, 0.5, Math.min(w, d) * 0.4]} w={0.8} h={0.22} bg={l.c1} fg={l.c3} />}
      </group>);
  }
}

/** Models for every kit prop that asks for the shared booth look. */
export const BOOTH_MODELS: Record<string, ComponentType> = Object.fromEntries(
  KIT.filter((k) => k.look).map((k) => { const spec: Spec = { w: k.w, d: k.d, h: k.h, look: k.look! }; return [k.id, () => <Booth {...spec} />]; }),
);
