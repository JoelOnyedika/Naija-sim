import './mockStorage';
import { registerContent } from '../src/content';
import { PETS } from '../src/data/balance';
import { FURNITURE, getFurniture } from '../src/data/items';
import { getActiveHome } from '../src/game/active';
import { petLimitOk } from '../src/game/buy';
import { describeItem } from '../src/game/itemInfo';
import { startNewLife } from '../src/game/life';
import { priceOf } from '../src/game/pricing';
import { blocksWalking, buildNavGrid, isFree, nearestFree } from '../src/world/navigation';
import { initBrain, SPECIES, stepPet, type PetSpecies } from '../src/world/petBrain';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

console.log('Pet items');
const pets = FURNITURE.filter((f) => f.pet), toys = FURNITURE.filter((f) => f.toy);
ok(pets.map((p) => p.pet).sort().join() === 'cat,dog,lion' && toys.length >= 1, 'cat, dog, lion and a ball exist');
ok(getFurniture('pet_cat')!.price < getFurniture('pet_dog')!.price && getFurniture('pet_dog')!.price < getFurniture('pet_lion')!.price, 'prices rise cat < dog < lion');
ok(pets.every((p) => p.price >= 300000), 'pets are valuable items');
ok([...pets, ...toys].every((p) => priceOf(p.price) > 0), 'pet prices go through the shared pricing function');
ok([...pets, ...toys].every((p) => !blocksWalking({ uid: 'u', defId: p.id, x: 0, z: 0, rotation: 0 })), 'pets and toys never block walking');
ok(pets.every((p) => describeItem(p).functional && describeItem(p).passive.join(' ').includes('Bond and Hunger')), 'the info panel explains the pet care stats (bond and hunger)');
ok(petLimitOk([], 'pet') && !petLimitOk(Array.from({ length: PETS.maxPerHome }, () => ({ defId: 'pet_cat' })), 'pet') && !petLimitOk(Array.from({ length: PETS.maxBallsPerHome }, () => ({ defId: 'pet_ball' })), 'toy'), 'per-home caps on pets and balls work');

console.log('Pet behaviour');
for (const homeKind of ['nepo', 'lapo'] as const) {
  startNewLife(homeKind);
  const home = getActiveHome()!;
  const grid = buildNavGrid(home.layout, [...home.fixtures, ...home.placed]);
  const start = nearestFree(grid, { x: 3, z: 3 })!;
  for (const sp of Object.keys(SPECIES) as PetSpecies[]) {
    const b = initBrain(start.x, start.z, seeded(7)), rnd = seeded(11);
    let blocked = 0, maxStep = 0, modes = new Set<string>(), px = b.x, pz = b.z, played = 0, pivotMove = 0, maxY = 0;
    for (let i = 0; i < 4000; i++) { // 200 s at 20 fps
      const yawBefore = b.yaw;
      stepPet(b, sp, 0.05, { grid, ball: null, rnd });
      if (!isFree(grid, b)) blocked++;
      const step = Math.hypot(b.x - px, b.z - pz); maxStep = Math.max(maxStep, step); px = b.x; pz = b.z;
      modes.add(b.mode); if (b.mode === 'play') played++;
      maxY = Math.max(maxY, b.y); void yawBefore; void pivotMove;
    }
    ok(blocked === 0, `${homeKind}/${sp}: never stands in a wall or furniture (200 s)`);
    ok(maxStep <= SPECIES[sp].speed * 0.05 + 1e-6, `${homeKind}/${sp}: never moves faster than its speed (no sliding or teleporting), max step ${maxStep.toFixed(3)}`);
    ok(modes.has('walk') && modes.has('idle'), `${homeKind}/${sp}: idles and walks`);
    ok(played === 0, `${homeKind}/${sp}: does not play when there is no ball`);
    ok(maxY <= SPECIES[sp].hopHeight + 1e-9 && maxY >= 0, `${homeKind}/${sp}: hops stay within their configured height`);
  }
}

console.log('Ball play');
startNewLife('nepo');
const home = getActiveHome()!;
const grid = buildNavGrid(home.layout, [...home.fixtures, ...home.placed]);
const start = nearestFree(grid, { x: 3, z: 3 })!;
const ball = nearestFree(grid, { x: start.x + 2, z: start.z + 1.5 })!;
for (const sp of ['dog', 'cat'] as PetSpecies[]) {
  const b = initBrain(start.x, start.z, seeded(3)), rnd = seeded(5), ballPos = { ...ball };
  let plays = 0, kicks = 0, badKick = 0, wasPlay = false, nearBall = false, early = 0;
  for (let i = 0; i < 12000; i++) { // 600 s
    const r = stepPet(b, sp, 0.05, { grid, ball: ballPos, rnd });
    if (b.mode === 'play' && !wasPlay) { plays++; nearBall = Math.hypot(b.x - ballPos.x, b.z - ballPos.z) < 1; if (!nearBall) early++; }
    wasPlay = b.mode === 'play';
    if (r.kickBallTo) { kicks++; if (!isFree(grid, r.kickBallTo)) badKick++; ballPos.x = r.kickBallTo.x; ballPos.z = r.kickBallTo.z; }
    if (!isFree(grid, b)) { fails++; console.log('✗ pet in solid cell while playing'); break; }
  }
  ok(plays >= 2, `${sp}: goes to the ball and plays more than once in 10 minutes (${plays})`);
  ok(early === 0, `${sp}: only starts playing when it is next to the ball`);
  ok(kicks >= 1 && badKick === 0, `${sp}: bats the ball only to free floor (${kicks} kicks)`);
}
{
  const b = initBrain(start.x, start.z, seeded(9)), rnd = seeded(2); const starts: number[] = []; let was = false;
  for (let i = 0; i < 20000; i++) { stepPet(b, 'dog', 0.05, { grid, ball, rnd }); const now = b.mode === 'play'; if (now && !was) starts.push(i * 0.05); was = now; }
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  ok(starts.length >= 3 && gaps.every((d) => d >= PETS.playCooldown), `a pet waits out the cooldown between ball sessions (${starts.length} sessions, shortest gap ${Math.min(...gaps).toFixed(1)} s)`);
}

console.log('Pivot, determinism, cost, recovery');
{
  const b = initBrain(start.x, start.z, seeded(1)), rnd = seeded(8); let moved = 0, worst = 0;
  for (let i = 0; i < 6000; i++) {
    const x = b.x, z = b.z; stepPet(b, 'lion', 0.05, { grid, ball: null, rnd });
    const d = Math.hypot(b.x - x, b.z - z);
    if (b.mode === 'walk' && d > 1e-9) { moved++; const heading = Math.atan2(b.x - x, b.z - z); const diff = Math.abs(((heading - b.yaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); worst = Math.max(worst, diff); }
  }
  ok(moved > 100 && worst <= 0.5 + 1e-6, `a pet only walks while facing within 0.5 rad of where it is going (worst ${worst.toFixed(2)} rad over ${moved} steps)`);
}
{
  const run = () => { const b = initBrain(start.x, start.z, seeded(4)), rnd = seeded(6); for (let i = 0; i < 2000; i++) stepPet(b, 'cat', 0.05, { grid, ball: null, rnd }); return `${b.x.toFixed(4)},${b.z.toFixed(4)},${b.yaw.toFixed(4)}`; };
  ok(run() === run(), 'same seed, same behaviour (deterministic)');
}
{
  const t0 = performance.now();
  const bs = (['cat', 'dog', 'lion'] as PetSpecies[]).map((s, i) => ({ s, b: initBrain(start.x, start.z, seeded(i + 1)), rnd: seeded(i + 20) }));
  for (let i = 0; i < 12000; i++) for (const p of bs) stepPet(p.b, p.s, 0.05, { grid, ball, rnd: p.rnd });
  const ms = performance.now() - t0;
  ok(Number.isFinite(ms) && ms < 3000, `3 pets x 10 minutes of simulation cost ${ms.toFixed(0)} ms of CPU (about ${(ms / 12000 / 3 * 1000).toFixed(0)} microseconds per pet per frame)`);
}
{
  const b = initBrain(start.x, start.z, seeded(1));
  // furniture lands on the pet: it must step out instead of staying inside
  const k = grid.blocked.findIndex((v, i) => !!v && i % grid.cols > 3 && i % grid.cols < grid.cols - 3);
  b.x = grid.x0 + (k % grid.cols + 0.5) * 0.25; b.z = grid.z0 + (Math.floor(k / grid.cols) + 0.5) * 0.25;
  ok(!isFree(grid, b), 'setup: the pet really is in a blocked cell');
  stepPet(b, 'cat', 0.05, { grid, ball: null, rnd: seeded(1) });
  ok(isFree(grid, b), 'a pet that ends up in a blocked spot is moved to the nearest free spot');
}

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll pet checks passed');
