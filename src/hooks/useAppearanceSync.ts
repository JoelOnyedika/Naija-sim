import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

/** Applies the theme and battery-saver settings to the page root. Theme styles are scoped to phone apps (see index.css). */
export function useAppearanceSync() {
  const theme = useSettingsStore((s) => s.theme), saver = useSettingsStore((s) => s.batterySaver);
  const [systemDark, setSystemDark] = useState(() => !!query()?.matches);
  useEffect(() => {
    const q = query(); if (!q) return;
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    q.addEventListener('change', on); return () => q.removeEventListener('change', on);
  }, []);
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  useEffect(() => { document.documentElement.dataset.theme = resolved; }, [resolved]);
  useEffect(() => { document.documentElement.classList.toggle('battery-saver', saver); }, [saver]);
}
