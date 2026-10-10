import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { FEATURED_PLAYERS } from '@/data/featured';
import { useFlowStore } from '@/stores/flowStore';
import { useStateId } from '@/stores/mapStore';
import { useUiStore } from '@/stores/uiStore';
import { WorldView } from '@/three/world/WorldView';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';
import { SocialLinks } from '@/ui/SocialLinks';
import { formatNaira } from '@/core/format';
import { getArea, getLandmark, getState, propertiesOfState } from '@/world/registry';
import { AuthPanel } from '../auth/AuthPanel';

interface Card { key: string; tag: string; title: string; text: string; glyph: string; from: string; to: string }

function useFeaturedCards(stateId: string): Card[] {
  return useMemo(() => {
    const players: Card[] = FEATURED_PLAYERS.map((p) => ({ key: p.name, tag: p.kind, title: p.name, text: p.blurb, glyph: p.glyph, from: p.from, to: p.to }));
    const homes = propertiesOfState(stateId).filter((p) => p.luxuryLevel >= 9).slice(0, 2).map<Card>((p) => ({
      key: p.id, tag: 'Featured home', title: p.name, text: `${getArea(p.areaId)?.name} · ${formatNaira(p.price)} · ${p.bedrooms} bed`, glyph: '🏡', from: '#B8892F', to: '#6B4A12',
    }));
    const places = (getState(stateId)?.mapData.landmarks ?? []).slice(0, 2).map<Card>((l) => ({
      key: l.id, tag: 'Featured location', title: l.name, text: l.tagline, glyph: l.icon, from: '#FF4D6D', to: '#8C1F3B',
    }));
    return [...players, ...homes, ...places];
  }, [stateId]);
}

/** Landing: a living 3D map of the current state with featured content. Login/signup float over it. */
export function LandingScreen() {
  const phase = useFlowStore((s) => s.phase);
  const go = useFlowStore((s) => s.go);
  const stateId = useStateId();
  const online = useUiStore((s) => s.online);
  const tickOnline = useUiStore((s) => s.tickOnline);
  const [picked, setPicked] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const cards = useFeaturedCards(stateId);
  const landmark = picked ? getLandmark(picked) : null;
  const authOpen = phase === 'login' || phase === 'signup';

  useEffect(() => { const t = setInterval(tickOnline, 2500); return () => clearInterval(t); }, [tickOnline]);
  useEffect(() => { const t = setInterval(() => setIdx((i) => (i + 1) % cards.length), 4500); return () => clearInterval(t); }, [cards.length]);

  const card = cards[idx % cards.length];
  const tagline = getState(stateId)?.tagline ?? 'Create your story.';

  return (
    <div className="absolute inset-0 overflow-hidden bg-night">
      <div className={`absolute inset-0 transition duration-700 ${authOpen ? 'scale-105 blur-[3px] brightness-75' : ''}`}>
        <WorldView stateId={stateId} mode="landing" calm={authOpen} onSelectLandmark={(id) => { sfx.pop(); setPicked(id); }} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-night/70 via-transparent to-night/85" />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-safe">
        <Logo />
        <div className="flex flex-col items-end gap-2">
          <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
            {(online / 1000).toFixed(0)}K Online
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="glass" onClick={() => go('login')}>Login</Button>
            <Button size="sm" onClick={() => go('signup')}>Sign Up</Button>
          </div>
        </div>
      </div>

      {/* featured card */}
      <div className="absolute inset-x-0 top-[5.6rem] z-10 flex justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.div key={card.key} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-3xl p-3 pr-4 shadow-glass" style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">{card.glyph}</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/70">{card.tag}</span>
              <span className="block truncate font-display text-lg font-bold leading-tight">{card.title}</span>
              <span className="block text-[13px] leading-snug text-white/80">{card.text}</span>
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="absolute inset-x-0 top-[10.6rem] z-10 flex justify-center gap-1.5">
        {cards.map((c, i) => <button key={c.key} aria-label={`Card ${i + 1}`} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-danfo' : 'w-1.5 bg-white/40'}`} />)}
      </div>

      {/* hero + CTAs */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-safe">
        <AnimatePresence>
          {landmark && (
            <motion.div key={landmark.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-dark mx-auto mb-4 flex max-w-md items-start gap-3 rounded-3xl p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danfo/20 text-2xl">{landmark.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold">{landmark.name}</span>
                <span className="block text-sm font-semibold text-danfo">{landmark.tagline}</span>
                <span className="block text-sm text-white/75">{landmark.description}</span>
              </span>
              <button onClick={() => setPicked(null)} aria-label="Close" className="text-white/60 hover:text-white">✕</button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl font-extrabold leading-tight drop-shadow sm:text-4xl"><span className="text-gradient-naija">{tagline}</span></h1>
          <p className="mt-1 text-sm text-white/80">Hustle, hang out at Quilox, own a home, and see how far you go. Tap a landmark to explore.</p>
          <div className="mt-4 flex gap-3">
            <Button size="lg" className="flex-[1.6]" onClick={() => go('signup')}>Sign Up Free</Button>
            <Button size="lg" variant="glass" className="flex-1" onClick={() => go('login')}>Login</Button>
          </div>
          <SocialLinks className="mt-4 justify-center" />
        </div>
      </div>

      <AnimatePresence>{authOpen && <AuthPanel key="auth" mode={phase === 'login' ? 'login' : 'signup'} />}</AnimatePresence>
    </div>
  );
}
