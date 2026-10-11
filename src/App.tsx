import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { CharacterScreen } from '@/features/character/CharacterScreen';
import { GameScreen } from '@/features/game/GameScreen';
import { LandingScreen } from '@/features/landing/LandingScreen';
import { RouletteScreen } from '@/features/roulette/RouletteScreen';
import { SummaryScreen } from '@/features/summary/SummaryScreen';
import { resetTransientUi } from '@/game/life';
import { useMusicSync } from '@/hooks/useMusicSync';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useFlowStore } from '@/stores/flowStore';
import { useLifeStore } from '@/stores/lifeStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

/** Top-level flow: landing → login/signup → character → roulette → summary → game. */
export default function App() {
  useMusicSync();
  const phase = useFlowStore((s) => s.phase);
  const go = useFlowStore((s) => s.go);
  const session = useAuthStore((s) => s.session);
  const created = useCharacterStore((s) => s.created);
  const lifeType = useLifeStore((s) => s.lifeType);
  const activeHome = usePropertyStore((s) => s.activeId);

  // Repair impossible states (e.g. a stale saved phase) instead of showing a broken screen.
  useEffect(() => {
    const inGate = phase === 'landing' || phase === 'login' || phase === 'signup';
    if (!session && !inGate) go('landing');
    else if (session && (phase === 'game' || phase === 'summary') && (!lifeType || !activeHome)) go(created ? 'roulette' : 'character');
    else if (session && phase === 'roulette' && !created) go('character');
  }, [phase, session, created, lifeType, activeHome, go]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-night text-white">
      <ErrorBoundary onRecover={resetTransientUi} label="The game">
      {/* The game screen holds many independent exit animations (phone, sheets, toasts). Keeping it outside
          the `wait` presence group means it unmounts at once, so a reset triggered while the phone is open
          can no longer leave the old screen waiting on exits that never finish. */}
      {phase === 'game' && <GameScreen key="game" />}
      <AnimatePresence mode="wait">
        {(phase === 'landing' || phase === 'login' || phase === 'signup') && <LandingScreen key="landing" />}
        {phase === 'character' && <CharacterScreen key="character" />}
        {phase === 'roulette' && <RouletteScreen key="roulette" />}
        {phase === 'summary' && <SummaryScreen key="summary" />}
      </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}
