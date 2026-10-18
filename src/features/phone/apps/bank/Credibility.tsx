import { useMemo } from 'react';
import { CREDIBILITY } from '@/data/economy';
import { formatNaira } from '@/core/format';
import { computeCredibility } from '@/game/credibility';
import { useBankStore } from '@/stores/bankStore';
import { Card, Note, Progress, Title } from '../../ui';

export function CredibilityTab() {
  const signals = useBankStore((s) => s.transferSignals), bills = useBankStore((s) => s.bills), bonds = useBankStore((s) => s.bonds), weeks = useBankStore((s) => s.savingsWeeks);
  const c = useMemo(computeCredibility, [signals, bills, bonds, weeks]);
  const R = 46, C = 2 * Math.PI * R;
  const color = c.score >= 80 ? '#059669' : c.score >= 60 ? '#2F6BFF' : c.score >= 40 ? '#D97706' : '#64748B';
  return (
    <div className="p-3">
      <Card className="flex items-center gap-4">
        <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Credibility ${c.score} out of 100, ${c.band}`}>
          <circle cx="56" cy="56" r={R} fill="none" stroke="#E2E8F0" strokeWidth="10" />
          <circle cx="56" cy="56" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(c.score / 100) * C} ${C}`} transform="rotate(-90 56 56)" />
          <text x="56" y="58" textAnchor="middle" className="fill-slate-900 font-display text-[28px] font-extrabold">{c.score}</text>
          <text x="56" y="76" textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">out of 100</text>
        </svg>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your standing</p><p className="font-display text-2xl font-extrabold" style={{ color }}>{c.band}</p><p className="mt-1 text-xs leading-snug text-slate-500">An in-game score built from what you do in the bank.</p></div>
      </Card>

      <Title>What counts</Title>
      <div className="space-y-2">
        {c.items.map((i) => (
          <Card key={i.id} className="!p-3">
            <div className="flex items-baseline justify-between gap-2"><p className="text-[14px] font-bold">{i.label}</p><span className={`font-display text-sm font-extrabold tabular-nums ${i.points < 0 ? 'text-rose-600' : ''}`}>{i.points > 0 ? '+' : ''}{i.points}{i.max > 0 ? ` / ${i.max}` : ''}</span></div>
            {i.max > 0 && <div className="mt-1.5"><Progress label={i.label} value={i.points} max={i.max} /></div>}
            <p className="mt-1.5 text-xs leading-snug text-slate-500">{i.detail}</p>
          </Card>
        ))}
      </div>

      <Title>How to raise it</Title>
      <Card><ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-slate-600">
        <li>Send transfers of {formatNaira(CREDIBILITY.transferThreshold)} or more to your contacts (counted once per contact per day).</li>
        <li>Keep at least {formatNaira(10_000)} in savings at the weekly interest run.</li>
        <li>Pay weekly bills when they fall due, and clear overdue ones.</li>
        <li>Hold bonds until they mature.</li>
      </ul></Card>
      <Note>Repeating the same transfer, or moving money back and forth, does not farm points: counted transfers are capped per contact. This score only exists inside Nigeria Life and does not affect any real credit or financial eligibility.</Note>
    </div>
  );
}
