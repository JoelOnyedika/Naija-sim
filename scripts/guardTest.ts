import './mockStorage';
import { registerContent } from '../src/content';
import { BILLS } from '../src/data/economy';
import { BODYGUARD, BODYGUARD_LOOK } from '../src/data/bodyguard';
import { billables, chargeWeeklyBills, payBill } from '../src/game/banking';
import { dismissBodyguard, guardStopsAgbero, guardStopsTheft, hasBodyguard, hireBodyguard } from '../src/game/bodyguard';
import { maybeRoadblock } from '../src/game/agbero';
import { resetBillEffects } from '../src/game/billEffects';
import { startNewLife } from '../src/game/life';
import { useAgberoStore } from '../src/stores/agberoStore';
import { useBankStore } from '../src/stores/bankStore';
import { useBodyguardStore } from '../src/stores/bodyguardStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useTravelStore } from '../src/stores/travelStore';
import { entranceOf, wallPieces, windowsOnPiece, houseBounds, DOOR_W } from '../src/world/layoutGeometry';
import { getLayout, listStates } from '../src/world/registry';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const E = () => useEconomyStore.getState(), G = () => useBodyguardStore.getState();

console.log('The main door of every house');
let houses = 0, noDoor: string[] = [], blocked: string[] = [], outside: string[] = [], onWall: string[] = [];
for (const st of listStates()) for (const p of st.properties) {
  const L = getLayout(p.layoutId)!; houses++;
  const e = entranceOf(L);
  if (!e) { noDoor.push(p.name); continue; }
  const piece = wallPieces(L).find((q) => q.tall && (e.wall === 'back' ? q.o === 'h' : q.o === 'v') && Math.abs(q.c - e.c) < 1e-3 && e.along - DOOR_W / 2 >= q.a - 1e-3 && e.along + DOOR_W / 2 <= q.b + 1e-3);
  if (!piece) onWall.push(p.name);
  else if (windowsOnPiece(L, piece).some((w) => Math.abs(w.along - e.along) < w.width / 2 + DOOR_W / 2)) blocked.push(p.name);
  const b = houseBounds(L);
  if (e.guard.x < b.x0 - 1e-3 || e.guard.x > b.x1 + 1e-3 || e.guard.z < b.z0 - 1e-3 || e.guard.z > b.z1 + 1e-3) outside.push(p.name);
}
ok(houses >= 6 && noDoor.length === 0, `all ${houses} houses have a main door${noDoor.length ? ` (missing: ${noDoor.join(', ')})` : ''}`);
ok(onWall.length === 0, 'each door sits fully inside a tall outer wall');
ok(blocked.length === 0, 'no door is cut into a window');
ok(outside.length === 0, `the guard always stands inside the house${outside.length ? ` (not: ${outside.join(', ')})` : ''}`);
ok(JSON.stringify(entranceOf(getLayout(listStates()[0].properties[0].layoutId)!)) === JSON.stringify(entranceOf(getLayout(listStates()[0].properties[0].layoutId)!)), 'the same house always has the same door');

console.log('Hiring');
startNewLife('lapo'); resetBillEffects(); useBankStore.setState({ bills: [] });
ok(!hasBodyguard() && !billables().some((b) => b.def.id === 'bodyguard'), 'no bodyguard, no wage bill');
E().reset(10_000); ok(!hireBodyguard().ok && !G().hired, 'you cannot hire him without the fee');
E().reset(1_000_000); const before = E().money; ok(hireBodyguard().ok && hasBodyguard() && E().money === before - BODYGUARD.hireFee, `hiring costs ₦${BODYGUARD.hireFee.toLocaleString('en-NG')} once`);
ok(!hireBodyguard().ok, 'you cannot hire him twice');
ok(BILLS.some((b) => b.id === 'bodyguard' && b.min === BODYGUARD.weekly) && billables().some((b) => b.def.id === 'bodyguard' && b.amount === BODYGUARD.weekly), 'his weekly wage is billed');
ok(BODYGUARD_LOOK.topColor === '#0B0B10' && BODYGUARD_LOOK.bottomColor === '#0B0B10' && BODYGUARD_LOOK.accessory === 'glasses' && BODYGUARD_LOOK.top === 'jacket', 'black suit, black trousers, dark glasses');

console.log('On the road');
useTravelStore.setState({ trips: 40 }); useAgberoStore.getState().set({ active: null, result: null, lastTrip: 0 });
ok(maybeRoadblock(() => {}, () => 0) === false && !useAgberoStore.getState().active, 'with a bodyguard the roadblock never starts');
ok(G().stops.agbero === 1, 'and he is counted as having stepped in');
ok(guardStopsAgbero(), 'he stops them again if asked');
dismissBodyguard(); useAgberoStore.getState().set({ active: null, result: null, lastTrip: 0 }); useTravelStore.setState({ trips: 60 });
ok(maybeRoadblock(() => {}, () => 0) === true && !!useAgberoStore.getState().active, 'without him the roadblock happens as before');
useAgberoStore.getState().set({ active: null });

console.log('Wages and standing down');
G().hire(); useBankStore.setState({ bills: [] }); E().reset(5_000); chargeWeeklyBills(1);
ok(!hasBodyguard(), 'if the wage cannot be paid he stands down');
const rec = useBankStore.getState().bills.find((b) => b.defId === 'bodyguard')!; E().reset(500_000); ok(!!rec && payBill(rec.id).ok && hasBodyguard(), 'pay the bill and he is back on duty');

console.log('Pickpockets');
let jailed = ''; const arrest = (id: string) => { jailed = id; };
ok(guardStopsTheft(arrest, 'thief-1') && jailed === 'thief-1' && G().stops.thieves === 1, 'with a bodyguard a pickpocket is stopped and arrested');
dismissBodyguard(); jailed = ''; ok(!guardStopsTheft(arrest, 'thief-2') && jailed === '', 'without one nothing is stopped');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll bodyguard and door checks passed');
