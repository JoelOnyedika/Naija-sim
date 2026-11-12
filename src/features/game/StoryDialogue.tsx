import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { advanceLine, choose, nodeLines, visibleChoices } from '@/game/story';
import { NODE } from '@/data/story';
import { useStoryStore } from '@/stores/storyStore';

/**
 * The dialogue overlay: a box at the bottom with the speaker, a badge portrait, typewriter text (tap to finish it, tap again for
 * the next line) and choice buttons. Data-driven (data/story.ts); the open world reuses it. While the beating scene runs the screen
 * shakes and a red vignette pulses. Nothing graphic is drawn.
 */
const SPEED = 24; // characters per second

export function StoryDialogue() {
  const d = useStoryStore((s) => s.dialogue), beating = useStoryStore((s) => s.beating);
  const node = d ? NODE(d.nodeId) : undefined;
  const lines = node ? nodeLines(node) : [], text = lines[d?.line ?? 0] ?? '';
  const [shown, setShown] = useState(0);
  const key = d ? `${d.nodeId}:${d.line}` : '';
  useEffect(() => {
    setShown(0); if (!text) return;
    const id = window.setInterval(() => setShown((n) => { if (n >= text.length) { window.clearInterval(id); return n; } return n + 1; }), 1000 / SPEED);
    return () => window.clearInterval(id);
  }, [key, text]);
  const typed = shown >= text.length, last = !!d && d.line >= lines.length - 1;
  const choices = node && last && typed ? visibleChoices(node) : [];
  const tap = () => { if (!typed) { setShown(text.length); return; } if (!(last && visibleChoices(node!).length)) advanceLine(); };
  return (
    <AnimatePresence>
      {d && node && (
        <motion.div key="story" role="dialog" aria-label="Story" className="pointer-events-auto absolute inset-0 z-[96] flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1, x: beating ? [0, -8, 8, -6, 6, 0] : 0 }} exit={{ opacity: 0 }} transition={beating ? { repeat: Infinity, duration: 0.5 } : undefined} onClick={tap}>
          {beating && <motion.div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle, transparent 35%, rgba(160,0,0,0.75) 100%)' }} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 0.8 }} />}
          <div className="pb-safe relative mx-2 mb-2 rounded-3xl border border-white/15 bg-black/85 p-4 text-white shadow-2xl" onClick={(e) => { e.stopPropagation(); tap(); }}>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[28px]" aria-hidden>{node.badge}</div>
              <div className="text-[15px] font-black tracking-wide">{node.speaker}</div>
            </div>
            <p className="min-h-[4.2rem] text-[15px] leading-snug text-white/95">{text.slice(0, shown)}<span className={typed ? 'opacity-0' : 'opacity-60'}>▌</span></p>
            {choices.length > 0 && (
              <div className="mt-2 grid gap-2">
                {choices.map((c) => <button key={c.id} onClick={(e) => { e.stopPropagation(); choose(c.id); }} className="rounded-2xl bg-white/12 px-3 py-2.5 text-left text-[14px] font-bold active:scale-[0.98]">{c.label}{c.hint && <span className="block text-[11px] font-normal text-white/55">{c.hint}</span>}</button>)}
              </div>
            )}
            {typed && !choices.length && <div className="mt-1 text-right text-[11px] text-white/45">Tap to continue</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
