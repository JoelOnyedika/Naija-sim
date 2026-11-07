import './mockStorage';
import { registerContent } from '../src/content';
import { AIRCRAFT, AIRCRAFT_PADS, NAME_MAX, defaultLivery, sanitizeLivery } from '../src/data/aircraft';
import { liveryOf, repaintAircraft, startingLivery } from '../src/game/aircraft';
import { useCharacterStore } from '../src/stores/characterStore';
import { APPS } from '../src/data/apps';
import { aircraftPads, aircraftSalePrice, buyAircraft, hangarHouse, padsAt, sellAircraft, whyNotAircraft } from '../src/game/aircraft';
import { startNewLife } from '../src/game/life';
import { useAircraftStore } from '../src/stores/aircraftStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { usePropertyStore } from '../src/stores/propertyStore';
import { houseBounds } from '../src/world/layoutGeometry';
import { getLayout, getProperty, listStates } from '../src/world/registry';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const E = () => useEconomyStore.getState(), A = () => useAircraftStore.getState(), P = () => usePropertyStore.getState();
const props = listStates().flatMap((s) => s.properties);
const duplex = props.find((p) => p.category === 'upperClass')!, luxury = props.find((p) => p.category === 'luxury')!, small = props.find((p) => p.category === 'starter')!;

console.log('What there is to buy');
ok(AIRCRAFT.length >= 4 && new Set(AIRCRAFT.map((a) => a.kind)).size === 3, 'helicopters, planes and a jet');
ok(AIRCRAFT.every((a) => a.price > duplex.price && a.price >= 600_000_000), 'every aircraft costs more than the big houses');
ok(AIRCRAFT_PADS.upperClass === 2 && AIRCRAFT_PADS.luxury === 3 && padsAt(small.id) === 0 && padsAt(duplex.id) === 2 && padsAt(luxury.id) === 3, 'only the two big houses have pads: 2 and 3');
ok(APPS.some((a) => a.id === 'aircraft'), 'there is an Aviation app on the phone');

console.log('Buying needs a big house');
startNewLife('lapo'); E().reset(50_000_000_000);
ok(!!whyNotAircraft('r44') && !buyAircraft('r44').ok && A().owned.length === 0, 'with no big house you cannot buy one');
P().reset(); P().own(small.id); P().setActive(small.id);
ok(!buyAircraft('r44').ok && /big house/i.test(whyNotAircraft('r44')!), 'a small house does not count');
P().own(duplex.id); P().setActive(duplex.id);
ok(hangarHouse()?.pads === 2 && whyNotAircraft('r44') === null, 'owning the duplex lets you buy');
const m0 = E().money; ok(buyAircraft('r44').ok && A().owned.includes('r44') && E().money === m0 - AIRCRAFT[0].price, 'buying takes its price');
ok(!buyAircraft('r44').ok, 'you cannot buy the same one twice');
ok(buyAircraft('skyhawk').ok && !buyAircraft('h125').ok && /pad/i.test(whyNotAircraft('h125')!), 'a duplex has two pads, then it is full');
const m1 = E().money, sale = aircraftSalePrice('r44'); ok(sellAircraft('r44').ok && E().money === m1 + sale, 'selling pays 70% back');
ok(!A().owned.includes('r44') && buyAircraft('h125').ok, 'and the pad is free again');
P().own(luxury.id); P().setActive(luxury.id);
ok(hangarHouse()?.pads === 3 && buyAircraft('phenom').ok, 'the luxury duplex has a third pad');
ok(aircraftSalePrice('phenom') === Math.round(AIRCRAFT[3].price * 0.7), 'a sale returns 70%');
E().reset(100); A().reset(); ok(!buyAircraft('skyhawk').ok && A().owned.length === 0, 'you cannot buy what you cannot afford');
startNewLife('lapo'); ok(A().owned.length === 0, 'a new life starts with none');

console.log('Where they park');
for (const p of [duplex, luxury]) { const L = getLayout(getProperty(p.id)!.layoutId)!, b = houseBounds(L), pads = aircraftPads(L, padsAt(p.id));
  ok(pads.length === padsAt(p.id) && pads.every((q) => q.z > b.z1 + 3 && q.x > b.x0 - 2 && q.x < b.x1 + 2), `${p.name}: ${pads.length} pads on the lawn in front of the house`);
  const far = Math.max(...[L.plot.x0, L.plot.x1].flatMap((x) => [L.plot.z0, L.plot.z1].map((z) => Math.hypot(x - b.cx, z - b.cz)))) + 3;
  ok(pads.every((q) => Math.hypot(q.x - b.cx, q.z - b.cz) + 4.5 <= far + 1.4), `${p.name}: every pad is on the grass disc`); }

console.log('Paint shop');
useCharacterStore.getState().setName('Joel');
ok(defaultLivery(AIRCRAFT[0], 'Joel').name === 'Joel' && startingLivery('r44')!.name === 'Joel', 'a new aircraft starts with the player name on it');
ok(sanitizeLivery({ body: 'red', name: 'A'.repeat(40), style: 'zigzag' as never }, AIRCRAFT[1], 'Joel').body === AIRCRAFT[1].color && sanitizeLivery({ name: 'A'.repeat(40) }, AIRCRAFT[1], 'J').name.length === NAME_MAX, 'bad colours, styles and long names are cleaned');
startNewLife('lapo'); E().reset(50_000_000_000); P().reset(); P().own(duplex.id); P().setActive(duplex.id);
ok(buyAircraft('skyhawk', { name: 'Chief', body: '#112233', stripe: '#abcdef', style: 'swoosh' }).ok && liveryOf('skyhawk')!.name === 'Chief' && liveryOf('skyhawk')!.body === '#112233' && liveryOf('skyhawk')!.style === 'swoosh', 'the chosen paint is kept');
ok(repaintAircraft('skyhawk', { name: 'Boss', text: '#FFFFFF' }).ok && liveryOf('skyhawk')!.name === 'Boss', 'it can be repainted');
ok(!repaintAircraft('r44', { name: 'x' }).ok, 'you cannot repaint what you do not own');
sellAircraft('skyhawk'); ok(A().liveries['skyhawk'] === undefined, 'selling removes the paint');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll aircraft checks passed');
