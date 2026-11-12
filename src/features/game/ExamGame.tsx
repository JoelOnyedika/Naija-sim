import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EXAM } from '@/data/story';
import { answer, peek, peekChance } from '@/game/exam';
import { concludeExam } from '@/game/story';
import { useStoryStore } from '@/stores/storyStore';

/** The Exam Hall mini game: 8 questions, 10 seconds each, a countdown bar, and a "Peek" button that cheats (and can get you caught). Rules: game/exam.ts. */
export function ExamGame() {
  const ex = useStoryStore((s) => s.exam);
  const [left, setLeft] = useState<number>(EXAM.secondsPerQuestion);
  const [result, setResult] = useState<ReturnType<typeof concludeExam> | null>(null);
  const qi = ex?.i ?? 0;
  useEffect(() => { setLeft(EXAM.secondsPerQuestion); }, [qi, ex === null]);
  useEffect(() => {
    if (!ex || ex.done) return;
    const id = window.setInterval(() => setLeft((t) => t - 0.1), 100);
    return () => window.clearInterval(id);
  }, [ex?.i, ex?.done]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (s: typeof ex) => useStoryStore.getState().set({ exam: s });
  useEffect(() => { if (ex && !ex.done && left <= 0) set(answer(ex, -1)); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ex?.done && !result) setResult(concludeExam(ex)); }, [ex?.done]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setResult(null); };
  const q = ex && !ex.done ? ex.qs[ex.i] : null;
  return (
    <AnimatePresence>
      {(ex || result) && (
        <motion.div key="exam" role="dialog" aria-label="Exam hall" className="pointer-events-auto absolute inset-0 z-[94] flex items-end justify-center bg-black/70 px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="panel-solid pb-safe mb-2 w-full max-w-md rounded-3xl p-4 text-white">
            {q && ex && (
              <>
                <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-widest text-white/60"><span>Question {ex.i + 1} of {ex.qs.length}</span><span>Score {ex.score}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(0, (left / EXAM.secondsPerQuestion) * 100)}%` }} /></div>
                <p className="mt-3 text-[16px] font-bold leading-snug">{q.q}</p>
                <div className="mt-3 grid gap-2">
                  {q.options.map((o, i) => <button key={i} onClick={() => set(answer(ex, i))} className={`rounded-2xl px-3 py-2.5 text-left text-[14px] font-semibold active:scale-[0.98] ${ex.revealed === i ? 'bg-emerald-500/40 ring-2 ring-emerald-300' : 'bg-white/10'}`}>{o}</button>)}
                </div>
                <button onClick={() => set(peek(ex))} disabled={ex.revealed !== null} className="mt-3 w-full rounded-2xl border border-rose-400/40 py-2 text-[13px] font-bold text-rose-200 disabled:opacity-40">👀 Peek at your neighbour ({Math.round(peekChance(ex.peeks) * 100)}% to get caught)</button>
              </>
            )}
            {result && (
              <>
                <div className="text-center text-[44px]">{result.caught ? '🚨' : result.grade === 'Fail' ? '😬' : '🎓'}</div>
                <p className="mt-1 text-center text-[18px] font-black">{result.caught ? 'Caught cheating!' : `Result: ${result.grade}`}</p>
                <p className="mt-1 text-center text-[13px] text-white/70">{result.caught ? 'The invigilator confiscated your script. Your name is now in his notebook.' : `You scored ${result.score} of ${EXAM.questions}.`}</p>
                <button onClick={close} className="mt-3 w-full rounded-2xl bg-white py-3 text-[15px] font-extrabold text-slate-900">Continue</button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
