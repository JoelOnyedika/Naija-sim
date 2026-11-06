import { AnimatePresence, motion } from 'framer-motion';
import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { BOSS_LOOK, FINALE, ROAD_CHOICES, STAGES, getOpponent, lookFor, type Opponent, type RoadChoice } from '@/data/agbero';
import { chooseRoad, fighterNow, finishRoadblock, oddsFor, resolveFinale, stageOf } from '@/game/agbero';
import { useAgberoStore } from '@/stores/agberoStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useEconomyStore } from '@/stores/economyStore';
import { OutcomeRow, outcomes } from './OutcomeChips';
import { Hero } from './HeroArt';
import { Thug, type ThugMood } from './Thug';

const Dust = ({ x }: { x: string }) => (
  <>{[0, 1, 2, 3].map((i) => <motion.i key={i} className="absolute bottom-3 block rounded-full bg-amber-100/70" style={{ left: x, width: 14 + i * 5, height: 14 + i * 5 }} initial={{ opacity: 0.8, x: 0, y: 0, scale: 0.4 }} animate={{ opacity: 0, x: -30 - i * 14, y: -10 - i * 6, scale: 1.6 }} transition={{ duration: 0.9, delay: i * 0.12, repeat: 1 }} />)}</>
);

/** Effects drawn over either version of the scene: dust, the punch burst, coins, speech bubbles and the ticket shout. */
function Fx({ choice, success, playing, finale, crew, dust = false }: { choice: RoadChoice | null; success: boolean; playing: boolean; finale: boolean; crew: number; dust?: boolean }) {
  return (
    <>
      {dust && playing && choice === 'run' && <Dust x="30%" />}
      {playing && choice === 'fight' && (
        <>
          <motion.div className="absolute left-[46%] top-[34%] -translate-x-1/2 text-[56px] leading-none" animate={{ scale: [0.4, 1.3, 0.9, 1.4, 1], rotate: [-10, 10, -10, 10, 0], opacity: [0, 1, 1, 1, 0] }} transition={{ duration: 1.6 }}>💥</motion.div>
          <motion.div className="absolute bottom-3 left-[44%] h-20 w-28 -translate-x-1/2 rounded-full bg-amber-100/60 blur-md" animate={{ scale: [0.5, 1.4, 1.1, 1.5], opacity: [0, 0.8, 0.6, 0] }} transition={{ duration: 1.6 }} />
        </>
      )}
      {playing && choice === 'pay' && [0, 1, 2, 3, 4].map((i) => <motion.span key={i} className="absolute bottom-20 left-[20%] text-[22px]" initial={{ opacity: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, 110 + i * 14], y: [0, -30 - (i % 2) * 14, 0] }} transition={{ duration: 1.2, delay: i * 0.15 }}>🪙</motion.span>)}
      {playing && choice === 'talk' && (
        <>
          <motion.div className="absolute left-[8%] top-3 rounded-2xl bg-white px-2.5 py-1 text-[12px] font-bold text-slate-800" initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }} transition={{ duration: 0.9 }}>Oga, listen small…</motion.div>
          <motion.div className="absolute right-[8%] top-3 rounded-2xl bg-white px-2.5 py-1 text-[12px] font-bold text-slate-800" initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 1], y: 0 }} transition={{ duration: 0.9, delay: 0.9 }}>{success ? '👍🏾 Correct!' : '😒 Pay!'}</motion.div>
        </>
      )}
      {!choice && !finale && <motion.div className="absolute right-[6%] top-3 rounded-2xl rounded-br-sm bg-white px-2.5 py-1 text-[12px] font-extrabold text-slate-800" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}>{crew > 1 ? 'TICKET! OGA PAY!' : 'TICKET!'} 🗣️</motion.div>}
    </>
  );
}

/** Where each man stands (percent from the left) and how big he is, by crew size. The first is the leader, standing nearest the middle. */
const SLOTS: Record<number, { left: number; bottom: number; size: number }[]> = {
  1: [{ left: 56, bottom: 8, size: 1.2 }],
  2: [{ left: 42, bottom: 6, size: 1.1 }, { left: 66, bottom: 20, size: 0.98 }],
  3: [{ left: 36, bottom: 4, size: 1.08 }, { left: 54, bottom: 22, size: 0.94 }, { left: 70, bottom: 6, size: 1.05 }],
};

/** The little street scene. What happens in it follows the choice and whether it worked. The crew (1 to 3 men) is drawn ugly and angry. */
function FlatStage({ opp, choice, success, playing, finale = false, looks, crew }: { opp: Opponent; choice: RoadChoice | null; success: boolean; playing: boolean; finale?: boolean; looks: number[]; crew: number }) {
  const idle = !choice; // after the animation the final pose stays (knocked down, run away) instead of resetting
  const slots = SLOTS[Math.max(1, Math.min(3, crew))];
  const men = slots.map((slot, i) => ({ slot, look: finale && i === 0 ? BOSS_LOOK : lookFor(looks[i] ?? i) }));
  const p = idle ? { x: 0 } : choice === 'run' ? (success ? { x: [0, -60, -330] } : { x: [0, -50, 20] }) : choice === 'fight' ? { x: [0, 120, 110, 120] } : { x: 0 };
  const fell = choice === 'fight';
  const mood = (i: number): ThugMood => {
    if (idle) return 'idle';
    if (choice === 'fight') return success ? 'attack' : 'cheer';
    if (choice === 'run') return 'attack';
    if (choice === 'pay') return 'cheer';
    return success ? 'lower' : i === 0 ? 'attack' : 'idle';
  };
  const move = (i: number) => {
    if (idle) return { x: 0, rotate: 0, y: 0 };
    const near = -(70 + i * 12);
    if (choice === 'fight') return success ? { x: [0, near, near + 6, near], rotate: [0, 0, 0, 82 - i * 8], y: [0, 0, 0, 14 + i * 3] } : { x: [0, near, near + 8, near], rotate: 0, y: 0 };
    if (choice === 'run') return success ? { x: [0, -30 - i * 10, -34 - i * 10], rotate: 0, y: 0 } : { x: [0, -120, -190 + i * 18], rotate: 0, y: 0 };
    if (choice === 'pay') return i === 0 ? { x: [0, -26, 0], rotate: [0, -4, 0], y: 0 } : { x: 0, rotate: 0, y: 0 };
    return { x: 0, rotate: 0, y: 0 };
  };
  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(180deg,#E9A25A 0%,#FFD9A0 42%,#8A8F98 42.5%,#4B5563 100%)' }} role="img" aria-label={`Street scene with ${opp.name}${crew > 1 ? ` and ${crew - 1} more` : ''}`}>
      <div className="absolute inset-x-0 top-6 flex items-end gap-1 px-2 opacity-60">{[34, 52, 28, 60, 40, 48, 30, 56, 36].map((h, i) => <i key={i} className="block flex-1 rounded-t-sm bg-[#7C5A3C]" style={{ height: h }} />)}</div>
      <div className="absolute bottom-[78px] left-[30%] h-8 w-24 rounded-md bg-[#E5A400]/80"><i className="absolute inset-x-0 top-3 block h-1 bg-black/60" /></div>
      <div className="absolute inset-x-0 bottom-[34px] h-1 overflow-hidden"><motion.div className="flex w-[200%] gap-6" animate={{ x: ['0%', '-50%'] }} transition={{ duration: choice === 'run' && playing ? 0.6 : 3, repeat: Infinity, ease: 'linear' }}>{Array.from({ length: 30 }).map((_, i) => <i key={i} className="block h-1 w-8 shrink-0 rounded bg-white/70" />)}</motion.div></div>
      <motion.div className="absolute bottom-3 left-[6%] z-50" animate={p} transition={{ duration: choice === 'run' ? 1.2 : 1.6, ease: 'easeInOut' }}>
        <motion.div animate={idle ? { y: [0, -2, 0] } : choice === 'run' ? { y: [0, -10, 0, -10, 0] } : fell && !success ? { rotate: [0, 0, -80], y: [0, 0, 20] } : {}} transition={{ duration: choice === 'run' ? 0.5 : 1.6, repeat: choice === 'run' && playing ? Infinity : 0, delay: fell ? 0.2 : 0 }}><Hero look={useCharacterStore.getState().appearance} size={1.1} /></motion.div>
      </motion.div>
      {[...men.keys()].sort((a, b) => men[b].slot.bottom - men[a].slot.bottom).map((i) => (
        <motion.div key={i} className="absolute" style={{ left: `${men[i].slot.left}%`, bottom: men[i].slot.bottom, zIndex: 40 - men[i].slot.bottom }} animate={move(i)} transition={{ duration: 1.6, ease: 'easeInOut' }}>
          <Thug look={men[i].look} mood={mood(i)} size={men[i].slot.size} />
        </motion.div>
      ))}
      <Fx choice={choice} success={success} playing={playing} finale={finale} crew={crew} dust />
    </div>
  );
}

const Stage3D = lazy(() => import('./roadblock3d/StreetStage3D'));
let webgl: boolean | null = null;
const hasWebGL = (): boolean => { if (webgl === null) { try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webgl = false; } } return webgl; };
class Guard3D extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn('[roadblock] 3D stage failed, using the flat scene', e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** The street scene: flat 2D people standing in a real 3D street when WebGL works, and the all-2D scene when it does not (or while it loads). */
function Stage(props: { opp: Opponent; choice: RoadChoice | null; success: boolean; playing: boolean; finale?: boolean; looks: number[]; crew: number }) {
  const flat = <FlatStage {...props} />;
  if (!hasWebGL()) return flat;
  const { opp, choice, success, playing, finale = false, looks, crew } = props;
  return (
    <Guard3D fallback={flat}>
      <div className="relative h-[220px] w-full overflow-hidden rounded-2xl bg-[#C9617E]" role="img" aria-label={`Street scene with ${opp.name}${crew > 1 ? ` and ${crew - 1} more` : ''}`}>
        <Suspense fallback={<div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#3F4A9A,#C9617E 55%,#FFB066)' }} />}>
          <Stage3D crew={crew} looks={looks} choice={choice} success={success} finale={finale} />
        </Suspense>
        <Fx choice={choice} success={success} playing={playing} finale={finale} crew={crew} />
      </div>
    </Guard3D>
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
            <Stage opp={opp} choice={result?.choice ?? null} success={!!result?.success} playing={playing} finale={block.finale} looks={block.looks ?? [0]} crew={block.crew ?? 1} />
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="text-[10.5px] font-extrabold uppercase tracking-wide text-hibiscus">🚧 Road block</div><div className="truncate font-display text-[19px] font-extrabold leading-tight">{opp.name}{!block.finale && (block.crew ?? 1) > 1 && <span className="ml-1.5 align-middle text-[11px] font-bold text-hibiscus">+ {(block.crew ?? 1) - 1} {(block.crew ?? 1) === 2 ? "boy" : "boys"}</span>}</div></div>
              {!block.finale && <div className="shrink-0 rounded-xl bg-danfo/15 px-2.5 py-1 text-right ring-1 ring-danfo/40"><div className="text-[9.5px] font-bold uppercase text-danfo/80">He wants</div><div className="font-display text-[16px] font-extrabold text-danfo">{formatNaira(block.demand)}</div></div>}
            </div>
            {!result && <p className="mt-1.5 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.06] px-3 py-2 text-[13.5px] italic leading-snug text-white/90">{block.finale ? FINALE.intro : opp.line.replace('{amount}', block.demand.toLocaleString('en-NG'))}</p>}
            {!result && !block.finale && (
              <div className="mt-2 space-y-1.5">
                {ROAD_CHOICES.map((c) => {
                  const odds = oddsFor(c.id, f, opp.power, block.crew ?? 1), canPay = c.id !== 'pay' || money > 0;
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
