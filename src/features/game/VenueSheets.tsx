import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CRIME } from '@/data/balance';
import { CLUB, CLUB_OPTIONS } from '@/data/club';
import { INTERIORS } from '@/data/interiors';
import { npcRegistry } from '@/data/npcs';
import { hasRealModel } from '@/data/showroom';
import { getVehicle } from '@/data/vehicles';
import { buyClub, clubPrice, announcementText } from '@/game/club';
import { attemptPickpocket, sentenceMinutesFor, successChance } from '@/game/crime';
import { renderReceiptPng } from '@/game/receiptImage';
import { buyVehicle, vehiclePrice } from '@/game/vehicles';
import { useClubStore } from '@/stores/clubStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useJailStore } from '@/stores/jailStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { toast, useUiStore } from '@/stores/uiStore';

function Sheet({ open, label, onClose, children, z = 75 }: { open: boolean; label: string; onClose: () => void; children: ReactNode; z?: number }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div key={label} className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-black/45 px-2" style={{ zIndex: z }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} className="panel pb-safe mb-2 max-h-[82vh] w-full max-w-md overflow-y-auto rounded-2xl p-4" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <button onClick={onClose} aria-label={`Close ${label}`} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={18} /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tap an NPC: who they are, say hello, or try to pick their pocket (risky; the odds and the sentence are shown first). */
export function NpcSheet() {
  const id = useInteriorStore((s) => s.selectedNpc), here = useInteriorStore((s) => s.current);
  const crim = useJailStore((s) => s.criminality);
  const close = () => useInteriorStore.getState().selectNpc(null);
  const npc = id ? npcRegistry.get(id) : undefined, def = here ? INTERIORS[here.kind] : null;
  const act = () => {
    if (!npc) return; const r = attemptPickpocket(npc.id);
    if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; }
    if (r.outcome === 'stolen') { sfx.coin(); toast(`${r.message} +${formatNaira(r.amount)}`, 'good'); } else { sfx.error(); toast(r.message, 'bad'); }
    close();
  };
  return (
    <Sheet open={!!npc} label="Person" onClose={close}>
      {npc && def && (
        <>
          <div className="pr-10"><div className="font-display text-lg font-extrabold">{npc.name} <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 align-middle text-[11px] font-semibold text-white/70">NPC</span></div><div className="text-[12px] text-white/60">A character in {here?.name}, not a real player.</div></div>
          <p className="mt-2 text-[13px] text-white/80">“{npc.greeting}”</p>
          <button onClick={() => { sfx.pop(); toast(`${npc.name}: ${npc.greeting}`); }} className="mt-3 h-11 w-full rounded-xl bg-white/10 text-sm font-semibold">Say hello</button>
          {def.crowd && (
            <div className="mt-3 rounded-xl bg-rose-500/10 p-3">
              <div className="text-[13px] font-bold text-rose-300">Pick their pocket</div>
              <div className="mt-1 text-[12px] text-white/70">{Math.round(successChance(crim) * 100)}% chance it works. If you are caught you go to jail for {sentenceMinutesFor(crim)} minutes{crim ? ` (wanted level ${crim})` : ''}. Success raises your wanted level by {CRIME.criminalityPerSuccess}, an arrest by {CRIME.criminalityPerArrest}. Jail time keeps running even if you close the game.</div>
              <button onClick={act} className="mt-2 h-11 w-full rounded-xl bg-rose-600 text-sm font-extrabold">Try it</button>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

/** The club menu: pick what to order, see the total, pay. Nothing is recorded until the money is really taken. */
export function ClubMenu() {
  const open = useUiStore((s) => s.clubMenuOpen);
  const close = () => useUiStore.getState().setClubMenu(false);
  const [sel, setSel] = useState<string[]>([]);
  const receipts = useClubStore((s) => s.receipts);
  const total = sel.reduce((a, id) => a + clubPrice(CLUB_OPTIONS.find((o) => o.id === id)!), 0);
  const pay = () => {
    const r = buyClub(sel);
    if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; }
    sfx.purchase(); setSel([]); close(); useUiStore.getState().setReceipt(r.receipt.id);
  };
  return (
    <Sheet open={open} label="Club menu" onClose={close}>
      <div className="pr-10 font-display text-lg font-extrabold">{useInteriorStore.getState().current?.name ?? 'Club'} menu</div>
      <div className="text-[12px] text-white/60">In-game naira only. Big spenders get announced (at most once a minute).</div>
      <div className="mt-3 space-y-2">
        {CLUB_OPTIONS.map((o) => {
          const on = sel.includes(o.id);
          return (
            <button key={o.id} role="checkbox" aria-checked={on} onClick={() => setSel((s) => (on ? s.filter((x) => x !== o.id) : [...s, o.id]))} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${on ? 'border-accent bg-accent/20' : 'border-white/10 bg-white/[0.06]'}`}>
              <span className="text-2xl">{o.glyph}</span>
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{o.name}</span><span className="block text-[12px] text-white/60">{o.blurb}</span></span>
              <span className="text-[14px] font-extrabold text-danfo">{formatNaira(clubPrice(o))}</span>
            </button>
          );
        })}
      </div>
      <button disabled={!sel.length} onClick={pay} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold disabled:opacity-40">{sel.length ? `Pay ${formatNaira(total)}` : 'Pick something'}</button>
      {receipts.length > 0 && <button onClick={() => { close(); useUiStore.getState().setReceipt(receipts[0].id); }} className="mt-2 h-10 w-full rounded-xl bg-white/10 text-[13px] font-semibold">My receipts ({receipts.length})</button>}
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
    <Sheet open={!!r} label="Receipt" onClose={close} z={80}>
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
        <motion.div key={a.id} role="status" initial={{ y: -80, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -60, opacity: 0 }} className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+5.5rem)] z-[85] mx-auto max-w-md rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 px-4 py-3 text-center shadow-2xl">
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
  const buy = () => { if (!v) return; const r = buyVehicle(v.id); if (r.ok) { sfx.purchase(); toast(r.message, 'good'); close(); } else { sfx.error(); toast(r.message, 'bad'); } };
  return (
    <Sheet open={!!v && here?.kind === 'showroom'} label="Vehicle" onClose={close}>
      {v && (
        <>
          <div className="pr-10"><div className="font-display text-lg font-extrabold">{v.name}</div><div className="text-[12px] capitalize text-white/60">{v.type === 'keke' ? 'Tricycle' : v.type}</div></div>
          <p className="mt-2 text-[13px] text-white/80">{v.blurb}</p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2"><span className="text-[12px] text-white/60">Price</span><span className="font-display text-lg font-extrabold text-danfo">{formatNaira(vehiclePrice(v.id))}</span></div>
          {!hasRealModel(v.id) && <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] font-semibold text-amber-300">The car on the podium is a placeholder model. The real 3D model has not been added yet.</p>}
          {owned.includes(v.id) ? <div className="mt-3 rounded-xl bg-emerald-500/15 py-3 text-center text-sm font-bold text-emerald-300">You own this car</div>
            : <button onClick={buy} className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold">Buy for {formatNaira(vehiclePrice(v.id))}</button>}
        </>
      )}
    </Sheet>
  );
}
void CLUB;
