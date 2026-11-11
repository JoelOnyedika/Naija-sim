import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira, formatNairaCompact } from '@/core/format';
import { CLUB_GROUPS, CLUB_OPTIONS, MAX_QTY, type ClubGroup, type ClubOption } from '@/data/club';
import { buyClub, clubPrice } from '@/game/club';
import { toast } from '@/stores/uiStore';

/** The pricier an item, the louder its border: plain, purple glow, pulsing gold, burning. */
const tierOf = (unit: number) => (unit >= 50_000_000 ? 'ball-fire' : unit >= 1_000_000 ? 'ball-gold' : unit >= 100_000 ? 'ball-purple' : '');

/**
 * The club's tasks, shown in the venue panel: everything you can spend on, as stylish cards you tap to buy on the spot. No bar to
 * find, no bouncer to talk to. Each purchase is charged at once, shows in the live feed and goes on the bill.
 */
export function ClubBalling() {
  const [group, setGroup] = useState<ClubGroup>('bottles'), [qty, setQty] = useState<Record<string, number>>({});
  const q = (o: ClubOption) => qty[o.id] ?? 1;
  const buy = (o: ClubOption) => {
    const n = o.multi ? q(o) : 1, r = buyClub([{ id: o.id, qty: n }]);
    if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; }
    sfx.purchase(); toast(`${n > 1 ? `${n}× ` : ''}${o.name}: ${formatNaira(r.receipt.total)}`, 'good');
  };
  return (
    <div className="mt-1.5">
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="What to spend on">
        {CLUB_GROUPS.map((g) => <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => { sfx.click(); setGroup(g.id); }} className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-bold ${group === g.id ? 'border-accent bg-accent text-white' : 'border-white/15 bg-white/5 text-white/80'}`}>{g.label}</button>)}
      </div>
      {/* One slim row per item: emoji, name and a line about it, price, a small stepper when you can buy several, and the buy button. */}
      <div className="no-scrollbar mt-1 max-h-[34vh] space-y-1.5 overflow-y-auto pr-0.5">
        {CLUB_OPTIONS.filter((o) => o.group === group).map((o) => {
          const unit = clubPrice(o), n = o.multi ? q(o) : 1, tier = tierOf(unit);
          return (
            <div key={o.id} className={`ball-card flex items-center gap-2 px-2 py-1.5 ${tier}`}>
              <span className="w-8 shrink-0 text-center text-[26px] leading-none">{o.glyph}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-extrabold leading-tight">{o.name}</div>
                <div className="truncate text-[10.5px] leading-tight text-white/50">{o.blurb}</div>
                <div className="font-display text-[12.5px] font-extrabold leading-tight text-danfo">{formatNairaCompact(unit)}{o.multi ? <span className="text-[10px] font-semibold text-white/45"> each</span> : null}</div>
              </div>
              {o.multi && (
                <div className="flex shrink-0 items-center rounded-lg bg-black/30">
                  <button onClick={() => setQty((x) => ({ ...x, [o.id]: Math.max(1, q(o) - 1) }))} aria-label={`One less ${o.name}`} className="h-8 w-7 text-base font-bold active:bg-white/15">−</button>
                  <span className="w-5 text-center text-[13px] font-extrabold tabular-nums">{n}</span>
                  <button onClick={() => setQty((x) => ({ ...x, [o.id]: Math.min(MAX_QTY, q(o) + 1) }))} aria-label={`One more ${o.name}`} className="h-8 w-7 text-base font-bold active:bg-white/15">+</button>
                </div>
              )}
              <button onClick={() => buy(o)} aria-label={`Buy ${o.name}`} className="h-9 shrink-0 rounded-lg bg-accent px-2.5 text-[12px] font-extrabold active:brightness-110">{o.multi && n > 1 ? formatNairaCompact(unit * n) : 'Buy'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
