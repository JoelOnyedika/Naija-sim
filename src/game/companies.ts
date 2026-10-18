import { CITY_CATALOG } from '@/content/cities';
import { formatNaira, uid } from '@/core/format';
import { nowMinutes } from '@/core/gameTime';
import { COMPANY, LOGOS, getCategory, getChannel, scaled } from '@/data/companies';
import { DAY_MINUTES } from '@/data/economy';
import { useCompanyStore, type Company, type CompanyEvent } from '@/stores/companyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { guarded } from './guard';
import { notify } from './notify';

/**
 * Company rules. Every owner-paid action goes: validate everything -> post to the shared ledger -> change the company, and
 * nothing is charged when validation fails. A company earns revenue only while it has a manager ("operating"). A daily
 * settlement (once per game day) turns revenue and staff costs into company funds. Funds reach the wallet only by payout
 * (once per game day). All figures come from data/companies.ts.
 */
export type Result = { ok: true; id?: string } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const store = () => useCompanyStore.getState();
export const getCompany = (id: string) => store().companies.find((c) => c.id === id);
const patch = (id: string, f: (c: Company) => Company) => useCompanyStore.setState((s) => ({ companies: s.companies.map((c) => (c.id === id ? f(c) : c)) }));
const ev = (kind: CompanyEvent['kind'], text: string, amount?: number): CompanyEvent => ({ id: uid(), at: nowMinutes(), kind, text, amount });
const addEvent = (id: string, e: CompanyEvent) => patch(id, (c) => ({ ...c, activity: [e, ...c.activity].slice(0, 80) }));
const dayOf = (m = nowMinutes()) => Math.floor(m / DAY_MINUTES);

// ── Derived numbers
export const isOperating = (c: Company) => !!c.manager;
export const capacityOf = (c: Company) => COMPANY.capacity[c.level - 1];
export const branchCapOf = (c: Company) => COMPANY.branchCap[c.level - 1];
export const activeCampaigns = (c: Company, now = nowMinutes()) => c.campaigns.filter((k) => k.startedAt <= now && k.endsAt > now);
export const marketingBonusBps = (c: Company, now = nowMinutes()) => Math.min(3_500, activeCampaigns(c, now).reduce((s, k) => s + (getChannel(k.channelId)?.bonusBps ?? 0), 0));

export interface DailyFigures { revenue: number; payroll: number; opex: number; net: number }
/** What one game day looks like for this company right now. Revenue is 0 until a manager is hired. */
export function dailyFigures(c: Company, now = nowMinutes()): DailyFigures {
  const b = COMPANY.base, k = c.categoryId, staff = c.employees.length;
  const raw = scaled(b.revenue, k) + staff * scaled(b.perStaff, k) + c.branches.length * scaled(b.branchRevenue, k);
  const mult = (COMPANY.levelRevenueBps[c.level - 1] / 10_000) * (1 + (c.efficiency * COMPANY.efficiency.bonusBps) / 10_000) * (1 + marketingBonusBps(c, now) / 10_000);
  const revenue = isOperating(c) ? Math.floor(raw * mult) : 0;
  const payroll = isOperating(c) ? scaled(b.managerWage, k) + staff * scaled(b.staffWage, k) : 0;
  const opex = isOperating(c) ? c.branches.length * scaled(b.branchOpex, k) : 0;
  return { revenue, payroll, opex, net: revenue - payroll - opex };
}
export const nextPayoutInMinutes = (c: Company, now = nowMinutes()) => (c.lastPayoutDay >= dayOf(now) ? (dayOf(now) + 1) * DAY_MINUTES - now : 0);
export const costs = {
  manager: (c: Company) => scaled(COMPANY.base.managerHire, c.categoryId),
  staff: (c: Company) => scaled(COMPANY.base.staffHire, c.categoryId),
  branch: (c: Company) => scaled(COMPANY.base.branchOpen, c.categoryId),
  level: (c: Company) => (c.level >= 3 ? 0 : Math.round(((getCategory(c.categoryId)?.startup ?? 0) * COMPANY.levelCostBps[c.level]) / 10_000 / 1000) * 1000),
  efficiency: (c: Company) => (c.efficiency >= COMPANY.efficiency.max ? 0 : Math.round(((getCategory(c.categoryId)?.startup ?? 0) * COMPANY.efficiency.costBps[c.efficiency]) / 10_000 / 1000) * 1000),
  marketing: (c: Company, channelId: string) => scaled(getChannel(channelId)?.baseCost ?? 0, c.categoryId),
};

/** Pays an owner cost from the wallet. Nothing changes if it cannot be paid. */
function charge(c: Company, amount: number, label: string): string | null {
  if (amount > useEconomyStore.getState().money) return `You need ${formatNaira(amount)} for that.`;
  const r = useEconomyStore.getState().post({ direction: 'expense', amount, label: `${c.name}: ${label}`, kind: 'business', meta: { ref: { type: 'company', id: c.id }, description: label } });
  return r.ok ? null : 'The payment could not be made.';
}

// ── Create
const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
export interface CreateInput { name: string; logo: string; categoryId: string; description: string; hqCity: string }
export function validateCreate(i: CreateInput): string | null {
  const name = clean(i.name), cat = getCategory(i.categoryId);
  if (name.length < 3 || name.length > 30) return 'The company name must be 3 to 30 characters.';
  if (store().companies.some((c) => c.name.toLowerCase() === name.toLowerCase())) return 'You already have a company with that name.';
  if (!LOGOS.includes(i.logo)) return 'Choose a logo.';
  if (!cat) return 'Choose a business type.';
  if (clean(i.description).length > 120) return 'Keep the description under 120 characters.';
  if (!CITY_CATALOG.some((c) => c.id === i.hqCity)) return 'Choose a headquarters city.';
  if (store().companies.length >= COMPANY.slots) return `You can own ${COMPANY.slots} companies.`;
  return null;
}
export function createCompany(i: CreateInput): Result {
  const bad = validateCreate(i);
  if (bad) return no(bad);
  const cat = getCategory(i.categoryId)!;
  if (cat.startup > useEconomyStore.getState().money) return no(`You need ${formatNaira(cat.startup)} to start this company.`);
  return guarded(`company|${clean(i.name).toLowerCase()}`, () => {
    const id = uid(), now = nowMinutes();
    const c: Company = { id, name: clean(i.name), logo: i.logo, categoryId: i.categoryId, description: clean(i.description), hqCity: i.hqCity, level: 1, efficiency: 0, manager: null, employees: [], branches: [], campaigns: [], funds: 0, createdAt: now,
      lifetime: { revenue: 0, payroll: 0, opex: 0, marketing: 0, investment: cat.startup, payouts: 0 }, lastDayResult: null, lastDay: dayOf(now), lastPayoutDay: -1, activity: [] };
    const e = charge(c, cat.startup, 'Startup cost');
    if (e) return no(e);
    c.activity = [ev('created', `${c.name} was founded`, -cat.startup)];
    useCompanyStore.setState((s) => ({ companies: [...s.companies, c] }));
    return { ok: true, id } as Result;
  }, no('That company was already created.'));
}

// ── Manager, staff
export function hireManager(id: string): Result {
  const c = getCompany(id);
  if (!c) return no('Company not found.');
  if (c.manager) return no('This company already has a manager.');
  return guarded(`mgr|${id}`, () => {
    const e = charge(c, costs.manager(c), 'Manager hiring fee');
    if (e) return no(e);
    patch(id, (x) => ({ ...x, manager: { hiredAt: nowMinutes() }, lastDay: dayOf(), lifetime: { ...x.lifetime, investment: x.lifetime.investment + costs.manager(c) } }));
    addEvent(id, ev('hire', 'Manager hired. The company is now operating', -costs.manager(c)));
    notify({ title: 'Company operating', body: `${c.name} has a manager and starts earning.`, icon: c.logo, appId: 'companies' });
    return { ok: true } as Result;
  }, no('Already hiring.'));
}
export function hireEmployee(id: string, role: string, branchId = 'hq'): Result {
  const c = getCompany(id), cat = c && getCategory(c.categoryId);
  if (!c || !cat) return no('Company not found.');
  if (!cat.roles.includes(role)) return no('Choose a role.');
  if (c.employees.length >= capacityOf(c)) return no(`This company is full (${capacityOf(c)} staff at level ${c.level}). Upgrade to hire more.`);
  if (branchId !== 'hq' && !c.branches.some((b) => b.id === branchId)) return no('That branch does not exist.');
  return guarded(`emp|${id}|${role}|${branchId}`, () => {
    const fee = costs.staff(c), e = charge(c, fee, `Hired ${role}`);
    if (e) return no(e);
    patch(id, (x) => ({ ...x, employees: [...x.employees, { id: uid(), role, branchId, hiredAt: nowMinutes() }], lifetime: { ...x.lifetime, investment: x.lifetime.investment + fee } }));
    addEvent(id, ev('hire', `Hired a ${role.toLowerCase()}`, -fee));
    return { ok: true } as Result;
  }, no('Already hiring.'));
}
export function fireEmployee(id: string, employeeId: string): Result {
  const c = getCompany(id), e = c?.employees.find((x) => x.id === employeeId);
  if (!c || !e) return no('That employee does not work here.');
  patch(id, (x) => ({ ...x, employees: x.employees.filter((y) => y.id !== employeeId) }));
  addEvent(id, ev('fire', `Let go of a ${e.role.toLowerCase()}`));
  return { ok: true };
}

// ── Branches and upgrades
export function openBranch(id: string, cityId: string): Result {
  const c = getCompany(id);
  if (!c) return no('Company not found.');
  if (!CITY_CATALOG.some((x) => x.id === cityId)) return no('Choose a city.');
  if (c.branches.length >= branchCapOf(c)) return no(branchCapOf(c) === 0 ? 'Upgrade to level 2 to open branches.' : `This company can have ${branchCapOf(c)} branch${branchCapOf(c) > 1 ? 'es' : ''} at level ${c.level}.`);
  if (!c.manager) return no('Hire a manager before opening branches.');
  return guarded(`branch|${id}|${cityId}`, () => {
    const fee = costs.branch(c), e = charge(c, fee, 'Opened a branch');
    if (e) return no(e);
    const city = CITY_CATALOG.find((x) => x.id === cityId)!.name;
    patch(id, (x) => ({ ...x, branches: [...x.branches, { id: uid(), cityId, label: `${city} branch ${x.branches.length + 1}`, openedAt: nowMinutes() }], lifetime: { ...x.lifetime, investment: x.lifetime.investment + fee } }));
    addEvent(id, ev('branch', `Opened a branch in ${city}`, -fee));
    return { ok: true } as Result;
  }, no('Already submitted.'));
}
export function levelUpBlocker(c: Company): string | null {
  if (c.level >= 3) return 'Already at the top level.';
  const need = COMPANY.prereq[c.level];
  if (!c.manager) return 'Hire a manager first.';
  if (c.employees.length < need.staff) return `Needs ${need.staff} staff (you have ${c.employees.length}).`;
  if (c.branches.length < need.branches) return `Needs ${need.branches} branch${need.branches > 1 ? 'es' : ''}.`;
  return null;
}
export function upgradeLevel(id: string): Result {
  const c = getCompany(id);
  if (!c) return no('Company not found.');
  const blocked = levelUpBlocker(c);
  if (blocked) return no(blocked);
  return guarded(`lvl|${id}`, () => {
    const fee = costs.level(c), e = charge(c, fee, `Upgrade to level ${c.level + 1}`);
    if (e) return no(e);
    patch(id, (x) => ({ ...x, level: x.level + 1, lifetime: { ...x.lifetime, investment: x.lifetime.investment + fee } }));
    addEvent(id, ev('upgrade', `Upgraded to level ${c.level + 1}`, -fee));
    return { ok: true } as Result;
  }, no('Already submitted.'));
}
export function upgradeEfficiency(id: string): Result {
  const c = getCompany(id);
  if (!c) return no('Company not found.');
  if (c.efficiency >= COMPANY.efficiency.max) return no('Efficiency is already maxed.');
  return guarded(`eff|${id}`, () => {
    const fee = costs.efficiency(c), e = charge(c, fee, 'Efficiency upgrade');
    if (e) return no(e);
    patch(id, (x) => ({ ...x, efficiency: x.efficiency + 1, lifetime: { ...x.lifetime, investment: x.lifetime.investment + fee } }));
    addEvent(id, ev('upgrade', `Efficiency upgraded to ${c.efficiency + 1}`, -fee));
    return { ok: true } as Result;
  }, no('Already submitted.'));
}

// ── Marketing
export function runCampaign(id: string, channelId: string): Result {
  const c = getCompany(id), ch = getChannel(channelId);
  if (!c || !ch) return no('Choose a campaign.');
  const now = nowMinutes();
  if (activeCampaigns(c, now).some((k) => k.channelId === channelId)) return no(`${ch.name} is already running.`);
  return guarded(`mkt|${id}|${channelId}`, () => {
    const fee = costs.marketing(c, channelId), e = charge(c, fee, ch.name);
    if (e) return no(e);
    patch(id, (x) => ({ ...x, campaigns: [...x.campaigns, { id: uid(), channelId, startedAt: now, endsAt: now + ch.days * DAY_MINUTES }].slice(-30), lifetime: { ...x.lifetime, marketing: x.lifetime.marketing + fee } }));
    addEvent(id, ev('marketing', `${ch.name} started for ${ch.days} game day${ch.days > 1 ? 's' : ''}`, -fee));
    return { ok: true } as Result;
  }, no('Already submitted.'));
}

// ── Daily settlement and payout
/** Settles game day `day` for every company (once each). Revenue and staff costs go through company funds, never the wallet. */
export function settleCompanies(day: number) {
  for (const c0 of [...store().companies]) {
    const c = getCompany(c0.id)!;
    if (c.lastDay >= day) continue;
    patch(c.id, (x) => ({ ...x, lastDay: day })); // mark first, so a day is settled once
    if (!isOperating(c)) continue;
    const f = dailyFigures(c, (day + 1) * DAY_MINUTES - 1);
    const available = c.funds + f.revenue, costsDue = f.payroll + f.opex, funds = Math.max(0, available - costsDue);
    patch(c.id, (x) => ({ ...x, funds, lastDayResult: { day, revenue: f.revenue, payroll: f.payroll, opex: f.opex },
      lifetime: { ...x.lifetime, revenue: x.lifetime.revenue + f.revenue, payroll: x.lifetime.payroll + f.payroll, opex: x.lifetime.opex + f.opex } }));
    addEvent(c.id, ev(available < costsDue ? 'shortfall' : 'revenue', available < costsDue ? `Not enough funds to cover costs (${formatNaira(costsDue)})` : `Day closed: ${formatNaira(f.revenue)} in, ${formatNaira(costsDue)} out`, f.net));
  }
}

export function cashOut(id: string): Result {
  const c = getCompany(id);
  if (!c) return no('Company not found.');
  if (c.funds <= 0) return no('There is nothing to pay out yet.');
  const day = dayOf();
  if (c.lastPayoutDay >= day) return no('You already took a payout today. The next one is available tomorrow.');
  return guarded(`payout|${id}`, () => {
    const amount = c.funds;
    // record the payout BEFORE crediting so it can only happen once for the day
    patch(id, (x) => ({ ...x, funds: 0, lastPayoutDay: day, lifetime: { ...x.lifetime, payouts: x.lifetime.payouts + amount } }));
    const r = useEconomyStore.getState().post({ direction: 'income', amount, label: `Payout from ${c.name}`, kind: 'business', counterparty: c.name, meta: { opKey: `payout:${id}:${day}`, description: 'Company funds paid to you', ref: { type: 'company', id } } });
    if (!r.ok) { patch(id, (x) => ({ ...x, funds: amount, lastPayoutDay: day - 1, lifetime: { ...x.lifetime, payouts: x.lifetime.payouts - amount } })); return no('The payout could not be made.'); }
    addEvent(id, ev('payout', `Paid ${formatNaira(amount)} to you`, amount));
    return { ok: true } as Result;
  }, no('Already submitted.'));
}
export const totalCompanyFunds = () => store().companies.reduce((s, c) => s + c.funds, 0);
