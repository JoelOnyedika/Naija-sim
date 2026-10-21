import './mockStorage';
import { readFileSync } from 'node:fs';
import { registerContent } from '../src/content';
import { REFERRAL } from '../src/data/balance';
import { TASKS } from '../src/data/tasks';
import { checkServerReward, makeCode, parseCode, spendDelta, type ServerReward } from '../src/game/referrals';
import { startNewLife } from '../src/game/life';
import { advance } from '../src/game/loop';
import { useAuthStore } from '../src/stores/authStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useReferralStore } from '../src/stores/referralStore';

registerContent();
Math.random = () => 0.999999;
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const R = () => useReferralStore.getState();
const E = () => useEconomyStore.getState();

console.log('Codes');
const mine = makeCode('player'), tunde = makeCode('Tunde'), chioma = makeCode('Chioma');
ok(/^NL-[2-9A-HJ-NP-Z]{6}$/.test(mine) && mine === makeCode('player') && makeCode('PLAYER ') === mine, 'a code is NL-XXXXXX and stable for a username');
ok(new Set([mine, tunde, chioma, makeCode('Emeka'), makeCode('Zainab'), makeCode('Kemi')]).size === 6, 'different usernames get different codes');
ok(parseCode(' nl-ab23cd ') === 'NL-AB23CD' && parseCode('NL AB23CD') === 'NL-AB23CD' && parseCode('nlab23cd') === 'NL-AB23CD', 'codes are accepted in lower case, with spaces or without the dash');
ok(['', 'NL-', 'NL-AB23C', 'NL-AB23CDE', 'XX-AB23CD', 'NL-AB0OIL', '<script>', 'NL-AB23C!'].every((x) => parseCode(x) === null), 'malformed codes, and codes with 0/O/1/I, are rejected');

console.log('Using a friend\'s code');
startNewLife('nepo'); R().reset();
ok(!R().redeem('garbage', mine).ok && R().referredBy === null, 'a malformed code is refused');
ok(!R().redeem(mine, mine).ok && R().referredBy === null, 'you cannot use your own code');
ok(R().redeem(tunde.toLowerCase(), mine).ok && R().referredBy === tunde, 'a friend\'s code is accepted (case-insensitive)');
ok(!R().redeem(chioma, mine).ok && R().referredBy === tunde, 'a second code is refused, the first one stays');
R().reset(); R().capture('nl-ab23cd');
ok(R().pendingRef === 'NL-AB23CD' && R().referredBy === null, 'a code from a link is only remembered, never applied by itself');
R().capture('<img src=x>'); ok(R().pendingRef === 'NL-AB23CD', 'junk in the link is ignored');
R().reset();

console.log('Spending towards the qualifying amount');
const tx = (kind: string, amount: number, direction: 'income' | 'expense', extra: object = {}) => ({ kind, amount: direction === 'expense' ? -amount : amount, direction, status: 'completed', ...extra }) as Parameters<typeof spendDelta>[0];
ok(spendDelta(tx('purchase', 5000, 'expense')) === 5000 && spendDelta(tx('food', 800, 'expense')) === 800 && spendDelta(tx('visit', 1500, 'expense')) === 1500, 'purchases, food and visits count');
ok(['transfer', 'savings', 'bond', 'bet', 'invest', 'bill', 'tax'].every((k) => spendDelta(tx(k, 9999, 'expense')) === 0), 'transfers, savings, bonds, bets, investments, bills and tax do not count (they could be cycled)');
ok(spendDelta(tx('purchase', 9999, 'expense', { internal: true })) === 0 && spendDelta(tx('purchase', 9999, 'expense', { status: 'failed' })) === 0, 'internal and failed movements do not count');
ok(spendDelta(tx('refund', 3000, 'income')) === -3000 && spendDelta(tx('income', 3000, 'income')) === 0, 'a refund takes money off the spend; ordinary income does nothing');

startNewLife('nepo'); R().reset(); E().credit(10_000_000, 'test');
R().redeem(tunde, mine);
const step = () => advance(1);
E().debit(7_000, 'Test buy', 'purchase'); step();
ok(R().spent === 7_000 && R().outbox.length === 0 && !R().qualifiedAt, 'ordinary spending is counted and below the threshold nothing is queued');
E().debit(50_000, 'Test transfer', 'transfer'); E().debit(50_000, 'Test bet', 'bet'); step();
ok(R().spent === 7_000, 'a transfer or a bet does not move the total');
E().credit(2_000, 'Sold something', 'refund'); step();
ok(R().spent === 5_000, 'selling something back reduces it');
E().debit(9_999, 'Test buy', 'purchase'); step();
ok(R().spent === 14_999 && !R().qualifiedAt, `${REFERRAL.minSpend - 1} is not enough (threshold ${REFERRAL.minSpend})`);
E().debit(1, 'Test buy', 'purchase'); step();
ok(R().spent === REFERRAL.minSpend && !!R().qualifiedAt && R().outbox.length === 1, 'exactly at the threshold the friend qualifies and one claim is queued for the server');
ok(R().outbox[0].referrerCode === tunde && R().outbox[0].referredCode === mine && R().outbox[0].claimId === `${mine}>${tunde}`, 'the claim names both codes and has a stable id');
E().debit(30_000, 'Test buy', 'purchase'); step(); step();
ok(R().outbox.length === 1, 'more spending never queues a second claim');
const before = E().money;
for (let i = 0; i < 5; i++) step();
ok(E().money === before, 'qualifying pays nothing locally: only the server can confirm a reward');

console.log('Server rewards (the hand-off to a backend)');
R().reset(); startNewLife('nepo'); E().credit(1_000_000, 'test');
const good: ServerReward = { claimId: 'c1', referrerCode: mine, referredCode: tunde, amount: REFERRAL.reward };
const bal = () => E().money;
const cases: [string, ServerReward][] = [
  ['wrong amount', { ...good, claimId: 'a', amount: REFERRAL.reward + 1 }], ['zero', { ...good, claimId: 'b', amount: 0 }], ['negative', { ...good, claimId: 'c', amount: -5 }],
  ['not a number', { ...good, claimId: 'd', amount: NaN }], ['fraction', { ...good, claimId: 'e', amount: 500.5 }],
  ['for someone else', { ...good, claimId: 'f', referrerCode: chioma }], ['self referral', { ...good, claimId: 'g', referredCode: mine }],
  ['malformed code', { ...good, claimId: 'h', referredCode: 'hello' }], ['empty id', { ...good, claimId: '' }],
];
for (const [name, c] of cases) { const b = bal(); const r = R().applyServerReward(c, mine); ok(!r.ok && bal() === b, `rejected and nothing paid: ${name} (${r.reason})`); }
const b0 = bal();
ok(R().applyServerReward(good, mine).ok && bal() - b0 === REFERRAL.reward, `a valid confirmed reward pays exactly ${REFERRAL.reward}`);
ok(!R().applyServerReward(good, mine).ok && bal() - b0 === REFERRAL.reward, 'the same claim is never paid twice');
ok(!R().applyServerReward({ ...good }, mine).ok, 'duplicates are caught again on a repeat');
ok(R().confirmed.length === 1 && R().confirmed[0].amount === REFERRAL.reward, 'the confirmed earnings record matches what was paid');
ok(checkServerReward(good, mine, ['c1']) === 'duplicate', 'the rule function itself reports duplicates');
R().applyServerSummary({ invitations: 3.9, pendingRewards: -2 });
ok(R().invitations === 3 && R().pendingRewards === 0, 'server counts are sanitised (whole, never negative)');

console.log('Configuration and honesty');
ok(REFERRAL.minSpend === 15_000 && REFERRAL.reward === 1_000, 'the requested rules (₦15,000 spend, ₦1,000 reward) are the configured values');
const rules = readFileSync('src/game/referrals.ts', 'utf8'), ui = readFileSync('src/features/phone/apps/Invite.tsx', 'utf8'), store = readFileSync('src/stores/referralStore.ts', 'utf8');
ok(!/15[_,]?000|\b1[_,]?000\b/.test(rules.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')) && !/15[_,]?000/.test(ui + store), 'the amounts are not hardcoded outside the config');
ok(/cannot be withdrawn or exchanged for real money/.test(ui), 'the screen says rewards are in-game only and cannot be turned into real money');
ok(/not connected yet/.test(ui), 'the screen says counts and rewards need the online service');
ok(!/credit\(/.test(store.replace(/\/\/.*$/gm, '')), 'the store never credits money on its own: rewards only go through the validated server path');
ok(/opKey: `referral:\$\{r\.claimId\}`/.test(store), 'a reward is posted with an idempotency key as well');

console.log('Onboarding task');
const task = TASKS.find((t) => t.id === 'invite');
ok(!!task && task.action?.app === 'invite' && task.event === 'app:invite', 'a task introduces invites and points at the Invite app');
const panel = readFileSync('src/features/game/TaskPanel.tsx', 'utf8');
ok(/openPhone\(\)/.test(panel) && /openApp\(t\.action!\.app\)/.test(panel), 'tapping the task opens the phone straight on the Invite screen');
ok(/fireTask\('app:invite'\)/.test(ui), 'opening the Invite screen completes the task');
ok(TASKS.slice(0, 3).map((t) => t.id).join() === 'art,furniture,wash', 'the first three starter tasks are unchanged');
useAuthStore.getState();

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll referral checks passed');
