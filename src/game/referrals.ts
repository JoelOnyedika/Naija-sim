import { REFERRAL } from '@/data/balance';
import type { Transaction } from '@/stores/economyStore';

/**
 * Invitation rules (pure). The code is derived from the username and is NOT secret or unique-guaranteed: a server must own code
 * issuing and uniqueness. Everything that decides a reward lives on the server in a real deployment; this file defines the rules
 * and the shapes the server would use, and the store (stores/referralStore.ts) records what this device can know.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I

function fnv(s: string): number { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

/** NL-XXXXXX, stable for a username. */
export function makeCode(username: string): string {
  const base = username.trim().toLowerCase() || 'player';
  let a = fnv('nl|' + base), b = fnv(base + '|referral'), out = '';
  for (let i = 0; i < 6; i++) { const v = i < 3 ? a : b; out += ALPHABET[(v >>> (i % 3) * 5) & 31]; }
  return `NL-${out}`;
}
const CODE_RE = /^NL-[2-9A-HJ-NP-Z]{6}$/;
/** Accepts "nl-abc234", " NL ABC234 " and the like. Returns the normal form or null. */
export function parseCode(raw: string): string | null {
  const t = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!t.startsWith('NL') || t.length !== 8) return null;
  const c = `NL-${t.slice(2)}`; return CODE_RE.test(c) ? c : null;
}
export const shareLink = (code: string, base = ''): string => `${base}?ref=${code}`;

/** A transaction's effect on "spend towards the qualifying amount": positive for counted spending, negative for refunds, 0 otherwise. */
export function spendDelta(tx: Pick<Transaction, 'kind' | 'amount' | 'direction' | 'internal' | 'status'>): number {
  if (tx.internal || (tx.status && tx.status !== 'completed') || !Number.isFinite(tx.amount)) return 0;
  if (tx.direction === 'expense' && REFERRAL.spendKinds.includes(tx.kind)) return Math.abs(tx.amount);
  if (tx.direction === 'income' && REFERRAL.refundKinds.includes(tx.kind)) return -Math.abs(tx.amount);
  return 0;
}

export type RedeemError = 'malformed' | 'own' | 'already';
export function checkRedeem(raw: string, myCode: string, alreadyRedeemed: boolean): { ok: true; code: string } | { ok: false; error: RedeemError; message: string } {
  const code = parseCode(raw);
  if (!code) return { ok: false, error: 'malformed', message: 'That does not look like an invite code. It looks like NL-AB23CD.' };
  if (code === myCode) return { ok: false, error: 'own', message: 'You cannot use your own code.' };
  if (alreadyRedeemed) return { ok: false, error: 'already', message: 'You have already used an invite code.' };
  return { ok: true, code };
}

/** What a server tells this device when it confirms a friend qualified. */
export interface ServerReward { claimId: string; referrerCode: string; referredCode: string; amount: number }
export function checkServerReward(r: ServerReward, myCode: string, alreadyPaid: readonly string[]): string | null {
  if (!r || typeof r.claimId !== 'string' || !r.claimId) return 'bad claim id';
  if (parseCode(r.referrerCode) !== r.referrerCode || parseCode(r.referredCode) !== r.referredCode) return 'bad code';
  if (r.referrerCode !== myCode) return 'not for this player';
  if (r.referrerCode === r.referredCode) return 'self referral';
  if (!Number.isSafeInteger(r.amount) || r.amount <= 0 || r.amount > REFERRAL.reward) return 'bad amount';
  if (alreadyPaid.includes(r.claimId)) return 'duplicate';
  return null;
}
