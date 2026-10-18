import { useHustleStore, type Listing } from '@/stores/hustleStore';
import { Card, EmptyState, Title } from '../../ui';
import { useGameMinutes } from '../bank/common';
import { JobCard } from './common';

function Group({ title, items, open, empty }: { title: string; items: Listing[]; open: (id: string) => void; empty: string }) {
  const now = useGameMinutes();
  return (<><Title>{title} ({items.length})</Title>
    <div className="space-y-2">{items.length === 0 ? <Card><p className="py-2 text-center text-[13px] text-slate-400">{empty}</p></Card> : items.map((l) => <JobCard key={l.id} l={l} now={now} onOpen={open} mine={l.clientId === 'me'} />)}</div></>);
}

/** Jobs where I am the worker. */
export function MyWork({ open }: { open: (id: string) => void }) {
  const all = useHustleStore((s) => s.listings);
  const mine = all.filter((l) => l.clientId !== 'me');
  const working = mine.filter((l) => l.workerId === 'me' && (l.status === 'accepted' || l.status === 'in_progress'));
  const applied = mine.filter((l) => l.status === 'open' && l.applicants.some((a) => a.applicantId === 'me' && a.status === 'applied'));
  const done = mine.filter((l) => l.workerId === 'me' && l.status === 'completed');
  const lost = mine.filter((l) => l.applicants.some((a) => a.applicantId === 'me' && (a.status === 'declined' || a.status === 'withdrawn')) && l.workerId !== 'me');
  if (!working.length && !applied.length && !done.length && !lost.length) return <Card className="m-3"><EmptyState glyph="🧰" title="No jobs yet">Find work on the board and apply. Applying is not the same as being hired.</EmptyState></Card>;
  return <div className="p-3"><Group title="Working on" items={working} open={open} empty="Nothing in progress" /><Group title="Applied" items={applied} open={open} empty="No waiting applications" /><Group title="Completed" items={done} open={open} empty="Nothing completed yet" /><Group title="Declined or withdrawn" items={lost} open={open} empty="None" /></div>;
}

/** Jobs where I am the client. */
export function Posted({ open }: { open: (id: string) => void }) {
  const mine = useHustleStore((s) => s.listings).filter((l) => l.clientId === 'me');
  if (!mine.length) return <Card className="m-3"><EmptyState glyph="📌" title="You have not posted a job">Post a job or hire someone directly. Hiring holds the payment in escrow.</EmptyState></Card>;
  return <div className="p-3">
    <Group title="Open" items={mine.filter((l) => l.status === 'open')} open={open} empty="No open jobs" />
    <Group title="Being worked on" items={mine.filter((l) => ['requested', 'accepted', 'in_progress'].includes(l.status))} open={open} empty="Nobody is working for you right now" />
    <Group title="Completed" items={mine.filter((l) => l.status === 'completed')} open={open} empty="Nothing completed yet" />
    <Group title="Cancelled" items={mine.filter((l) => l.status === 'cancelled')} open={open} empty="None" /></div>;
}
