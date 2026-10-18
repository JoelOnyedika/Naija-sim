import { sfx } from '@/audio/sfx';
import { formatNaira, uid } from '@/core/format';
import { nowMinutes } from '@/core/gameTime';
import { DAY_MINUTES } from '@/data/economy';
import { HUSTLE_CATEGORIES, PLAYERS, getPlayer } from '@/data/players';
import { useEconomyStore } from '@/stores/economyStore';
import { useHustleStore, type Applicant, type Listing } from '@/stores/hustleStore';
import { useStatsStore } from '@/stores/statsStore';
import { guarded } from './guard';
import { notify } from './notify';

/**
 * Hustle rules (all counterparties are simulated players).
 *
 * MONEY
 *  - When I am the CLIENT: my budget is held in escrow the moment I hire someone (accept an applicant, or a direct hire is
 *    accepted). It leaves my wallet as an internal entry. On completion it is released (internal) and paid out (a real expense).
 *    The hired player arrives a few game minutes later; if I cancel before then, the escrow comes back as a separate "Escrow refunded" entry. Work in
 *    progress cannot be cancelled. Posting a job costs nothing.
 *  - When I am the WORKER (simulated client): no escrow; the client pays the agreed rate when the job completes.
 * TIME: everything runs on the game clock; `runHustle` is called by the scheduler tick and every step is idempotent.
 * RATING: counts only completed jobs I did (see hustleRating). There are no reviews.
 */
export const HUSTLE = {
  decisionMinutes: 40, arrivalMinutes: 15, energyCost: 12, maxApplications: 5, maxPosted: 5,
  /** A simulated client accepts a proposed rate up to this share of the budget over (110% = 11000 bps). */
  acceptCeilingBps: 11_000, minRateBps: 2_500, maxRateBps: 20_000,
  applicantDelays: [30, 90, 180],
  perClientRatingCap: 3, pointsPerJob: 10,
  maxOpenSample: 10, marketPeriod: DAY_MINUTES,
};
export const LOCATIONS = ['Lagos', 'Abuja', 'Port Harcourt', 'Remote'] as const;
export type Result = { ok: true; id?: string } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const st = () => useHustleStore.getState();
const eco = () => useEconomyStore.getState();
const durationFor = (budget: number) => Math.min(60, 20 + Math.floor(budget / 5000));
const patch = (id: string, f: (l: Listing) => Listing) => useHustleStore.setState((s) => ({ listings: s.listings.map((l) => (l.id === id ? f(l) : l)) }));
export const getListing = (id: string) => st().listings.find((l) => l.id === id);
const name = (id: string) => (id === 'me' ? 'You' : `@${getPlayer(id)?.username ?? id}`);

// ── Sample market
interface Template { id: string; client: string; title: string; category: string; description: string; requirements: string; budget: number; location: string }
const T = (id: string, client: string, title: string, category: string, description: string, requirements: string, budget: number, location: string): Template => ({ id, client: `p:${client}`, title, category, description, requirements, budget, location });
export const TEMPLATES: Template[] = [
  T('t1', 'bisi_events', 'DJ for a naming ceremony', 'DJ and music', 'Four hours of music for about 60 guests. Afrobeats and highlife.', 'Own equipment', 40000, 'Lagos'),
  T('t2', 'lekki_larry', 'Decorate a new one-bedroom flat', 'Decorating', 'Style the living room and bedroom with a budget for small items.', 'Photos of past work', 30000, 'Lagos'),
  T('t3', 'ada_cooks', 'Deliver 20 food packs across Yaba', 'Delivery', 'Pick up at 12pm and deliver by 3pm.', 'Own bike or car', 12000, 'Lagos'),
  T('t4', 'tailor_kunle', 'Cook jollof for 30 guests', 'Cooking and catering', 'Jollof rice and chicken for a small birthday.', 'Food handler experience', 35000, 'Abuja'),
  T('t5', 'femi_fixes', 'Design a logo for a food stall', 'Design', 'A simple logo and a flyer, two revisions.', 'Portfolio', 15000, 'Remote'),
  T('t6', 'okada_musa', 'Airport pickup and drop', 'Driving', 'Pick up two guests from the airport and drop them in Ikoyi.', 'Clean car, licence', 18000, 'Lagos'),
  T('t7', 'halima_hair', 'Plan a small engagement party', 'Event planning', 'Venue, seating and a vendor list for 50 people.', 'Referral or past events', 70000, 'Abuja'),
  T('t8', 'engr_chidi', 'Fix a generator', 'Repairs', 'The generator will not start. Diagnose and repair.', 'Own tools', 22000, 'Port Harcourt'),
  T('t9', 'pixel_tola', 'Sew two agbada outfits', 'Tailoring', 'Native wear for a wedding, measurements provided.', 'Samples of past work', 45000, 'Lagos'),
  T('t10', 'amaka_ride', 'Braid and makeup for a bride', 'Hair and beauty', 'Hair and makeup at the venue on the morning of the wedding.', 'Photos of past work', 30000, 'Abuja'),
  T('t11', 'yemi_decor', 'Style a rooftop for a birthday', 'Decorating', 'Lights, plants and seating for 25 guests.', 'Own supplies', 38000, 'Lagos'),
  T('t12', 'dj_kele', 'Run errands across Lagos Island', 'Delivery', 'A day of pickups and drops.', 'Fast and reliable', 9000, 'Lagos'),
];
function fromTemplate(t: Template, now: number, suffix = ''): Listing {
  return { id: `sample:${t.id}${suffix}`, title: t.title, category: t.category, description: t.description, requirements: t.requirements, location: t.location, budget: t.budget, clientId: t.client,
    status: 'open', applicants: [], createdAt: now, deadline: now + 3 * DAY_MINUTES, durationMinutes: durationFor(t.budget), escrow: 0, sample: true };
}
export function seedHustle() {
  if (st().seeded) return;
  const now = nowMinutes();
  useHustleStore.setState({ seeded: true, listings: TEMPLATES.slice(0, 7).map((t) => fromTemplate(t, now)) });
}
/** Once a game day the market gets a new sample job (rotating through the templates). Safe to run twice for a period. */
export function refreshMarket(period: number) {
  if (!st().seeded) return;
  const open = st().listings.filter((l) => l.sample && l.status === 'open').length;
  if (open >= HUSTLE.maxOpenSample) return;
  const t = TEMPLATES[(period + 7) % TEMPLATES.length], id = `sample:${t.id}:d${period}`;
  if (st().listings.some((l) => l.id === id)) return;
  useHustleStore.setState((s) => ({ listings: [fromTemplate(t, nowMinutes(), `:d${period}`), ...s.listings].slice(0, 120) }));
}

// ── Rating
export interface HustleRating { score: number; completed: number; clients: number; level: 'New' | 'Active' | 'Trusted' | 'Top hustler' }
/** 10 points per completed job I did, at most 3 jobs counted per client, capped at 100. No reviews exist, so none are shown. */
export function hustleRating(): HustleRating {
  const done = st().listings.filter((l) => l.status === 'completed' && l.workerId === 'me');
  const per: Record<string, number> = {};
  for (const l of done) per[l.clientId] = (per[l.clientId] ?? 0) + 1;
  const counted = Object.values(per).reduce((s, n) => s + Math.min(n, HUSTLE.perClientRatingCap), 0);
  const score = Math.min(100, counted * HUSTLE.pointsPerJob);
  return { score, completed: done.length, clients: Object.keys(per).length, level: score >= 60 ? 'Top hustler' : score >= 30 ? 'Trusted' : score >= 10 ? 'Active' : 'New' };
}

// ── Worker side: apply to a job
export const myApplication = (l: Listing) => l.applicants.find((a) => a.applicantId === 'me' && (a.status === 'applied' || a.status === 'accepted'));
export function applyToJob(listingId: string, rate: number): Result {
  const l = getListing(listingId);
  if (!l) return no('That job does not exist.');
  if (l.clientId === 'me') return no('You cannot apply to your own job.');
  if (l.status !== 'open') return no('This job is no longer open.');
  if (l.deadline !== undefined && l.deadline < nowMinutes()) return no('This job has expired.');
  if (myApplication(l)) return no('You already applied.');
  if (!Number.isSafeInteger(rate) || rate < 1) return no('Enter the rate you want.');
  if (rate * 10_000 < l.budget * HUSTLE.minRateBps || rate * 10_000 > l.budget * HUSTLE.maxRateBps) return no(`Your rate must be between ${formatNaira(Math.ceil(l.budget * HUSTLE.minRateBps / 10_000))} and ${formatNaira(Math.floor(l.budget * HUSTLE.maxRateBps / 10_000))}.`);
  const active = st().listings.filter((x) => x.status === 'open' && x.applicants.some((a) => a.applicantId === 'me' && a.status === 'applied')).length;
  if (active >= HUSTLE.maxApplications) return no(`You can have ${HUSTLE.maxApplications} applications waiting at once.`);
  return guarded(`apply|${listingId}`, () => {
    const now = nowMinutes();
    patch(listingId, (x) => ({ ...x, applicants: [...x.applicants, { id: uid(), applicantId: 'me', rate, at: now, status: 'applied', decideAt: now + HUSTLE.decisionMinutes }] }));
    return { ok: true } as Result;
  }, no('Already applied.'));
}
export function withdrawApplication(listingId: string): Result {
  const l = getListing(listingId), a = l && l.applicants.find((x) => x.applicantId === 'me' && x.status === 'applied');
  if (!l || !a) return no('You have no waiting application here.');
  patch(listingId, (x) => ({ ...x, applicants: x.applicants.map((y) => (y.id === a.id ? { ...y, status: 'withdrawn' as const } : y)) }));
  return { ok: true };
}
/** Start work I was hired for. The job is simulated: it runs for its duration on the game clock, costs some energy, then pays. */
export function startJob(listingId: string): Result {
  const l = getListing(listingId);
  if (!l || l.workerId !== 'me' || l.status !== 'accepted') return no('There is nothing to start.');
  const { stats, activity } = useStatsStore.getState();
  if (activity) return no('Finish what you are doing first.');
  if (stats.energy < HUSTLE.energyCost) return no('You are too tired for this job.');
  useStatsStore.getState().apply({ energy: -HUSTLE.energyCost, hunger: -4 });
  const now = nowMinutes();
  patch(listingId, (x) => ({ ...x, status: 'in_progress', startedAt: now, finishAt: now + x.durationMinutes }));
  return { ok: true };
}

// ── Client side
const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
export interface PostInput { title: string; category: string; description: string; budget: number; location: string; requirements: string; deadlineDays?: number }
export function validatePost(i: PostInput): string | null {
  const title = clean(i.title), desc = clean(i.description);
  if (title.length < 3 || title.length > 60) return 'The title must be 3 to 60 characters.';
  if (!(HUSTLE_CATEGORIES as readonly string[]).includes(i.category)) return 'Choose a category.';
  if (desc.length < 10 || desc.length > 400) return 'Describe the job in 10 to 400 characters.';
  if (!Number.isSafeInteger(i.budget) || i.budget < 1000 || i.budget > 50_000_000) return 'The budget must be between ₦1,000 and ₦50,000,000.';
  if (!(LOCATIONS as readonly string[]).includes(i.location)) return 'Choose a location.';
  if (clean(i.requirements).length > 120) return 'Keep requirements under 120 characters.';
  return null;
}
export function postJob(i: PostInput): Result {
  const bad = validatePost(i);
  if (bad) return no(bad);
  if (st().listings.filter((l) => l.clientId === 'me' && l.status === 'open').length >= HUSTLE.maxPosted) return no(`You can have ${HUSTLE.maxPosted} open jobs at a time.`);
  return guarded(`post|${clean(i.title).toLowerCase()}|${i.budget}`, () => {
    const now = nowMinutes(), id = uid();
    const l: Listing = { id, title: clean(i.title), category: i.category, description: clean(i.description), requirements: clean(i.requirements), location: i.location, budget: i.budget, clientId: 'me', status: 'open', applicants: [],
      createdAt: now, deadline: i.deadlineDays ? now + i.deadlineDays * DAY_MINUTES : undefined, durationMinutes: durationFor(i.budget), escrow: 0 };
    useHustleStore.setState((s) => ({ listings: [l, ...s.listings] }));
    return { ok: true, id } as Result;
  }, no('That job was already posted.'));
}

/** Hold the agreed amount in escrow. Returns false (and holds nothing) if I cannot afford it. */
function holdEscrow(l: Listing, amount: number): boolean {
  const r = eco().post({ direction: 'expense', amount, label: `Hustle escrow: ${l.title}`, kind: 'business', meta: { internal: true, opKey: `hustle-hold:${l.id}`, description: 'Held until the job is done', ref: { type: 'hustle', id: l.id } } });
  return r.ok;
}
/** A hired simulated worker is accepted now and starts after `arrivalMinutes`. Cancelling is possible until then. */
function hireSimulatedWorker(l: Listing, workerId: string, rate: number, now: number) {
  patch(l.id, (x) => ({ ...x, status: 'accepted', workerId, agreedRate: rate, escrow: rate, acceptedAt: now, startAt: now + HUSTLE.arrivalMinutes }));
}
export function acceptApplicant(listingId: string, applicantId: string): Result {
  const l = getListing(listingId), a = l?.applicants.find((x) => x.id === applicantId);
  if (!l || l.clientId !== 'me') return no('That is not your job.');
  if (l.status !== 'open') return no('This job is no longer open.');
  if (!a || a.status !== 'applied') return no('That applicant is no longer available.');
  if (a.rate > eco().money) return no(`You need ${formatNaira(a.rate)} to fund this job. It is held until the work is done.`);
  return guarded(`hire|${listingId}|${applicantId}`, () => {
    if (!holdEscrow(l, a.rate)) return no('Could not hold the payment.');
    const now = nowMinutes();
    patch(listingId, (x) => ({ ...x, applicants: x.applicants.map((y) => (y.id === a.id ? { ...y, status: 'accepted' as const } : y.status === 'applied' ? { ...y, status: 'declined' as const } : y)) }));
    hireSimulatedWorker(getListing(listingId)!, a.applicantId, a.rate, now);
    return { ok: true } as Result;
  }, no('Already hired.'));
}
export function declineApplicant(listingId: string, applicantId: string): Result {
  const l = getListing(listingId);
  if (!l || l.clientId !== 'me' || l.status !== 'open') return no('That job is not open.');
  patch(listingId, (x) => ({ ...x, applicants: x.applicants.map((y) => (y.id === applicantId && y.status === 'applied' ? { ...y, status: 'declined' as const } : y)) }));
  return { ok: true };
}

/** Ask a simulated player to do a job for me. They answer after a short wait; if they accept, the payment is held in escrow. */
export function hireDirectly(i: { playerId: string; category: string; description: string; amount: number; location: string }): Result {
  const p = getPlayer(i.playerId);
  if (!p) return no('That player does not exist.');
  const svc = p.services.find((s) => s.category === i.category);
  if (!svc) return no(`@${p.username} does not offer ${i.category.toLowerCase()}.`);
  const desc = clean(i.description);
  if (desc.length < 10 || desc.length > 400) return no('Describe the work in 10 to 400 characters.');
  if (!Number.isSafeInteger(i.amount) || i.amount < 1000 || i.amount > 50_000_000) return no('The amount must be between ₦1,000 and ₦50,000,000.');
  if (!(LOCATIONS as readonly string[]).includes(i.location)) return no('Choose a location.');
  if (i.amount > eco().money) return no('You do not have enough money for that offer.');
  if (st().listings.some((l) => l.direct && l.workerId === i.playerId && l.status === 'requested')) return no(`You already have a request waiting for @${p.username}.`);
  return guarded(`direct|${i.playerId}|${i.amount}`, () => {
    const now = nowMinutes(), id = uid();
    useHustleStore.setState((s) => ({ listings: [{ id, title: `${i.category} for @${p.username}`, category: i.category, description: desc, requirements: '', location: i.location, budget: i.amount, clientId: 'me', status: 'requested' as const, applicants: [],
      workerId: i.playerId, agreedRate: i.amount, direct: true, createdAt: now, decideAt: now + HUSTLE.decisionMinutes, durationMinutes: durationFor(i.amount), escrow: 0 }, ...s.listings] }));
    return { ok: true, id } as Result;
  }, no('Already sent.'));
}

/** Cancel a job I posted or a direct request. Before work starts only; escrow, if any, is refunded as its own entry. */
export function cancelListing(listingId: string): Result {
  const l = getListing(listingId);
  if (!l || l.clientId !== 'me') return no('That is not your job.');
  if (l.status === 'in_progress') return no('Work has started, so it cannot be cancelled.');
  if (l.status === 'completed' || l.status === 'cancelled') return no('That job is already finished.');
  const now = nowMinutes();
  if (l.escrow > 0) eco().post({ direction: 'income', amount: l.escrow, label: `Escrow refunded: ${l.title}`, kind: 'refund', meta: { internal: true, opKey: `hustle-refund:${l.id}`, ref: { type: 'hustle', id: l.id } } });
  patch(listingId, (x) => ({ ...x, status: 'cancelled', escrow: 0, cancelledAt: now, cancelReason: 'Cancelled by you', applicants: x.applicants.map((a) => (a.status === 'applied' ? { ...a, status: 'declined' as const } : a)) }));
  return { ok: true };
}
/** I was hired but have not started: hand the job back so it reopens for others. */
export function abandonJob(listingId: string): Result {
  const l = getListing(listingId);
  if (!l || l.workerId !== 'me' || l.status !== 'accepted') return no('You can only leave a job before you start it.');
  patch(listingId, (x) => ({ ...x, status: 'open', workerId: undefined, agreedRate: undefined, acceptedAt: undefined, applicants: x.applicants.map((a) => (a.applicantId === 'me' && a.status === 'accepted' ? { ...a, status: 'withdrawn' as const } : a)) }));
  return { ok: true };
}

// ── The tick
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/** Advances everything that happens over time. Called from the scheduler on every game tick; every step only acts once. */
export function runHustle(now = nowMinutes()) {
  seedHustle(); // saves from before Hustle existed get their first sample jobs here
  const all = [...st().listings];
  for (const l0 of all) {
    const l = getListing(l0.id)!;
    // 1. deadlines
    if (l.status === 'open' && l.deadline !== undefined && l.deadline < now) { patch(l.id, (x) => ({ ...x, status: 'cancelled', cancelledAt: now, cancelReason: 'Expired', applicants: x.applicants.map((a) => (a.status === 'applied' ? { ...a, status: 'declined' as const } : a)) })); continue; }
    // 2. a simulated client answers my application
    if (l.status === 'open' && l.clientId !== 'me') {
      const a = l.applicants.find((x) => x.applicantId === 'me' && x.status === 'applied' && x.decideAt !== undefined && x.decideAt <= now);
      if (a) {
        if (a.rate * 10_000 <= l.budget * HUSTLE.acceptCeilingBps) {
          patch(l.id, (x) => ({ ...x, status: 'accepted', workerId: 'me', agreedRate: a.rate, acceptedAt: now, applicants: x.applicants.map((y) => (y.id === a.id ? { ...y, status: 'accepted' as const } : y.status === 'applied' ? { ...y, status: 'declined' as const } : y)) }));
          notify({ title: 'You got the job!', body: `${name(l.clientId)} accepted you for "${l.title}". Open Hustle to start.`, icon: '✅', appId: 'hustle' });
        } else {
          patch(l.id, (x) => ({ ...x, applicants: x.applicants.map((y) => (y.id === a.id ? { ...y, status: 'declined' as const } : y)) }));
          notify({ title: 'Application declined', body: `${name(l.clientId)} could not meet your rate for "${l.title}".`, icon: '❌', appId: 'hustle' });
        }
        continue;
      }
    }
    // 3. simulated applicants for jobs I posted
    if (l.status === 'open' && l.clientId === 'me') {
      const n = l.applicants.length, delay = HUSTLE.applicantDelays[n];
      if (delay !== undefined && now >= l.createdAt + delay) {
        const pool = PLAYERS.filter((p) => p.services.some((s) => s.category === l.category && l.budget * 2 >= s.from) && !l.applicants.some((a) => a.applicantId === p.id));
        if (pool.length) {
          const p = pool[hash(l.id + n) % pool.length];
          const rate = Math.max(1000, Math.round((l.budget * [100, 95, 110][n % 3]) / 100 / 500) * 500);
          const app: Applicant = { id: uid(), applicantId: p.id, rate, at: now, status: 'applied' };
          patch(l.id, (x) => ({ ...x, applicants: [...x.applicants, app] }));
          notify({ title: 'New applicant', body: `@${p.username} applied for "${l.title}" at ${formatNaira(rate)}.`, icon: p.avatar, appId: 'hustle' });
        }
      }
    }
    // 4. direct hire answers
    if (l.status === 'requested' && l.decideAt !== undefined && l.decideAt <= now) {
      const p = getPlayer(l.workerId!)!, svc = p.services.find((s) => s.category === l.category);
      if (svc && l.budget * 10 >= svc.from * 8 && holdEscrow(l, l.budget)) {
        hireSimulatedWorker(l, p.id, l.budget, now);
        notify({ title: 'Request accepted', body: `@${p.username} accepted. ${formatNaira(l.budget)} is held until the work is done.`, icon: p.avatar, appId: 'hustle' });
      } else {
        const why = !svc || l.budget * 10 < svc.from * 8 ? 'The offer was too low' : 'You could not fund the escrow';
        patch(l.id, (x) => ({ ...x, status: 'cancelled', cancelledAt: now, cancelReason: why }));
        notify({ title: 'Request declined', body: `@${p.username} did not take the job. ${why}.`, icon: '❌', appId: 'hustle' });
      }
      continue;
    }
    // 5. a hired simulated worker arrives and starts
    if (l.status === 'accepted' && l.workerId !== 'me' && l.startAt !== undefined && l.startAt <= now) {
      patch(l.id, (x) => ({ ...x, status: 'in_progress', startedAt: now, finishAt: now + x.durationMinutes }));
      continue;
    }
    // 6. finished work
    if (l.status === 'in_progress' && l.finishAt !== undefined && l.finishAt <= now) {
      patch(l.id, (x) => ({ ...x, status: 'completed', completedAt: now })); // flag first so it can only pay once
      const rate = l.agreedRate ?? l.budget;
      if (l.workerId === 'me') {
        eco().post({ direction: 'income', amount: rate, label: `Hustle: ${l.title}`, kind: 'business', counterparty: name(l.clientId), meta: { opKey: `hustle-pay:${l.id}`, description: `Paid by ${name(l.clientId)}`, ref: { type: 'hustle', id: l.id } } });
        notify({ title: 'Job done, you got paid', body: `${formatNaira(rate)} for "${l.title}".`, icon: '💰', appId: 'hustle' }); sfx.coin();
      } else {
        eco().post({ direction: 'income', amount: l.escrow, label: `Escrow released: ${l.title}`, kind: 'business', meta: { internal: true, opKey: `hustle-release:${l.id}`, ref: { type: 'hustle', id: l.id } } });
        eco().post({ direction: 'expense', amount: rate, label: `Paid ${name(l.workerId!)}: ${l.title}`, kind: 'business', counterparty: name(l.workerId!), meta: { opKey: `hustle-pay:${l.id}`, description: 'Job completed', ref: { type: 'hustle', id: l.id } } });
        patch(l.id, (x) => ({ ...x, escrow: 0 }));
        notify({ title: 'Job completed', body: `${name(l.workerId!)} finished "${l.title}". ${formatNaira(rate)} was paid from escrow.`, icon: '✅', appId: 'hustle' });
      }
    }
  }
}
