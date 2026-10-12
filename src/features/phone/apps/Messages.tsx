import { ArrowLeft, CornerUpLeft, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CONTACTS, contactLabel, type ContactDef } from '@/data/contacts';
import { useEconomyStore } from '@/stores/economyStore';
import { phoneEpoch, usePhoneStore, type ChatMessage } from '@/stores/phoneStore';
import { Empty } from '../ui';
import { TransactionCard } from '../TransactionCard';

const REPLIES = ['Okay o!', 'Hahaha, true.', 'No wahala. Let us talk later.', 'I dey hear you.', 'Make sure you rest too.', 'Sharp sharp.'];
export const QUICK_REACTIONS = ['😂', '❤️', '🔥', '😭', '👍', '💀'];

const timeFmt = new Intl.DateTimeFormat('en-NG', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'short' });
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
const dayLabel = (t: number) => (sameDay(t, Date.now()) ? 'Today' : sameDay(t, Date.now() - 864e5) ? 'Yesterday' : dayFmt.format(t));

/** What a message looks like when quoted or previewed in the list. */
function preview(m: ChatMessage): string {
  if (m.kind === 'transaction') {
    const tx = useEconomyStore.getState().transactions.find((t) => t.id === m.txId);
    return tx ? `💸 ${tx.amount < 0 ? 'Sent' : 'Received'} ${formatNaira(Math.abs(tx.amount))}` : '💸 Transfer';
  }
  return m.text;
}

function ConversationList({ onOpen }: { onOpen: (id: string) => void }) {
  const threads = usePhoneStore((s) => s.threads);
  const readAt = usePhoneStore((s) => s.readAt);
  const rows = useMemo(() => CONTACTS.filter((c) => threads[c.id]?.length).map((c) => ({ c, last: threads[c.id].at(-1)!, unread: threads[c.id].filter((m) => m.from === 'them' && m.at > (readAt[c.id] ?? 0)).length })).sort((a, b) => b.last.at - a.last.at), [threads, readAt]);
  if (!rows.length) return <Empty>No messages yet. Start a chat from Contacts.</Empty>;
  return (
    <ul className="divide-y divide-slate-200 bg-white">
      {rows.map(({ c, last, unread }) => (
        <li key={c.id}>
          <button onClick={() => { sfx.click(); onOpen(c.id); }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-slate-50">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl">{c.avatar}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-bold text-slate-900">{contactLabel(c)}</span><span className={`shrink-0 text-[11px] ${unread ? 'font-bold text-accent' : 'text-slate-400'}`}>{sameDay(last.at, Date.now()) ? timeFmt.format(last.at) : dayFmt.format(last.at)}</span></span>
              <span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] text-slate-500">{last.from === 'me' ? '✓ ' : ''}{preview(last)}</span>{unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{unread}</span>}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Bubble({ m, all, selected, onSelect, contact }: { m: ChatMessage; all: ChatMessage[]; selected: boolean; onSelect: () => void; contact: ContactDef }) {
  const mine = m.from === 'me';
  const quoted = m.replyTo ? all.find((x) => x.id === m.replyTo) : undefined;
  const reactions = Object.entries(m.reactions ?? {});
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[82%] ${reactions.length ? 'mb-3' : ''}`}>
        <button onClick={onSelect} aria-pressed={selected} aria-label={`Message, ${mine ? 'sent by you' : `from ${contact.name}`}. Tap for options.`}
          className={`block w-full text-left shadow-sm transition ${m.kind === 'transaction' ? 'rounded-2xl p-1' : 'px-3 py-1.5'} ${mine ? 'rounded-2xl rounded-br-md bg-emerald-600 text-white' : 'rounded-2xl rounded-bl-md bg-white text-slate-900'} ${selected ? 'ring-2 ring-accent ring-offset-1' : ''}`}>
          {quoted && (
            <span className={`mb-1 block rounded-lg border-l-4 px-2 py-1 text-[12px] ${mine ? 'border-white/70 bg-black/15' : 'border-accent bg-slate-100'}`}>
              <b className="block text-[11px]">{quoted.from === 'me' ? 'You' : contactLabel(contact)}</b>
              <span className="line-clamp-2">{preview(quoted)}</span>
            </span>
          )}
          {m.kind === 'transaction' && m.txId ? <TransactionCard txId={m.txId} compact /> : <span className="whitespace-pre-wrap break-words text-[14px] leading-snug">{m.text}</span>}
          <span className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'} ${m.kind === 'transaction' ? 'px-2 pb-1' : ''}`}>{timeFmt.format(m.at)}{mine && <span aria-label="delivered">✓✓</span>}</span>
        </button>
        {reactions.length > 0 && (
          <span className={`absolute -bottom-3 flex gap-0.5 ${mine ? 'right-2' : 'left-2'}`}>
            {reactions.map(([emoji, who]) => <span key={emoji} className="flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[12px] shadow ring-1 ring-slate-200">{emoji}{who.length > 1 && <span className="text-[10px] font-bold text-slate-500">{who.length}</span>}</span>)}
          </span>
        )}
      </div>
    </div>
  );
}

function Conversation({ contact, onBack }: { contact: ContactDef; onBack: () => void }) {
  const msgs = usePhoneStore((s) => s.threads[contact.id]) ?? [];
  const say = usePhoneStore((s) => s.say);
  const react = usePhoneStore((s) => s.react);
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { usePhoneStore.getState().markThreadRead(contact.id); }, [contact.id, msgs.length]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  const selectedMsg = msgs.find((m) => m.id === selected);
  const replyMsg = msgs.find((m) => m.id === replyTo);

  const send = () => {
    const t = text.trim(); if (!t) return;
    const epoch = phoneEpoch();
    say(contact.id, 'me', t, replyTo ? { replyTo } : undefined);
    setText(''); setReplyTo(null); setSelected(null); sfx.pop();
    window.setTimeout(() => {
      if (epoch !== phoneEpoch()) return; // life was reset meanwhile
      say(contact.id, 'them', Math.random() > 0.5 ? contact.line : REPLIES[Math.floor(Math.random() * REPLIES.length)]); sfx.notify();
    }, 1200);
  };
  const toggleReaction = (emoji: string) => {
    if (!selectedMsg) return;
    const had = selectedMsg.reactions?.[emoji]?.includes('me');
    react(contact.id, selectedMsg.id, emoji, 'me'); sfx.pop();
    if (!had && selectedMsg.from === 'me' && Math.random() > 0.6) { const epoch = phoneEpoch(); window.setTimeout(() => { if (epoch === phoneEpoch()) react(contact.id, selectedMsg.id, '❤️', 'them'); }, 900); }
    setSelected(null);
  };

  return (
    <div className="flex h-full flex-col bg-[#ECE5DD]">
      <header className="flex items-center gap-2 border-b bg-white px-2 py-2">
        <button onClick={onBack} aria-label="Back to chats" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"><ArrowLeft size={20} /></button>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">{contact.avatar}</span>
        <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold leading-tight text-slate-900">{contactLabel(contact)}</div><div className="text-[11px] text-slate-500">{contact.kind === 'player' ? 'Player' : contact.role}</div></div>
      </header>
      <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-3" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Say hi to {contact.name.split(' ')[0]} 👋</p>}
        {msgs.map((m, i) => (
          <div key={m.id}>
            {(i === 0 || !sameDay(msgs[i - 1].at, m.at)) && <div className="my-2 flex justify-center"><span className="rounded-lg bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">{dayLabel(m.at)}</span></div>}
            <Bubble m={m} all={msgs} contact={contact} selected={selected === m.id} onSelect={() => setSelected((s) => (s === m.id ? null : m.id))} />
          </div>
        ))}
        <div ref={end} />
      </div>

      {selectedMsg && (
        <div className="flex items-center gap-1 border-t bg-white px-2 py-1.5" role="toolbar" aria-label="Message options">
          <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
            {QUICK_REACTIONS.map((e) => <button key={e} onClick={() => toggleReaction(e)} aria-label={`React ${e}`} aria-pressed={!!selectedMsg.reactions?.[e]?.includes('me')} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${selectedMsg.reactions?.[e]?.includes('me') ? 'bg-accent/15 ring-2 ring-accent' : 'active:bg-slate-100'}`}>{e}</button>)}
          </div>
          <button onClick={() => { setReplyTo(selectedMsg.id); setSelected(null); }} className="flex h-10 items-center gap-1 rounded-full bg-slate-100 px-3 text-[13px] font-bold text-slate-700"><CornerUpLeft size={15} />Reply</button>
          <button onClick={() => setSelected(null)} aria-label="Close options" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500"><X size={18} /></button>
        </div>
      )}
      {replyMsg && (
        <div className="flex items-center gap-2 border-t bg-white px-3 py-1.5">
          <div className="min-w-0 flex-1 rounded-lg border-l-4 border-accent bg-slate-100 px-2 py-1 text-[12px] text-slate-700"><b className="block text-[11px]">Replying to {replyMsg.from === 'me' ? 'yourself' : contact.name.split(' ')[0]}</b><span className="line-clamp-1">{preview(replyMsg)}</span></div>
          <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500"><X size={16} /></button>
        </div>
      )}
      <form className="flex gap-2 border-t bg-white p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={500} className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-[16px] text-slate-900 outline-none ring-2 ring-transparent focus:ring-accent" />
        <button aria-label="Send message" disabled={!text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:bg-slate-300"><Send size={18} /></button>
      </form>
    </div>
  );
}

export function MessagesApp() {
  const chatWith = usePhoneStore((s) => s.chatWith);
  const set = usePhoneStore((s) => s.setChatWith);
  const contact = chatWith ? CONTACTS.find((x) => x.id === chatWith) : undefined;
  if (!contact) return <ConversationList onOpen={set} />;
  return <Conversation key={contact.id} contact={contact} onBack={() => set(null)} />;
}
