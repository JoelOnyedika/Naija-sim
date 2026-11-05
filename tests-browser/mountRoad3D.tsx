// TEST-ONLY helper (the game never imports this): mounts the experimental 3D roadblock street so screenshots do not depend on the game flow.
import { createRoot } from 'react-dom/client';
import { StreetStage3D } from '@/features/game/roadblock3d/StreetStage3D';
import type { RoadChoice } from '@/data/agbero';

export function mountRoad3D(o: { crew: number; looks: number[]; choice: RoadChoice | null; success: boolean }) {
  document.getElementById('r3d')?.remove();
  const d = document.createElement('div'); d.id = 'r3d'; d.style.cssText = 'position:fixed;left:0;top:0;width:360px;z-index:9999;background:#000'; document.body.appendChild(d);
  createRoot(d).render(<StreetStage3D {...o} onStats={(s) => { (globalThis as { __r3dStats?: unknown }).__r3dStats = { ...(s as object) }; }} />);
}
