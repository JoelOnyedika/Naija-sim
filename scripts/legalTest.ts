import './mockStorage';
import { registerContent } from '../src/content';
import { COURT, POLICE } from '../src/data/legal';
import { clearGuard } from '../src/game/guard';
import { buildEvents, fileCase, filingCost, handleToId, runLegal, stageOf, submitReport, validateFiling, validateReport, verdictFor, visibleEvents } from '../src/game/legal';
import { startNewLife } from '../src/game/life';
import { useClockStore } from '../src/stores/clockStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useLegalStore } from '../src/stores/legalStore';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const L = () => useLegalStore.getState(), eco = () => useEconomyStore.getState();
const at = (m: number) => { useClockStore.setState({ minutes: m }); runLegal(m); };
const fresh = (money = 1_000_000) => { startNewLife('lapo'); clearGuard(); eco().reset(money); useClockStore.setState({ minutes: 480 }); };
const DESC = 'He agreed to pay me for the decoration but never did.';
const CASE = { defendant: '@lekki_larry', category: 'Unpaid debt', description: DESC, evidence: 'WhatsApp screenshots', lawyerId: 'l1' };

console.log('Court: live cases never run dry');
fresh();
ok(L().cases.filter((c) => c.sample && c.status === 'live').length === 3, 'a new life has 3 live sample cases');
for (const m of [600, 1200, 5000]) { at(m); }
ok(L().cases.filter((c) => c.sample && c.status === 'live').length === 3 && L().cases.some((c) => c.sample && c.status === 'closed'), 'long after the first ones closed there are still 3 live cases');
ok(L().cases.filter((c) => c.sample && c.status === 'live').every((c) => c.events.at(-1)!.at > 5000), 'every live case still has its verdict ahead of it');
console.log('Court: filing');
fresh();
ok(handleToId('@Lekki_Larry') === 'p:lekki_larry' && handleToId('ghost') === null, 'usernames are matched (case and @ ignored); unknown ones are not');
ok(validateFiling({ ...CASE, defendant: 'ghost' }) !== null && validateFiling({ ...CASE, category: 'x' }) !== null && validateFiling({ ...CASE, description: 'short' }) !== null && validateFiling({ ...CASE, evidence: 'x'.repeat(301) }) !== null && validateFiling({ ...CASE, defendant: '' }) !== null, 'the filing form is validated');
ok(validateFiling({ ...CASE, lawyerId: 'l6' })?.includes('not available') === true && validateFiling({ ...CASE, lawyerId: 'l2' })?.includes('does not handle') === true && validateFiling({ ...CASE, lawyerId: 'zzz' }) !== null, 'an unavailable lawyer, the wrong specialty and an unknown lawyer are refused');
ok(validateFiling(CASE) === null && filingCost('l1') === COURT.filingFee + 60_000, 'a valid filing costs the fee plus the lawyer');
for (let k = 0; k < 40; k++) at(480 + k * 7);
const m0 = eco().money; const r = fileCase(CASE); const cid = (r as any).id as string;
ok(r.ok && /^CASE-\d{4}$/.test(cid) && eco().money === m0 - 85_000 && eco().transactions[0].ref?.id === cid, 'filing creates a case with a reference and charges once, recorded in the ledger');
ok(!fileCase(CASE).ok && L().cases.filter((c) => c.plaintiff === 'me').length === 1, 'the same case cannot be filed again (double tap or later)');
clearGuard(); eco().debit(eco().money - 100, 'spend');
ok(!fileCase({ ...CASE, description: 'A different and fairly long complaint here.' }).ok && L().cases.filter((c) => c.plaintiff === 'me').length === 1, 'filing without enough money fails and creates nothing');
eco().credit(1_000_000, 'top up'); clearGuard();
for (const d of ['One different complaint, long enough.', 'Another different complaint, long enough.']) { clearGuard(); fileCase({ ...CASE, description: d }); }
clearGuard(); ok(L().cases.filter((c) => c.plaintiff === 'me' && c.status === 'live').length === 3 && !fileCase({ ...CASE, description: 'A fourth complaint that is long enough.' }).ok, `at most ${COURT.maxOpenFiled} open cases`);

console.log('Court: proceedings');
const c = L().cases.find((x) => x.id === cid)!;
ok(buildEvents(c).map((e) => e.text).join() === c.events.map((e) => e.text).join(), 'the case model is deterministic: same case, same proceedings');
ok(c.events.length === 8 && c.events[0].stage === 'Filed' && c.events.at(-1)!.stage === 'Verdict' && c.events.every((e, i, a) => i === 0 || e.at > a[i - 1].at), 'eight timed events from Filed to Verdict');
ok(visibleEvents(c, c.filedAt + 25).length === 3 && stageOf(c, c.filedAt + 25) === 'Case introduced', 'the viewer only shows events whose time has come');
at(c.filedAt + 50); ok(L().cases.find((x) => x.id === cid)!.status === 'live' && visibleEvents(c, c.filedAt + 50).length === 5, 'mid-case it is still live');
at(c.filedAt + 80); const closed = L().cases.find((x) => x.id === cid)!;
ok(closed.status === 'closed' && closed.verdict === verdictFor(c), 'at the verdict time it closes with the deterministic verdict');
const incomeAtVerdict = eco().lifetimeIncome, v1 = closed.verdict; at(c.filedAt + 500); ok(L().cases.find((x) => x.id === cid)!.verdict === v1 && L().cases.filter((x) => x.id === cid).length === 1, 'running the clock again never changes or duplicates a verdict');
ok(eco().lifetimeIncome === incomeAtVerdict, 'a verdict moves no money (no damages are awarded)');
const wins = Array.from({ length: 200 }, (_, i) => verdictFor({ id: `X${i}`, lawyerId: 'l3' })).filter((v) => v === 'plaintiff').length;
const winsNo = Array.from({ length: 200 }, (_, i) => verdictFor({ id: `X${i}`, lawyerId: undefined })).filter((v) => v === 'plaintiff').length;
ok(wins > winsNo, `a stronger lawyer wins more often (${wins} vs ${winsNo} of 200)`);

console.log('Police');
fresh();
const REP = { reported: 'dj_kele', category: 'Theft', description: 'My bag went missing after the party at the club.' };
ok(validateReport({ ...REP, reported: 'ghost' }) !== null && validateReport({ ...REP, category: 'x' }) !== null && validateReport({ ...REP, description: 'short' }) !== null && validateReport(REP) === null, 'the report form is validated');
const rr = submitReport(REP); const rid = (rr as any).id as string;
ok(rr.ok && /^REP-\d{4}$/.test(rid) && L().reports[0].status === 'submitted' && eco().money === 1_000_000, 'a report starts as Submitted and costs nothing');
ok(!submitReport(REP).ok && L().reports.length === 1, 'the same report cannot be submitted twice');
clearGuard(); ok(validateReport({ ...REP, reported: 'okada_musa' })?.includes('wait') === true, 'reports are rate limited');
at(480 + POLICE.reviewAfter + 1); ok(L().reports[0].status === 'review', 'after a while it is Under Review');
for (let i = 0; i < 3; i++) at(480 + POLICE.decideAfter + 2 + i);
const rep = L().reports[0];
ok(rep.status === 'referred' || rep.status === 'dismissed', `then it is ${rep.status} (never guilty by default)`);
// find reports that would be referred / dismissed and check the linking
const mk = (n: number, category: string) => { fresh(); const ids: string[] = []; for (let i = 0; i < n; i++) { clearGuard(); useClockStore.setState({ minutes: 480 + i * 10 }); const s = submitReport({ ...REP, category, description: `Report number ${i} describing something that happened.` }); if (s.ok) ids.push((s as any).id); at(480 + i * 10 + 1); } return ids; };
mk(3, 'Fraud'); at(480 + 200); at(480 + 201);
const refs = L().reports.filter((r) => r.status === 'referred');
ok(refs.length >= 1 && refs.every((r) => !!r.caseId && L().cases.find((c) => c.id === r.caseId)?.reportId === r.id && L().cases.find((c) => c.id === r.caseId)?.plaintiff === 'state'), 'a referral creates a linked court case (and not a second one)');
ok(refs.every((r) => L().cases.filter((c) => c.reportId === r.id).length === 1), 'exactly one case per referred report');
const cs = L().cases.find((c) => c.id === refs[0].caseId)!;
at(cs.filedAt + 100); at(cs.filedAt + 101);
ok(L().cases.find((c) => c.id === cs.id)!.status === 'closed' && L().reports.find((r) => r.id === refs[0].id)!.status === 'resolved', 'when the case closes the report becomes Resolved');
fresh(); const o = mk(2, 'Noise and nuisance'); at(480 + 300); at(480 + 301);
ok(o.length >= 1 && L().reports.filter((r) => r.category === 'Noise and nuisance').every((r) => r.status === 'dismissed') && L().cases.every((c) => c.sample), 'a report in a non-referable category is dismissed and creates no case');

console.log(fails ? `\n${fails} legal check(s) FAILED` : '\nAll legal checks passed');
process.exit(fails ? 1 : 0);
