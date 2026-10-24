import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Footprints, Home, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usesOf } from '@/data/activities';
import { INTERIORS } from '@/data/interiors';
import { getFurniture } from '@/data/items';
import { makeNpcs } from '@/data/npcs';
import { formatNaira } from '@/core/format';
import { getActiveHome } from '@/game/active';
import { CHAT, channelFor, getTransport, playerMenu, type ChatScope, type Sender } from '@/game/chat';
import { describeUse } from '@/game/itemInfo';
import { chooseActivity, interactWith } from '@/game/interactions';
import { leaveInterior } from '@/game/interiors';
import { useChatStore } from '@/stores/chatStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { livePlayer, liveNpcs } from '@/world/npcLive';

const SCOPE = {
  local: { label: 'Local', tone: 'bg-emerald-500', text: 'text-emerald-300' },
  global: { label: 'Global', tone: 'bg-sky-500', text: 'text-sky-300' },
} as const;

const initials = (n: string) => n.slice(0, 1).toUpperCase();

/** One tappable thing to do in the venue: the nearest of each kind of object that has activities. */
interface Spot { uid: string; defId: string; name: string; glyph: string }

/**
 * Chat and "what is here" for a venue, as a compact panel above the dock so the venue stays visible behind it.
 * LOCAL = this copy of this venue only; GLOBAL = every venue (they are separate channels). Below the box: Spots (tap one to walk
 * there and pick what to do) and Players here (tap one for their profile). Offline, only this device and the NPCs are here.
 */
export function InteriorChat() {
  const open = useUiStore((s) => s.chatOpen), here = useInteriorStore((s) => s.current), channels = useChatStore((s) => s.channels);
  const [scope, setScope] = useState<ChatScope>('local');
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<Sender | null>(null);
  const [spotUid, setSpotUid] = useState<string | null>(null);
  const [showMsgs, setShowMsgs] = useState(true);
  const end = useRef<HTMLDivElement>(null);
  const close = () => useUiStore.getState().setChatOpen(false);
  const ch = channelFor(scope, here), list = ch ? channels[ch] ?? [] : [];
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [list.length, open, scope, showMsgs]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  useEffect(() => { if (!open) { setSpotUid(null); setMenu(null); } }, [open]);
  const online = getTransport().authoritative, def = here ? INTERIORS[here.kind] : null, st = SCOPE[scope];
  const send = () => { const r = useChatStore.getState().send(scope, text); if (!r.ok) { toast(r.error ?? 'Could not send', 'bad'); return; } setText(''); };
  const people = useMemo(() => (here ? makeNpcs(here.kind, here.seed, here.npcCount) : []), [here?.kind, here?.seed, here?.npcCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const spots = useMemo<Spot[]>(() => {
    if (!open || !here) return [];
    const placed = getActiveHome()?.placed ?? [], best = new Map<string, { s: Spot; d: number }>();
    for (const p of placed) {
      const f = getFurniture(p.defId); if (!f || !usesOf(f).length) continue;
      const d = Math.hypot(p.x - livePlayer.x, p.z - livePlayer.z), cur = best.get(p.defId);
      if (!cur || d < cur.d) best.set(p.defId, { s: { uid: p.uid, defId: p.defId, name: f.name, glyph: f.glyph }, d });
    }
    return [...best.values()].sort((a, b) => a.d - b.d).map((b) => b.s);
  }, [open, here]);
  const spot = spots.find((s) => s.uid === spotUid) ?? null;
  const spotUses = spot ? usesOf(getFurniture(spot.defId)).map(describeUse) : [];
  const uses = spot ? usesOf(getFurniture(spot.defId)) : [];
  const here_n = here ? 1 + here.npcCount : 0;
  return (
    <AnimatePresence>
      {open && here && def?.chat && (
        <motion.div key="chat" className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.9rem)] z-[76] flex justify-center px-2" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          <div role="dialog" aria-label="Venue chat" className="panel pointer-events-auto flex max-h-[52vh] w-full max-w-md flex-col rounded-3xl p-2.5">
            {/* header: where you are, which channel, and the ways out */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">{def.glyph}</div>
              <div className="min-w-[4.2rem] flex-1 leading-tight"><div className="truncate text-[13px] font-extrabold">{here.name}</div><div className="whitespace-nowrap text-[11px] text-white/55">Copy {here.instance} · {here_n} here</div></div>
              <div className="flex gap-0.5 rounded-xl bg-white/[0.07] p-0.5">
                {(['local', 'global'] as const).map((s) => <button key={s} aria-pressed={scope === s} onClick={() => { setScope(s); setMenu(null); }} className={`rounded-lg px-2 py-1.5 text-[12px] font-bold ${scope === s ? `${SCOPE[s].tone} text-white` : 'text-white/60'}`}>{SCOPE[s].label}</button>)}
              </div>
              {here.kind !== 'jail' && <button onClick={() => { close(); leaveInterior(); }} aria-label="Leave and go home" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><Home size={17} /></button>}
              <button onClick={close} aria-label="Close panel" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><ChevronDown size={19} /></button>
            </div>
            {/* messages (only the latest few, scrolls) */}
            {showMsgs && (
              <div className="mt-2 max-h-[17vh] min-h-[2.2rem] space-y-1 overflow-y-auto rounded-xl bg-white/[0.05] px-2.5 py-1.5">
                {list.length === 0 && <p className="py-1 text-center text-[12px] text-white/45">{scope === 'local' ? `Only people in this copy can see this.${online ? '' : ' Offline: it is you and the NPCs.'}` : `Everyone in any venue sees this.${online ? '' : ' Offline: only you see global messages.'}`}</p>}
                {list.map((m) => (
                  <div key={m.id} className={m.from.kind === 'system' ? 'rounded-md bg-amber-500/15 px-2 py-1 text-center text-[12px] font-semibold text-amber-200' : 'text-[13px] leading-snug'}>
                    {m.from.kind !== 'system' && <button onClick={() => setMenu(m.from.id === 'me' ? null : m.from)} className={`mr-1.5 font-bold ${m.from.id === 'me' ? 'text-white' : st.text}`}>{m.from.name}{m.from.kind === 'npc' && <span className="ml-1 rounded bg-white/10 px-1 text-[9.5px] font-semibold text-white/60">NPC</span>}</button>}
                    <span className="text-white/90">{m.text}</span>
                  </div>
                ))}
                <div ref={end} />
              </div>
            )}
            {menu && (
              <div className="mt-1.5 rounded-xl bg-white/[0.08] p-2">
                <div className="px-1 pb-1 text-[12px] font-bold">{menu.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {playerMenu(menu, online).map((o) => (
                    <button key={o.id} disabled={!o.enabled} title={o.reason} onClick={() => { if (o.id === 'profile' && menu.kind === 'npc') { useInteriorStore.getState().selectNpc(menu.id); close(); } setMenu(null); }} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40">{o.label}{!o.enabled && o.reason ? ` · ${o.reason}` : ''}</button>
                  ))}
                  <button onClick={() => setMenu(null)} className="rounded-lg px-2.5 py-1.5 text-[12px] text-white/60">Close</button>
                </div>
              </div>
            )}
            <form className="mt-1.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setShowMsgs(true)} maxLength={CHAT.maxLength + 20} placeholder={scope === 'local' ? `Say something to all ${here_n} here…` : 'Say something to every venue…'} aria-label="Message" className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3.5 py-2.5 text-[14px] outline-none placeholder:text-white/40" />
              <button type="submit" aria-label="Send" className={`flex h-11 w-11 items-center justify-center rounded-2xl ${st.tone}`}><Send size={18} /></button>
            </form>
            {/* spots */}
            {spots.length > 0 && (
              <>
                <div className="mt-2 flex items-center justify-between px-1 text-[12px]"><span className="font-bold">Spots here</span><span className="flex items-center gap-1 text-white/50"><Footprints size={13} />Tap one to walk there</span></div>
                <div className="no-scrollbar mt-1 flex gap-1.5 overflow-x-auto pb-0.5">
                  {spots.map((s) => <button key={s.uid} aria-pressed={spotUid === s.uid} onClick={() => { setSpotUid(spotUid === s.uid ? null : s.uid); setShowMsgs(false); }} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold ${spotUid === s.uid ? 'bg-white text-night' : 'bg-white/10'}`}><span>{s.glyph}</span>{s.name}</button>)}
                </div>
              </>
            )}
            {spot && (
              <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
                {spotUses.map((d, i) => (
                  <button key={i} onClick={() => { const item = getActiveHome()?.placed.find((p) => p.uid === spot.uid); if (!item) return; close(); if (uses[i].id) chooseActivity(item, uses[i].id!); else interactWith(item); }} className="flex w-[11.5rem] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 text-left active:bg-white/10">
                    <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">{d.glyph}</span>{d.seconds != null && <span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] tabular-nums text-white/70">{d.seconds}s</span>}</div>
                    <div className={`mt-1.5 text-[12px] font-bold ${d.cost ? 'text-amber-300' : 'text-emerald-300'}`}>{d.cost ? formatNaira(d.cost) : 'Free'}</div>
                    <div className="text-[14px] font-extrabold leading-tight">{d.label}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">{d.effects.slice(0, 3).map((e) => <span key={e.label} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.delta > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{e.delta > 0 ? '+' : '−'}{e.label}</span>)}</div>
                  </button>
                ))}
              </div>
            )}
            {/* players */}
            <div className="mt-2 px-1 text-[12px] font-bold">Players here · {here_n}</div>
            <div className="no-scrollbar mt-1 flex gap-2.5 overflow-x-auto pb-0.5">
              <div className="flex w-14 shrink-0 flex-col items-center gap-0.5"><div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-rose-400 bg-white/10 text-[15px] font-extrabold">You</div></div>
              {people.map((p) => (
                <button key={p.id} onClick={() => { useInteriorStore.getState().selectNpc(p.id); close(); }} className="flex w-14 shrink-0 flex-col items-center gap-0.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-400 text-[16px] font-extrabold" style={{ background: p.appearance.topColor }}>{initials(p.name)}</div>
                  <div className="w-full truncate text-center text-[10.5px] text-white/70">{p.name}</div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
void liveNpcs;
