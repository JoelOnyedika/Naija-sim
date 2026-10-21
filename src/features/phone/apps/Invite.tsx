import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { REFERRAL } from '@/data/balance';
import { fireTask } from '@/game/tasks';
import { makeCode, shareLink } from '@/game/referrals';
import { useAuthStore } from '@/stores/authStore';
import { useReferralStore } from '@/stores/referralStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Note, Progress, Stat, Title } from '../ui';

/** The invite screen. See stores/referralStore.ts for what this device can and cannot know without an online service. */
export function InviteApp() {
  const me = useAuthStore((s) => s.session) ?? 'player';
  const code = makeCode(me);
  const link = shareLink(code, typeof location !== 'undefined' ? location.origin + location.pathname : '');
  const r = useReferralStore();
  const [entry, setEntry] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { fireTask('app:invite'); }, []);

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard?.writeText(text); sfx.pop(); toast(`${what} copied`, 'good'); } catch { toast('Could not copy. Select the text and copy it yourself.', 'bad'); }
  };
  const share = async () => {
    const text = `Join me on Nigeria Life! Use my invite code ${code}.`;
    try { if (navigator.share) await navigator.share({ title: 'Nigeria Life', text, url: link }); else await copy(`${text} ${link}`, 'Invite'); } catch { /* the player closed the share sheet */ }
  };
  const apply = (raw: string) => { const x = useReferralStore.getState().redeem(raw, code); setMsg({ ok: x.ok, text: x.message }); if (x.ok) { sfx.reward(); setEntry(''); } else sfx.error(); };
  const qualified = !!r.qualifiedAt;
  const confirmed = r.confirmed.reduce((a, c) => a + c.amount, 0);

  return (
    <div className="space-y-3 p-3">
      <Card className="bg-gradient-to-br from-violet-600 to-purple-800 text-center text-white">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-white/75">Your invite code</p>
        <p className="mt-1 select-all font-display text-[34px] font-extrabold tracking-[0.12em]" aria-label={`Your invite code is ${code}`}>{code}</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-[12px] text-white/80">Friends who spend {formatNaira(REFERRAL.minSpend)} in the game earn you {formatNaira(REFERRAL.reward)}.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Btn tone="light" className="px-1 text-[13px]" onClick={() => void copy(code, 'Code')}>Copy code</Btn>
          <Btn tone="light" className="px-1 text-[13px]" onClick={() => void copy(link, 'Link')}>Copy link</Btn>
          <Btn tone="green" className="px-1 text-[13px]" onClick={() => void share()}>Share</Btn>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Invitations" value={r.invitations} sub="friends who joined" />
        <Stat label="Eligible" value={r.confirmed.length + r.pendingRewards} sub={`spent ${formatNaira(REFERRAL.minSpend)}+`} />
        <Stat label="Pending" value={formatNaira(r.pendingRewards * REFERRAL.reward)} sub="waiting to be confirmed" />
        <Stat label="Earned" value={formatNaira(confirmed)} tone={confirmed ? 'good' : 'plain'} sub="confirmed, in-game" />
      </div>
      <Note>Counts and rewards for your invites are confirmed by the online service, which is not connected yet. Until it is, they stay at zero, and nothing is added to your balance by clicking a link or opening an account.</Note>

      <Title>Got a friend&apos;s code?</Title>
      {r.pendingRef && !r.referredBy && (
        <Card className="bg-violet-50">
          <p className="text-sm font-bold">Your link has a code: {r.pendingRef}</p>
          <div className="mt-2 flex gap-2"><Btn onClick={() => apply(r.pendingRef!)}>Use it</Btn><Btn tone="light" onClick={() => r.clearPending()}>Not now</Btn></div>
        </Card>
      )}
      {r.referredBy ? (
        <Card>
          <p className="text-sm font-bold">You used {r.referredBy}</p>
          <div className="mt-2"><Progress value={Math.min(r.spent, REFERRAL.minSpend)} max={REFERRAL.minSpend} label="Spending towards your friend's reward" /></div>
          <p className="mt-1.5 text-[12px] text-slate-600">{qualified ? 'You qualified your friend. The online service will confirm their reward.' : `${formatNaira(Math.min(r.spent, REFERRAL.minSpend))} of ${formatNaira(REFERRAL.minSpend)} spent`}</p>
        </Card>
      ) : (
        <Card>
          <label className="block text-[12px] font-semibold text-slate-600" htmlFor="ref-code">Enter a code (you can only use one)</label>
          <div className="mt-1.5 flex gap-2">
            <input id="ref-code" value={entry} onChange={(e) => { setEntry(e.target.value); setMsg(null); }} maxLength={12} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="NL-AB23CD" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-display text-[15px] font-bold uppercase tracking-wider outline-none focus:border-violet-500" />
            <Btn onClick={() => apply(entry)} disabled={!entry.trim()}>Apply</Btn>
          </div>
          {msg && <p role="status" className={`mt-1.5 text-[12px] font-semibold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
        </Card>
      )}
      {r.referredBy && msg?.ok && <p role="status" className="px-1 text-[12px] font-semibold text-emerald-600">{msg.text}</p>}

      <Title>How it works</Title>
      <Card>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-snug text-slate-700">
          <li>Share your code or link with a friend.</li>
          <li>They enter it once. You cannot use your own code.</li>
          <li>They spend {formatNaira(REFERRAL.minSpend)} in the game on things like furniture, food and visits. Transfers, savings, bets and investments do not count, and selling something back takes that money off.</li>
          <li>You earn {formatNaira(REFERRAL.reward)} once per friend, after the service confirms it. Clicking a link or making an account earns nothing.</li>
        </ol>
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">Rewards are in-game naira only. They cannot be withdrawn or exchanged for real money.</p>
      </Card>
    </div>
  );
}
