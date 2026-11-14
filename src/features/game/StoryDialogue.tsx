import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { castDef } from '@/data/cast';
import { NODE } from '@/data/story';
import { advanceLine, choose, lineSpeaker, nodeLines, skipDialogue, visibleChoices } from '@/game/story';
import { useCharacterStore } from '@/stores/characterStore';
import { useStoryStore } from '@/stores/storyStore';
import { AvatarPreview } from '@/three/avatar/AvatarPreview';

/**
 * Dialogue presentation. Two styles, chosen per node (data/story.ts):
 *  - standard: a slim box at the bottom with the speaker's name, a small portrait and the text. The world stays visible and the characters keep acting.
 *  - cinematic: letterbox bars, a large portrait with name and role, bigger text and clear choice cards, used for important scenes (the camera
 *    moves to frame the speakers at the same time: game/interact.ts).
 * Portraits are the real 3D characters (the same low-poly models) shown from the shoulders up. No emoji stand in for people.
 * Tap to finish the typing, tap again for the next line. "Skip" jumps to the last line of the node (a choice is never skipped). During the beating
 * scene the screen shakes and a red vignette pulses; nothing graphic is drawn.
 */
const SPEED = 30; // characters per second

function Portrait({ who, size }: { who: string; size: number }) {
  const player = useCharacterStore((s) => s.appearance);
  const look = who === 'player' ? player : castDef(who)?.appearance;
  if (!look) return <div style={{ width: size, height: size }} className="rounded-full bg-white/10" />;
  return <div style={{ width: size, height: size }} className="overflow-hidden rounded-full border border-white/20 bg-gradient-to-b from-slate-600/60 to-slate-900/80 shadow-lg" aria-hidden><AvatarPreview appearance={look} focus="head" spin={false} /></div>;
}

export function StoryDialogue() {
  const d = useStoryStore((s) => s.dialogue), beating = useStoryStore((s) => s.beating), flags = useStoryStore((s) => s.flags);
  const node = d ? NODE(d.nodeId) : undefined;
  const lines = useMemo(() => (node ? nodeLines(node) : []), [node, flags]); // eslint-disable-line react-hooks/exhaustive-deps
  const text = lines[d?.line ?? 0] ?? '';
  const who = node && d ? lineSpeaker(node, d.line) : '', def = who && who !== 'player' ? castDef(who) : undefined;
  const narrator = who === 'narrator';
  const name = who === 'player' ? 'You' : def?.name ?? '', role = who === 'player' ? '' : def?.role ?? '';
  const [shown, setShown] = useState(0);
  const key = d ? `${d.nodeId}:${d.line}` : '';
  useEffect(() => {
    setShown(0); if (!text) return;
    const id = window.setInterval(() => setShown((n) => { if (n >= text.length) { window.clearInterval(id); return n; } return n + 1; }), 1000 / SPEED);
    return () => window.clearInterval(id);
  }, [key, text]);
  const typed = shown >= text.length, last = !!d && d.line >= lines.length - 1;
  const choices = node && last && typed ? visibleChoices(node) : [];
  const waitingForChoice = !!node && last && visibleChoices(node).length > 0;
  const tap = () => { if (!typed) { setShown(text.length); return; } if (!waitingForChoice) advanceLine(); };
  const cinematic = node?.style === 'cinematic';
  // keyboard: Enter / Space continues, Escape skips to the last line
  useEffect(() => {
    if (!d) return; const k = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } else if (e.key === 'Escape') skipDialogue(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  return (
    <AnimatePresence>
      {d && node && (
        <motion.div key="story" role="dialog" aria-label="Conversation" className="pointer-events-none absolute inset-0 z-[96]" initial={{ opacity: 0 }} animate={{ opacity: 1, x: beating ? [0, -8, 8, -6, 6, 0] : 0 }} exit={{ opacity: 0 }} transition={beating ? { repeat: Infinity, duration: 0.5 } : undefined}>
          {beating && <motion.div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle, transparent 35%, rgba(160,0,0,0.75) 100%)' }} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 0.8 }} />}
          {cinematic && (<>
            <motion.div className="absolute inset-x-0 top-0 h-[9vh] bg-black" initial={{ y: '-100%' }} animate={{ y: 0 }} transition={{ duration: 0.45 }} />
            <motion.div className="absolute inset-x-0 bottom-0 h-[9vh] bg-black" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.45 }} />
          </>)}
          <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end" onClick={tap}>
            {cinematic ? (
              <div className="pb-safe relative mx-2 mb-[10vh] rounded-3xl bg-gradient-to-t from-black/90 via-black/80 to-black/55 p-4 text-white backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); tap(); }}>
                {!narrator && <div className="flex items-end gap-3">
                  <Portrait who={who} size={92} />
                  <div className="min-w-0 pb-1">
                    <div className="text-[19px] font-black uppercase leading-none tracking-wide">{name}</div>
                    {role && <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-widest text-amber-300/90">{role}</div>}
                    {def && <div className="mt-0.5 text-[11.5px] italic text-white/55">{def.description}</div>}
                  </div>
                </div>}
                <p className={`mt-3 min-h-[4.6rem] text-[16.5px] leading-snug text-white ${narrator ? 'text-center italic text-white/90' : ''}`}>{text.slice(0, shown)}<span className={typed ? 'opacity-0' : 'opacity-60'}>▌</span></p>
                {choices.length > 0 && (
                  <div className="mt-2 grid gap-2">
                    {choices.map((c, i) => <button key={c.id} onClick={(e) => { e.stopPropagation(); choose(c.id); }} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 text-left text-[14.5px] font-bold active:scale-[0.98] active:bg-white/20"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-300 text-[12px] font-black text-slate-900">{i + 1}</span>{c.label}{c.hint && <span className="block text-[11px] font-normal text-white/55">{c.hint}</span>}</button>)}
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/45"><button onClick={(e) => { e.stopPropagation(); skipDialogue(); }} className="rounded-full px-2 py-1 active:bg-white/10">Skip</button>{typed && !waitingForChoice && <span>Tap to continue</span>}</div>
              </div>
            ) : (
              <div className="pb-safe relative mx-2 mb-[5.2rem] rounded-2xl border border-white/10 bg-black/80 p-3 text-white shadow-xl backdrop-blur" onClick={(e) => { e.stopPropagation(); tap(); }}>
                <div className="flex items-start gap-3">
                  <Portrait who={who} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between"><span className="text-[14px] font-extrabold">{name}</span>{role && <span className="text-[10.5px] text-white/50">{role}</span>}</div>
                    <p className="mt-0.5 min-h-[2.6rem] text-[14.5px] leading-snug text-white/95">{text.slice(0, shown)}<span className={typed ? 'opacity-0' : 'opacity-60'}>▌</span></p>
                  </div>
                </div>
                {choices.length > 0 && <div className="mt-2 grid gap-1.5">{choices.map((c) => <button key={c.id} onClick={(e) => { e.stopPropagation(); choose(c.id); }} className="rounded-xl bg-white/12 px-3 py-2 text-left text-[13.5px] font-bold active:bg-white/20">{c.label}</button>)}</div>}
                <div className="mt-1 flex items-center justify-between text-[10.5px] text-white/40"><button onClick={(e) => { e.stopPropagation(); skipDialogue(); }} className="rounded-full px-2 py-0.5 active:bg-white/10">Skip</button>{typed && !waitingForChoice && <span>Tap to continue</span>}</div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
