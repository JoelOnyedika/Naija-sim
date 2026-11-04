import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { FINALE, ROAD_CHOICES, STAGES, getOpponent, type Opponent, type RoadChoice } from '@/data/agbero';
import { chooseRoad, fighterNow, finishRoadblock, oddsFor, resolveFinale, stageOf } from '@/game/agbero';
import { useAgberoStore } from '@/stores/agberoStore';
import { useEconomyStore } from '@/stores/economyStore';
import { OutcomeRow, outcomes } from './OutcomeChips';

/** A simple cartoon person drawn in SVG so it can be animated cheaply and look the same on every phone. */
function Person({ skin, shirt, cap, flip = false, boss = false }: { skin: string; shirt: string; cap?: string; flip?: boolean; boss?: boolean }) {
  return (
    <svg viewBox="0 0 64 100" width="64" height="100" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <ellipse cx="32" cy="97" rx="18" ry="3.5" fill="rgba(0,0,0,0.3)" />
      <rect x="21" y="62" width="9" height="32" rx="4" fill="#1F2937" /><rect x="34" y="62" width="9" height="32" rx="4" fill="#1F2937" />
      <rect x="16" y="30" width="32" height="38" rx="12" fill={shirt} />
      {boss && <path d="M32 30 L26 48 L32 68 L38 48 Z" fill="#E5E7EB" opacity="0.7" />}
      <rect x="6" y="34" width="10" height="28" rx="5" fill={skin} /><rect x="48" y="34" width="10" height="28" rx="5" fill={skin} />
      <circle cx="32" cy="20" r="14" fill={skin} />
      {cap && <><path d="M17 17 Q32 -2 47 17 Z" fill={cap} /><rect x="30" y="14" width="22" height="5" rx="2.5" fill={cap} /></>}
      <circle cx="27" cy="22" r="1.8" fill="#111" /><circle cx="37" cy="22" r="1.8" fill="#111" />
      <path d="M27 29 Q32 32 37 29" stroke="#111" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const Dust = ({ x }: { x: string }) => (
  <>{[0, 1, 2, 3].map((i) => <motion.i key={i} className="absolute bottom-3 block rounded-full bg-amber-100/70" style={{ left: x, width: 14 + i * 5, height: 14 + i * 5 }} initial={{ opacity: 0.8, x: 0, y: 0, scale: 0.4 }} animate={{ opacity: 0, x: -30 - i * 14, y: -10 - i * 6, scale: 1.6 }} transition={{ duration: 0.9, delay: i * 0.12, repeat: 1 }} />)}</>
);

/** The little street scene. What happens in it follows the choice and whether it worked. */
function Stage({ opp, choice, success, playing, finale = false }: { opp: Opponent; choice: RoadChoice | null; success: boolean; playing: boolean; finale?: boolean }) {
  const idle = !choice || !playing;
  // player and Agbero x positions (percent of the stage width) over time, by choice
  const p = idle ? { x: '0%' } : choice === 'run' ? (success ? { x: ['0%', '-140%'] } : { x: ['0%', '-40%', '10%'] }) : choice === 'fight' ? { x: ['0%', '120%', '110%', '120%'] } : { x: '0%' };
  const a = idle ? { x: '0%' } : choice === 'run' ? (success ? { x: ['0%', '-10%', '0%'] } : { x: ['0%', '-60%', '-110%'] }) : choice === 'fight' ? { x: ['0%', '-110%', '-100%', '-110%'] } : choice === 'pay' ? { x: ['0%', '-30%', '0%'] } : { x: '0%' };
  const fell = playing && choice === 'fight';
  return (
    <div className="relative h-[190px] w-full overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(180deg,#F6B26B 0%,#FFD9A0 45%,#8A8F98 45.5%,#4B5563 100%)' }} role="img" aria-label={`Street scene with ${opp.name}`}>
      {/* skyline */}
      <div className="absolute inset-x-0 top-6 flex items-end gap-1 px-2 opacity-60">{[34, 52, 28, 60, 40, 48, 30, 56, 36].map((h, i) => <i key={i} className="block flex-1 rounded-t-sm bg-[#7C5A3C]" style={{ height: h }} />)}</div>
      {/* road dashes that slide */}
      <div className="absolute inset-x-0 bottom-[34px] h-1 overflow-hidden"><motion.div className="flex w-[200%] gap-6" animate={{ x: ['0%', '-50%'] }} transition={{ duration: choice === 'run' && playing ? 0.6 : 3, repeat: Infinity, ease: 'linear' }}>{Array.from({ length: 30 }).map((_, i) => <i key={i} className="block h-1 w-8 shrink-0 rounded bg-white/70" />)}</motion.div></div>
      {/* the player */}
      <motion.div className="absolute bottom-3 left-[14%]" animate={p} transition={{ duration: choice === 'run' ? 1.2 : 1.6, ease: 'easeInOut' }}>
        <motion.div animate={idle ? { y: [0, -2, 0] } : choice === 'run' ? { y: [0, -10, 0, -10, 0] } : fell && !success ? { rotate: [0, 0, 80], y: [0, 0, 20] } : {}} transition={{ duration: choice === 'run' ? 0.5 : 1.6, repeat: choice === 'run' && playing ? Infinity : 0, delay: fell ? 0.2 : 0 }}><Person skin="#8B5A3C" shirt="#0B8F4D" /></motion.div>
      </motion.div>
      {/* the Agbero */}
      <motion.div className="absolute bottom-3 right-[14%]" animate={a} transition={{ duration: choice === 'run' ? 1.2 : 1.6, ease: 'easeInOut' }}>
        <motion.div animate={idle ? { rotate: [-2, 2, -2] } : fell && success ? { rotate: [0, 0, -80], y: [0, 0, 20] } : {}} transition={{ duration: idle ? 1.4 : 1.6, repeat: idle ? Infinity : 0, delay: fell ? 0.2 : 0 }}><Person skin={opp.skin} shirt={opp.shirt} cap={opp.cap} flip boss={opp.power === 2} /></motion.div>
      </motion.div>
      {/* effects */}
      {playing && choice === 'run' && <Dust x="40%" />}
      {playing && choice === 'fight' && (
        <>
          <motion.div className="absolute left-1/2 top-[36%] -translate-x-1/2 text-[54px] leading-none" animate={{ scale: [0.4, 1.3, 0.9, 1.4, 1], rotate: [-10, 10, -10, 10, 0], opacity: [0, 1, 1, 1, 0] }} transition={{ duration: 1.6 }}>💥</motion.div>
          <motion.div className="absolute bottom-3 left-1/2 h-20 w-24 -translate-x-1/2 rounded-full bg-amber-100/60 blur-md" animate={{ scale: [0.5, 1.4, 1.1, 1.5], opacity: [0, 0.8, 0.6, 0] }} transition={{ duration: 1.6 }} />
        </>
      )}
      {playing && choice === 'pay' && [0, 1, 2, 3, 4].map((i) => <motion.span key={i} className="absolute bottom-16 left-[22%] text-[22px]" initial={{ opacity: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, 90 + i * 14], y: [0, -30 - (i % 2) * 14, 0] }} transition={{ duration: 1.2, delay: i * 0.15 }}>🪙</motion.span>)}
      {playing && choice === 'talk' && (
        <>
          <motion.div className="absolute left-[18%] top-3 rounded-2xl bg-white px-2.5 py-1 text-[12px] font-bold text-slate-800" initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }} transition={{ duration: 0.9 }}>Oga, listen small…</motion.div>
          <motion.div className="absolute right-[18%] top-3 rounded-2xl bg-white px-2.5 py-1 text-[12px] font-bold text-slate-800" initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 1], y: 0 }} transition={{ duration: 0.9, delay: 0.9 }}>{success ? '👍🏾 Correct!' : '😒 Pay!'}</motion.div>
        </>
      )}
      {!choice && !finale && <motion.div className="absolute right-[24%] top-4 rounded-2xl rounded-br-sm bg-white px-2.5 py-1 text-[12px] font-extrabold text-slate-800" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}>TICKET! 🗣️</motion.div>}
    </div>
  );
}

const oddsColor = (o: number) => (o >= 0.6 ? '#34D399' : o >= 0.35 ? '#FFC21A' : '#F87171');

/**
 * The Agbero roadblock after a trip: an animated street scene and four ways out. Run, fight and talk show your odds, which come
 * from your health, energy, charisma and the fitness and communication skills. Opens only after a trip, never while you are busy.
 */
export function RoadBlock() {
  const block = useAgberoStore((s) => s.active);
  const result = useAgberoStore((s) => s.result);
  const wins = useAgberoStore((s) => s.wins);
  const money = useEconomyStore((s) => s.money);
  const [playing, setPlaying] = useState(false), [shown, setShown] = useState(false);
  useEffect(() => {
    if (!result) { setPlaying(false); setShown(false); return; }
    setPlaying(true); setShown(false);
    const t1 = setTimeout(() => setPlaying(false), 1900), t2 = setTimeout(() => setShown(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [result]);
  const opp = block ? getOpponent(block.opponentId) : null;
  const f = useMemo(() => fighterNow(), [block, money]); // eslint-disable-line react-hooks/exhaustive-deps
  const ended = !!result && block?.finale;
  return (
    <AnimatePresence>
      {block && opp && (
        <motion.div key="road" className="pointer-events-auto absolute inset-0 z-[85] flex items-end justify-center bg-gradient-to-t from-black/75 via-black/30 to-black/10 px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-label={`${opp.name} blocks your road`} className="pb-safe mb-2 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[1.4rem] border border-white/12 bg-[#0E131C] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]" initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }}>
            <Stage opp={opp} choice={result?.choice ?? null} success={!!result?.success} playing={playing} finale={block.finale} />
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="text-[10.5px] font-extrabold uppercase tracking-wide text-hibiscus">🚧 Road block</div><div className="truncate font-display text-[19px] font-extrabold leading-tight">{opp.name}</div></div>
              {!block.finale && <div className="shrink-0 rounded-xl bg-danfo/15 px-2.5 py-1 text-right ring-1 ring-danfo/40"><div className="text-[9.5px] font-bold uppercase text-danfo/80">He wants</div><div className="font-display text-[16px] font-extrabold text-danfo">{formatNaira(block.demand)}</div></div>}
            </div>
            {!result && <p className="mt-1.5 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.06] px-3 py-2 text-[13.5px] italic leading-snug text-white/90">{block.finale ? FINALE.intro : opp.line.replace('{amount}', block.demand.toLocaleString('en-NG'))}</p>}
            {!result && !block.finale && (
              <div className="mt-2 space-y-1.5">
                {ROAD_CHOICES.map((c) => {
                  const odds = oddsFor(c.id, f, opp.power), canPay = c.id !== 'pay' || money > 0;
                  return (
                    <motion.button key={c.id} whileTap={{ scale: 0.98 }} disabled={!canPay} onClick={() => chooseRoad(c.id)} aria-label={c.label}
                      className="flex min-h-[54px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] px-3 py-2 text-left active:from-white/20 disabled:opacity-45">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[22px]">{c.emoji}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-tight">{c.label}</span><span className="block text-[11px] text-white/55">{c.sub}</span></span>
                      {c.id === 'pay' ? <span className="shrink-0 text-[12px] font-extrabold text-danfo">-{formatNaira(Math.min(block.demand, money))}</span> : (
                        <span className="shrink-0 text-right"><span className="block text-[15px] font-extrabold tabular-nums" style={{ color: oddsColor(odds) }}>{Math.round(odds * 100)}%</span><span className="block h-1 w-10 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full" style={{ width: `${odds * 100}%`, background: oddsColor(odds) }} /></span></span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
            {!result && block.finale && (
              <div className="mt-2 space-y-1.5">
                {(['join', 'report'] as const).map((k) => (
                  <motion.button key={k} whileTap={{ scale: 0.98 }} onClick={() => resolveFinale(k)} aria-label={FINALE[k].label} className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] px-3 py-2 text-left active:from-white/20">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[22px]">{k === 'join' ? '🤝' : '📣'}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-tight">{FINALE[k].label}</span><span className="block text-[11px] text-white/60">{FINALE[k].sub}</span></span>
                  </motion.button>
                ))}
              </div>
            )}
            {result && (
              <div className="mt-2">
                {!shown ? <div className="py-6 text-center text-[13px] font-semibold text-white/60">…</div> : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`rounded-2xl border px-3 py-2.5 text-[14px] font-semibold leading-snug ${result.success ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-rose-400/50 bg-rose-400/10'}`}>
                      <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: result.success ? '#34D399' : '#FCA5A5' }}>{ended ? 'The story ends' : result.choice === 'pay' ? 'Paid' : result.success ? 'It worked!' : 'It went wrong'}</div>
                      {result.text}
                      <OutcomeRow list={outcomes(result.effects as never, result.money, 5)} />
                    </div>
                    {!block.finale && wins > 0 && <div className="mt-1.5 text-center text-[11px] font-semibold text-white/50">Street story: {STAGES[stageOf(wins)]} · {wins} win{wins === 1 ? '' : 's'}</div>}
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => { sfx.click(); finishRoadblock(); }} className="mt-2 w-full rounded-2xl bg-gradient-to-b from-danfo to-danfo-deep py-3 text-[15px] font-extrabold text-night shadow-pop" aria-label="Continue">Continue</motion.button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
