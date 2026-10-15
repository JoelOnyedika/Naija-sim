import { useEffect, useState } from 'react';
import { formatNaira } from '@/core/format';
import { effectiveStatus } from '@/game/ads/slots';
import type { AdStatus, AdSubmission } from '@/types/ads';

export const useNow = (ms = 1000) => { const [n, setN] = useState(Date.now()); useEffect(() => { const t = window.setInterval(() => setN(Date.now()), ms); return () => window.clearInterval(t); }, [ms]); return n; };

export function timeLeft(ms: number) {
  if (ms <= 0) return 'ended';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m}m ${s % 60}s left`;
}

const LOOK: Record<AdStatus, { label: string; cls: string; icon: string }> = {
  draft: { label: 'Draft', cls: 'bg-white/10 text-white/70', icon: '✎' }, pending: { label: 'Pending review', cls: 'bg-amber-400/20 text-amber-300', icon: '⏳' },
  active: { label: 'Live', cls: 'bg-emerald-400/20 text-emerald-300', icon: '●' }, rejected: { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300', icon: '✕' },
  expired: { label: 'Expired', cls: 'bg-white/10 text-white/50', icon: '◌' },
};
/** Status with an icon and a word, never colour alone. */
export function StatusBadge({ status }: { status: AdStatus }) {
  const l = LOOK[status];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${l.cls}`}><span aria-hidden>{l.icon}</span>{l.label}</span>;
}

export const Price = ({ n }: { n: number }) => <span className="font-display font-extrabold text-danfo">{formatNaira(n)}</span>;

/** One line summary of an ad submission for "My ads" lists. */
export function AdRow({ ad, now, onClick, extra }: { ad: AdSubmission; now: number; onClick?: () => void; extra?: React.ReactNode }) {
  const status = effectiveStatus(ad, now);
  return (
    <button onClick={onClick} className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left">
      <img src={ad.imageDataUrl} alt="" className="h-12 w-20 shrink-0 rounded-lg bg-black/30 object-contain" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{ad.advertiser}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/60"><StatusBadge status={status} />{status === 'active' && ad.expiresAt ? <span>{timeLeft(ad.expiresAt - now)}</span> : null}{status === 'rejected' && ad.rejectReason ? <span className="truncate">{ad.rejectReason}</span> : null}</span>
      </span>
      {extra}
    </button>
  );
}
