import { B } from '../models/primitives';
import type { WindowStyle } from '@/types/world';

/** Window furniture centred on the opening, in the wall's local space (+z faces into the room). */
export function WindowUnit({ width: w, height: h, style, T, trim }: { width: number; height: number; style: WindowStyle; T: number; trim: string }) {
  const frameColor = style === 'glass' || style === 'panoramic' ? '#1B1F24' : style === 'burglar' ? '#F4F1EA' : trim;
  const f = style === 'panoramic' ? 0.03 : 0.05;
  const slats = Math.max(3, Math.round(h / 0.1));
  const bars = Math.max(3, Math.round(w / 0.14));
  return (
    <group>
      {/* frame */}
      <B size={[w + 0.1, f, T + 0.04]} pos={[0, h / 2 + f / 2, 0]} color={frameColor} rough={0.5} radius={0.008} shadow={false} />
      <B size={[w + 0.12, f + 0.02, T + 0.1]} pos={[0, -h / 2 - f / 2, 0]} color={frameColor} rough={0.5} radius={0.008} shadow={false} />
      <B size={[f, h, T + 0.04]} pos={[-w / 2 - f / 2 + 0.01, 0, 0]} color={frameColor} rough={0.5} radius={0.008} shadow={false} />
      <B size={[f, h, T + 0.04]} pos={[w / 2 + f / 2 - 0.01, 0, 0]} color={frameColor} rough={0.5} radius={0.008} shadow={false} />
      {/* glazing / louvres */}
      {style === 'louvre' ? (
        Array.from({ length: slats }, (_, i) => (
          <B key={i} size={[w, 0.07, 0.03]} pos={[0, -h / 2 + ((i + 0.5) * h) / slats, 0]} rot={[0.55, 0, 0]} color="#BFE3EE" opacity={0.6} rough={0.1} metal={0.2} radius={0.004} shadow={false} />
        ))
      ) : (
        <mesh><planeGeometry args={[w, h]} /><meshStandardMaterial color="#CFE8F3" transparent opacity={0.2} roughness={0.05} metalness={0.2} /></mesh>
      )}
      {style === 'sash' && (<><B size={[0.035, h, 0.04]} pos={[0, 0, 0]} color={trim} rough={0.5} radius={0.006} shadow={false} /><B size={[w, 0.035, 0.04]} pos={[0, 0.05, 0]} color={trim} rough={0.5} radius={0.006} shadow={false} /></>)}
      {style === 'panoramic' && [-w / 4, w / 4].map((x) => <B key={x} size={[0.03, h, 0.03]} pos={[x, 0, 0]} color="#1B1F24" rough={0.5} radius={0.005} shadow={false} />)}
      {style === 'burglar' && (
        <group position={[0, 0, T / 2 + 0.03]}>
          {Array.from({ length: bars }, (_, i) => <B key={i} size={[0.018, h, 0.018]} pos={[-w / 2 + ((i + 0.5) * w) / bars, 0, 0]} color="#1B1F24" metal={0.5} rough={0.5} radius={0.004} shadow={false} />)}
          {[-h / 4, h / 4].map((y) => <B key={y} size={[w, 0.018, 0.018]} pos={[0, y, 0]} color="#1B1F24" metal={0.5} rough={0.5} radius={0.004} shadow={false} />)}
        </group>
      )}
    </group>
  );
}
