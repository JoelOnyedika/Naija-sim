import { useActiveHome } from '@/game/active';
import { backupIn, lightLevel, powerMode, type PowerInputs } from '@/game/power';
import { usePowerStore } from '@/stores/powerStore';
import { useInteriorStore } from '@/stores/interiorStore';

/** Power inputs for the active home, read live from the store and the placed furniture. */
export function usePowerInputs(): PowerInputs {
  const home = useActiveHome();
  const outage = usePowerStore((s) => s.outage);
  const ibetaOn = usePowerStore((s) => s.ibetaOn);
  const inside = useInteriorStore((s) => !!s.current);
  // public venues have their own supply: an outage at home never dims a market or a club
  return { outage, ibetaOn, ...backupIn(home?.placed ?? []), hasSolar: inside || backupIn(home?.placed ?? []).hasSolar };
}
export function usePower() { const i = usePowerInputs(); return { inputs: i, mode: powerMode(i), level: lightLevel(i) }; }
