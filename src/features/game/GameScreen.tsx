import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { PropertyDetails } from '@/features/houses/PropertyDetails';
import { MapOverlay } from '@/features/map/MapOverlay';
import { PhoneOverlay } from '@/features/phone/PhoneOverlay';
import { useAmbience } from '@/hooks/useAmbience';
import { useGameLoop } from '@/game/loop';
import { usePropertyStore } from '@/stores/propertyStore';
import { useUiStore } from '@/stores/uiStore';
import { PropertyScene } from '@/three/property/PropertyScene';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { Toasts } from '@/ui/Toasts';
import { ActivityChip } from './ActivityChip';
import { StatsStrip } from './StatsStrip';
import { BuyMode } from './BuyMode';
import { Dock } from './Dock';
import { FoodPicker } from './FoodPicker';
import { ActionMenu } from './ActionMenu';
import { Hud } from './Hud';
import { InteriorShell } from './InteriorShell';
import { InteriorChat } from './InteriorChat';
import { ClubBanner, ClubMenu, ClubTicket, ReceiptSheet, VehicleSheet } from './VenueSheets';
import { ClubLive } from './ClubLive';
import { HaggleSheet } from './HaggleSheet';
import { CarReveal } from '../carReveal/CarReveal';
import { NpcSheet } from './NpcSheet';
import { LoadingOverlay } from './LoadingOverlay';
import { RotateButton } from './RotateButton';
import { ProfileSheet } from './ProfileSheet';
import { StatsWidget } from './StatsWidget';
import { TaskPanel } from './TaskPanel';
import { EventPrompt } from './EventPrompt';
import { DailySheet } from './DailySheet';
import { RoadBlock } from './RoadBlock';
import { TestDrive } from './TestDrive';
import { preloadTravel } from '@/features/travel/preload';
import { useDailyPopup } from './useDailyPopup';

/** The game: the 3D home is always underneath; everything else is an overlay on top of it. */
export function GameScreen() {
  useGameLoop();
  useAmbience();
  useDailyPopup();
  const mode = useUiStore((s) => s.mode);
  const activeId = usePropertyStore((s) => s.activeId);
  // Entering the game and every change of home rebuilds the 3D scene: cover it with the loading screen until it is drawn.
  useEffect(() => { if (activeId) useUiStore.getState().setSceneLoading(true); }, [activeId]);
  useEffect(() => () => useUiStore.getState().setSceneLoading(false), []);
  useEffect(() => { preloadTravel(); }, []); // fetch the 3D travel scene in the background so the first trip is as smooth as the tenth
  return (
    <div className="absolute inset-0 bg-night">
      <ErrorBoundary inline label="The 3D home"><PropertyScene /></ErrorBoundary>
      <Hud />
      <RotateButton />
      <ActivityChip />
        <StatsStrip />
      {mode === 'home' && <TaskPanel />}
      <AnimatePresence>{mode === 'home' && <StatsWidget key="stats" />}</AnimatePresence>
      <BuyMode />
      <ProfileSheet />
      <MapOverlay />
      <Dock />
      <PhoneOverlay />
      <FoodPicker />
      <ActionMenu />
      <InteriorShell />
      <InteriorChat />
      <NpcSheet />
      <ClubLive />
      <ClubMenu />
      <ClubTicket />
      <HaggleSheet />
      <ReceiptSheet />
      <ClubBanner />
      <VehicleSheet />
      <TestDrive />
      <CarReveal />
      <EventPrompt />
      <DailySheet />
      <RoadBlock />
      <PropertyDetails />
      <Toasts />
      <LoadingOverlay />
    </div>
  );
}
