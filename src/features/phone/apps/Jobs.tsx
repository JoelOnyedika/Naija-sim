import { formatNaira } from '@/core/format';
import { JOBS } from '@/data/jobs';
import { jobBlocked, startShift } from '@/game/jobs';
import { useStatsStore } from '@/stores/statsStore';
import { Btn, Card, Row } from '../ui';

export function JobsApp() {
  useStatsStore((s) => s.stats);
  const activity = useStatsStore((s) => s.activity);
  return (
    <div className="space-y-2 p-3">
      {activity?.kind === 'job' && <Card className="bg-emerald-50"><div className="text-sm font-bold">Working: {activity.label}</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-200"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${(activity.elapsed / activity.seconds) * 100}%` }} /></div></Card>}
      {JOBS.map((j) => { const why = jobBlocked(j.id); return (
        <Card key={j.id}>
          <Row glyph={j.glyph} title={j.title} sub={`${j.company} · ${j.blurb}`} right={<div className="text-right font-display font-extrabold text-emerald-700">{formatNaira(j.salary)}</div>} />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>⚡ {j.energyCost} energy · ⏱ {j.seconds}s · {j.minCharisma ? `Needs ${j.minCharisma} Charisma` : 'No requirements'}</span>
            <Btn tone="green" disabled={!!why} onClick={() => startShift(j.id)}>{why ?? 'Work a shift'}</Btn></div>
        </Card>
      ); })}
    </div>
  );
}
