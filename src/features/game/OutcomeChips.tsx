import { formatNaira } from '@/core/format';
import type { Effects } from '@/types/game';
import { STAT_META } from './statMeta';

export interface Outcome { key: string; text: string; color: string; good: boolean }

/** Turn stat changes and a naira change into small coloured chips ("+12 Health", "-₦500"). At most `max` are returned, money first. */
export function outcomes(effects?: Effects, money = 0, max = 4): Outcome[] {
  const out: Outcome[] = [];
  if (money) out.push({ key: 'money', text: `${money > 0 ? '+' : '-'}${formatNaira(Math.abs(money))}`, color: '#FFC21A', good: money > 0 });
  for (const [k, v] of Object.entries(effects ?? {})) {
    const m = STAT_META[k as keyof typeof STAT_META];
    if (!m || !v) continue;
    out.push({ key: k, text: `${v > 0 ? '+' : ''}${Math.round(v)} ${m.label}`, color: m.color, good: v > 0 });
  }
  return out.slice(0, max);
}

/** A row of outcome chips. Bad outcomes are drawn dimmer with a red rim so they read as a cost at a glance. */
export function OutcomeRow({ list }: { list: Outcome[] }) {
  if (!list.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {list.map((o) => (
        <span key={o.key} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none"
          style={{ background: `${o.color}22`, color: o.good ? '#F3F7FF' : '#FCA5A5', boxShadow: `inset 0 0 0 1px ${o.good ? `${o.color}55` : '#F8717155'}` }}>
          <i className="block h-1.5 w-1.5 rounded-full" style={{ background: o.good ? o.color : '#F87171' }} />{o.text}
        </span>
      ))}
    </span>
  );
}
