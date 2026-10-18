import { formatNaira } from '@/core/format';
import { CASE_CATEGORIES, COURT, POLICE, REFERABLE, REPORT_CATEGORIES, getLawyer } from '@/data/legal';
import { PLAYERS, getPlayer } from '@/data/players';
import { nowMinutes } from '@/core/gameTime';
import { useEconomyStore } from '@/stores/economyStore';
import { useLegalStore, type CourtCase, type CourtEvent } from '@/stores/legalStore';
import { guarded } from './guard';
import { notify } from './notify';

/**
 * Court and police rules (a simulation). A case is a precomputed, deterministic list of timed events (the "case model"):
 * the viewer only reveals the events whose time has come, so reopening it never invents new dialogue. The verdict is decided
 * once, from the case id and the plaintiff's lawyer. There is no money award: a verdict is a record. A police report is
 * a claim, not a finding: it is reviewed, then dismissed or referred, and a referral creates exactly one linked court case.
 */
export type Result = { ok: true; id?: string } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const legal = () => useLegalStore.getState();
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
export const handleToId = (u: string) => { const p = PLAYERS.find((x) => x.username.toLowerCase() === clean(u).toLowerCase().replace(/^@/, '')); return p?.id ?? null; };
const nm = (id: string) => (id === 'me' ? 'You' : id === 'state' ? 'The State' : `@${getPlayer(id)?.username ?? id}`);

/** The structured proceedings for a case. Pure: same inputs, same text. */
export function buildEvents(c: Pick<CourtCase, 'id' | 'category' | 'plaintiff' | 'defendant' | 'description' | 'evidence' | 'lawyerId' | 'filedAt'>): CourtEvent[] {
  const lawyer = c.lawyerId ? getLawyer(c.lawyerId) : undefined, pl = nm(c.plaintiff), df = nm(c.defendant);
  const text: Record<string, string> = {
    Filed: `${pl} filed a ${c.category.toLowerCase()} case against ${df}.`,
    'Hearing scheduled': 'The registry fixed a hearing date. Both sides were notified.',
    'Case introduced': `The judge introduced the matter. ${pl} is represented by ${lawyer ? lawyer.name : 'themselves'}. ${df} appears for themselves.`,
    'Opening statements': `${pl}: "${c.description.slice(0, 140)}${c.description.length > 140 ? '...' : ''}" ${df} denied the claim in full.`,
    Evidence: c.evidence ? `Evidence submitted by ${pl}: "${c.evidence.slice(0, 120)}". The court noted it.` : `${pl} submitted no documents. The court relied on statements.`,
    Response: `${df} answered the claim and asked the court to dismiss it. The judge asked both sides to summarise.`,
    'Judge update': 'The judge retired to consider the matter.',
  };
  const win = verdictFor(c) === 'plaintiff';
  text.Verdict = `Judgment ${win ? `for ${pl}` : `for ${df}`}. The court records its decision. No damages are awarded in this version.`;
  return COURT.schedule.map(([stage, offset]) => ({ at: c.filedAt + offset, stage, text: text[stage] }));
}
export function verdictFor(c: Pick<CourtCase, 'id' | 'lawyerId'>): 'plaintiff' | 'defendant' {
  const strength = c.lawyerId ? getLawyer(c.lawyerId)?.strength ?? 0 : 0;
  return hash(c.id) % 100 < COURT.baseWinPct + strength ? 'plaintiff' : 'defendant';
}
export const stageOf = (c: CourtCase, now = nowMinutes()) => [...c.events].reverse().find((e) => e.at <= now)?.stage ?? 'Filed';
export const visibleEvents = (c: CourtCase, now = nowMinutes()) => c.events.filter((e) => e.at <= now);

function newCaseId() { const n = legal().seq.case + 1; useLegalStore.setState((s) => ({ seq: { ...s.seq, case: n } })); return `CASE-${String(n).padStart(4, '0')}`; }
function addCase(c: Omit<CourtCase, 'events' | 'status'>) {
  const full: CourtCase = { ...c, status: 'live', events: buildEvents(c) };
  useLegalStore.setState((s) => { const all = [full, ...s.cases]; return { cases: [...all.filter((c) => !c.sample).slice(0, 100), ...all.filter((c) => c.sample).slice(0, 12)].sort((a, b) => b.filedAt - a.filedAt) }; });
  return full;
}

// ── Filing
export interface FileInput { defendant: string; category: string; description: string; evidence?: string; lawyerId?: string }
export function validateFiling(i: FileInput): string | null {
  const defId = handleToId(i.defendant);
  if (!clean(i.defendant)) return 'Enter the defendant\'s username.';
  if (!defId) return 'No player has that username.';
  if (!(CASE_CATEGORIES as readonly string[]).includes(i.category)) return 'Choose a category.';
  const d = clean(i.description);
  if (d.length < 20 || d.length > 500) return 'Describe the complaint in 20 to 500 characters.';
  if (clean(i.evidence ?? '').length > 300) return 'Keep evidence notes under 300 characters.';
  if (i.lawyerId) { const l = getLawyer(i.lawyerId); if (!l) return 'Choose a lawyer from the list.'; if (!l.available) return `${l.name} is not available right now.`; if (!l.specialty.includes(i.category)) return `${l.name} does not handle ${i.category.toLowerCase()} cases.`; }
  if (legal().cases.filter((c) => c.plaintiff === 'me' && c.status === 'live').length >= COURT.maxOpenFiled) return `You can have ${COURT.maxOpenFiled} open cases at once.`;
  if (legal().cases.some((c) => c.plaintiff === 'me' && c.status === 'live' && c.defendant === defId && c.category === i.category && c.description === d)) return 'You already filed this case.';
  return null;
}
export const filingCost = (lawyerId?: string) => COURT.filingFee + (lawyerId ? getLawyer(lawyerId)?.fee ?? 0 : 0);

export function fileCase(i: FileInput): Result {
  const bad = validateFiling(i);
  if (bad) return no(bad);
  const cost = filingCost(i.lawyerId);
  if (cost > useEconomyStore.getState().money) return no(`Filing costs ${formatNaira(cost)}. You do not have enough.`);
  return guarded(`case|${i.defendant}|${i.category}|${clean(i.description)}`, () => {
    const id = newCaseId(), defendant = handleToId(i.defendant)!;
    const r = useEconomyStore.getState().post({ direction: 'expense', amount: cost, label: `Court filing: ${id}`, kind: 'purchase', meta: { opKey: `file:${id}`, description: i.lawyerId ? 'Filing fee and lawyer' : 'Filing fee', ref: { type: 'case', id } } });
    if (!r.ok) return no('The fee could not be paid.');
    const filedAt = nowMinutes();
    addCase({ id, title: `You v ${nm(defendant)}`, category: i.category, plaintiff: 'me', defendant, description: clean(i.description), evidence: clean(i.evidence ?? '') || undefined, lawyerId: i.lawyerId, filedAt, fee: cost });
    return { ok: true, id } as Result;
  }, no('That case was already filed.'));
}

// ── Police
export function validateReport(i: { reported: string; category: string; description: string; evidence?: string }): string | null {
  if (!handleToId(i.reported)) return 'No player has that username.';
  if (!(REPORT_CATEGORIES as readonly string[]).includes(i.category)) return 'Choose a category.';
  const d = clean(i.description);
  if (d.length < 20 || d.length > 400) return 'Describe what happened in 20 to 400 characters.';
  if (clean(i.evidence ?? '').length > 300) return 'Keep evidence notes under 300 characters.';
  const mine = legal().reports, now = nowMinutes();
  if (mine.filter((r) => r.status === 'submitted' || r.status === 'review').length >= POLICE.maxOpenReports) return `You can have ${POLICE.maxOpenReports} reports under review at once.`;
  if (mine[0] && now - mine[0].filedAt < POLICE.reportCooldownMinutes) return `Please wait ${POLICE.reportCooldownMinutes} game minutes between reports.`;
  return null;
}
export function submitReport(i: { reported: string; category: string; description: string; evidence?: string }): Result {
  const bad = validateReport(i);
  if (bad) return no(bad);
  return guarded(`report|${i.reported}|${i.category}`, () => {
    const n = legal().seq.report + 1, id = `REP-${String(n).padStart(4, '0')}`, now = nowMinutes();
    useLegalStore.setState((s) => ({ seq: { ...s.seq, report: n }, reports: [{ id, reportedId: handleToId(i.reported)!, category: i.category, description: clean(i.description), evidence: clean(i.evidence ?? '') || undefined, filedAt: now, status: 'submitted' as const, updatedAt: now }, ...s.reports].slice(0, 100) }));
    return { ok: true, id } as Result;
  }, no('That report was already submitted.'));
}

// ── Time
const SAMPLE_PAIRS: [string, string, string, string][] = [
  ['p:lekki_larry', 'p:yemi_decor', 'Contract dispute', 'Plaintiff says a decoration job was paid for but never finished.'],
  ['p:tailor_kunle', 'p:pixel_tola', 'Unpaid debt', 'Plaintiff says two outfits were collected and not paid for.'],
  ['p:halima_hair', 'p:amaka_ride', 'Property dispute', 'A dispute over who damaged borrowed equipment.'],
  ['p:okada_musa', 'p:femi_fixes', 'Defamation', 'Plaintiff says false claims were posted about their delivery service.'],
];
/** Keeps COURT.maxLiveSamples sample cases running between simulated players, so Live Cases always has something to watch. */
export function topUpSamples(now = nowMinutes()) {
  const live = legal().cases.filter((c) => c.sample && c.status === 'live').length;
  for (let k = live; k < COURT.maxLiveSamples; k++) {
    const n = (legal().seq.sample ?? 0) + 1;
    useLegalStore.setState((s) => ({ seq: { ...s.seq, sample: n } }));
    const [a, b, cat, desc] = SAMPLE_PAIRS[n % SAMPLE_PAIRS.length];
    // staggered start so the live cases are at different stages when they appear
    addCase({ id: `SAMPLE-${n}`, title: `${nm(a)} v ${nm(b)}`, category: cat, plaintiff: a, defendant: b, description: desc, filedAt: now - ((k * 27) % 60), fee: 0, sample: true });
  }
}
export function seedCourt() {
  if (legal().seeded) return;
  useLegalStore.setState({ seeded: true });
  topUpSamples();
}

/** Advances cases and reports. Idempotent: each transition happens once. */
export function runLegal(now = nowMinutes()) {
  seedCourt();
  for (const c of legal().cases.filter((x) => x.status === 'live')) {
    const verdictAt = c.events[c.events.length - 1].at;
    if (now >= verdictAt) {
      const verdict = verdictFor(c);
      useLegalStore.setState((s) => ({ cases: s.cases.map((x) => (x.id === c.id ? { ...x, status: 'closed' as const, verdict } : x)), reports: s.reports.map((r) => (r.caseId === c.id ? { ...r, status: 'resolved' as const, updatedAt: now } : r)) }));
      if (c.plaintiff === 'me' || c.defendant === 'me' || c.plaintiff === 'state') notify({ title: `Verdict: ${c.id}`, body: `${c.title}: judgment for the ${verdict === 'plaintiff' ? 'plaintiff' : 'defendant'}.`, icon: '⚖️', appId: 'court' });
    }
  }
  for (const r of legal().reports) {
    if (r.status === 'submitted' && now - r.filedAt >= POLICE.reviewAfter) {
      useLegalStore.setState((s) => ({ reports: s.reports.map((x) => (x.id === r.id ? { ...x, status: 'review' as const, updatedAt: now } : x)) }));
      notify({ title: 'Report under review', body: `${r.id} is being reviewed by the station.`, icon: '🚓', appId: 'police' });
    } else if (r.status === 'review' && now - r.filedAt >= POLICE.decideAfter) {
      const refer = REFERABLE.includes(r.category) && hash(r.id) % 100 < POLICE.referPct;
      if (refer) {
        const id = newCaseId();
        const c = addCase({ id, title: `The State v ${nm(r.reportedId)}`, category: r.category === 'Fraud' ? 'Fraud' : 'Property dispute', plaintiff: 'state', defendant: r.reportedId, description: r.description, evidence: r.evidence, filedAt: now, fee: 0, reportId: r.id });
        useLegalStore.setState((s) => ({ reports: s.reports.map((x) => (x.id === r.id ? { ...x, status: 'referred' as const, updatedAt: now, caseId: c.id } : x)) }));
        notify({ title: 'Report referred to court', body: `${r.id} became ${c.id}. A report is not a finding of guilt.`, icon: '⚖️', appId: 'police' });
      } else {
        useLegalStore.setState((s) => ({ reports: s.reports.map((x) => (x.id === r.id ? { ...x, status: 'dismissed' as const, updatedAt: now } : x)) }));
        notify({ title: 'Report dismissed', body: `${r.id}: the station found no grounds to refer it.`, icon: '🚓', appId: 'police' });
      }
    }
  }
  topUpSamples(now); // after closures, so Live Cases is never empty
}
