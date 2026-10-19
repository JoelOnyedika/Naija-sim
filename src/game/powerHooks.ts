import { useActiveHome } from '@/game/active';
import { backupIn, lightLevel, powerMode, type PowerInputs } from '@/game/power';
import { usePowerStore } from '@/stores/powerStore';

/** Power inputs for the active home, read live from the store and the placed furniture. */
export function usePowerInputs(): PowerInputs {
  const home = useActiveHome();
  const outage = usePowerStore((s) => s.outage);
  const ibetaOn = usePowerStore((s) => s.ibetaOn);
  return { outage, ibetaOn, ...backupIn(home?.placed ?? []) };
}
export function usePower() { const i = usePowerInputs(); return { inputs: i, mode: powerMode(i), level: lightLevel(i) }; }
