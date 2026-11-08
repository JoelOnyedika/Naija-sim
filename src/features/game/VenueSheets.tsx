import { useTestDriveStore } from '@/stores/testDriveStore';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CLUB, CLUB_GROUPS, CLUB_OPTIONS, MAX_QTY, type ClubGroup } from '@/data/club';
import { CarImage } from './CarCards';
import { getVehicle } from '@/data/vehicles';
import { buyClub, clubPrice, announcementText, tonightsBill } from '@/game/club';
import { renderBillPng, renderReceiptPng } from '@/game/receiptImage';
import { buyVehicle, salePrice, sellVehicle, vehiclePrice } from '@/game/vehicles';
import { useClubStore } from '@/stores/clubStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { toast, useUiStore } from '@/stores/uiStore';

export function Sheet({ open, label, onClose, children, z = 90, solid = false }: { open: boolean; label: string; onClose: () => void; children: ReactNode; z?: number; /** An opaque panel, for long sheets that must not show the game through them. */ solid?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div key={label} className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-black/45 px-2" style={{ zIndex: z }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} className={`${solid ? 'panel-solid shadow-[0_18px_50px_rgba(0,0,0,0.6)]' : 'panel'} relative pb-safe mb-2 max-h-[82vh] w-full max-w-md overflow-y-auto rounded-2xl p-4`} initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <button onClick={onClose} aria-label={`Close ${label}`} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={18} /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The club menu: pick what to order (crates, bundles and trays have a quantity), see the total, pay. Stays open so you can keep balling. */
export function ClubMenu() {
  const open = useUiStore((s) => s.clubMenuOpen);
  const close = () => useUiStore.getState().setClubMenu(false);
  const [qty, setQty] = useState<Record<string, number>>({}), [group, setGroup] = useState<ClubGroup>('bottles');
  const receipts = useClubStore((s) => s.receipts), since = useClubStore((s) => s.since), club = useInteriorStore((s) => s.current?.name ?? 'Club');
  const picked = CLUB_OPTIONS.filter((o) => (qty[o.id] ?? 0) > 0);
  const total = picked.reduce((a, o) => a + clubPrice(o) * qty[o.id], 0), bill = tonightsBill(receipts, club, since).total;
  const set = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(MAX_QTY, n)) }));
  const pay = () => {
    const r = buyClub(picked.map((o) => ({ id: o.id, qty: qty[o.id] })));
    if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; }
    sfx.purchase(); setQty({}); toast(`Charged ${formatNaira(r.receipt.total)}. It is on your bill.`, 'good');
  };
  return (
    <Sheet open={open} label="Club menu" onClose={close}>
      <div className="pr-10 font-display text-lg font-extrabold">{club} menu</div>
      <button onClick={() => { close(); useUiStore.getState().setClubTicket(true); }} className="mt-1 flex w-full items-center justify-between rounded-xl bg-white/[0.07] px-3 py-2 text-left active:bg-white/10" aria-label="Open my bill">
        <span className="text-[12px] text-white/60">Burned tonight · tap for your bill</span><span className="font-display text-[15px] font-extrabold text-danfo">{formatNaira(bill)}</span>
      </button>
      <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Menu sections">
        {CLUB_GROUPS.map((g) => {
          const n = CLUB_OPTIONS.filter((o) => o.group === g.id && (qty[o.id] ?? 0) > 0).length;
          return <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${group === g.id ? 'border-accent bg-accent/25' : 'border-white/10 bg-white/[0.06] text-white/75'}`}>{g.label}{n > 0 ? ` · ${n}` : ''}</button>;
        })}
      </div>
      <div className="mt-2 space-y-2">
        {CLUB_OPTIONS.filter((o) => o.group === group).map((o) => {
          const n = qty[o.id] ?? 0, on = n > 0;
          return (
            <div key={o.id} className={`flex w-full items-center gap-3 rounded-xl border p-3 ${on ? 'border-accent bg-accent/20' : 'border-white/10 bg-white/[0.06]'}`}>
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" role={o.multi ? undefined : 'checkbox'} aria-checked={o.multi ? undefined : on} onClick={() => (o.multi ? set(o.id, n + 1) : set(o.id, n ? 0 : 1))} aria-label={o.multi ? `Add ${o.name}` : o.name}>
                <span className="text-2xl">{o.glyph}</span>
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-tight">{o.name}</span><span className="block text-[12px] leading-snug text-white/60">{o.blurb}</span><span className="mt-0.5 block text-[13px] font-extrabold text-danfo">{formatNaira(clubPrice(o))}</span></span>
              </button>
              {o.multi && on && (
                <span className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => set(o.id, n - 1)} aria-label={`One less ${o.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg font-bold active:bg-white/25">−</button>
                  <span className="w-7 text-center text-[15px] font-extrabold tabular-nums">{n}</span>
                  <button onClick={() => set(o.id, n + 1)} aria-label={`One more ${o.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg font-bold active:bg-white/25">+</button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <button disabled={!picked.length} onClick={pay} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold disabled:opacity-40">{picked.length ? `Pay ${formatNaira(total)}` : 'Pick something'}</button>
      <p className="mt-2 text-center text-[11px] text-white/45">In-game naira only. It comes straight out of your cash. Big spenders get announced.</p>
    </Sheet>
  );
}

/** The bill: a paper ticket of everything you have burned tonight, newest at the bottom, with a running total. Can be saved as a picture. */
export function ClubTicket() {
  const open = useUiStore((s) => s.clubTicketOpen), close = () => useUiStore.getState().setClubTicket(false);
  const receipts = useClubStore((s) => s.receipts), since = useClubStore((s) => s.since), club = useInteriorStore((s) => s.current?.name ?? 'Club');
  const { rows, total } = tonightsBill(receipts, club, since), player = receipts[0]?.player ?? 'Player';
  const busy = useRef(false);
  const save = async () => {
    if (busy.current) return; busy.current = true;
    try {
      const blob = await renderBillPng({ club, player, since, rows, total }); const file = new File([blob], `bill-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `${club} bill` });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Bill saved as a picture', 'good'); }
    } catch { toast('Could not save the picture here.', 'bad'); } finally { busy.current = false; }
  };
  const paper = '#FBF7EE', zig = (dir: 'top' | 'bottom') => ({ height: 14, background: `linear-gradient(${dir === 'top' ? '135deg' : '315deg'}, ${paper} 25%, transparent 25%) -7px 0/14px 14px, linear-gradient(${dir === 'top' ? '225deg' : '45deg'}, ${paper} 25%, transparent 25%) -7px 0/14px 14px` });
  return (
    <Sheet open={open} label="Bill" onClose={close} solid>
      <div className="mx-auto w-full max-w-[22rem] pt-6" aria-label="Club bill">
        <div style={zig('top')} />
        <div className="px-4 pb-3 pt-1 text-[#1B1B22]" style={{ background: paper }}>
          <div className="text-center"><div className="font-display text-xl font-extrabold tracking-widest">{club.toUpperCase()}</div><div className="text-[11px] tracking-[0.35em] text-[#8A6D2B]">THE BILL</div></div>
          <div className="mt-3 rounded-xl bg-[#F1E8FA] py-2 text-center"><div className="text-[10px] font-extrabold tracking-[0.25em] text-[#7A1FA2]">BURNED TONIGHT</div><div className="font-display text-[28px] font-extrabold leading-tight" data-testid="bill-total">{formatNaira(total)}</div></div>
          <div className="relative my-3 border-t-2 border-dashed border-[#BBA877]"><span className="absolute -left-7 -top-3 h-5 w-5 rounded-full bg-[#0F141C]" /><span className="absolute -right-7 -top-3 h-5 w-5 rounded-full bg-[#0F141C]" /></div>
          <div className="max-h-[34vh] min-h-[4rem] space-y-1.5 overflow-y-auto pr-1" role="list" aria-label="Bill lines">
            {rows.length === 0 && <p className="py-3 text-center text-[13px] text-[#8A8A92]">Nothing ordered yet. Tap the bar.</p>}
            {rows.map((r, i) => (
              <div key={i} role="listitem" className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="min-w-0"><span className="mr-1.5 text-[10.5px] text-[#8A8A92]">{new Date(r.at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span><b className="font-semibold">{r.qty > 1 ? `${r.qty}× ` : ''}{r.name}</b></span>
                <span className="shrink-0 text-right"><b>{formatNaira(r.price)}</b><span className="block text-[10px] text-[#8A8A92]">so far {formatNaira(r.running)}</span></span>
              </div>
            ))}
          </div>
          <div className="my-3 border-t-2 border-[#1B1B22]" />
          <div className="flex items-center justify-between"><span className="text-[13px] font-bold">TOTAL</span><span className="font-display text-xl font-extrabold">{formatNaira(total)}</span></div>
          <div className="mt-2 text-center"><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10.5px] font-extrabold tracking-widest text-emerald-700">PAID FROM CASH · ALL DEDUCTED</span></div>
          <div className="mx-auto mt-3 h-10 w-4/5" style={{ background: 'repeating-linear-gradient(90deg,#1B1B22 0 2px,transparent 2px 5px,#1B1B22 5px 6px,transparent 6px 10px,#1B1B22 10px 13px,transparent 13px 15px)' }} aria-hidden />
        </div>
        <div style={zig('bottom')} />
      </div>
      <button onClick={() => void save()} className="mt-3 h-11 w-full rounded-xl bg-accent text-sm font-extrabold">Save or share picture</button>
      <button onClick={() => { close(); useUiStore.getState().setClubMenu(true); }} className="mt-2 h-10 w-full rounded-xl bg-white/10 text-[13px] font-semibold">Back to the menu</button>
    </Sheet>
  );
}

/** A receipt for a purchase that was really charged. It can be saved as a picture made on this device (no outside service). */
export function ReceiptSheet() {
  const id = useUiStore((s) => s.receiptId), receipts = useClubStore((s) => s.receipts);
  const close = () => useUiStore.getState().setReceipt(null);
  const r = receipts.find((x) => x.id === id);
  const busy = useRef(false);
  const save = async () => {
    if (!r || busy.current) return; busy.current = true;
    try {
      const blob = await renderReceiptPng(r); const file = new File([blob], `${r.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `${r.club} receipt` }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${r.id}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Receipt saved as a picture', 'good'); }
    } catch { toast('Could not save the picture here.', 'bad'); } finally { busy.current = false; }
  };
  return (
    <Sheet open={!!r} label="Receipt" onClose={close} z={92}>
      {r && (
        <>
          <div className="mx-auto mt-2 rounded-2xl bg-[#FBF7EE] p-4 text-[#1B1B22] shadow-xl" aria-label="Receipt">
            <div className="text-center"><div className="font-display text-xl font-extrabold tracking-widest">{r.club.toUpperCase()}</div><div className="text-[11px] tracking-[0.3em] text-[#8A6D2B]">OFFICIAL RECEIPT</div></div>
            <div className="my-3 border-t border-dashed border-[#BBA877]" />
            <div className="flex justify-between text-[12px]"><span className="text-[#6B6B72]">Guest</span><b>{r.player}</b></div>
            <div className="flex justify-between text-[12px]"><span className="text-[#6B6B72]">Date</span><b>{new Date(r.at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</b></div>
            <div className="flex justify-between text-[12px]"><span className="text-[#6B6B72]">Receipt no.</span><b>{r.id}</b></div>
            <div className="flex justify-between gap-3 text-[12px]"><span className="shrink-0 text-[#6B6B72]">Transaction</span><b className="min-w-0 break-all text-right">{r.txId}</b></div>
            <div className="my-3 border-t border-dashed border-[#BBA877]" />
            {r.lines.map((l) => <div key={l.id} className="flex justify-between py-0.5 text-[13px]"><span>{l.name}</span><b>{formatNaira(l.price)}</b></div>)}
            <div className="my-3 border-t border-[#1B1B22]" />
            <div className="flex items-center justify-between"><span className="text-[13px] font-bold">TOTAL</span><span className="font-display text-xl font-extrabold">{formatNaira(r.total)}</span></div>
            <div className="mt-3 text-center"><span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold tracking-widest text-emerald-700">PAID</span></div>
            <p className="mt-3 text-center text-[10px] text-[#8A8A92]">In-game naira. This receipt is not proof of any real-money purchase.</p>
          </div>
          <button onClick={() => void save()} className="mt-3 h-11 w-full rounded-xl bg-accent text-sm font-extrabold">Save or share picture</button>
          <button onClick={close} className="mt-2 h-10 w-full rounded-xl bg-white/10 text-[13px] font-semibold">Close</button>
        </>
      )}
    </Sheet>
  );
}

/** The big-spender banner. Appears only for a real, charged purchase, and goes away by itself. */
export function ClubBanner() {
  const a = useClubStore((s) => s.announcement), club = useInteriorStore((s) => s.current?.name ?? 'the club');
  useEffect(() => { if (!a) return; const t = setTimeout(() => useClubStore.getState().announce(null), 4800); return () => clearTimeout(t); }, [a]);
  return (
    <AnimatePresence>
      {a && (
        <motion.div key={a.id} role="status" initial={{ y: -80, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -60, opacity: 0 }} className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+5.5rem)] z-[95] mx-auto max-w-md rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 px-4 py-3 text-center shadow-2xl">
          <div className="text-[18px] font-extrabold leading-tight text-amber-200">{announcementText(a, club)}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A car on a showroom podium: price, what it is, buy. */
export function VehicleSheet() {
  const id = useUiStore((s) => s.showroomVehicle), here = useInteriorStore((s) => s.current), owned = useVehicleStore((s) => s.owned);
  const close = () => useUiStore.getState().setShowroomVehicle(null);
  const v = id ? getVehicle(id) : undefined;
  const buy = () => { if (!v) return; const r = buyVehicle(v.id); if (r.ok) { close(); useUiStore.getState().setCarReveal(v.id); /* the celebration film plays, then tells you the car is yours */ } else { sfx.error(); toast(r.message, 'bad'); } };
  return (
    <Sheet open={!!v && here?.kind === 'showroom'} label="Vehicle" onClose={close}>
      {v && (
        <>
          <CarImage car={v} className="-mt-1 mb-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />
          <div className="pr-10"><div className="font-display text-lg font-extrabold">{v.name}</div><div className="text-[12px] capitalize text-white/60">{v.type === 'keke' ? 'Tricycle' : v.type}</div></div>
          <p className="mt-2 text-[13px] text-white/80">{v.blurb}</p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2"><span className="text-[12px] text-white/60">Price</span><span className="font-display text-lg font-extrabold text-danfo">{formatNaira(vehiclePrice(v.id))}</span></div>
          {owned.includes(v.id) ? <div className="mt-3 space-y-2"><div className="rounded-xl bg-emerald-500/15 py-3 text-center text-sm font-bold text-emerald-300">You own this car</div><button onClick={() => { const r = sellVehicle(v.id); if (r.ok) { sfx.purchase(); toast(r.message, 'good'); close(); } else { sfx.error(); toast(r.message, 'bad'); } }} className="h-11 w-full rounded-xl bg-white/10 text-[14px] font-bold">Sell for {formatNaira(salePrice(v.id))} (70%)</button></div>
            : <button onClick={buy} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold">Buy for {formatNaira(vehiclePrice(v.id))}</button>}
          <button onClick={() => { close(); useTestDriveStore.getState().open(v.id); }} className="mt-2 h-11 w-full rounded-xl bg-white/10 text-[14px] font-bold">🏁 Test drive</button>
        </>
      )}
    </Sheet>
  );
}
void CLUB;
