import { motion } from 'framer-motion';
import { Circle, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useContext, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/audio/sfx';
import { BottomSlot } from './bottomSlot';

/** Light-theme building blocks shared by every phone app. */
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-[20px] bg-white p-4 text-slate-900 ${className}`}>{children}</div>
);
export const Title = ({ children }: { children: ReactNode }) => <h3 className="mb-1.5 mt-6 px-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500 first:mt-0">{children}</h3>;
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-8 text-center text-sm text-slate-400">{children}</p>;

export function Btn({ tone = 'dark', className = '', onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'dark' | 'green' | 'red' | 'light' }) {
  const t = { dark: 'bg-slate-900 text-white', green: 'bg-emerald-600 text-white', red: 'bg-rose-600 text-white', light: 'bg-slate-100 text-slate-800' }[tone];
  return <button {...rest} onClick={(e) => { sfx.click(); onClick?.(e); }} className={`rounded-xl px-3.5 py-2 text-[13px] font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${t} ${className}`} />;
}

export const Chip = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) => (
  <motion.button whileTap={{ scale: 0.93 }} aria-pressed={active ?? false} onClick={() => { sfx.click(); onClick(); }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${active ? 'bg-accent text-white' : 'bg-white text-slate-600 shadow-sm'}`}>{children}</motion.button>
);

export const Row = ({ glyph, title, sub, right }: { glyph?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center gap-3">
    {glyph && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">{glyph}</span>}
    <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold leading-tight">{title}</div>{sub && <div className="text-xs leading-snug text-slate-500">{sub}</div>}</div>
    {right}
  </div>
);

/**
 * The app's navigation bar. It is a fixed bar at the BOTTOM of the app (drawn into AppView's bottom strip), with at most five
 * items, each with an icon and a label, so every section is always visible: nothing to scroll sideways, nothing hidden.
 * More than five sections? The first four show, and "More" opens the rest in a small list. Prefer merging related sections
 * onto one page instead.
 */
export type TabDef<T extends string> = readonly [T, string] | readonly [T, string, LucideIcon];
const MAX_TABS = 5;
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly TabDef<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const slot = useContext(BottomSlot);
  const [more, setMore] = useState(false);
  if (!slot) return null;
  const split = tabs.length > MAX_TABS, shown = split ? tabs.slice(0, MAX_TABS - 1) : tabs, rest = split ? tabs.slice(MAX_TABS - 1) : [];
  const item = (t: TabDef<T>, active: boolean, onClick: () => void, key: string) => {
    const Icon = (t[2] as LucideIcon | undefined) ?? Circle;
    return (
      <button key={key} role="tab" aria-selected={active} onClick={() => { sfx.click(); onClick(); }} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-[10.5px] font-semibold">
        <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${active ? 'bg-accent/15 text-accent' : 'text-slate-500'}`}><Icon size={21} strokeWidth={active ? 2.3 : 1.9} /></span>
        <span className={`w-full truncate text-center ${active ? 'text-accent' : 'text-slate-500'}`}>{t[1]}</span>
      </button>
    );
  };
  return createPortal(
    <nav aria-label={label} className="border-t border-slate-200 bg-white">
      {more && <div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">{rest.map((t) => <button key={t[0]} role="menuitem" onClick={() => { sfx.click(); onChange(t[0]); setMore(false); }} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-[14px] font-semibold last:border-0 ${value === t[0] ? 'text-accent' : 'text-slate-800'}`}>{t[2] ? (() => { const I = t[2] as LucideIcon; return <I size={19} />; })() : null}{t[1]}</button>)}</div>}
      <div role="tablist" aria-label={label} className="flex pb-0.5">
        {shown.map((t) => item(t, value === t[0], () => { setMore(false); onChange(t[0]); }, t[0]))}
        {split && item(['more' as T, 'More', MoreHorizontal] as TabDef<T>, rest.some((t) => t[0] === value), () => setMore((v) => !v), 'more')}
      </div>
    </nav>,
    slot,
  );
}

/** Two or three mutually exclusive options in one pill, e.g. Light / Dark / System. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-slate-100 p-1">
      {options.map(([id, text]) => (
        <button key={id} role="radio" aria-checked={value === id} onClick={() => { sfx.click(); onChange(id); }}
          className={`flex-1 rounded-lg px-2 py-1.5 text-[13px] font-bold transition ${value === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{text}</button>
      ))}
    </div>
  );
}

export const SearchField = ({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) => (
  <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full rounded-xl bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-accent" />
);

export const Stat = ({ label, value, tone = 'plain', sub }: { label: string; value: ReactNode; tone?: 'plain' | 'good' | 'bad'; sub?: ReactNode }) => (
  <div className="rounded-2xl bg-white p-3 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-0.5 font-display text-[17px] font-extrabold tabular-nums leading-tight ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
    {sub && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{sub}</p>}
  </div>
);

export const Progress = ({ value, max, label }: { value: number; max: number; label: string }) => (
  <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, value)} className="h-2 overflow-hidden rounded-full bg-slate-200">
    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0}%` }} />
  </div>
);

/** A friendlier empty state than a bare line of grey text: a glyph, what is missing, and what to do about it. */
export const EmptyState = ({ glyph, title, children }: { glyph: string; title: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center gap-1 px-6 py-8 text-center"><span className="text-3xl" aria-hidden>{glyph}</span><p className="text-sm font-bold text-slate-700">{title}</p>{children && <p className="text-xs leading-snug text-slate-500">{children}</p>}</div>
);

export const Note = ({ children }: { children: ReactNode }) => <p className="px-1 text-[11.5px] leading-snug text-slate-500">{children}</p>;

/** An amount field that only accepts digits and shows the value in naira underneath. */
export function MoneyField({ value, onChange, label, invalid }: { value: string; onChange: (v: string) => void; label: string; invalid?: boolean }) {
  return (
    <>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input inputMode="numeric" value={value} maxLength={12} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))} placeholder="₦0" aria-invalid={invalid}
        className={`mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] font-bold text-slate-900 outline-none ring-2 ${invalid ? 'ring-rose-400' : 'ring-transparent focus:ring-accent'}`} />
    </>
  );
}
