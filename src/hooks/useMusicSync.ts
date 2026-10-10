import { useEffect } from 'react';
import { syncMusic } from '@/audio/music';
import { useSettingsStore } from '@/stores/settingsStore';

export function useMusicSync() {
  const music = useSettingsStore((s) => s.music);
  useEffect(() => {
    if (!music) { syncMusic(); return; }
    const start = () => { syncMusic(); window.removeEventListener('pointerdown', start); };
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, [music]);
}
