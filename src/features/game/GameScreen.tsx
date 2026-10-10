import { AnimatePresence } from 'framer-motion';
import { PropertyDetails } from '@/features/houses/PropertyDetails';
import { MapOverlay } from '@/features/map/MapOverlay';
import { PhoneOverlay } from '@/features/phone/PhoneOverlay';
import { useGameLoop } from '@/game/loop';
import { useUiStore } from '@/stores/uiStore';
import { PropertyScene } from '@/three/property/PropertyScene';
import { Toasts } from '@/ui/Toasts';
import { ActivityBanner } from './ActivityBanner';
import { BuyMode } from './BuyMode';
import { Dock } from './Dock';
import { FoodPicker } from './FoodPicker';
import { Hud } from './Hud';
import { StatsWidget } from './StatsWidget';
import { TaskPanel } from './TaskPanel';

/** The game: the 3D home is always underneath; everything else is an overlay on top of it. */
export function GameScreen() {
  useGameLoop();
  const mode = useUiStore((s) => s.mode);
  return (
    <div className="absolute inset-0 bg-night">
      <PropertyScene />
      <Hud />
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
    </div>
  );
}
