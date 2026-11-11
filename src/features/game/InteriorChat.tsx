import { sfx } from '@/audio/sfx';
import { motion } from 'framer-motion';
import { Camera, ChevronsDown, ChevronsUp, Footprints, Home, ListChecks, Send, MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usesOf } from '@/data/activities';
import { INTERIORS } from '@/data/interiors';
import { getFurniture } from '@/data/items';
import { makeNpcs } from '@/data/npcs';
import { vendorSpots } from '@/data/vendors';
import { formatNaira } from '@/core/format';
import { getActiveHome } from '@/game/active';
import { CHAT, channelFor, getTransport, playerMenu, type ChatScope, type Sender } from '@/game/chat';
import { describeUse } from '@/game/itemInfo';
import { chooseActivity, interactWith } from '@/game/interactions';
import { leaveInterior } from '@/game/interiors';
import { attemptPickpocket, sentenceMinutesFor, successChance } from '@/game/crime';
import { useJailStore } from '@/stores/jailStore';
import { useChatStore } from '@/stores/chatStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useTestDriveStore } from '@/stores/testDriveStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { TaskCard } from '@/ui/TaskCard';
import { BuyCarCards, SellCarCards } from './CarCards';
import { BettingEntry } from './BettingSlip';
import { ClubBalling } from './ClubBalling';
import { captureScene } from '@/three/capture';
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
const HINT_KEY = 'nigerialife.venuePanelSeen';
/** Has the player opened this kind of venue's panel before? Until they have, its open button glows so they know to tap it. */
function useVenueHint(kind: string | undefined, expanded: boolean): boolean {
  const read = (): string[] => { try { return JSON.parse(localStorage.getItem(HINT_KEY) ?? '[]'); } catch { return []; } };
  const [seenKinds, setSeen] = useState<string[]>(read);
  useEffect(() => {
    if (!kind || !expanded || seenKinds.includes(kind)) return;
    const next = [...seenKinds, kind]; setSeen(next);
    try { localStorage.setItem(HINT_KEY, JSON.stringify(next)); } catch { /* private mode: the hint just shows again next time */ }
  }, [kind, expanded, seenKinds]);
  return !kind || seenKinds.includes(kind);
}

export function InteriorChat() {
  const expanded = useUiStore((s) => s.chatOpen), dockHidden = useUiStore((s) => s.dockHidden), mode = useUiStore((s) => s.mode);
  const tab = useUiStore((x) => x.venueTab), setTab = (t: 'chat' | 'tasks') => useUiStore.getState().setVenueTab(t);
  const here = useInteriorStore((s) => s.current), channels = useChatStore((s) => s.channels);
  const [scope, setScope] = useState<ChatScope>('local');
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<Sender | null>(null);
  const [spotUid, setSpotUid] = useState<string | null>(null);
  const seen = useVenueHint(here?.kind, expanded);
  const [seenN, setSeenN] = useState(0);
  const end = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null);
  const setExpanded = (v: boolean) => useUiStore.getState().setChatOpen(v);
  const ch = channelFor(scope, here), list = ch ? channels[ch] ?? [] : [];
  const def = here ? INTERIORS[here.kind] : null;
  const shown = !!here && !!def?.chat && mode === 'home';
  useEffect(() => { if (expanded) end.current?.scrollIntoView({ block: 'end' }); }, [list.length, expanded, scope]);
  useEffect(() => { if (!expanded) { setMenu(null); setSpotUid(null); } }, [expanded]);
  useEffect(() => { setSpotUid(null); }, [tab]);
  // entering a venue starts with the panel folded and the menu showing; leaving it puts everything back
  useEffect(() => { if (!here) { useUiStore.getState().setChatOpen(false); useUiStore.getState().setDockHidden(false); } }, [here]);
  // other bottom pieces (the stats widget) sit above the panel, so tell them how tall it is
  useEffect(() => {
    const el = box.current; const root = document.documentElement;
    if (!shown || !el) { root.style.removeProperty('--panel-h'); return; }
    const ro = new ResizeObserver(() => root.style.setProperty('--panel-h', `${Math.round(el.getBoundingClientRect().height)}px`));
    ro.observe(el); return () => { ro.disconnect(); root.style.removeProperty('--panel-h'); };
  }, [shown]);
  const online = getTransport().authoritative, st = SCOPE[scope];
  const send = () => { const r = useChatStore.getState().send(scope, text); if (!r.ok) { toast(r.error ?? 'Could not send', 'bad'); return; } setText(''); };
  const people = useMemo(() => {
    if (!here) return [];
    const vendors = vendorSpots(here.kind, getActiveHome()?.placed ?? [], (id) => getFurniture(id)?.footprint ?? { w: 1, d: 1 }, { w: INTERIORS[here.kind].w, d: INTERIORS[here.kind].d }).map((v) => v.profile);
    return [...vendors, ...makeNpcs(here.kind, here.seed, here.npcCount)];
  }, [here?.kind, here?.seed, here?.npcCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const spots = useMemo<Spot[]>(() => {
    if (!expanded || !here || tab !== 'tasks') return [];
    const placed = getActiveHome()?.placed ?? [], best = new Map<string, { s: Spot; d: number }>();
    for (const p of placed) {
      const f = getFurniture(p.defId); if (!f || !usesOf(f).length) continue;
      const d = Math.hypot(p.x - livePlayer.x, p.z - livePlayer.z), cur = best.get(p.defId);
      if (!cur || d < cur.d) best.set(p.defId, { s: { uid: p.uid, defId: p.defId, name: f.name, glyph: f.glyph }, d });
    }
    return [...best.values()].sort((a, b) => a.d - b.d).map((b) => b.s);
  }, [expanded, here, tab]);
  const here_n = here ? 1 + here.npcCount : 0;
  const crim = useJailStore((x) => x.criminality);
  /** The nearest person to you, for the "crowd" spot. */
  const nearestNpc = () => { let best: string | null = null, bd = Infinity; for (const [id, pos] of liveNpcs) { const d = Math.hypot(pos.x - livePlayer.x, pos.z - livePlayer.z); if (d < bd) { bd = d; best = id; } } return best; };
  const pickNearest = () => { const id = nearestNpc(); if (!id) return; const r = attemptPickpocket(id); if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; } if (r.outcome === 'stolen') { sfx.coin(); toast(`${r.message} +${formatNaira(r.amount)}`, 'good'); } else { sfx.error(); toast(r.message, 'bad'); } setExpanded(false); };

  useEffect(() => { if (expanded) setSeenN(list.length); }, [expanded, list.length]);
  const unread = !expanded && list.length > seenN;
  const takePicture = async () => {
    try {
      const blob = await captureScene(); if (!blob) { toast('Could not take a picture here.', 'bad'); return; }
      const file = new File([blob], `nigeria-life-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: here?.name ?? 'Nigeria Life' }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Picture saved', 'good'); }
    } catch { /* the person closed the share sheet */ }
  };
  const sheetUp = useUiStore((x) => !!x.showroomVehicle || x.clubTicketOpen || !!x.haggle || x.bettingOpen || !!x.receiptId || !!x.carReveal), driving = useTestDriveStore((x) => !!x.vehicleId);
  const windowOpen = sheetUp || driving;
  if (!shown || !here || !def || windowOpen) return null; // one window at a time: the chat waits until the sheet or test drive is closed
  const isClub = here.kind === 'club', isBetting = here.kind === 'viewing';
  const open = (t: 'chat' | 'tasks') => { sfx.click(); if (expanded && tab === t) setExpanded(false); else { setTab(t); setExpanded(true); } };
  const taskCount = (isClub ? 0 : spots.length) + (def.crowd && !isClub ? 1 : 0);
  const onChat = expanded && tab === 'chat', onTasks = expanded && tab === 'tasks';
  const spotsList = isClub ? [] : spots;
  const spot = spotsList.find((x) => x.uid === spotUid) ?? null;
  const uses = spot ? usesOf(getFurniture(spot.defId)) : [];
  const spotUses = uses.map(describeUse);
  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+var(--dock-gap,4.9rem))] z-[76] flex justify-center px-2 ${dockHidden ? 'pr-16' : ''}`}>
      <div ref={box} role="region" aria-label="Venue panel" className={`panel pointer-events-auto flex ${onTasks && isClub ? 'max-h-[46vh]' : 'max-h-[66vh]'} w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-3xl p-2.5`}>
        {/* top strip: tap to fold or unfold; camera and fold-the-menu on the right */}
        <div className="flex items-center justify-between">
          <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Fold the panel' : 'Unfold the panel'} className="flex h-7 flex-1 items-center justify-center"><span className="h-1 w-12 rounded-full bg-white/25" /></button>
          <div className="flex gap-1.5">
            <button onClick={() => void takePicture()} aria-label="Take a picture" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><Camera size={16} /></button>
            <button onClick={() => { sfx.click(); useUiStore.getState().setDockHidden(!dockHidden); }} aria-label={dockHidden ? 'Show the menu' : 'Hide the menu'} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 active:bg-white/20">{dockHidden ? <ChevronsUp size={17} /> : <ChevronsDown size={17} />}</button>
          </div>
        </div>
        {/* where you are, then the two things you can open: Chat and Tasks, and the way home */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">{def.glyph}</div>
          <div className="min-w-[3.4rem] flex-1 leading-tight"><div className="truncate text-[13px] font-extrabold">{here.name}</div><div className="whitespace-nowrap text-[11px] text-white/55">Copy {here.instance} · {here_n} here</div></div>
          <button onClick={() => open('chat')} aria-pressed={onChat} aria-label="Open the chat" className={`relative flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold active:bg-white/20 ${onChat ? 'bg-white text-night' : 'bg-white/10'}`}><MessageCircle size={16} />Chat{unread && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#18222d]" />}</button>
          <button onClick={() => open('tasks')} aria-pressed={onTasks} aria-label="Open the tasks" className={`relative flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold active:bg-white/20 ${onTasks ? 'bg-white text-night' : isClub || isBetting ? 'bg-amber-400/25 text-amber-100' : 'bg-white/10'} ${!seen && !expanded ? 'venue-glow' : ''}`}><ListChecks size={16} />{isClub ? 'Ball' : 'Tasks'}{!isClub && taskCount > 0 && <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-[11px] tabular-nums">{taskCount}</span>}</button>
          {here.kind !== 'jail' && <button onClick={leaveInterior} aria-label="Leave and go home" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><Home size={17} /></button>}
        </div>

        {/* ------------------------------------------------------------------ chat */}
        {onChat && (
          <>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-0.5 rounded-xl bg-white/[0.07] p-0.5">
                {(['local', 'global'] as const).map((k) => <button key={k} aria-pressed={scope === k} onClick={() => { setScope(k); setMenu(null); }} className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${scope === k ? `${SCOPE[k].tone} text-white` : 'text-white/60'}`}>{SCOPE[k].label}</button>)}
              </div>
              <span className="text-[11px] text-white/45">{scope === 'local' ? 'This copy only' : 'Every venue'}</span>
            </div>
            <div className="mt-2 max-h-[22vh] min-h-[2.2rem] space-y-1 overflow-y-auto rounded-xl bg-white/[0.05] px-2.5 py-1.5">
              {list.length === 0 && <p className="py-1 text-center text-[12px] text-white/45">{scope === 'local' ? `Only people in this copy can see this.${online ? '' : ' Offline: it is you and the NPCs.'}` : `Everyone in any venue sees this.${online ? '' : ' Offline: only you see global messages.'}`}</p>}
              {list.map((m) => (
                <div key={m.id} className={m.from.kind === 'system' ? 'rounded-md bg-amber-500/15 px-2 py-1 text-center text-[12px] font-semibold text-amber-200' : 'text-[13px] leading-snug'}>
                  {m.from.kind !== 'system' && <button onClick={() => setMenu(m.from.id === 'me' ? null : m.from)} className={`mr-1.5 font-bold ${m.from.id === 'me' ? 'text-white' : st.text}`}>{m.from.name}{m.from.kind === 'npc' && <span className="ml-1 rounded bg-white/10 px-1 text-[9.5px] font-semibold text-white/60">NPC</span>}</button>}
                  <span className="text-white/90">{m.text}</span>
                </div>
              ))}
              <div ref={end} />
            </div>
            {menu && (
              <div className="mt-1.5 rounded-xl bg-white/[0.08] p-2">
                <div className="px-1 pb-1 text-[12px] font-bold">{menu.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {playerMenu(menu, online).map((o) => (
                    <button key={o.id} disabled={!o.enabled} title={o.reason} onClick={() => { if (o.id === 'profile' && menu.kind === 'npc') { useInteriorStore.getState().selectNpc(menu.id); } setMenu(null); }} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40">{o.label}{!o.enabled && o.reason ? ` · ${o.reason}` : ''}</button>
                  ))}
                  <button onClick={() => setMenu(null)} className="rounded-lg px-2.5 py-1.5 text-[12px] text-white/60">Close</button>
                </div>
              </div>
            )}
            <form className="mt-1.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={CHAT.maxLength + 20} placeholder={scope === 'local' ? `Say something to all ${here_n} here…` : 'Say something to every venue…'} aria-label="Message" className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3.5 py-2.5 text-[14px] outline-none placeholder:text-white/40" />
              <button type="submit" aria-label="Send" className={`flex h-11 w-11 items-center justify-center rounded-2xl ${st.tone}`}><Send size={18} /></button>
            </form>
            <div className="mt-2 px-1 text-[12px] font-bold">Players here · {here_n}</div>
            <div className="no-scrollbar mt-1 flex gap-2.5 overflow-x-auto pb-0.5">
              <div className="flex w-14 shrink-0 flex-col items-center gap-0.5"><div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-rose-400 bg-white/10 text-[15px] font-extrabold">You</div></div>
              {people.map((p) => (
                <button key={p.id} onClick={() => { setExpanded(false); useInteriorStore.getState().selectNpc(p.id); }} className="flex w-14 shrink-0 flex-col items-center gap-0.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-400 text-[16px] font-extrabold" style={{ background: p.appearance.topColor }}>{initials(p.name)}</div>
                  <div className="w-full truncate text-center text-[10.5px] text-white/70">{p.name}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ tasks: everything you can do here, no hunting for things to tap in the scene */}
        {onTasks && (
          <div className="mt-2">
            {isClub && <ClubBalling />}
            {isBetting && <div className="mb-2"><BettingEntry /></div>}
            {!isClub && (spotsList.length > 0 || def.crowd || here.kind === 'showroom') && (
              <>
                <div className="flex items-center justify-between px-1 text-[12px]"><span className="font-bold">What do you want to do?</span><span className="flex items-center gap-1 text-white/50"><Footprints size={13} />Tap one</span></div>
                <div className="no-scrollbar mt-1 flex gap-1.5 overflow-x-auto pb-0.5">
                  {here.kind === 'showroom' && [['__buycars', '\u{1F697} Buy cars'], ['__sellcars', '\u{1F4B0} Sell cars']].map(([id, label]) => (
                    <button key={id} aria-pressed={spotUid === id} onClick={() => setSpotUid(spotUid === id ? null : id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold ${spotUid === id ? 'bg-white text-night' : 'bg-white/10'}`}>{label}</button>
                  ))}
                  {def.crowd && <button aria-pressed={spotUid === '__crowd'} onClick={() => setSpotUid(spotUid === '__crowd' ? null : '__crowd')} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold ${spotUid === '__crowd' ? 'bg-white text-night' : 'bg-white/10'}`}><span>👥</span>The crowd</button>}
                  {spotsList.map((x) => <button key={x.uid} aria-pressed={spotUid === x.uid} onClick={() => setSpotUid(spotUid === x.uid ? null : x.uid)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold ${spotUid === x.uid ? 'bg-white text-night' : 'bg-white/10'}`}><span>{x.glyph}</span>{x.name}</button>)}
                </div>
              </>
            )}
            {spotUid === '__buycars' && <BuyCarCards onPick={() => { setSpotUid(null); setExpanded(false); }} />}
            {spotUid === '__sellcars' && <SellCarCards />}
            {spotUid === '__crowd' && (
              <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
                <button onClick={() => { const id = nearestNpc(); if (id) { setExpanded(false); useInteriorStore.getState().selectNpc(id); } }} className="flex w-[11.5rem] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 text-left active:bg-white/10"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">💬</span><div className="mt-1.5 text-[12px] font-bold text-emerald-300">Free</div><div className="text-[14px] font-extrabold leading-tight">Chat with someone nearby</div><div className="mt-1.5 flex flex-wrap gap-1"><span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">+Social</span><span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">+Fun</span></div></button>
                <button onClick={pickNearest} className="flex w-[11.5rem] shrink-0 flex-col rounded-2xl border border-rose-400/20 bg-white/[0.06] p-2.5 text-left active:bg-white/10"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">👛</span><div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold"><span className="text-emerald-300">Free</span><span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10.5px] text-rose-300">🚨 Risky · {Math.round(successChance(crim) * 100)}%</span></div><div className="text-[14px] font-extrabold leading-tight">Pick someone's pocket</div><div className="mt-1.5 text-[11px] text-white/60">Caught: jail for {sentenceMinutesFor(crim)} min</div></button>
              </div>
            )}
            {spot && (
              <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
                {spotUses.map((d, i) => (
                  <TaskCard key={i} width="11.75rem" glyph={d.glyph} title={d.label} seconds={d.seconds} cost={d.cost} risk={uses[i].risk ? { chance: uses[i].risk!.winChance } : undefined} winMoney={uses[i].risk?.winMoney} effects={d.effects} skill={d.skill} maxEffects={3}
                    onSelect={() => { const item = getActiveHome()?.placed.find((p) => p.uid === spot.uid); if (!item) return; if (uses[i].id) chooseActivity(item, uses[i].id!); else interactWith(item); setSpotUid(null); setExpanded(false); }} />
                ))}
              </div>
            )}
            {!isClub && !spotsList.length && !def.crowd && here.kind !== 'showroom' && !isBetting && <p className="rounded-xl bg-white/[0.05] px-3 py-3 text-center text-[12px] text-white/55">Nothing to do here yet.</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
void liveNpcs;
