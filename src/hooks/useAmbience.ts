import { useEffect } from 'react';
import { setAmbience } from '@/audio/ambience';
import { useInteriorStore } from '@/stores/interiorStore';
import { useSettingsStore } from '@/stores/settingsStore';

/** Plays the sound of the venue you are in, and stops it when you leave or switch the speaker off. */
export function useAmbience() {
  const kind = useInteriorStore((s) => s.current?.kind ?? null), music = useSettingsStore((s) => s.music);
  useEffect(() => { setAmbience(music ? kind : null); }, [kind, music]);
  useEffect(() => () => setAmbience(null), []);
}
