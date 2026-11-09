import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { BET, cashOutValue, combinedOdds, matchesFor, placeBet, settleBet, type Leg, type Pick, type Settlement, type Ticket } from '@/game/betting';
import { useClockStore } from '@/stores/clockStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { Sheet } from './VenueSheets';

const STAKES = [1_000, 5_000, 20_000, 100_000, 500_000];
const LABEL: Record<Pick, string> = { H: 'Home', D: 'Draw', A: 'Away' };

/** A card that opens the slip: the signature thing to do at the viewing centre, shown in the venue panel's Tasks. */
export function BettingEntry() {
  return (
    <button onClick={() => { sfx.open(); useUiStore.getState().setBetting(true); }} aria-label="Open the betting slip" className="ball-card ball-gold flex w-full items-center gap-3 p-3 text-left active:brightness-125">
      <span className="text-3xl">🎟️</span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold">Betting slip</span><span className="block text-[12px] leading-snug text-white/65">Pick up to {BET.maxLegs} matches, set your stake, watch the results come in. Cash out early if you dare.</span></span>
      <span className="rounded-full bg-amber-400/25 px-2 py-1 text-[10.5px] font-extrabold tracking-wider text-amber-200">{BET.matchesPerDay} MATCHES</span>
    </button>
  );
}

/**
 * The betting slip. Choose a result for up to five of today's matches, pick a stake, place the bet. The money leaves at once; the
 * results are then revealed one at a time. After a correct leg you can cash out for a bit less than the full win. The house takes
 * a margin on every price, so over many bets you lose: it is a game of nerves, not a way to make money.
 */
export function BettingSlip() {
  const open = useUiStore((s) => s.bettingOpen), close = () => { if (!live) useUiStore.getState().setBetting(false); else toast('The matches are still playing. Cash out or wait for the whistle.', 'bad'); };
  const minutes = useClockStore((s) => s.minutes), day = Math.floor(minutes / 1440);
  const matches = useMemo(() => matchesFor(day), [day]);
  const [legs, setLegs] = useState<Leg[]>([]), [stake, setStake] = useState(5_000);
  const [ticket, setTicket] = useState<Ticket | null>(null), [shown, setShown] = useState(0), [done, setDone] = useState<Settlement | null>(null);
  const settled = useRef(false);
  const live = !!ticket && !done;
  const odds = combinedOdds(matches, legs), potential = Math.round(stake * odds);
  useEffect(() => { if (!open) { setLegs([]); setTicket(null); setShown(0); setDone(null); settled.current = false; } }, [open]);
  // reveal one result every 1.4 seconds; after the last one the ticket pays out (or not)
  useEffect(() => {
    if (!ticket || done) return;
    if (shown >= ticket.results.length) { // every match is played out, even after a lost leg, so you see how close it was
      if (settled.current) return; settled.current = true;
      const s = settleBet(ticket); setDone(s); (s.kind === 'won' ? sfx.reward : sfx.error)();
      return;
    }
    const t = window.setTimeout(() => { setShown((n) => n + 1); sfx.click(); }, 1400);
    return () => window.clearTimeout(t);
  }, [ticket, shown, done]);
  const pick = (matchId: string, p: Pick) => { sfx.click(); setLegs((ls) => { const has = ls.find((l) => l.matchId === matchId); if (has?.pick === p) return ls.filter((l) => l.matchId !== matchId); const rest = ls.filter((l) => l.matchId !== matchId); return rest.length >= BET.maxLegs ? ls : [...rest, { matchId, pick: p }]; }); };
  const place = () => { const r = placeBet(day, legs, stake); if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; } sfx.purchase(); settled.current = false; setTicket(r.ticket); setShown(0); setDone(null); };
  const offer = ticket && !done ? cashOutValue(ticket, shown) : 0;
  const cash = () => { if (!ticket || !offer || settled.current) return; settled.current = true; const s = settleBet(ticket, shown); setDone(s); sfx.reward(); toast(`Cashed out ${formatNaira(s.paid)}`, 'good'); };
  const again = () => { setTicket(null); setShown(0); setDone(null); setLegs([]); settled.current = false; };
  return (
    <Sheet open={open} label="Betting slip" onClose={close}>
      <div className="pr-10 font-display text-lg font-extrabold">🎟️ Betting slip</div>
      <p className="text-[12px] text-white/55">In-game naira. The house keeps a margin, so you lose over time.</p>
      {!ticket && (
        <>
          <div className="mt-3 space-y-2">
            {matches.map((m) => {
              const cur = legs.find((l) => l.matchId === m.id)?.pick;
              return (
                <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-2.5">
                  <div className="flex items-center justify-between text-[13px] font-bold"><span className="truncate">{m.home}</span><span className="mx-2 text-white/40">vs</span><span className="truncate text-right">{m.away}</span></div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(['H', 'D', 'A'] as const).map((p) => (
                      <button key={p} onClick={() => pick(m.id, p)} aria-pressed={cur === p} aria-label={`${m.home} vs ${m.away}: ${LABEL[p]} at ${m.odds[p].toFixed(2)}`} className={`h-12 rounded-xl border text-center leading-tight ${cur === p ? 'border-amber-300 bg-amber-400/25 text-amber-100' : 'border-white/10 bg-white/[0.07]'}`}>
                        <span className="block text-[10.5px] font-semibold text-white/60">{LABEL[p]}</span><span className="block text-[15px] font-extrabold tabular-nums">{m.odds[p].toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sticky bottom-0 z-10 -mx-1 mt-3 bg-[#131922] px-1 pb-1 pt-2">
          <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3">
            <div className="flex items-center justify-between text-[12px] text-white/70"><span>{legs.length} {legs.length === 1 ? 'pick' : 'picks'} · combined odds</span><span className="font-display text-lg font-extrabold text-amber-200" data-testid="slip-odds">{legs.length ? odds.toFixed(2) : '–'}</span></div>
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {STAKES.map((s) => <button key={s} onClick={() => { sfx.click(); setStake(s); }} aria-pressed={stake === s} className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${stake === s ? 'border-amber-300 bg-amber-400/25' : 'border-white/10 bg-white/[0.06] text-white/75'}`}>{formatNaira(s)}</button>)}
            </div>
            <div className="mt-1 flex items-center justify-between"><span className="text-[12px] text-white/70">Possible win</span><span className="font-display text-xl font-extrabold text-danfo" data-testid="slip-potential">{legs.length ? formatNaira(potential) : '–'}</span></div>
          </div>
          <button disabled={!legs.length} onClick={place} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold disabled:opacity-40">{legs.length ? `Place bet · ${formatNaira(stake)}` : 'Pick a result first'}</button>
          </div>
        </>
      )}
      {ticket && (
        <>
          <div className="mt-3 space-y-2">
            {ticket.results.map((r, i) => {
              const m = ticket.matches.find((x) => x.id === r.matchId)!, revealed = i < shown;
              return (
                <div key={r.matchId} className={`rounded-2xl border p-2.5 ${!revealed ? 'border-white/10 bg-white/[0.05]' : r.won ? 'border-emerald-400/50 bg-emerald-500/15' : 'border-rose-400/50 bg-rose-500/15'}`}>
                  <div className="flex items-center justify-between text-[13px] font-bold"><span className="truncate">{m.home}</span><span className="mx-2 min-w-[3.2rem] text-center font-display text-lg font-extrabold tabular-nums">{revealed ? `${r.score[0]} - ${r.score[1]}` : '…'}</span><span className="truncate text-right">{m.away}</span></div>
                  <div className="mt-1 text-[12px] text-white/70">Your pick: {LABEL[r.pick]} at {m.odds[r.pick].toFixed(2)}{revealed ? (r.won ? ' · correct ✓' : ' · wrong ✗') : ' · playing…'}</div>
                </div>
              );
            })}
          </div>
          {live && offer > 0 && <button onClick={cash} className="mt-3 h-12 w-full rounded-xl bg-amber-400 text-[15px] font-extrabold text-black active:brightness-110">Cash out {formatNaira(offer)}</button>}
          {live && <p className="mt-2 text-center text-[11.5px] text-white/50">Stake {formatNaira(ticket.stake)} · would win {formatNaira(ticket.potential)}</p>}
          {done && (
            <div className={`mt-3 rounded-2xl border p-3 text-center ${done.paid > 0 ? 'border-emerald-400/50 bg-emerald-500/15' : 'border-rose-400/40 bg-rose-500/10'}`}>
              <div className="text-[11px] font-extrabold uppercase tracking-widest">{done.kind === 'won' ? 'You won!' : done.kind === 'cashed' ? 'Cashed out' : done.nearMiss ? 'So close!' : 'Not this time'}</div>
              <div className="font-display text-3xl font-extrabold" data-testid="slip-result">{done.paid > 0 ? `+${formatNaira(done.paid)}` : `−${formatNaira(ticket.stake)}`}</div>
              <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={again} className="h-11 rounded-xl bg-accent text-[14px] font-extrabold">New slip</button><button onClick={() => useUiStore.getState().setBetting(false)} className="h-11 rounded-xl bg-white/10 text-[14px] font-bold">Done</button></div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
