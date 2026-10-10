import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { sfx } from '@/audio/sfx';

/** Light-theme building blocks shared by every phone app. */
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-white p-3.5 text-slate-900 shadow-sm ${className}`}>{children}</div>
);
export const Title = ({ children }: { children: ReactNode }) => <h3 className="mb-2 mt-4 px-1 font-display text-[15px] font-bold text-slate-700 first:mt-0">{children}</h3>;
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-8 text-center text-sm text-slate-400">{children}</p>;

export function Btn({ tone = 'dark', className = '', onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'dark' | 'green' | 'red' | 'light' }) {
  const t = { dark: 'bg-slate-900 text-white', green: 'bg-emerald-600 text-white', red: 'bg-rose-600 text-white', light: 'bg-slate-100 text-slate-800' }[tone];
  return <button {...rest} onClick={(e) => { sfx.click(); onClick?.(e); }} className={`rounded-xl px-3.5 py-2 text-[13px] font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${t} ${className}`} />;
}

export const Chip = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) => (
  <motion.button whileTap={{ scale: 0.93 }} onClick={() => { sfx.click(); onClick(); }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>{children}</motion.button>
);

export const Row = ({ glyph, title, sub, right }: { glyph?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center gap-3">
    {glyph && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">{glyph}</span>}
    <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold leading-tight">{title}</div>{sub && <div className="text-xs leading-snug text-slate-500">{sub}</div>}</div>
    {right}
  </div>
);
