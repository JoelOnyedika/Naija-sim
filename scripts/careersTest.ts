import './mockStorage';
import { registerContent } from '../src/content';
import { CAREERS, getCareer } from '../src/data/careers';
import { acceptOffer, applyForJob, completeCareerShift, currentJob, jobBlocked, progressOf, promotionStatus, quitJob, requestPromotion, startShift } from '../src/game/jobs';
import { advance } from '../src/game/loop';
import { startNewLife } from '../src/game/life';
import { useCareerStore } from '../src/stores/careerStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useSkillStore } from '../src/stores/skillStore';
import { useStatsStore } from '../src/stores/statsStore';

registerContent();
// The Lapo life randomly gifts money inside the game loop (src/game/loop.ts), which made salary checks fail about 1 run in 12.
Math.random = () => 0.999999;
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const stats = () => useStatsStore.getState();
const fill = () => stats().apply({ energy: 100, hunger: 100, thirst: 100 });
/** Run a whole shift through the real game loop. */
const work = (id: string) => { fill(); const before = useEconomyStore.getState().money; if (!startShift(id)) return -1; for (let i = 0; i < 70 && stats().activity; i++) advance(1); return useEconomyStore.getState().money - before; };

console.log('Catalogue');
ok(CAREERS.length >= 30 && new Set(CAREERS.map((c) => c.id)).size === CAREERS.length, `${CAREERS.length} careers with unique ids`);
ok(CAREERS.every((c) => c.ranks.length >= 3 && c.ranks.every((r, i, a) => i === 0 || r.salary > a[i - 1].salary)), 'every career has 3+ ranks and pay rises with every rank');
ok(CAREERS.every((c) => c.ranks.every((r, i, a) => i === 0 || (r.minCharisma >= a[i - 1].minCharisma && r.minSkillLevel >= a[i - 1].minSkillLevel))), 'requirements never fall as ranks rise');
ok(getCareer('tech')!.ranks.map((r) => r.title).join() === 'Intern,Junior Developer,Developer,Senior Developer,Technical Lead,Engineering Manager,Technology Executive', 'Technology ranks match the brief');
ok(getCareer('bank')!.ranks.some((r) => r.title === 'Relationship Officer') && getCareer('bank')!.ranks.at(-1)!.title === 'Regional Manager', 'Banking ranks include Relationship Officer up to Regional Manager');

console.log('Working');
startNewLife('lapo'); useEconomyStore.getState().reset(50_000);
ok(currentJob() === null, 'a new life starts unemployed');
ok(jobBlocked('tech') === 'Apply first', 'a formal career cannot be worked without applying');
const pay = work('pos');
ok(pay === 6500 && currentJob()?.career.id === 'pos', 'open work: starting a POS shift takes the job and pays the rank salary through the game loop');
ok(progressOf('pos').shiftsInRank === 1 && progressOf('pos').totalShifts === 1, 'the finished shift is counted');
ok((useSkillStore.getState().xp.finance ?? 0) === 7, 'the shift grows the career skill');
ok(jobBlocked('shop') === 'You work somewhere else' && !startShift('shop'), 'you cannot work a second job at the same time');
const moneyNow = useEconomyStore.getState().money; completeCareerShift('shop');
ok(progressOf('shop').totalShifts === 0 && useEconomyStore.getState().money === moneyNow, 'a shift for a job you do not hold counts for nothing');

console.log('Promotion');
stats().apply({ charisma: 30 });
let r1 = requestPromotion('pos');
ok(!r1.ok && /Shifts at this rank/.test((r1 as any).error) && progressOf('pos').rank === 0, 'promotion is refused before enough shifts, says why, and changes nothing');
for (let i = 0; i < 2; i++) work('pos');  // 3 shifts in total
ok(promotionStatus('pos').eligible, 'with 3 shifts, enough Charisma and skill the player is eligible');
ok(requestPromotion('pos').ok && progressOf('pos').rank === 1 && progressOf('pos').shiftsInRank === 0, 'promotion moves up one rank and restarts the shift count');
ok(work('pos') === 9000, 'the new rank pays the new salary');
ok(!requestPromotion('pos').ok, 'you cannot be promoted again straight away');
ok(useCareerStore.getState().history.filter((h) => h.kind === 'promoted').length === 1, 'the promotion is recorded in career history');
// rank 3 of Kiosk Owner needs skill level 2: shifts alone are not enough
for (let i = 0; i < 4; i++) work('pos');  // 5 shifts at rank 1
useSkillStore.setState({ xp: {} });
let r2 = requestPromotion('pos');
ok(!r2.ok && /level/.test((r2 as any).error) && progressOf('pos').rank === 1, 'enough shifts without the skill level is refused, naming the skill');
useSkillStore.setState({ xp: { finance: 20 } });
ok(requestPromotion('pos').ok && progressOf('pos').rank === 2, 'with the skill level the promotion goes through');
stats().apply({ charisma: -100 });

console.log('Applying (formal careers)');
startNewLife('lapo'); stats().apply({ charisma: -100 });
const a1 = applyForJob('tech');
ok(!a1.ok && /Charisma/.test((a1 as any).error), 'applying without the Charisma needed is refused with the reason');
stats().apply({ charisma: 14 - stats().stats.charisma });
ok(applyForJob('tech').ok && !!useCareerStore.getState().offers.tech, 'meeting the requirements gets an offer, not a job');
ok(currentJob() === null && !applyForJob('tech').ok, 'an offer is not employment, and you cannot apply twice');
ok(acceptOffer('tech').ok && currentJob()?.rank.title === 'Intern', 'accepting the offer starts you as Intern');
ok(!applyForJob('open-nonexistent').ok && !applyForJob('pos').ok, 'unknown careers and open work cannot be applied to');
console.log('Switching');
stats().apply({ charisma: 50 });
for (let i = 0; i < 3; i++) work('tech');
ok(requestPromotion('tech').ok && progressOf('tech').rank === 1, 'Intern is promoted to Junior Developer after 3 shifts');
ok(applyForJob('bank').ok, 'applying to a second career works while employed');
ok(acceptOffer('bank').ok && currentJob()?.career.id === 'bank', 'accepting it switches jobs');
ok(progressOf('tech').rank === 1, 'progress in the old career is kept');
ok(quitJob().ok && currentJob() === null, 'quitting leaves you unemployed');
ok(applyForJob('tech').ok && acceptOffer('tech').ok && currentJob()?.rank.title === 'Junior Developer', 'returning to a career resumes at the rank you reached');
fill(); startShift('tech');
ok(!quitJob().ok && !acceptOffer('tech').ok, 'you cannot quit or switch in the middle of a shift');
for (let i = 0; i < 70 && stats().activity; i++) advance(1);

console.log(fails ? `\n${fails} career check(s) FAILED` : '\nAll career checks passed');
process.exit(fails ? 1 : 0);
