import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira, formatNairaCompact } from '@/core/format';
import { crowdMoment } from '@/game/clubCrowd';
import { tonightsBill } from '@/game/club';
import { useClubStore } from '@/stores/clubStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * What makes the club feel alive: a live feed of who is balling (you, and simulated patrons), a money rain when somebody sprays,
 * and a small "burned tonight" button that opens your bill. Only mounted while the player is inside a club.
 */
const SHOW_MS = 8000;

export function ClubLive() {
  const kind = useInteriorStore((s) => s.current?.kind);
  useEffect(() => { if (kind !== 'club') return; useClubStore.getState().startStay(); }, [kind]);
  if (kind !== 'club') return <ClubRain />;
  return <><ClubFeed /><ClubTabPill /><ClubRain /></>;
}

/** The newest few lines, fading after a few seconds. The patrons are a local simulation and never touch the player's money. */
function ClubFeed() {
  const feed = useClubStore((s) => s.feed), [now, setNow] = useState(() => Date.now());
  useEffect(() => { // a patron does something every 5 to 11 seconds
    let t: number, seq = 0;
    const next = () => { t = window.setTimeout(() => { useClubStore.getState().pushFeed(crowdMoment(Date.now(), Math.random, seq++)); next(); }, 5000 + Math.random() * 6000); };
    next(); return () => window.clearTimeout(t);
  }, []);
  useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(i); }, []);
  const live = useMemo(() => feed.filter((f) => now - f.at < SHOW_MS).slice(0, 3), [feed, now]);
  return (
    <div className="pointer-events-none absolute right-2 top-[calc(env(safe-area-inset-top,0px)+13rem)] z-[60] flex w-[min(68vw,16rem)] flex-col items-end gap-1.5" aria-live="polite" aria-label="Club feed">
      <AnimatePresence initial={false}>
        {live.map((f) => (
          <motion.div key={f.id} layout initial={{ opacity: 0, x: 40, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className={`rounded-2xl px-3 py-1.5 text-right text-[12px] font-bold leading-snug shadow-lg backdrop-blur-md ${f.mine ? 'border border-amber-300 bg-amber-500/85 text-black' : f.big ? 'border border-fuchsia-300/60 bg-fuchsia-700/80 text-white' : 'bg-black/65 text-white'}`}>
            {f.text}{f.amount > 0 && !f.text.includes('₦') ? <span className="ml-1 opacity-70">{formatNaira(f.amount)}</span> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** "Burned tonight": always in reach, opens the bill. */
function ClubTabPill() {
  const receipts = useClubStore((s) => s.receipts), since = useClubStore((s) => s.since), club = useInteriorStore((s) => s.current?.name ?? 'Club');
  const sheet = useUiStore((s) => s.clubTicketOpen), total = tonightsBill(receipts, club, since).total;
  if (sheet) return null;
  return (
    <button onClick={() => { sfx.open(); useUiStore.getState().setClubTicket(true); }} aria-label={`Open my bill, ${formatNaira(total)} burned tonight`} data-testid="club-bill-pill"
      className="pointer-events-auto absolute right-14 top-[calc(env(safe-area-inset-top,0px)+4.1rem)] z-30 flex h-10 items-center gap-1.5 rounded-full border border-amber-300/50 bg-black/70 pl-2.5 pr-3 text-[12px] font-extrabold text-amber-200 shadow-lg backdrop-blur-md active:bg-white/10">
      <span className="text-base">🧾</span><span className="tabular-nums">{formatNairaCompact(total)}</span>
    </button>
  );
}

/** Notes falling over the screen for a few seconds. Plain emoji, no pictures, nothing to download. */
function ClubRain() {
  const burst = useClubStore((s) => s.burst);
  useEffect(() => { if (!burst) return; const t = window.setTimeout(() => useClubStore.getState().setBurst(null), 3200); return () => window.clearTimeout(t); }, [burst]);
  const bits = useMemo(() => (burst ? Array.from({ length: 34 }, (_, i) => ({ i, x: (i * 37) % 100, d: (i % 9) * 0.18, r: ((i * 53) % 90) - 45, g: burst.kind === 'rain' ? ['💸', '💵', '💸', '🤑'][i % 4] : ['🎉', '✨', '🎊', '🍾'][i % 4] })) : []), [burst]);
  return (
    <AnimatePresence>
      {burst && (
        <motion.div key={burst.id} className="pointer-events-none absolute inset-0 z-[94] overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
          {bits.map((b) => (
            <motion.span key={b.i} className="absolute text-3xl" style={{ left: `${b.x}%`, top: -40 }} initial={{ y: 0, rotate: 0, opacity: 1 }} animate={{ y: 900, rotate: b.r * 4, opacity: [1, 1, 0.8] }} transition={{ duration: 2.6, delay: b.d, ease: 'easeIn' }}>{b.g}</motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
