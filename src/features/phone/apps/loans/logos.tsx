import type { ReactNode } from 'react';
import type { LenderId } from '@/data/loans';

/**
 * Home-screen logos for the three loan apps: hand-made SVG, full square (the phone rounds the corners), no pictures to download.
 * OFAY follows the look of the green OPay mark (ring and highlight dot), FALMFAY the purple palm mark of PalmPay, KWIKKASH is its own.
 */
const frame = (children: ReactNode, defs: ReactNode) => (
  <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden><defs>{defs}</defs>{children}</svg>
);

export function OfayLogo() {
  return frame((
    <>
      <rect width="100" height="100" fill="url(#ofg)" />
      <circle cx="82" cy="14" r="26" fill="#fff" opacity="0.1" /><circle cx="14" cy="92" r="22" fill="#003d24" opacity="0.18" />
      {/* the ring: a thick O with a gap where the F begins */}
      <path d="M50 22 a28 28 0 1 0 27.2 21" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" />
      <path d="M52 36 h20 M52 50 h13" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <circle cx="78" cy="30" r="6.5" fill="#B8FFD9" />
    </>
  ), <linearGradient id="ofg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#12E58A" /><stop offset="1" stopColor="#008F4E" /></linearGradient>);
}

export function FalmfayLogo() {
  return frame((
    <>
      <rect width="100" height="100" fill="url(#fpg)" />
      <circle cx="20" cy="18" r="30" fill="#fff" opacity="0.1" />
      {/* a palm tree: curved trunk, five leaves, a coin */}
      <path d="M52 86 C48 66 50 52 57 38" fill="none" stroke="#FDE68A" strokeWidth="7" strokeLinecap="round" />
      <g fill="#fff">
        <path d="M57 38 C44 22 28 26 20 38 C33 32 45 34 57 38Z" /><path d="M57 38 C50 20 60 8 74 8 C66 18 62 28 57 38Z" />
        <path d="M57 38 C70 24 86 28 92 40 C80 33 68 34 57 38Z" /><path d="M57 38 C42 36 30 46 28 58 C38 48 47 42 57 38Z" opacity="0.92" /><path d="M57 38 C72 38 84 48 84 60 C76 50 66 43 57 38Z" opacity="0.92" />
      </g>
      <circle cx="75" cy="78" r="10" fill="#FB923C" /><circle cx="75" cy="78" r="5.5" fill="none" stroke="#FFEDD5" strokeWidth="2.4" />
    </>
  ), <linearGradient id="fpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A78BFA" /><stop offset="0.55" stopColor="#7C3AED" /><stop offset="1" stopColor="#4C1D95" /></linearGradient>);
}

export function KwikkashLogo() {
  return frame((
    <>
      <rect width="100" height="100" fill="#FACC15" />
      <rect width="100" height="12" fill="#111" /><rect width="100" height="12" fill="url(#kwh)" />
      <circle cx="50" cy="56" r="34" fill="#111" />
      <path d="M55 24 L30 60 H47 L42 88 L72 48 H54 Z" fill="#FACC15" stroke="#FACC15" strokeWidth="2" strokeLinejoin="round" />
    </>
  ), <pattern id="kwh" width="16" height="12" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)"><rect width="8" height="12" fill="#FACC15" /></pattern>);
}

export const LOAN_LOGOS: Record<LenderId, () => JSX.Element> = { ofay: OfayLogo, falmfay: FalmfayLogo, kwikkash: KwikkashLogo };
