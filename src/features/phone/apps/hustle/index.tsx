import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { hustleRating } from '@/game/hustle';
import { useHustleStore } from '@/stores/hustleStore';
import { Progress } from '../../ui';
import { Board } from './Board';
import { JobDetail } from './Detail';
import { PostJob, Pros } from './Forms';
import { MyWork, Posted } from './Lists';

type Route = { n: 'home' } | { n: 'work' } | { n: 'board' } | { n: 'job'; id: string; from: Route } | { n: 'pros' } | { n: 'post' } | { n: 'mine' } | { n: 'posted' };
const TITLES: Record<string, string> = { work: 'Find Work', board: 'Job Board', pros: 'Find a Pro', post: 'Post a Job', mine: 'My Jobs', posted: 'Jobs I Posted', job: 'Job details' };
const MENU: { to: Route; glyph: string; title: string; sub: string }[] = [
  { to: { n: 'work' }, glyph: '🔍', title: 'Find Work', sub: 'Open jobs you can apply to' },
  { to: { n: 'pros' }, glyph: '🧑🏾‍🔧', title: 'Find a Pro', sub: 'Search providers by service' },
  { to: { n: 'board' }, glyph: '📋', title: 'Browse Board', sub: 'Every job, any status' },
  { to: { n: 'post' }, glyph: '✍🏾', title: 'Post a Job', sub: 'Free to post' },
  { to: { n: 'pros' }, glyph: '🤝', title: 'Hire Directly', sub: 'Ask a player to do a job' },
  { to: { n: 'mine' }, glyph: '🧰', title: 'My Jobs', sub: 'Work I applied for or won' },
  { to: { n: 'posted' }, glyph: '📌', title: 'Jobs I Posted', sub: 'Applicants and hires' },
];

/** Hustle: a gig marketplace between players. Everyone but you is a simulated player. Rules: game/hustle.ts. */
export function HustleApp() {
  const [route, setRoute] = useState<Route>({ n: 'home' });
  const rating = hustleRating();
  useHustleStore((s) => s.listings.length);
  const go = (r: Route) => { sfx.click(); setRoute(r); };
  const openJob = (from: Route) => (id: string) => go({ n: 'job', id, from });
  if (route.n === 'home') return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-5 text-white shadow-lg">
        <p className="text-xs text-white/80">Your hustle rating</p>
        <p className="font-display text-4xl font-extrabold tabular-nums">{rating.score}<span className="text-base font-semibold text-white/70"> / 100 · {rating.level}</span></p>
        <div className="mt-2"><Progress label="Hustle rating" value={rating.score} max={100} /></div>
        <p className="mt-2 text-xs text-white/85">{rating.completed} job{rating.completed === 1 ? '' : 's'} completed. Based on finished jobs only (up to 3 per client count). There are no reviews.</p>
      </div>
      <p className="mt-3 px-1 text-[13px] leading-snug text-slate-600">Players hire players to decorate houses, DJ parties, drive, cook, organise events and more around Nigeria Life. Everyone else here is a simulated player.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">{MENU.map((m) => <button key={m.title} onClick={() => go(m.to)} className="rounded-2xl bg-white p-3 text-left shadow-sm active:bg-slate-50"><span className="text-2xl" aria-hidden>{m.glyph}</span><span className="mt-1 block text-[14px] font-bold">{m.title}</span><span className="block text-[11.5px] leading-snug text-slate-500">{m.sub}</span></button>)}</div>
    </div>
  );
  const back = route.n === 'job' ? route.from : { n: 'home' } as Route;
  return (
    <div className="flex min-h-full flex-col">
      <button onClick={() => go(back)} className="flex items-center gap-1 px-2 py-2.5 text-sm font-bold text-accent" aria-label="Back"><ChevronLeft size={18} />{TITLES[route.n]}</button>
      {route.n === 'work' && <Board mode="work" open={openJob(route)} />}
      {route.n === 'board' && <Board mode="board" open={openJob(route)} />}
      {route.n === 'job' && <JobDetail id={route.id} />}
      {route.n === 'pros' && <Pros />}
      {route.n === 'post' && <PostJob done={(id) => go(id ? { n: 'job', id, from: { n: 'posted' } } : { n: 'posted' })} />}
      {route.n === 'mine' && <MyWork open={openJob(route)} />}
      {route.n === 'posted' && <Posted open={openJob(route)} />}
    </div>
  );
}
