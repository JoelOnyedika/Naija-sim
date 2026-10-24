import { AnimatePresence, motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { INTERIORS } from '@/data/interiors';
import { CHAT, channelFor, getTransport, playerMenu, type ChatScope, type Sender } from '@/game/chat';
import { useChatStore } from '@/stores/chatStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { toast, useUiStore } from '@/stores/uiStore';

const SCOPE = {
  local: { label: 'Local', tone: 'bg-emerald-500', ring: 'border-emerald-400/40', text: 'text-emerald-300' },
  global: { label: 'Global', tone: 'bg-sky-500', ring: 'border-sky-400/40', text: 'text-sky-300' },
} as const;

/**
 * Chat inside a venue. LOCAL = this copy of this venue only. GLOBAL = every venue. They are different channels with different
 * colours and different banners, and a message sent to one never shows in the other. Offline, only this device and the NPCs are here.
 */
export function InteriorChat() {
  const open = useUiStore((s) => s.chatOpen), here = useInteriorStore((s) => s.current), channels = useChatStore((s) => s.channels);
  const [scope, setScope] = useState<ChatScope>('local');
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<Sender | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const close = () => useUiStore.getState().setChatOpen(false);
  const ch = channelFor(scope, here), list = ch ? channels[ch] ?? [] : [];
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [list.length, open, scope]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  const online = getTransport().authoritative, def = here ? INTERIORS[here.kind] : null, st = SCOPE[scope];
  const send = () => { const r = useChatStore.getState().send(scope, text); if (!r.ok) { toast(r.error ?? 'Could not send', 'bad'); return; } setText(''); };
  return (
    <AnimatePresence>
      {open && here && def?.chat && (
        <motion.div key="chat" className="pointer-events-auto absolute inset-0 z-[76] flex items-end justify-center bg-black/35 px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div role="dialog" aria-label="Chat" onClick={(e) => e.stopPropagation()} className={`panel pb-safe mb-2 flex h-[58vh] w-full max-w-md flex-col rounded-2xl border-2 ${st.ring} p-3`} initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1 rounded-xl bg-white/[0.06] p-1">
                {(['local', 'global'] as const).map((s) => <button key={s} aria-pressed={scope === s} onClick={() => { setScope(s); setMenu(null); }} className={`flex-1 rounded-lg py-1.5 text-[13px] font-bold ${scope === s ? `${SCOPE[s].tone} text-white` : 'text-white/60'}`}>{SCOPE[s].label}</button>)}
              </div>
              <button onClick={close} aria-label="Close chat" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={18} /></button>
            </div>
            <p className={`mt-2 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] ${st.text}`}>
              {scope === 'local' ? `Only people in this copy of ${here.name} (copy ${here.instance}) can see this.${online ? '' : ' Offline: it is you and the NPCs.'}` : `Everyone in any venue can see this.${online ? '' : ' Offline: global chat needs the online service, so only you see your messages.'}`}
            </p>
            <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {list.length === 0 && <p className="pt-6 text-center text-[12px] text-white/45">Nothing here yet. Say something.</p>}
              {list.map((m) => (
                <div key={m.id} className={m.from.kind === 'system' ? 'rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-center text-[12px] font-semibold text-amber-200' : 'text-[13px] leading-snug'}>
                  {m.from.kind !== 'system' && <button onClick={() => setMenu(m.from.id === 'me' ? null : m.from)} className={`mr-1.5 font-bold ${m.from.id === 'me' ? 'text-white' : st.text}`}>{m.from.name}{m.from.kind === 'npc' && <span className="ml-1 rounded bg-white/10 px-1 text-[9.5px] font-semibold text-white/60">NPC</span>}</button>}
                  <span className="text-white/90">{m.text}</span>
                </div>
              ))}
              <div ref={end} />
            </div>
            {menu && (
              <div className="mt-2 rounded-xl bg-white/[0.08] p-2">
                <div className="px-1 pb-1 text-[12px] font-bold">{menu.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {playerMenu(menu, online).map((o) => (
                    <button key={o.id} disabled={!o.enabled} title={o.reason} onClick={() => { if (o.id === 'profile' && menu.kind === 'npc') { useInteriorStore.getState().selectNpc(menu.id); close(); } setMenu(null); }} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40">{o.label}{!o.enabled && o.reason ? ` · ${o.reason}` : ''}</button>
                  ))}
                  <button onClick={() => setMenu(null)} className="rounded-lg px-2.5 py-1.5 text-[12px] text-white/60">Close</button>
                </div>
              </div>
            )}
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={CHAT.maxLength + 20} placeholder={`Message ${st.label.toLowerCase()} chat`} aria-label="Message" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2.5 text-[14px] outline-none placeholder:text-white/40" />
              <button type="submit" aria-label="Send" className={`flex h-11 w-11 items-center justify-center rounded-xl ${st.tone}`}><Send size={18} /></button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
