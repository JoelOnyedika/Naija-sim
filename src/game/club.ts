import { CLUB, clubOption, type ClubOption } from '@/data/club';
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

export type ClubResult = { ok: true; receipt: Receipt; announcement: Announcement | null } | { ok: false; message: string };

/**
 * Pay for club options. Nothing is recorded, applied or announced unless the money was actually taken: the receipt, the stat effects
 * and the announcement all come after a successful ledger entry, and the receipt keeps that entry's id. Local simulation: a server
 * must charge, record the receipt and decide announcements in multiplayer.
 */
export function buyClub(ids: string[], now = Date.now()): ClubResult {
  const here = useInteriorStore.getState().current;
  if (!here || here.kind !== 'club') return { ok: false, message: 'You can only order inside the club.' };
  if (isJailed(now)) return { ok: false, message: 'You are serving time.' };
  const unique = [...new Set(ids)];
  const opts = unique.map(clubOption);
  if (!unique.length || opts.some((o) => !o)) return { ok: false, message: 'Pick something first.' };
  const lines = (opts as ClubOption[]).map((o) => ({ id: o.id, name: o.name, price: clubPrice(o) }));
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
  for (const o of opts as ClubOption[]) for (const [k, v] of Object.entries(o.effects)) fx[k as keyof Effects] = (fx[k as keyof Effects] ?? 0) + (v as number);
  useStatsStore.getState().apply(fx);

  // announce only real, charged purchases, and not more than once per cooldown
  const shout = (opts as ClubOption[]).some((o) => o.shout);
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
