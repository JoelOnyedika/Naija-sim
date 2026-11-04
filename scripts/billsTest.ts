import './mockStorage';
import { registerContent } from '../src/content';
import { BILLS, WEEK_MINUTES } from '../src/data/economy';
import { billables, chargeWeeklyBills, payBill } from '../src/game/banking';
import { DATA_MOOD_DRAIN, isOverdue, resetBillEffects, stepDisconnect, stepNoData } from '../src/game/billEffects';
import { startNewLife } from '../src/game/life';
import { useBankStore } from '../src/stores/bankStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { usePowerStore } from '../src/stores/powerStore';
import { useStatsStore } from '../src/stores/statsStore';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const E = () => useEconomyStore.getState();

console.log('The data and electricity bills');
const data = BILLS.find((b) => b.id === 'data')!, nepa = BILLS.find((b) => b.id === 'electricity')!;
ok(!!data && data.appliesTo === 'home' && data.min === data.max && data.min > 0, 'there is a flat mobile-data bill for your home');
ok(/cuts your light/i.test(nepa.note) && /mood/i.test(data.note), 'both bills say what happens when you do not pay');
startNewLife('lapo'); resetBillEffects();
const list = billables();
ok(list.some((b) => b.def.id === 'data' && b.amount === data.min) && list.some((b) => b.def.id === 'electricity'), 'a home is billed for data and electricity');

console.log('Unpaid electricity: NEPA cuts the light');
E().reset(0); usePowerStore.getState().reset();
chargeWeeklyBills(1);
ok(isOverdue('electricity') && isOverdue('data'), 'with no money both bills go overdue');
ok(stepDisconnect(true) === true && usePowerStore.getState().outage, 'NEPA disconnects the house');
usePowerStore.getState().step(100000, true); // even a long time later...
ok(stepDisconnect(true) === true && usePowerStore.getState().outage, 'the outage does not end by itself while the bill is overdue');
ok(stepDisconnect(false) === false, 'a home with no public power cannot be disconnected');
const ebill = useBankStore.getState().bills.find((b) => b.defId === 'electricity' && b.status === 'overdue')!;
E().reset(ebill.amount + 100);
ok(payBill(ebill.id).ok, 'paying the overdue bill works from the Bank app');
ok(stepDisconnect(true) === false && !usePowerStore.getState().outage, 'NEPA restores the light once it is paid');

console.log('Unpaid data: mood drains');
const dbill = useBankStore.getState().bills.find((b) => b.defId === 'data' && b.status === 'overdue')!;
useStatsStore.getState().reset(); const h0 = useStatsStore.getState().stats.happiness;
stepNoData(10);
ok(Math.abs(useStatsStore.getState().stats.happiness - (h0 - DATA_MOOD_DRAIN * 10)) < 1e-6, 'an overdue data bundle drains mood slowly');
E().reset(dbill.amount + 10); payBill(dbill.id);
const h1 = useStatsStore.getState().stats.happiness; stepNoData(10);
ok(useStatsStore.getState().stats.happiness === h1 && !isOverdue('data'), 'paying it stops the drain');
ok(WEEK_MINUTES > 0, 'bills run on the existing weekly schedule');
console.log(fails ? `\n${fails} FAILED` : '\nAll bill-effect checks passed');
process.exit(fails ? 1 : 0);
