import { AnimatePresence, motion } from 'framer-motion';
import { formatNaira } from '@/core/format';
import { LENDERS } from '@/data/loans';
import { chooseVisit, finishVisit, oddsOf, type VisitChoice } from '@/game/collectors';
import { useEconomyStore } from '@/stores/economyStore';
import { useLoanStore } from '@/stores/loanStore';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The loan collectors at your door (or on the street). Plain 2D scene: choose to hide, run, fight or pay. Rules and odds: game/collectors.ts. */
export function CollectorVisit() {
  const v = useLoanStore((s) => s.visit), money = useEconomyStore((s) => s.money);
  const d = v ? LENDERS[v.lender] : null;
  const home = v?.where === 'home';
  const choices: { id: VisitChoice; label: string; glyph: string; hint: string }[] = v ? [
    ...(home ? [{ id: 'hide' as const, label: 'Pretend you are not home', glyph: '🤫', hint: pct(oddsOf('hide', v)) }] : []),
    { id: 'run', label: home ? 'Sneak out the back and run' : 'Run for it', glyph: '🏃🏾', hint: pct(oddsOf('run', v)) },
    { id: 'fight', label: 'Shout back at them', glyph: '🗣️', hint: pct(oddsOf('fight', v)) },
    { id: 'pay', label: money >= v.owed ? `Pay ${formatNaira(v.owed)}` : `Pay what you have (${formatNaira(money)})`, glyph: '💸', hint: 'sure' },
  ] : [];
  return (
    <AnimatePresence>
      {v && d && (
        <motion.div key="collectors" role="dialog" aria-label="Loan collectors" className="pointer-events-auto absolute inset-0 z-[95] flex items-end justify-center bg-black/65 px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="panel-solid pb-safe relative mb-2 w-full max-w-md overflow-hidden rounded-3xl" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}>
            <div className="relative px-4 pb-3 pt-4" style={{ background: `linear-gradient(160deg, ${d.theme.from}, ${d.theme.to})`, color: d.theme.dark ? '#111' : '#fff' }}>
              <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">{home ? 'Knock knock' : v.where === 'venue' ? 'They found you' : 'On the street'}</div>
              <div className="text-[20px] font-black leading-tight">{d.collectors.crew}</div>
              <motion.div className="mt-2 text-[44px] leading-none" animate={v.result ? {} : { x: [0, -5, 5, -4, 4, 0] }} transition={{ repeat: Infinity, duration: 0.9, repeatDelay: 0.8 }}>
                {home && '🚪'}{Array.from({ length: v.men }, () => '🕴🏾').join('')}
              </motion.div>
            </div>
            <div className="space-y-2 p-4 text-white">
              {!v.result ? (
                <>
                  <p className="text-[14px] italic text-white/80">"{home ? d.collectors.knock : `Hey! ${d.name}! You are owing ${formatNaira(v.owed)}. Where is our money?`}"</p>
                  <p className="text-[12px] text-white/60">You owe {d.name} {formatNaira(v.owed)} (late fees included). {v.men} {v.men > 1 ? 'people' : 'person'}. If this goes wrong they shame you in front of everyone and charge recovery fees.</p>
                  <div className="grid gap-2 pt-1">
                    {choices.map((c) => <button key={c.id} onClick={() => chooseVisit(c.id)} className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 text-left text-[14px] font-bold active:scale-[0.98]"><span className="text-2xl">{c.glyph}</span><span className="flex-1">{c.label}</span><span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/80">{c.hint}</span></button>)}
                  </div>
                </>
              ) : (
                <>
                  <p className={`rounded-2xl p-3 text-[14px] font-semibold ${v.result.tone === 'good' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>{v.result.text}</p>
                  <button onClick={finishVisit} className="w-full rounded-2xl bg-white py-3 text-[15px] font-extrabold text-slate-900 active:scale-[0.98]">Continue</button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
