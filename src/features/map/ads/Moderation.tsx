import { useState } from 'react';
import { effectiveStatus } from '@/game/ads/slots';
import { useAdsStore } from '@/stores/adsStore';
import { toast } from '@/stores/uiStore';
import { AdRow, useNow } from './common';

/**
 * DEVELOPMENT-ONLY moderation. Shown in dev builds, or in production when localStorage['nl.moderator'] = '1'. It calls the
 * same store actions (approve / reject) that a real admin interface would call, but it is NOT secure: anybody can switch it
 * on. A production system must do moderation on a server with real authentication.
 */
export const isModerator = () => import.meta.env.DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('nl.moderator') === '1');

export function Moderation() {
  const subs = useAdsStore((s) => s.submissions);
  const now = useNow(1000);
  const [reason, setReason] = useState('');
  if (!isModerator()) return null;
  const pending = subs.filter((s) => s.status === 'pending'), live = subs.filter((s) => effectiveStatus(s, now) === 'active');
  const act = (r: { ok: boolean; error?: string }, msg: string) => toast(r.ok ? msg : (r as { error: string }).error, r.ok ? 'good' : 'bad');
  return (
    <div className="rounded-2xl border border-dashed border-amber-300/40 p-3">
      <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-amber-300">Moderation (dev only)</div>
      {!pending.length && !live.length && <p className="text-xs text-white/55">Nothing waiting. Submitted ads appear here.</p>}
      <div className="space-y-2">
        {pending.map((s) => (
          <div key={s.id} className="space-y-1.5">
            <AdRow ad={s} now={now} />
            <div className="flex gap-1.5">
              <button onClick={() => act(useAdsStore.getState().approve(s.id), 'Approved: now live for the full duration.')} className="flex-1 rounded-xl bg-emerald-500/25 py-1.5 text-xs font-bold text-emerald-200">Approve</button>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reject reason" className="min-w-0 flex-[2] rounded-xl bg-white/10 px-2 text-xs" aria-label="Reject reason" />
              <button onClick={() => { act(useAdsStore.getState().reject(s.id, reason), 'Rejected: the position is free again.'); setReason(''); }} className="flex-1 rounded-xl bg-rose-500/25 py-1.5 text-xs font-bold text-rose-200">Reject</button>
            </div>
          </div>
        ))}
        {live.map((s) => (
          <div key={s.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><AdRow ad={s} now={now} /></div>
            <button onClick={() => { useAdsStore.setState({ submissions: useAdsStore.getState().submissions.map((x) => (x.id === s.id ? { ...x, expiresAt: Date.now() - 1000 } : x)) }); useAdsStore.getState().sweep(); toast('Expired now (test): the position is free again.'); }} className="shrink-0 rounded-xl bg-white/10 px-2 py-2 text-[11px] font-bold">Expire now</button></div>
        ))}
      </div>
    </div>
  );
}
