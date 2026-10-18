import { formatNaira } from '@/core/format';
import { fmtGameSpan } from '@/core/gameTime';
import type { Listing, ListingStatus } from '@/stores/hustleStore';
import { getPlayer } from '@/data/players';
import { Card, Row } from '../../ui';

const BADGE: Record<ListingStatus, [string, string]> = {
  open: ['Open', 'bg-emerald-100 text-emerald-700'], requested: ['Waiting for reply', 'bg-amber-100 text-amber-700'], accepted: ['Accepted', 'bg-sky-100 text-sky-700'],
  in_progress: ['In progress', 'bg-violet-100 text-violet-700'], completed: ['Completed', 'bg-slate-200 text-slate-700'], cancelled: ['Cancelled', 'bg-rose-100 text-rose-700'],
};
export const StatusBadge = ({ status }: { status: ListingStatus }) => <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${BADGE[status][1]}`}>{BADGE[status][0]}</span>;
export const clientName = (id: string) => (id === 'me' ? 'You' : `@${getPlayer(id)?.username ?? id}`);
export const deadlineText = (l: Listing, now: number) => (l.deadline === undefined ? 'No deadline' : l.deadline < now ? 'Expired' : `Ends in ${fmtGameSpan(l.deadline - now)}`);

export function JobCard({ l, now, onOpen, mine }: { l: Listing; now: number; onOpen: (id: string) => void; mine?: boolean }) {
  const p = getPlayer(l.clientId);
  const waiting = l.applicants.filter((a) => a.status === 'applied').length;
  return (
    <Card>
      <button className="w-full text-left" onClick={() => onOpen(l.id)} aria-label={`${l.title}, view details`}>
        <Row glyph={p?.avatar ?? '🧑🏾'} title={l.title} sub={`${clientName(l.clientId)} · ${l.location}`} right={<div className="text-right"><div className="font-display text-sm font-extrabold text-emerald-700">{formatNaira(l.agreedRate ?? l.budget)}</div><StatusBadge status={l.status} /></div>} />
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-slate-600">{l.description}</p>
        <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500"><span>{l.category}</span><span>{l.status === 'open' ? deadlineText(l, now) : ''}</span>{waiting > 0 && <span>{waiting} applicant{waiting > 1 ? 's' : ''}</span>}{l.sample && !mine && <span>Sample job</span>}</p>
      </button>
    </Card>
  );
}
