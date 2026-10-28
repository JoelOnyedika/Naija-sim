import { Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatNaira } from '@/core/format';

/** One small pill. Always the same height, centred text, never wraps or spills out. */
export function Chip({ tone, children }: { tone: 'good' | 'bad' | 'gold' | 'sky' | 'plain' | 'danger'; children: ReactNode }) {
  const c = { good: 'bg-emerald-500/20 text-emerald-300', bad: 'bg-rose-500/20 text-rose-300', gold: 'bg-amber-500/20 text-amber-300', sky: 'bg-sky-500/20 text-sky-300', plain: 'bg-white/10 text-white/70', danger: 'bg-rose-500/25 text-rose-200' }[tone];
  return <span className={`inline-flex h-6 max-w-full shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold leading-none ${c}`}>{children}</span>;
}

export interface TaskCardProps {
  glyph: string; title: string; seconds?: number | null; cost: number;
  risk?: { chance: number }; winMoney?: number; effects: { label: string; delta: number }[]; skill?: string;
  locked?: boolean; width: number | string; maxEffects?: number;
  /** Tap target for the whole card (the chat panel). The action menu passes a footer button instead. */
  onSelect?: () => void; footer?: ReactNode;
}

/** The card for one task, used everywhere a task is offered: same layout, same alignment, nothing cut off. */
export function TaskCard(p: TaskCardProps) {
  const shown = p.effects.slice(0, p.maxEffects ?? 4), more = p.effects.length - shown.length;
  const body = (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl leading-none ${p.locked ? 'bg-white/5 grayscale' : 'bg-white/10'}`}>{p.glyph}</span>
        {p.seconds != null && <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-black/30 px-2 text-[11.5px] font-semibold tabular-nums text-white/70"><Clock size={11} strokeWidth={2.5} />{p.seconds}s</span>}
      </div>
      <div className="mt-2 flex min-h-[1.5rem] w-full flex-wrap items-center gap-1.5">
        <Chip tone={p.cost ? 'gold' : 'good'}>{p.cost ? formatNaira(p.cost) : 'Free'}</Chip>
        {p.risk && <Chip tone="danger"><span aria-hidden>🚨</span>Risky{p.risk.chance < 1 ? ` · ${Math.round(p.risk.chance * 100)}%` : ''}</Chip>}
        {p.winMoney ? <Chip tone="gold">Win {formatNaira(p.winMoney)}</Chip> : null}
      </div>
      <div className={`mt-2 min-h-[2.5rem] w-full break-words text-left text-[15px] font-bold leading-[1.2] ${p.locked ? 'text-white/55' : ''}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
      <div className="mt-2 flex min-h-[3.2rem] w-full flex-wrap content-start items-start gap-1.5">
        {shown.map((e) => <Chip key={e.label} tone={e.delta > 0 ? 'good' : 'bad'}>{e.label.startsWith('Money') ? `+${formatNaira(e.delta)} pay` : `${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta)} ${e.label}`}</Chip>)}
        {more > 0 && <Chip tone="plain">+{more} more</Chip>}
        {p.skill && <Chip tone="sky">{p.skill.replace(' when finished', '')}</Chip>}
      </div>
      {p.footer && <div className="mt-auto w-full pt-2">{p.footer}</div>}
    </>
  );
  const cls = `relative flex shrink-0 flex-col items-start overflow-hidden rounded-2xl border p-3 text-left ${p.locked ? 'border-white/5 bg-white/[0.04]' : 'border-white/10 bg-white/[0.08]'}`;
  return p.onSelect ? <button onClick={p.onSelect} style={{ width: p.width }} className={`${cls} active:bg-white/10`}>{body}</button> : <div style={{ width: p.width }} className={cls}>{body}</div>;
}
