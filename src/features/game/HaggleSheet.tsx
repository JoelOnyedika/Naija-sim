import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { HAGGLE, acceptPrice, makeOffer, newHaggle, settleHaggle, type HaggleState } from '@/game/haggle';
import { toast, useUiStore } from '@/stores/uiStore';
import { Sheet } from './VenueSheets';

/**
 * The haggling sheet. The seller shows a price and a mood; you slide an offer and he answers. Too low and he gets angry and
 * walks off; way too high and he hails you (you overpaid); close to fair and he "agrees small". Nothing is charged until you
 * press Pay after a deal.
 */
export function HaggleSheet() {
  const h = useUiStore((s) => s.haggle), close = () => useUiStore.getState().setHaggle(null);
  const [st, setSt] = useState<HaggleState | null>(null), [offer, setOffer] = useState(0);
  useEffect(() => { if (h) { setSt(newHaggle(h.ask)); setOffer(Math.round((h.ask * 0.5) / 50) * 50); } else setSt(null); }, [h]);
  if (!h || !st) return <Sheet open={false} label="Haggle" onClose={close}>{null}</Sheet>;
  const step = Math.max(50, Math.round(h.ask / 40 / 50) * 50), lo = Math.max(50, Math.round((h.ask * 0.1) / 50) * 50), hi = Math.round((h.ask * 1.3) / 50) * 50;
  const send = () => { sfx.click(); const n = makeOffer(st, offer); setSt(n); if (n.result?.kind === 'deal') sfx.reward(); else if (n.result?.kind === 'walked') sfx.error(); };
  const pay = () => { const r = settleHaggle(st, h.item, h.who); if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; } sfx.purchase(); toast(r.message, st.result?.kind === 'walked' ? 'bad' : 'good'); close(); };
  const res = st.result;
  return (
    <Sheet open label="Haggle" onClose={close}>
      <div className="pr-10 font-display text-lg font-extrabold">{h.glyph} Haggle for {h.item}</div>
      <p className="text-[12px] text-white/55">Seller: {h.who}</p>
      <div className="mt-3 rounded-2xl bg-white/[0.07] p-3">
        <p className="text-[14px] font-semibold leading-snug" data-testid="haggle-line">{st.line}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="flex gap-1" aria-label={`Seller mood: ${st.mood} of ${HAGGLE.hearts}`}>{Array.from({ length: HAGGLE.hearts }, (_, i) => <Heart key={i} size={18} className={i < st.mood ? 'fill-hibiscus text-hibiscus' : 'text-white/25'} />)}</span>
          <span className="text-[11px] text-white/50">Round {Math.min(st.round + (res ? 0 : 1), HAGGLE.maxRounds)} of {HAGGLE.maxRounds}</span>
        </div>
      </div>
      {!res && (
        <>
          <div className="mt-3 flex items-baseline justify-between"><span className="text-[12px] text-white/60">He wants</span><span className="font-display text-xl font-extrabold text-danfo" data-testid="haggle-price">{formatNaira(st.price)}</span></div>
          <div className="mt-2 rounded-2xl bg-white/[0.07] p-3">
            <div className="text-center text-[11px] font-bold uppercase tracking-wide text-white/50">Your offer</div>
            <div className="text-center font-display text-3xl font-extrabold tabular-nums" data-testid="haggle-offer">{formatNaira(offer)}</div>
            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => setOffer((o) => Math.max(lo, o - step))} aria-label="Offer less" className="h-10 w-10 shrink-0 rounded-full bg-white/15 text-lg font-bold active:bg-white/25">−</button>
              <input type="range" min={lo} max={hi} step={50} value={offer} onChange={(e) => setOffer(Number(e.target.value))} aria-label="Your offer" className="h-10 w-full accent-[#FFC21A]" />
              <button onClick={() => setOffer((o) => Math.min(hi, o + step))} aria-label="Offer more" className="h-10 w-10 shrink-0 rounded-full bg-white/15 text-lg font-bold active:bg-white/25">+</button>
            </div>
          </div>
          <button onClick={send} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold active:brightness-110">Offer {formatNaira(offer)}</button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => { sfx.click(); setSt(acceptPrice(st)); }} className="h-11 rounded-xl bg-white/10 text-[13px] font-bold">Pay his {formatNaira(st.price)}</button>
            <button onClick={() => { sfx.close(); close(); }} className="h-11 rounded-xl bg-white/10 text-[13px] font-bold">Walk away</button>
          </div>
        </>
      )}
      {res?.kind === 'deal' && (
        <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 p-3 text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">{res.grade === 'sharp' ? 'Sharp haggling!' : res.grade === 'fair' ? 'Fair deal' : 'He hailed you: you overpaid'}</div>
          <div className="font-display text-3xl font-extrabold" data-testid="haggle-paid">{formatNaira(res.paid)}</div>
          {res.saved > 0 ? <div className="text-[12px] text-white/70">You saved {formatNaira(res.saved)} off his first price</div> : <div className="text-[12px] text-white/70">No saving this time</div>}
          <button onClick={pay} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold">Pay {formatNaira(res.paid)}</button>
        </div>
      )}
      {res?.kind === 'walked' && <button onClick={pay} className="mt-3 h-12 w-full rounded-xl bg-white/15 text-[15px] font-extrabold">He left. Close</button>}
    </Sheet>
  );
}
