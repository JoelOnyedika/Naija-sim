import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira, formatNairaCompact } from '@/core/format';
import { CLUB_GROUPS, CLUB_OPTIONS, MAX_QTY, type ClubGroup, type ClubOption } from '@/data/club';
import { buyClub, clubPrice, tonightsBill } from '@/game/club';
import { useClubStore } from '@/stores/clubStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { toast, useUiStore } from '@/stores/uiStore';

/** The pricier an item, the louder its border: plain, purple glow, pulsing gold, burning. */
const tierOf = (unit: number) => (unit >= 50_000_000 ? 'ball-fire' : unit >= 1_000_000 ? 'ball-gold' : unit >= 100_000 ? 'ball-purple' : '');

/**
 * The club's tasks, shown in the venue panel: everything you can spend on, as stylish cards you tap to buy on the spot. No bar to
 * find, no bouncer to talk to. Each purchase is charged at once, shows in the live feed and goes on the bill.
 */
export function ClubBalling() {
  const [group, setGroup] = useState<ClubGroup>('bottles'), [qty, setQty] = useState<Record<string, number>>({});
  const receipts = useClubStore((s) => s.receipts), since = useClubStore((s) => s.since), club = useInteriorStore((s) => s.current?.name ?? 'Club');
  const tonight = tonightsBill(receipts, club, since).total;
  const q = (o: ClubOption) => qty[o.id] ?? 1;
  const buy = (o: ClubOption) => {
    const n = o.multi ? q(o) : 1, r = buyClub([{ id: o.id, qty: n }]);
    if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; }
    sfx.purchase(); toast(`${n > 1 ? `${n}× ` : ''}${o.name}: ${formatNaira(r.receipt.total)}`, 'good');
  };
  return (
    <div className="mt-2">
      <button onClick={() => { sfx.open(); useUiStore.getState().setClubTicket(true); }} aria-label="Open my bill" className="flex w-full items-center justify-between rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-500/20 to-fuchsia-600/20 px-3 py-2.5 text-left active:brightness-125">
        <span className="flex items-center gap-2"><span className="text-xl">🧾</span><span className="leading-tight"><span className="block text-[11px] font-bold uppercase tracking-widest text-amber-200/80">Burned tonight</span><span className="block font-display text-lg font-extrabold text-amber-200">{formatNaira(tonight)}</span></span></span>
        <span className="flex items-center gap-0.5 text-[12px] font-bold text-white/70">View bill<ChevronRight size={16} /></span>
      </button>
      <div className="no-scrollbar -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="What to spend on">
        {CLUB_GROUPS.map((g) => <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => { sfx.click(); setGroup(g.id); }} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${group === g.id ? 'border-accent bg-accent/25' : 'border-white/10 bg-white/[0.06] text-white/75'}`}>{g.label}</button>)}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {CLUB_OPTIONS.filter((o) => o.group === group).map((o) => {
          const unit = clubPrice(o), n = o.multi ? q(o) : 1, tier = tierOf(unit);
          return (
            <div key={o.id} className={`ball-card flex flex-col p-2.5 ${tier}`}>
              <div className="flex items-start justify-between"><span className="text-3xl leading-none">{o.glyph}</span>{tier === 'ball-fire' && <span className="rounded-full bg-orange-500/30 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-orange-200">LEGEND</span>}{tier === 'ball-gold' && <span className="rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-amber-200">BIG MOVE</span>}</div>
              <div className="mt-1.5 text-[13.5px] font-extrabold leading-tight">{o.name}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-white/55" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.blurb}</div>
              <div className="mt-1.5 font-display text-[15px] font-extrabold text-danfo">{formatNairaCompact(unit)}{o.multi ? <span className="text-[10.5px] font-semibold text-white/45"> each</span> : null}</div>
              {o.multi && (
                <div className="mt-1.5 flex items-center justify-between rounded-xl bg-black/30 p-0.5">
                  <button onClick={() => setQty((s) => ({ ...s, [o.id]: Math.max(1, q(o) - 1) }))} aria-label={`One less ${o.name}`} className="h-8 w-8 rounded-lg text-lg font-bold active:bg-white/15">−</button>
                  <span className="text-[14px] font-extrabold tabular-nums">{n}</span>
                  <button onClick={() => setQty((s) => ({ ...s, [o.id]: Math.min(MAX_QTY, q(o) + 1) }))} aria-label={`One more ${o.name}`} className="h-8 w-8 rounded-lg text-lg font-bold active:bg-white/15">+</button>
                </div>
              )}
              <button onClick={() => buy(o)} aria-label={`Buy ${o.name}`} className="mt-2 h-10 w-full rounded-xl bg-accent text-[13px] font-extrabold active:brightness-110">Spend {formatNairaCompact(unit * n)}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
