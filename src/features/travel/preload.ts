/**
 * The 3D travel scene is a separate chunk (three, the street, vehicles). It used to download on the FIRST trip, while the trip clock
 * was already running over a plain sky, which showed as an orange screen for the first minutes. Now the chunk is requested early
 * (when the game screen opens, when the map or the Ride app opens, and when a trip is planned) and the trip clock waits for it.
 */
type SceneModule = typeof import('./Scene3D');
let loading: Promise<SceneModule> | null = null;
export const loadScene3D = (): Promise<SceneModule> => (loading ??= import('./Scene3D').catch((e) => { loading = null; throw e; }));

let warmed = false;
/** Fire and forget: fetch the scene chunk and the car model code in the background, once, when the browser is idle. */
export function preloadTravel(): void {
  if (warmed) return; warmed = true;
  const go = () => { void loadScene3D().catch(() => { warmed = false; }); void import('@/three/models/CarModel').catch(() => undefined); };
  const ric = (globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(go, { timeout: 4000 }); else setTimeout(go, 1500);
}
