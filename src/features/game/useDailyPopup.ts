import { useEffect } from 'react';
import { canClaimDaily, ensureToday } from '@/game/daily';
import { screenBusy } from '@/game/streetEvents';
import { useDailyStore } from '@/stores/dailyStore';

let shownThisSession = false;
/** Opens the daily sheet once per session when there is a login reward to claim, as soon as the screen is free. */
export function useDailyPopup() {
  useEffect(() => {
    ensureToday();
    const id = window.setInterval(() => {
      if (shownThisSession) { window.clearInterval(id); return; }
      if (!canClaimDaily()) { shownThisSession = true; return; }
      if (screenBusy()) return;
      shownThisSession = true;
      useDailyStore.getState().set({ sheetOpen: true });
    }, 1500);
    return () => window.clearInterval(id);
  }, []);
}
