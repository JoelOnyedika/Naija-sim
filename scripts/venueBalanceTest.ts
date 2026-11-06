import { KIT } from '../src/data/venueKit';
import { FOODS } from '../src/data/foods';
import { MARKET_RATIO, PRICE_CEILING, PRICE_FLOOR, fairPrice, valueOf } from '../src/data/pricing';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const uses = KIT.flatMap((k) => (k.uses ?? []).map((u) => ({ k, u })));
const hasPrice = (u: (typeof uses)[number]['u']) => !!u.cost || !!u.payout || !!u.risk || Object.values(u.effects).some((v) => (v ?? 0) < 0);

console.log('Nothing in a venue is free for nothing');
ok(uses.length > 300 && uses.every(({ u }) => hasPrice(u)), `all ${uses.length} venue activities cost naira, pay for work, risk something or drain you`);
const kind = (f: (u: (typeof uses)[number]['u']) => boolean) => uses.filter(({ u }) => f(u)).length;
const paid = kind((u) => !!u.cost && !u.payout), gamble = kind((u) => !!u.risk), work = kind((u) => !!u.payout);
ok(paid >= 120 && gamble >= 40 && work >= 40, `${paid} cost naira, ${gamble} are gambles, ${work} are paid work`);
const get = (id: string) => uses.find(({ u }) => u.id === id)!.u;
ok(get('swim_laps').cost! >= 1000 && get('float_relax').cost! >= 1000 && get('sun_lounge').cost! >= 800, 'the pool and the loungers have a price');
ok(!!get('give_interview').risk && get('give_interview').risk!.loseEffects.charisma! < 0, 'an interview can cost you charisma');
ok(!!get('meet_actor').risk && !!get('vip_gist').risk, 'meeting the famous is a gamble too');
ok(get('sit_bench').effects.hunger! < 0 && !get('sit_bench').cost, 'a bench is free but the time still costs a little hunger');
ok(uses.every(({ u }) => !u.cost || u.cost <= 100_000) && uses.filter(({ u }) => u.cost && !u.payout && u.cost > 5000).every(({ u }) => (u.effects.happiness ?? 0) + (u.effects.hunger ?? 0) > 0), 'nothing silly: any big price buys something');
ok(uses.every(({ u }) => !u.risk || (u.risk.winChance > 0.05 && u.risk.winChance < 0.95)), 'every gamble can be won and lost');
const drain = (u: (typeof uses)[number]['u']) => Object.values(u.effects).reduce((t: number, v) => t + Math.max(0, -(v ?? 0)), 0);
const NATURE = ['pray_quietly', 'pray_together', 'hear_sermon', 'shade_relax', 'relax_fountain', 'sit_bench'];
const gifts = uses.filter(({ u }) => !u.payout && !u.cost && !u.risk && (u.effects.happiness ?? 0) >= 8 && drain(u) < 5 && !NATURE.includes(u.id!)).map(({ u }) => u.id);
ok(gifts.length === 0, `a big happiness reward with no naira price either drains at least 5 points or is a prayer, shade or a fountain (${gifts.join(', ') || 'none'})`);


console.log('The yardstick');
const ratios = uses.filter(({ u }) => u.cost && !u.payout && !u.risk && valueOf(u.effects) > 200).map(({ u }) => u.cost! / valueOf(u.effects)).sort((a, b) => a - b);
const med = ratios[Math.floor(ratios.length / 2)];
ok(ratios.length > 120 && Math.abs(med - MARKET_RATIO) < 0.35, `${ratios.length} priced activities have a median of ${med.toFixed(2)} naira per naira of value (the yardstick is ${MARKET_RATIO})`);
const foodRatios = FOODS.map((f) => f.price / valueOf(f.effects)).sort((a, b) => a - b);
ok(Math.abs(foodRatios[Math.floor(foodRatios.length / 2)] - MARKET_RATIO) < 0.5, 'the food menu sits on the same yardstick');
ok(fairPrice({ hunger: 50, happiness: 8 }) >= 3000 && fairPrice({ hunger: 50, happiness: 8 }) <= 5500, 'a plate-sized meal prices like a plate of jollof');
ok(fairPrice({}) === PRICE_FLOOR && fairPrice({ charisma: 500, happiness: 500 }) === PRICE_CEILING, 'prices stay between the floor and the ceiling');
ok(fairPrice({ happiness: 20 }) > fairPrice({ happiness: 10 }) && fairPrice({ happiness: 10, energy: -10 }) < fairPrice({ happiness: 10 }), 'more benefit costs more and a drain makes it cheaper');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll venue balance checks passed');
