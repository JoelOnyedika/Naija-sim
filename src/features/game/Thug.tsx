import type { ThugLook, Weapon } from '@/data/agbero';
import './thug.css';

export type ThugMood = 'idle' | 'attack' | 'lower' | 'cheer';

/** Weapons are drawn pointing up from the hand at (0,0). */
function WeaponArt({ w }: { w: Weapon }) {
  switch (w) {
    case 'club': return (<g>
      <path d="M-3.5 0 L-5.5 -10 Q-10 -30 -7 -47 Q0 -56 7 -47 Q10 -30 5.5 -10 L3.5 0Z" fill="#7C4A1E" stroke="#3B2210" strokeWidth="1.2" />
      <ellipse cx="-2" cy="-24" rx="2.4" ry="3.4" fill="#4A2A10" /><ellipse cx="3" cy="-38" rx="2" ry="2.8" fill="#4A2A10" /><path d="M-4 -44 Q0 -48 4 -44" stroke="#A9743D" strokeWidth="1.4" fill="none" />
      {[[-8, -40], [8, -36], [-8, -30], [8, -44]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 2} L${x + (x < 0 ? -5 : 5)} ${y} L${x} ${y + 2}Z`} fill="#9CA3AF" stroke="#4B5563" strokeWidth="0.5" />)}
    </g>);
    case 'plank': return (<g>
      <rect x="-8" y="-54" width="16" height="54" rx="1.5" fill="#A47A4B" stroke="#4A2F17" strokeWidth="1.2" />
      <path d="M-4 -52 L-4 -4 M2 -50 L3 -6 M5 -46 L5 -10" stroke="#7A5530" strokeWidth="0.9" fill="none" />
      {[[-5, -48], [4, -44], [-3, -36], [5, -30], [-4, -24]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="1.6" fill="#D1D5DB" /><path d={`M${x} ${y} L${x + (i % 2 ? 7 : -7)} ${y - 3}`} stroke="#9CA3AF" strokeWidth="1.2" /></g>)}
      <path d="M-8 -54 L-5 -58 L-2 -54 L2 -57 L5 -54 L8 -56 L8 -54Z" fill="#A47A4B" />
    </g>);
    case 'pipe': return (<g>
      <rect x="-3.6" y="-56" width="7.2" height="56" rx="2" fill="#9CA3AF" stroke="#374151" strokeWidth="1" />
      <rect x="-1.4" y="-54" width="1.6" height="50" fill="#E5E7EB" opacity="0.7" /><rect x="-4" y="-22" width="8" height="5" fill="#92400E" opacity="0.7" /><rect x="-4.2" y="-56" width="8.4" height="4" rx="1" fill="#6B7280" />
    </g>);
    case 'bottle': return (<g>
      <path d="M-3.5 0 L-3.5 -14 L-8.5 -24 L-8.5 -42 L-5 -37 L-2 -47 L1 -38 L4 -48 L6 -38 L8.5 -42 L8.5 -24 L3.5 -14 L3.5 0Z" fill="#22C55E" opacity="0.9" stroke="#14532D" strokeWidth="1" />
      <path d="M-5 -26 L-5 -38" stroke="#BBF7D0" strokeWidth="1.6" opacity="0.8" />
    </g>);
    default: return (<g>
      <rect x="-2" y="-54" width="4" height="54" rx="1.5" fill="#1F1B16" /><circle cx="0" cy="-56" r="5" fill="#F5B301" stroke="#92400E" strokeWidth="1" /><rect x="-2.6" y="-14" width="5.2" height="3" fill="#F5B301" />
    </g>);
  }
}

const STUBBLE: [number, number][] = [[36, 47], [40, 50], [44, 52], [50, 53], [56, 52], [60, 50], [64, 47], [33, 42], [67, 42], [38, 44], [62, 44], [47, 55], [53, 55], [42, 55], [58, 55]];

/**
 * An Agbero, drawn ugly on purpose: sunken red-veined eyes under a furious V of eyebrows, a crooked nose, a snarl with gritted teeth
 * (some missing, some gold), a scar, stubble, sweat and a throbbing vein, in torn and dirty clothes with a weapon in his raised fist.
 * SVG, so it animates cheaply and looks the same on every phone. `mood` changes what the weapon and the body do.
 */
export function Thug({ look, mood = 'idle', size = 1 }: { look: ThugLook; mood?: ThugMood; size?: number }) {
  const b = look.build, bareTorso = look.top === 'bare' || look.top === 'vest';
  const torsoX = 50 - 22 * b, torsoW = 44 * b, shoulderL = 50 - 21 * b, shoulderR = 50 + 21 * b;
  const skinDark = '#00000033';
  return (
    <svg viewBox="-6 -24 112 176" width={112 * 0.78 * size} height={176 * 0.78 * size} aria-hidden className={`th-rage th-${mood}`} style={{ overflow: 'visible' }}>
      <ellipse cx="50" cy="147" rx={30 * b} ry="5" fill="rgba(0,0,0,0.35)" />
      {/* legs and slippers */}
      {look.top === 'kaftan' ? <path d="M30 96 L26 142 L74 142 L70 96Z" fill={look.trousers} stroke="#CBD5E1" strokeWidth="1" /> : <>
        <path d={`M${50 - 18 * b} 98 L${50 - 20 * b} 128 L${50 - 18 * b} 143 L${50 - 4} 143 L${50 - 2} 100Z`} fill={look.trousers} /><path d={`M${50 + 18 * b} 98 L${50 + 20 * b} 128 L${50 + 18 * b} 143 L${50 + 4} 143 L${50 + 2} 100Z`} fill={look.trousers} />
        <path d={`M${50 - 20 * b} 134 l3 3 l3 -3 l3 3 l4 -3`} stroke="#00000055" strokeWidth="1" fill="none" />
      </>}
      <ellipse cx={50 - 11 * b} cy="145" rx="10" ry="3.4" fill="#78350F" /><ellipse cx={50 + 11 * b} cy="145" rx="10" ry="3.4" fill="#78350F" />
      <g className="th-breathe">
        {/* torso */}
        <rect x={torsoX} y="50" width={torsoW} height="54" rx="15" fill={bareTorso ? look.skin : look.topColor} />
        {look.top === 'kaftan' && <path d={`M${torsoX} 70 L${torsoX - 3} 140 L${torsoX + torsoW + 3} 140 L${torsoX + torsoW} 70Z`} fill={look.topColor} stroke="#CBD5E1" strokeWidth="1" />}
        <ellipse cx="50" cy="88" rx={19 * b} ry="15" fill={bareTorso ? look.skin : look.topColor} />
        <ellipse cx="50" cy="88" rx={19 * b} ry="15" fill="rgba(255,255,255,0.08)" />
        {look.top === 'vest' && <>
          <path d={`M${torsoX + 6} 52 L${torsoX + 14} 52 L${torsoX + 14} 78 Q50 84 ${torsoX + torsoW - 14} 78 L${torsoX + torsoW - 14} 52 L${torsoX + torsoW - 6} 52 L${torsoX + torsoW - 2} 100 L${torsoX + torsoW - 6} 106 l-4 -4 l-4 5 l-4 -5 l-4 5 l-4 -5 l-4 5 l-4 -5 l-4 4 L${torsoX + 2} 100Z`} fill={look.topColor} stroke="#00000044" strokeWidth="0.8" />
          <ellipse cx="38" cy="92" rx="5" ry="3" fill="#7C4A1E" opacity="0.45" /><ellipse cx="60" cy="80" rx="4" ry="6" fill="#7C4A1E" opacity="0.35" /><path d="M44 94 l2 3 M58 98 l3 2" stroke="#3B2210" strokeWidth="1.2" />
        </>}
        {look.top === 'bare' && <><path d="M50 54 L50 78" stroke={skinDark} strokeWidth="1.4" /><path d="M36 64 Q44 72 50 66 Q56 72 64 64" stroke={skinDark} strokeWidth="1.4" fill="none" /><path d="M40 96 Q50 100 60 96" stroke={skinDark} strokeWidth="1.2" fill="none" /></>}
        {look.top === 'jersey' && <><path d="M42 50 L50 62 L58 50" fill={look.skin} /><text x="50" y="88" textAnchor="middle" fontSize="20" fontWeight="900" fill="rgba(255,255,255,0.85)" fontFamily="Arial Black, sans-serif">10</text><path d="M38 100 l3 3 l4 -3 l4 3 l4 -3" stroke="#00000055" strokeWidth="1" fill="none" /></>}
        {look.top === 'hoodie' && <><path d={`M${torsoX + 2} 54 Q50 46 ${torsoX + torsoW - 2} 54 L${torsoX + torsoW - 6} 62 Q50 56 ${torsoX + 6} 62Z`} fill="rgba(0,0,0,0.28)" /><rect x="38" y="84" width="24" height="14" rx="4" fill="rgba(0,0,0,0.2)" /><path d="M46 60 L45 74 M54 60 L55 74" stroke="#E5E7EB" strokeWidth="1.2" /></>}
        {look.top === 'kaftan' && <><path d="M50 56 L50 136" stroke="#E5B84A" strokeWidth="2" /><path d="M38 60 Q50 72 62 60" stroke="#E5B84A" strokeWidth="2" fill="none" /></>}
        {/* the arm that holds the weapon, raised */}
        <path d={`M${shoulderL} 62 Q${shoulderL - 18} 66 ${22 - (b - 1) * 4} 46`} stroke={look.top === 'jersey' || look.top === 'hoodie' ? look.topColor : look.skin} strokeWidth={11 * b} strokeLinecap="round" fill="none" />
        <path d={`M${shoulderL - 8} 63 Q${shoulderL - 16} 62 ${26 - (b - 1) * 4} 52`} stroke={skinDark} strokeWidth="1.2" fill="none" className="th-vein" />
        <g transform={`translate(${22 - (b - 1) * 4} 44)`}>
          <g className="th-weapon"><WeaponArt w={look.weapon} /></g>
          <circle cx="0" cy="0" r={7.5} fill={look.skin} stroke="#00000055" strokeWidth="1" />
          <path d="M-4 -2 L4 -2 M-4 1 L4 1" stroke="#00000066" strokeWidth="1" />
        </g>
        {/* the other arm: a clenched fist at the side */}
        <path d={`M${shoulderR} 62 Q${shoulderR + 14} 76 ${82 + (b - 1) * 4} 92`} stroke={look.top === 'jersey' || look.top === 'hoodie' ? look.topColor : look.skin} strokeWidth={11 * b} strokeLinecap="round" fill="none" />
        <circle cx={82 + (b - 1) * 4} cy="94" r="7.5" fill={look.skin} stroke="#00000055" strokeWidth="1" /><path d={`M${78 + (b - 1) * 4} 92 L${86 + (b - 1) * 4} 92 M${78 + (b - 1) * 4} 95 L${86 + (b - 1) * 4} 95`} stroke="#00000066" strokeWidth="1" />
        {look.gold && <><path d="M37 55 Q50 76 63 55" stroke="#FBBF24" strokeWidth="2.4" fill="none" /><circle cx="50" cy="71" r="3.4" fill="#FBBF24" stroke="#92400E" strokeWidth="0.8" /></>}
        <rect x="43" y="44" width="14" height="12" fill={look.skin} /><rect x="43" y="44" width="14" height="12" fill={skinDark} />
        {look.top === 'hoodie' && <ellipse cx="50" cy="52" rx="19" ry="7" fill={look.topColor} />}
        {/* the head: a big square jaw */}
        <circle cx="25" cy="29" r="5.5" fill={look.skin} /><circle cx="75" cy="29" r="5.5" fill={look.skin} /><circle cx="25" cy="29" r="2.4" fill={skinDark} /><circle cx="75" cy="29" r="2.4" fill={skinDark} />
        <path d="M25 18 Q25 2 50 2 Q75 2 75 18 L73 38 Q71 56 50 57 Q29 56 27 38 Z" fill={look.skin} stroke="#00000044" strokeWidth="1" />
        {look.head === 'none' && <path d="M27 17 Q50 -4 73 17 Q63 7 50 7 Q37 7 27 17Z" fill="#17110D" />}
        {/* forehead wrinkles and a throbbing vein */}
        <path d="M36 12 Q50 9 64 12 M38 16 Q50 13 62 16" stroke="#00000040" strokeWidth="1.1" fill="none" />
        <path d="M65 9 l3 4 -3 3 3 4" stroke="#7F1D1D" strokeWidth="1.5" fill="none" className="th-vein" />
        {/* eyes: sunken, bloodshot, glaring */}
        {[38, 62].map((x, i) => (<g key={x}>
          <ellipse cx={x} cy="32" rx="8" ry="5" fill="rgba(0,0,0,0.38)" />
          <ellipse cx={x} cy="31" rx="5.2" ry="3.3" fill="#F8EAD6" />
          <path d={`M${x - 4} 31 L${x - 1} 30 M${x + 4} 31 L${x + 1} 32 M${x - 3} 33 L${x} 32`} stroke="#DC2626" strokeWidth="0.7" />
          <circle cx={x + (i ? -1 : 1)} cy="31.4" r="1.9" fill="#111" />
          <path d={`M${x - 6} 27 L${x + 6} 27 L${x + (i ? -6 : 6)} ${i ? 30 : 30}Z`} fill={look.skin} opacity="0.95" transform={`rotate(${i ? 14 : -14} ${x} 28)`} />
          <path d={`M${x - 5} 36 Q${x} 39 ${x + 5} 36`} stroke="#00000055" strokeWidth="1.2" fill="none" />
        </g>))}
        {/* furious V brows */}
        <path d={`M30 21 L47 29`} stroke="#0B0705" strokeWidth={4.6 * look.brow} strokeLinecap="round" /><path d={`M70 21 L53 29`} stroke="#0B0705" strokeWidth={4.6 * look.brow} strokeLinecap="round" />
        <path d="M48.5 22 L49 28 M51.5 22 L51 28" stroke="#00000066" strokeWidth="1.2" />
        {/* a crooked nose with flared nostrils */}
        <path d="M49 30 L45 43 Q43 47 49 47.5 Q57 48 56 43 L52 30" fill="#00000026" stroke="#00000066" strokeWidth="1" /><ellipse cx="47.5" cy="45.4" rx="1.7" ry="1.2" fill="#1A0D08" /><ellipse cx="53.5" cy="45.6" rx="1.7" ry="1.2" fill="#1A0D08" />
        {/* the snarl: gritted teeth, a gap, a gold one */}
        <path d="M35 49 Q50 42 65 49 Q63 58 50 59 Q37 58 35 49Z" fill="#2A0F0F" stroke="#00000088" strokeWidth="1" />
        <path d="M38 49 Q50 45 62 49 L61 53 Q50 50 39 53Z" fill="#F3EBD3" />
        {[42, 46, 50, 54, 58].map((x) => <path key={x} d={`M${x} 47 L${x} 52`} stroke="#8B7B5B" strokeWidth="0.7" />)}
        {look.gap && <rect x="46.3" y="47.2" width="3.4" height="4.6" fill="#2A0F0F" />}
        {look.gold && <rect x="54.2" y="47.2" width="3.4" height="4.4" fill="#F5B301" />}
        <path d="M34 44 Q31 50 36 56 M66 44 Q69 50 64 56" stroke="#00000055" strokeWidth="1.2" fill="none" />
        {look.stubble && STUBBLE.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.8" fill="#000" opacity="0.5" />)}
        {look.scar && <g><path d="M66 22 L58 41" stroke="#E2A58D" strokeWidth="1.8" strokeLinecap="round" /><path d="M64.6 25 l3 -1 M62.8 30 l3 -1 M61 35 l3 -1" stroke="#7F1D1D" strokeWidth="0.9" /></g>}
        <path d="M70 15 q2 4 0 6 q-2 -2 0 -6" fill="#BAE6FD" opacity="0.8" />
        {/* headwear */}
        {look.head === 'bandana' && <><path d="M26 14 Q50 2 74 14 L74 21 Q50 11 26 21Z" fill={look.headColor} /><path d="M72 15 L84 11 L80 20 L86 24 L74 22Z" fill={look.headColor} /><circle cx="40" cy="14" r="1" fill="#fff" opacity="0.6" /><circle cx="56" cy="11" r="1" fill="#fff" opacity="0.6" /></>}
        {look.head === 'cap' && <><path d="M26 16 Q50 -8 74 16Z" fill={look.headColor} /><path d="M29 15 L71 15 L67 21 L33 21Z" fill="rgba(0,0,0,0.45)" /><circle cx="50" cy="-1" r="2" fill="rgba(255,255,255,0.4)" /></>}
        {look.head === 'beanie' && <><path d="M26 19 Q26 -6 50 -6 Q74 -6 74 19Z" fill={look.headColor} /><path d="M30 6 L30 17 M38 0 L38 17 M46 -3 L46 17 M54 -3 L54 17 M62 0 L62 17 M70 6 L70 17" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" /><rect x="26" y="14" width="48" height="6" rx="3" fill="rgba(0,0,0,0.3)" /></>}
        {look.head === 'fila' && <><path d="M31 16 L69 16 L65 -4 L35 -4Z" fill={look.headColor} stroke="#E5B84A" strokeWidth="1.2" /><path d="M33 10 L67 10" stroke="#E5B84A" strokeWidth="1.4" /></>}
      </g>
    </svg>
  );
}
