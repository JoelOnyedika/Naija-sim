import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { PropertyDetails } from '@/features/houses/PropertyDetails';
import { MapOverlay } from '@/features/map/MapOverlay';
import { PhoneOverlay } from '@/features/phone/PhoneOverlay';
import { useGameLoop } from '@/game/loop';
import { usePropertyStore } from '@/stores/propertyStore';
import { useUiStore } from '@/stores/uiStore';
import { PropertyScene } from '@/three/property/PropertyScene';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { Toasts } from '@/ui/Toasts';
import { ActivityBanner } from './ActivityBanner';
import { BuyMode } from './BuyMode';
import { Dock } from './Dock';
import { FoodPicker } from './FoodPicker';
import { Hud } from './Hud';
import { LoadingOverlay } from './LoadingOverlay';
import { RotateButton } from './RotateButton';
import { StatsWidget } from './StatsWidget';
import { TaskPanel } from './TaskPanel';

/** The game: the 3D home is always underneath; everything else is an overlay on top of it. */
export function GameScreen() {
  useGameLoop();
  const mode = useUiStore((s) => s.mode);
  const activeId = usePropertyStore((s) => s.activeId);
  // Entering the game and every change of home rebuilds the 3D scene: cover it with the loading screen until it is drawn.
  useEffect(() => { if (activeId) useUiStore.getState().setSceneLoading(true); }, [activeId]);
  useEffect(() => () => useUiStore.getState().setSceneLoading(false), []);
  return (
    <div className="absolute inset-0 bg-night">
      <ErrorBoundary inline label="The 3D home"><PropertyScene /></ErrorBoundary>
      <Hud />
      <RotateButton />
      <ActivityBanner />
      {mode === 'home' && <TaskPanel />}
      <AnimatePresence>{mode === 'home' && <StatsWidget key="stats" />}</AnimatePresence>
      <BuyMode />
      <MapOverlay />
      <Dock />
      <PhoneOverlay />
      <FoodPicker />
      <PropertyDetails />
      <Toasts />
      <LoadingOverlay />
    </div>
  );
}
