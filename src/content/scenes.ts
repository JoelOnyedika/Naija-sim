import { registerScene } from '@/three/world/sceneRegistry';
import { LagosWorld } from './lagos/scene/LagosWorld';

/** Register each state's 3D world. Kept separate from content/index.ts so data-only tools can skip React. */
export function registerScenes() {
  registerScene('lagos', LagosWorld);
}
