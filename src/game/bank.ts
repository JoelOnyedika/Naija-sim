import { formatNaira } from '@/core/format';
import { PLAYERS, type PlayerDef } from '@/data/players';
import { useAuthStore } from '@/stores/authStore';
import { useEconomyStore } from '@/stores/economyStore';
import { phoneEpoch, usePhoneStore } from '@/stores/phoneStore';
import { recordTransferSignal } from './banking';

/** The most one transfer may move. A game rule, not a banking limit. */
export const MAX_TRANSFER = 50_000_000_000;

/** A transfer is just a receiver's username and an amount. There is no contact list and no pre-filled names. */
export interface TransferRequest { to: string; amount: number }
export type TransferResult = { ok: true; txId: string; recipient: PlayerDef } | { ok: false; error: string };

export const cleanUsername = (s: string) => s.trim().replace(/^@+/, '').toLowerCase();
/**
 * Finds the player a username belongs to. Every player is a SIMULATED character (data/players.ts) until real accounts exist;
 * when they do, this is the one place that becomes a server lookup.
 */
export const findRecipient = (to: string): PlayerDef | null => PLAYERS.find((p) => p.username.toLowerCase() === cleanUsername(to)) ?? null;

/** Returns why a transfer is not allowed, or null when it is. Pure: touches no state. */
export function validateTransfer(req: TransferRequest, balance = useEconomyStore.getState().money): string | null {
  const name = cleanUsername(req.to);
  if (!name) return 'Enter the receiver\'s username.';
  if (name === (useAuthStore.getState().session ?? '').toLowerCase()) return 'You cannot send money to yourself.';
  if (!findRecipient(req.to)) return `No player has the username @${name}.`;
  const a = req.amount;
  if (!Number.isFinite(a) || !Number.isSafeInteger(a) || a <= 0) return 'Enter an amount.';
  if (a > MAX_TRANSFER) return `The most you can send at once is ${formatNaira(MAX_TRANSFER)}.`;
  if (a > balance) return 'That is more than your balance.';
  return null;
}

// Guards against a double tap or a repeated callback: one submission at a time, and the same request twice in a short window is ignored.
let busy = false;
let last: { key: string; at: number } | null = null;
const DUPLICATE_WINDOW_MS = 2500;
const THANKS = ['Received, thank you!', 'Alert don enter. Thanks o!', 'Got it. God bless you.'];

/**
 * Send money to a player by username. Validates first, then moves the money exactly once through the shared ledger, records
 * the transaction, and posts a chat card that points at that very record. Invalid or repeated requests change nothing.
 * Recipients are scripted players without balances, so there is no matching credit; with real accounts the credit belongs
 * right after the debit below.
 */
export function sendTransfer(req: TransferRequest): TransferResult {
  const err = validateTransfer(req);
  if (err) return { ok: false, error: err };
  const player = findRecipient(req.to)!;
  const key = `${player.id}|${req.amount}`;
  const now = Date.now();
  if (busy || (last && last.key === key && now - last.at < DUPLICATE_WINDOW_MS)) return { ok: false, error: 'That transfer was already sent.' };
  busy = true;
  try {
    const handle = `@${player.username}`;
    if (!useEconomyStore.getState().debit(req.amount, `Transfer to ${handle}`, 'transfer', handle, { status: 'completed', sender: 'You', recipient: handle })) {
      return { ok: false, error: 'That is more than your balance.' };
    }
    last = { key, at: now };
    recordTransferSignal(player.id, req.amount);
    const txId = useEconomyStore.getState().transactions[0].id;
    usePhoneStore.getState().say(player.id, 'me', `Sent ${formatNaira(req.amount)}`, { kind: 'transaction', txId });
    const epoch = phoneEpoch();
    setTimeout(() => {
      if (epoch !== phoneEpoch()) return; // the life was reset while we waited
      usePhoneStore.getState().say(player.id, 'them', THANKS[Math.floor(Math.random() * THANKS.length)]);
    }, 1400);
    return { ok: true, txId, recipient: player };
  } finally {
    busy = false;
  }
}
