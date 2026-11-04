import { AnimatePresence, motion } from 'framer-motion';
import { Dices, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { getStreetEvent, type EventChoice, type StreetEvent } from '@/data/streetEvents';
import { answerEvent, canPick, choiceNeeds, ignorePending } from '@/game/streetEvents';
import { useDailyStore } from '@/stores/dailyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { OutcomeRow, outcomes } from './OutcomeChips';

/** Each moment gets one of these colour moods, picked from its id so it is always the same. */
const MOODS: [string, string][] = [['#0B8F4D', '#07603A'], ['#FF8A3D', '#B4491A'], ['#2F6BFF', '#1B3A9E'], ['#A855F7', '#5B21B6'], ['#FF4D6D', '#9F1239'], ['#19C3A6', '#0E6F63']];
const moodOf = (ev: StreetEvent) => MOODS[[...ev.id].reduce((a, c) => a + c.charCodeAt(0), 0) % MOODS.length];

/** What a choice will do, as chips: its price, a gamble's odds and prize, or the plain outcome. */
function chipsFor(c: EventChoice) {
  const r = c.risk;
  if (r) return outcomes(r.winEffects, r.winMoney ? r.winMoney - (c.cost ?? 0) : c.cost ? -c.cost : 0, 3);
  return outcomes(c.effects, (c.money ?? 0) - (c.cost ?? 0), 4);
}

/**
 * A street moment: somebody stops you and you pick what to do. A colourful bottom card with a countdown. The 3D world stays visible
 * above it. Letting the time run out (or closing the card) ignores the person, which can have a small cost.
 */
export function EventPrompt() {
  const pending = useDailyStore((s) => s.pending);
  const money = useEconomyStore((s) => s.money);
  const place = useInteriorStore((s) => s.current?.name);
  const [left, setLeft] = useState(1);
  const ev = pending ? getStreetEvent(pending.eventId) : undefined;
  useEffect(() => {
    if (!pending) return;
    const tick = () => setLeft(Math.max(0, 1 - (Date.now() - pending.startedAt) / (pending.seconds * 1000)));
    tick(); const id = window.setInterval(tick, 200); return () => window.clearInterval(id);
  }, [pending]);
  const [c1, c2] = ev ? moodOf(ev) : MOODS[0];
  return (
    <AnimatePresence>
      {pending && ev && (
        <motion.div key={pending.eventId + pending.startedAt} className="pointer-events-auto absolute inset-0 z-[80] flex items-end justify-center bg-gradient-to-t from-black/65 via-black/15 to-transparent px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-label={`${ev.who}: ${ev.title}`} className="pb-safe relative mb-2 max-h-[86vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-[1.4rem] border border-white/12 bg-[#0E131C] shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
            initial={{ y: 110, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 110, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            {/* hero */}
            <div className="relative flex items-center gap-3 px-4 pb-3 pt-4" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${c1}cc 0%, ${c2}99 55%, transparent 100%)` }}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-30 blur-2xl" style={{ background: c1 }} />
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.2rem] bg-black/30 text-[38px] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/25">{ev.icon}</motion.div>
              <div className="min-w-0 flex-1 pr-9">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white">{ev.who}</span>
                  <span className="truncate text-[10.5px] font-semibold text-white/75">{place ? `📍 ${place}` : '🏠 At home'}</span>
                </div>
                <div className="mt-1 font-display text-[21px] font-extrabold leading-[1.1] text-white drop-shadow">{ev.title}</div>
              </div>
              <button onClick={() => { sfx.close(); ignorePending(); }} aria-label="Ignore" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white/90 ring-1 ring-white/15 active:bg-black/55"><X size={17} /></button>
            </div>
            {/* what they said */}
            <div className="px-4 pt-3">
              <div className="relative rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-[14px] italic leading-snug text-white/90">{ev.text}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Time left to answer" aria-valuenow={Math.round(left * 100)}>
                <div className="h-full rounded-full" style={{ width: `${left * 100}%`, background: left > 0.3 ? `linear-gradient(90deg, ${c1}, #FFC21A)` : 'linear-gradient(90deg, #FF4D6D, #FF8A3D)', transition: 'width 0.2s linear' }} />
              </div>
            </div>
            {/* choices */}
            <div className="space-y-2 px-4 pb-4 pt-3">
              {ev.choices.map((c) => {
                const ok = canPick(c), need = choiceNeeds(c);
                const free = !c.cost && !c.risk;
                return (
                  <motion.button key={c.id} whileTap={ok ? { scale: 0.98 } : undefined} disabled={!ok} onClick={() => { const r = answerEvent(c.id); if (!r.ok && r.reason !== 'insufficient') sfx.error(); }} aria-label={c.label}
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] px-3 py-2.5 text-left active:from-white/20 disabled:opacity-45">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[17px]" style={{ background: c.risk ? '#A855F733' : c.cost ? '#FFC21A26' : '#34D39926' }}>
                      {c.risk ? <Dices size={18} className="text-violet-300" /> : c.cost ? '💸' : '✨'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold leading-tight">{c.label}</span>
                      {c.risk && <span className="mt-0.5 block text-[10.5px] font-semibold text-violet-300">{Math.round(c.risk.winChance * 100)}% chance to win</span>}
                      <OutcomeRow list={chipsFor(c)} />
                      {!ok && <span className="mt-1 block text-[10.5px] font-bold text-rose-300">Need {formatNaira(need)} (you have {formatNaira(money)})</span>}
                    </span>
                    {free && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Free</span>}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
