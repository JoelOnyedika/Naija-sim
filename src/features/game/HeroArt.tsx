import type { Appearance } from '@/types/game';

/**
 * The player in the roadblock scene: a detailed 2D drawing made from the player's own look (skin, hair, top, bottom, shoes), with a
 * worried but determined face, a collar, a watch, a belt and laces, standing ready. Not a copy of the 3D avatar, but it wears the
 * same colours so it is recognisably "you".
 */
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`; };

export function Hero({ look, size = 1 }: { look: Appearance; size?: number }) {
  const femme = look.body === 'femme', skin = look.skin, skinD = shade(skin, 0.78), top = look.topColor, topD = shade(top, 0.72), bot = look.bottomColor, botD = shade(bot, 0.7), hair = look.hairColor || '#17110D';
  const dress = look.bottom === 'dress' || look.bottom === 'skirt', shorts = look.bottom === 'shorts', hood = look.top === 'hoodie', jacket = look.top === 'jacket';
  const hs = look.hairStyle;
  return (
    <svg viewBox="-4 -6 88 128" width={88 * 0.74 * size} height={128 * 0.74 * size} aria-hidden style={{ overflow: 'visible' }}>
      <ellipse cx="40" cy="117" rx="22" ry="4" fill="rgba(0,0,0,0.32)" />
      {/* hair behind the head */}
      {(hs === 'afro') && <circle cx="40" cy="15" r="19" fill={hair} />}
      {(hs === 'braids' || hs === 'twists' || femme) && hs !== 'bald' && <path d="M22 16 Q20 38 24 52 L30 50 L30 20Z M58 16 Q60 38 56 52 L50 50 L50 20Z" fill={hair} />}
      {hs === 'dreads' && [22, 27, 53, 58].map((x, i) => <path key={x} d={`M${x} 14 Q${x + (i < 2 ? -3 : 3)} 30 ${x + (i < 2 ? -2 : 2)} ${40 + (i % 2) * 6}`} stroke={hair} strokeWidth="5" strokeLinecap="round" fill="none" />)}
      {/* legs and shoes */}
      {dress ? <path d="M23 66 L19 100 L61 100 L57 66Z" fill={bot} /> : <>
        <rect x="26" y={shorts ? 70 : 70} width="12" height={shorts ? 18 : 40} rx="4" fill={bot} /><rect x="42" y="70" width="12" height={shorts ? 18 : 40} rx="4" fill={bot} />
        <rect x="26" y="70" width="12" height="40" rx="4" fill={shorts ? 'none' : botD} opacity="0.18" /><path d="M32 74 L32 108 M48 74 L48 108" stroke={botD} strokeWidth="1" opacity="0.5" />
      </>}
      {(shorts || dress) && <><rect x="28" y={dress ? 100 : 88} width="9" height={dress ? 10 : 22} rx="4" fill={skin} /><rect x="43" y={dress ? 100 : 88} width="9" height={dress ? 10 : 22} rx="4" fill={skin} /></>}
      {look.shoes !== 'barefoot' ? <>
        <path d="M23 109 Q23 104 31 104 L40 106 L40 114 L22 114Z" fill={look.shoeColor} stroke="#00000055" strokeWidth="1" /><path d="M40 106 L49 104 Q57 104 57 109 L58 114 L40 114Z" fill={look.shoeColor} stroke="#00000055" strokeWidth="1" />
        <path d="M22 112 L40 112 M40 112 L58 112" stroke="#00000066" strokeWidth="2" /><path d="M28 106 l4 1 M33 106 l4 1 M43 106 l4 -1" stroke="#00000044" strokeWidth="1" />
      </> : <><ellipse cx="31" cy="112" rx="9" ry="3.4" fill={skin} /><ellipse cx="49" cy="112" rx="9" ry="3.4" fill={skin} /></>}
      {/* torso */}
      <rect x="20" y="36" width="40" height="38" rx="12" fill={top} stroke={topD} strokeWidth="1" />
      {look.top === 'kaftan' && <path d="M22 60 L18 104 L62 104 L58 60Z" fill={top} stroke={topD} strokeWidth="1" />}
      {jacket && <><path d="M40 36 L40 74" stroke={topD} strokeWidth="1.6" /><rect x="22" y="62" width="14" height="9" rx="2" fill={topD} opacity="0.5" /></>}
      {look.top === 'jersey' && <text x="40" y="62" textAnchor="middle" fontSize="16" fontWeight="900" fill="rgba(255,255,255,0.8)" fontFamily="Arial Black, sans-serif">7</text>}
      {look.top === 'shirt' && <><path d="M32 36 L40 48 L48 36" fill="#F4F1EA" stroke={topD} strokeWidth="1" /><path d="M40 48 L40 74" stroke={topD} strokeWidth="1" /><circle cx="40" cy="56" r="1" fill={topD} /><circle cx="40" cy="64" r="1" fill={topD} /></>}
      {look.top === 'tee' && <path d="M32 36 Q40 46 48 36" fill={skin} stroke={topD} strokeWidth="1.4" />}
      {hood && <><path d="M26 38 Q40 52 54 38 L52 34 Q40 44 28 34Z" fill={topD} /><path d="M37 46 L36 60 M43 46 L44 60" stroke="#E5E7EB" strokeWidth="1.2" /></>}
      {!dress && <rect x="21" y="68" width="38" height="5" fill={botD} />}
      <rect x="37" y="68" width="6" height="5" rx="1" fill="#D4A72C" />
      {/* arms ready for trouble: one fist raised, the other open */}
      <path d="M22 42 Q8 50 12 30" stroke={look.top === 'tee' ? skin : top} strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M58 42 Q68 54 66 70" stroke={look.top === 'tee' ? skin : top} strokeWidth="10" strokeLinecap="round" fill="none" />
      {look.top === 'tee' && <><path d="M22 42 Q16 46 13 36" stroke={top} strokeWidth="11" strokeLinecap="round" fill="none" /><path d="M58 42 Q63 48 63 54" stroke={top} strokeWidth="11" strokeLinecap="round" fill="none" /></>}
      <circle cx="12" cy="27" r="6.6" fill={skin} stroke="#00000044" strokeWidth="1" /><path d="M8 25 L16 25 M8 28 L16 28" stroke={skinD} strokeWidth="1" />
      <circle cx="66" cy="73" r="6" fill={skin} stroke="#00000044" strokeWidth="1" /><rect x="60" y="62" width="11" height="4" rx="1.5" fill="#CBD5E1" stroke="#475569" strokeWidth="0.8" />
      {/* neck and head */}
      <rect x="34" y="28" width="12" height="11" fill={skin} /><rect x="34" y="28" width="12" height="11" fill="#00000026" />
      <circle cx="22" cy="19" r="4.4" fill={skin} /><circle cx="58" cy="19" r="4.4" fill={skin} />
      <path d="M22 14 Q22 -2 40 -2 Q58 -2 58 14 L57 26 Q55 37 40 38 Q25 37 23 26Z" fill={skin} stroke="#00000033" strokeWidth="1" />
      {/* hair on top */}
      {hs === 'fade' && <path d="M23 12 Q40 -8 57 12 Q52 2 40 2 Q28 2 23 12Z" fill={hair} />}
      {hs === 'lowcut' && <path d="M23 13 Q40 -6 57 13 Q52 4 40 4 Q28 4 23 13Z" fill={hair} />}
      {(hs === 'afro') && <path d="M21 14 Q40 -12 59 14 Q52 4 40 4 Q28 4 21 14Z" fill={hair} />}
      {(hs === 'braids' || hs === 'twists' || hs === 'cornrows') && <><path d="M22 14 Q40 -8 58 14 Q50 2 40 2 Q30 2 22 14Z" fill={hair} />{[28, 34, 40, 46, 52].map((x) => <path key={x} d={`M${x} 2 L${x} 12`} stroke={shade(hair, 1.8)} strokeWidth="0.8" />)}</>}
      {hs === 'dreads' && <path d="M22 14 Q40 -8 58 14 Q50 2 40 2 Q30 2 22 14Z" fill={hair} />}
      {hs === 'bun' && <><path d="M23 13 Q40 -6 57 13 Q52 3 40 3 Q28 3 23 13Z" fill={hair} /><circle cx="40" cy="-4" r="7" fill={hair} /></>}
      {/* a determined, nervous face */}
      <path d="M29 12 L37 15 M51 12 L43 15" stroke={shade(hair, 1)} strokeWidth="2.6" strokeLinecap="round" />
      {[32, 48].map((x) => <g key={x}><ellipse cx={x} cy="19" rx="4.4" ry="3.1" fill="#fff" /><circle cx={x + (x < 40 ? 1 : -1)} cy="19.4" r="2" fill={look.eye ?? '#2A1A10'} /><circle cx={x + (x < 40 ? 1.6 : -0.4)} cy="18.6" r="0.7" fill="#fff" /></g>)}
      <path d="M40 20 L38 28 Q40 30 42 28" stroke={skinD} strokeWidth="1.4" fill="none" />
      <path d="M33 31 Q40 29 47 31 Q45 35 40 35 Q35 35 33 31Z" fill="#7A2E2E" opacity="0.85" /><path d="M35 32 Q40 31 45 32" stroke="#fff" strokeWidth="1.6" opacity="0.85" fill="none" />
      <path d="M45 6 q2 4 0 6 q-2 -2 0 -6" fill="#BAE6FD" opacity="0.8" />
      {look.beard && look.beard !== 'none' && <path d="M27 28 Q40 42 53 28 Q50 36 40 37 Q30 36 27 28Z" fill={hair} opacity="0.75" />}
      {look.accessory === 'glasses' && <><circle cx="32" cy="19" r="5.4" fill="none" stroke="#111" strokeWidth="1.4" /><circle cx="48" cy="19" r="5.4" fill="none" stroke="#111" strokeWidth="1.4" /><path d="M37.4 19 L42.6 19" stroke="#111" strokeWidth="1.4" /></>}
    </svg>
  );
}
