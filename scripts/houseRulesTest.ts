/** House rules from the owner's brief: square footprints, no garages, windows only on the two non-camera walls,
 *  Lapo Baby starting house has exactly one window, luxury houses are square. */
import { registerContent } from '../src/content';
import { getLayout, listStates } from '../src/world/registry';
import { houseBounds } from '../src/world/layoutGeometry';

registerContent();
let errors = 0, houses = 0, state0 = 0;
const err = (m: string) => { console.error('  ✗ ' + m); errors++; };
for (const state of listStates()) for (const p of state.properties) {
  const lapoStart = state.startingProperties.lapo.includes(p.id);
  const L = getLayout(p.layoutId); if (!L) { err(`${p.id}: no layout`); continue; }
  houses++; if (lapoStart) state0++;
  const b = houseBounds(L);
  if (Math.abs(b.w - b.d) > 0.01) err(`${p.id} (${p.name}): footprint is ${b.w.toFixed(1)} x ${b.d.toFixed(1)}, not square`);
  if (p.garageBays !== 0 || L.zones.some((z) => z.kind === 'garage')) err(`${p.id}: has a garage`);
  for (const w of L.windows) if (w.wall !== 'back' && w.wall !== 'left') err(`${p.id}: window on a camera-facing wall`);
  if (lapoStart && L.windows.length !== 1) err(`${p.id} (${p.name}): Lapo Baby starting house has ${L.windows.length} windows, needs exactly 1`);
}
console.log(`Checked ${houses} properties, ${state0} Lapo Baby starting houses`);
if (errors) { console.error(`${errors} house rule problem(s)`); process.exit(1); }
console.log('All house rule checks passed');
