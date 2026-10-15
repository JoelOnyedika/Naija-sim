import type { Appearance } from '@/types/game';

/**
 * A small procedural head-and-shoulders portrait drawn from the character's appearance (skin, hair style and colour, top,
 * accessory). Pure SVG: no extra 3D canvas, so it is free to show in the HUD at all times.
 */
export function Portrait({ a, size = 48, className = '' }: { a: Appearance; size?: number; className?: string }) {
  const hair = a.hairColor, skin = a.skin;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="Your character">
      <defs><clipPath id="pclip"><circle cx="32" cy="32" r="32" /></clipPath><linearGradient id="pbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#35507A" /><stop offset="1" stopColor="#16233A" /></linearGradient></defs>
      <g clipPath="url(#pclip)">
        <rect width="64" height="64" fill="url(#pbg)" />
        {/* hair behind the head */}
        {a.hairStyle === 'afro' && <circle cx="32" cy="24" r="17" fill={hair} />}
        {a.hairStyle === 'dreads' && <path d="M14 26c0-12 8-17 18-17s18 5 18 17v22h-6V30H20v18h-6z" fill={hair} />}
        {a.hairStyle === 'braids' && <path d="M15 27c0-12 7-18 17-18s17 6 17 18v18h-5V30H20v15h-5z" fill={hair} />}
        {/* shoulders and top */}
        <path d="M6 66c0-14 10-22 26-22s26 8 26 22z" fill={a.topColor} />
        <path d="M26 44l6 7 6-7z" fill={skin} />
        {/* neck and head */}
        <rect x="27" y="36" width="10" height="10" rx="3" fill={skin} />
        <ellipse cx="32" cy="27" rx="12" ry="14" fill={skin} />
        {/* hair on top */}
        {a.hairStyle === 'lowcut' && <path d="M20 24c0-8 5-12 12-12s12 4 12 12c-3-4-7-6-12-6s-9 2-12 6z" fill={hair} />}
        {a.hairStyle === 'fade' && <path d="M20 23c1-7 6-11 12-11s11 4 12 11c-3-3-7-4-12-4s-9 1-12 4z" fill={hair} opacity="0.9" />}
        {a.hairStyle === 'afro' && <path d="M17 24c0-9 6-15 15-15s15 6 15 15c-3-5-8-8-15-8s-12 3-15 8z" fill={hair} />}
        {(a.hairStyle === 'braids' || a.hairStyle === 'dreads') && <path d="M19 25c0-9 5-14 13-14s13 5 13 14c-3-4-7-6-13-6s-10 2-13 6z" fill={hair} />}
        {a.hairStyle === 'bun' && <><circle cx="32" cy="9" r="5" fill={hair} /><path d="M20 24c0-8 5-12 12-12s12 4 12 12c-3-4-7-6-12-6s-9 2-12 6z" fill={hair} /></>}
        {/* face */}
        <circle cx="27" cy="28" r="1.4" fill="#1A1210" /><circle cx="37" cy="28" r="1.4" fill="#1A1210" />
        <path d="M28 34c2.5 2 5.5 2 8 0" stroke="#1A1210" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {a.accessory === 'glasses' && <g stroke="#111" strokeWidth="1.3" fill="none"><rect x="22" y="25" width="8" height="6" rx="2" /><rect x="34" y="25" width="8" height="6" rx="2" /><path d="M30 28h4" /></g>}
      </g>
    </svg>
  );
}
