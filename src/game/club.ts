import { CLUB, MAX_QTY, PRAISE_NAMES, clubOption, type ClubOption } from '@/data/club';
import { copy } from '@/data/copy';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useClubStore, type Announcement, type Receipt } from '@/stores/clubStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useStatsStore } from '@/stores/statsStore';
import type { Effects } from '@/types/game';
import { channelFor } from './chat';
import { isJailed } from './crime';
import { priceOf } from './pricing';

export const clubPrice = (o: ClubOption) => priceOf(o.price);

export type ClubOrder = string | { id: string; qty: number };
/** Strings are one of each (the same id twice is still one, as before); objects carry a quantity for crates, trays and bundles. */
function normalise(order: ClubOrder[]): { o: ClubOption; qty: number }[] | null {
  const map = new Map<string, number>();
  for (const e of order) {
    const id = typeof e === 'string' ? e : e?.id, o = typeof id === 'string' ? clubOption(id) : undefined;
    if (!o) return null;
    const q = typeof e === 'string' ? 1 : Math.floor(Number(e.qty));
    if (!Number.isFinite(q) || q < 1) return null;
    map.set(id, typeof e === 'string' ? 1 : Math.min(MAX_QTY, (map.get(id) ?? 0) + q));
  }
  return [...map].map(([id, qty]) => { const o = clubOption(id)!; return { o, qty: o.multi ? qty : 1 }; });
}

export type ClubResult = { ok: true; receipt: Receipt; announcement: Announcement | null } | { ok: false; message: string };

/**
 * Pay for club options. Nothing is recorded, applied or announced unless the money was actually taken: the receipt, the stat effects
 * and the announcement all come after a successful ledger entry, and the receipt keeps that entry's id. Local simulation: a server
 * must charge, record the receipt and decide announcements in multiplayer.
 */
export function buyClub(order: ClubOrder[], now = Date.now()): ClubResult {
  const here = useInteriorStore.getState().current;
  if (!here || here.kind !== 'club') return { ok: false, message: 'You can only order inside the club.' };
  if (isJailed(now)) return { ok: false, message: 'You are serving time.' };
  const picked = Array.isArray(order) && order.length ? normalise(order) : null;
  if (!picked || !picked.length) return { ok: false, message: 'Pick something first.' };
  const opts = picked.map((p) => p.o);
  const lines = picked.map(({ o, qty }) => ({ id: o.id, name: o.name, price: clubPrice(o) * qty, ...(qty > 1 ? { qty } : {}) }));
  const total = lines.reduce((a, l) => a + l.price, 0);
  if (!Number.isSafeInteger(total) || total <= 0) return { ok: false, message: 'That order cannot be priced.' };

  const club = useClubStore.getState(), n = club.nextId();
  const receiptId = `R-${now.toString(36).toUpperCase()}-${n}`;
  const paid = useEconomyStore.getState().post({ direction: 'expense', amount: total, label: `${here.name}: ${lines.map((l) => l.name).join(', ')}`, kind: 'purchase', meta: { opKey: `club:${receiptId}` } });
  if (!paid.ok) return { ok: false, message: paid.reason === 'duplicate' ? 'That order was already paid.' : copy.broke() };
  const player = useAuthStore.getState().session ?? 'Player';
  const receipt: Receipt = { id: receiptId, txId: paid.tx.id, at: now, club: here.name, player, lines, total, status: 'paid' };
  club.addReceipt(receipt);

  const fx: Effects = {};
  for (const { o, qty } of picked) for (const [k, v] of Object.entries(o.effects)) fx[k as keyof Effects] = (fx[k as keyof Effects] ?? 0) + (v as number) * Math.min(qty, 3); // the third crate and beyond feels the same: it is about being seen
  useStatsStore.getState().apply(fx);

  // the live feed always shows what the player did (no cooldown: it is a stream, not a banner), and big moves make it rain
  picked.forEach(({ o, qty }, i) => {
    const line = lines[i], big = line.price >= CLUB.announceThreshold * 5;
    club.pushFeed({ id: `${receiptId}:${o.id}`, who: player, text: o.say ? o.say(player, qty, line.price) : `${player} ordered ${o.name}`, amount: line.price, at: now, mine: true, big });
    if (o.id === 'hype' || o.id === 'praise') club.pushFeed({ id: `${receiptId}:${o.id}:chant`, who: 'Hype man', text: `🎤 "${player}! ${PRAISE_NAMES[(n + i) % PRAISE_NAMES.length]}! ${PRAISE_NAMES[(n + i + 3) % PRAISE_NAMES.length]}!"`, amount: 0, at: now, mine: false, big: false });
  });
  // every order pops something on screen: money rain for spraying, confetti for anything a moderate spender would notice
  if (picked.some(({ o }) => o.rain)) club.setBurst('rain'); else if (total >= CLUB.megaThreshold || total >= CLUB.announceThreshold) club.setBurst('confetti');

  // announce only real, charged purchases, and not more than once per cooldown
  const shout = opts.some((o) => o.shout);
  let announcement: Announcement | null = null;
  const qualifies = total >= CLUB.announceThreshold || shout;
  if (qualifies && now - useClubStore.getState().lastAnnounceAt >= CLUB.announceCooldownMs) {
    announcement = { id: receiptId, name: player, amount: total, style: total >= CLUB.megaThreshold ? 'mega' : total >= CLUB.announceThreshold ? 'big' : 'hype', at: now };
    useClubStore.getState().announce(announcement);
    const ch = channelFor('local', here);
    if (ch) useChatStore.getState().receive(ch, 'local', { id: 'system', name: here.name, kind: 'system' }, announcementText(announcement, here.name), now);
  }
  return { ok: true, receipt, announcement };
}

export const announcementText = (a: Pick<Announcement, 'name' | 'amount' | 'style'>, club: string): string =>
  a.style === 'hype' ? `${a.name}! ${a.name}! The hype man is on the mic.` : `${a.style === 'mega' ? 'MEGA BALLER' : 'BIG BALLER'}! ${a.name} just spent ₦${a.amount.toLocaleString('en-NG')} at ${club}!`;

/** Everything paid in the club during the current stay: what the bill shows. Newest last, with a running total. */
export function tonightsBill(receipts: Receipt[], club: string, since: number) {
  const rows: { at: number; name: string; qty: number; price: number; running: number }[] = []; let running = 0;
  [...receipts].filter((r) => r.club === club && r.at >= since).sort((a, b) => a.at - b.at).forEach((r) => r.lines.forEach((l) => { running += l.price; rows.push({ at: r.at, name: l.name, qty: l.qty ?? 1, price: l.price, running }); }));
  return { rows, total: running };
}
