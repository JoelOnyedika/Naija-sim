import { formatNaira } from '@/core/format';
import { CONTACTS, contactLabel, type ContactDef } from '@/data/contacts';
import { useEconomyStore } from '@/stores/economyStore';
import { phoneEpoch, usePhoneStore } from '@/stores/phoneStore';

/** The most one transfer may move. A game rule, not a banking limit. */
export const MAX_TRANSFER = 50_000_000_000;
/** Quick amounts. Tapping one fills the amount box; it never sends anything. */
export const TRANSFER_PRESETS = [10_000, 15_000, 20_000, 50_000, 100_000];
export const MAX_DESCRIPTION = 60;

export interface TransferRequest { toId: string; amount: number; description?: string }
export type TransferResult = { ok: true; txId: string; recipient: ContactDef } | { ok: false; error: string };

/** Who the player can send money to: people, not businesses. */
export const transferableContacts = () => CONTACTS.filter((c) => c.canReceiveMoney ?? (c.group === 'family' || c.group === 'friend'));

/** Returns why a transfer is not allowed, or null when it is. Pure: touches no state. */
export function validateTransfer(req: TransferRequest, balance = useEconomyStore.getState().money): string | null {
  const contact = transferableContacts().find((c) => c.id === req.toId);
  if (!contact) return 'Choose who to send money to.';
  const a = req.amount;
  if (!Number.isFinite(a) || !Number.isSafeInteger(a) || a <= 0) return 'Enter an amount.';
  if (a > MAX_TRANSFER) return `The most you can send at once is ${formatNaira(MAX_TRANSFER)}.`;
  if (a > balance) return 'That is more than your balance.';
  if ((req.description ?? '').trim().length > MAX_DESCRIPTION) return `Keep the description under ${MAX_DESCRIPTION} characters.`;
  return null;
}

// Guards against a double tap or a repeated callback: one submission at a time, and the same request twice in a short window is ignored.
let busy = false;
let last: { key: string; at: number } | null = null;
const DUPLICATE_WINDOW_MS = 2500;

const REPLIES: Record<string, string[]> = {
  family: ['Received. God bless you, my child!', 'Thank you o! Have you eaten?', 'I got the alert. You are a good child.'],
  friend: ['Alert don enter! You too much.', 'Received, boss. I owe you one.', 'Thanks, guy. Sharp sharp.'],
};

/**
 * Send money to a contact. Validates first, then moves the money exactly once through the shared economy store, records
 * the transaction, and posts a chat card that points at that very record. Invalid or repeated requests change nothing.
 * Recipients here are scripted characters without balances, so there is no matching credit; if player accounts ever
 * exist, the credit belongs right after the debit below.
 */
export function sendTransfer(req: TransferRequest): TransferResult {
  const description = (req.description ?? '').trim();
  const err = validateTransfer(req);
  if (err) return { ok: false, error: err };
  const key = `${req.toId}|${req.amount}|${description}`;
  const now = Date.now();
  if (busy || (last && last.key === key && now - last.at < DUPLICATE_WINDOW_MS)) return { ok: false, error: 'That transfer was already sent.' };
  busy = true;
  try {
    const contact = transferableContacts().find((c) => c.id === req.toId)!;
    const label = `Transfer to ${contact.name}`;
    const eco = useEconomyStore.getState();
    if (!eco.debit(req.amount, label, 'transfer', contact.name, { status: 'completed', description: description || undefined, sender: 'You', recipient: contact.name })) {
      return { ok: false, error: 'That is more than your balance.' };
    }
    last = { key, at: now };
    const txId = useEconomyStore.getState().transactions[0].id;
    const phone = usePhoneStore.getState();
    phone.say(contact.id, 'me', `Sent ${formatNaira(req.amount)}${description ? `: ${description}` : ''}`, { kind: 'transaction', txId });
    const epoch = phoneEpoch();
    const pool = REPLIES[contact.group] ?? REPLIES.friend;
    setTimeout(() => {
      if (epoch !== phoneEpoch()) return; // the life was reset while we waited
      usePhoneStore.getState().say(contact.id, 'them', pool[Math.floor(Math.random() * pool.length)]);
    }, 1400);
    return { ok: true, txId, recipient: contact };
  } finally {
    busy = false;
  }
}

export { contactLabel };
