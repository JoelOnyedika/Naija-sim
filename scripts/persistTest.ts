import './mockStorage';

// Persistence needs `window.localStorage` (see settingsTest.ts). The old v1 save goes in storage BEFORE the stores load,
// exactly like a returning player opening the upgraded game.
(globalThis as any).window = globalThis;
localStorage.setItem('nigerialife.economy', JSON.stringify({
  version: 1,
  state: { money: 48_250, transactions: [
    { id: 'tx-new', kind: 'salary', amount: 6500, label: 'POS Agent', at: 1_700_000_100_000 },
    { id: 'tx-old', kind: 'purchase', amount: -1200, label: 'Indomie', at: 1_700_000_000_000 },
    { id: 'tx-tr', kind: 'transfer', amount: -5000, label: 'Transfer to Mama', at: 1_699_999_000_000, status: 'completed', recipient: 'Mama' },
  ] },
}));

const { useEconomyStore } = await import('../src/stores/economyStore');
const { useBankStore } = await import('../src/stores/bankStore');
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const e = () => useEconomyStore.getState();

console.log('Upgrading a saved v1 game');
ok(e().money === 48_250, 'the player keeps their money');
ok(e().transactions.length === 3 && e().transactions[0].label === 'POS Agent' && e().transactions[2].recipient === 'Mama', 'the player keeps their full history, in order, with transfer details');
ok(e().transactions.map((t) => t.direction).join() === 'income,expense,expense', 'history entries gain a direction');
ok(e().lifetimeIncome === 6500 && e().lifetimeExpense === 6200, 'lifetime totals are rebuilt from the kept history');
ok(e().transactions.every((t) => t.balanceAfter === undefined && t.reference === undefined), 'nothing is invented for old entries (no fake balances or references)');
e().credit(1000, 'after upgrade');
ok(e().money === 49_250 && e().transactions[0].reference === 'NL-000004' && e().transactions[0].balanceBefore === 48_250, 'new entries after the upgrade get balances and the next reference number');
const saved = JSON.parse(localStorage.getItem('nigerialife.economy')!);
ok(saved.version === 2 && saved.state.money === 49_250, 'the upgraded save is written back as version 2');

console.log('Bank state round trip');
useBankStore.setState({ savings: { balance: 123_456, entries: [] }, savingsWeeks: 3 });
const onDisk = localStorage.getItem('nigerialife.bank')!;
const raw = JSON.parse(onDisk);
ok(raw.state.savings.balance === 123_456 && raw.state.savingsWeeks === 3, 'savings and credibility counters are saved');
useBankStore.setState({ savings: { balance: 0, entries: [] }, savingsWeeks: 0 }); // memory wiped, as on a fresh page load...
localStorage.setItem('nigerialife.bank', onDisk);                                  // ...while the saved bytes are still there
await useBankStore.persist.rehydrate();
ok(useBankStore.getState().savings.balance === 123_456 && useBankStore.getState().savingsWeeks === 3, 'they load back after a reload');

console.log(fails ? `\n${fails} persistence check(s) FAILED` : '\nAll persistence checks passed');
process.exit(fails ? 1 : 0);
