import { useEffect, useRef, useState } from 'react';
import { CONTACTS } from '@/data/contacts';
import { usePhoneStore } from '@/stores/phoneStore';
import { sfx } from '@/audio/sfx';
import { Card, Empty, Row } from '../ui';

const REPLIES = ['Okay o!', 'Hahaha, true.', 'No wahala. Let us talk later.', 'I dey hear you.', 'Make sure you rest too.', 'Sharp sharp.'];

export function MessagesApp() {
  const chatWith = usePhoneStore((s) => s.chatWith);
  const set = usePhoneStore((s) => s.setChatWith);
  const threads = usePhoneStore((s) => s.threads);
  const say = usePhoneStore((s) => s.say);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [threads, chatWith]);
  const withThreads = CONTACTS.filter((c) => threads[c.id]?.length);

  if (!chatWith) {
    return (
      <div className="space-y-2 p-3">
        {withThreads.length === 0 && <Empty>No messages yet. Start a chat from Contacts.</Empty>}
        {withThreads.map((c) => { const last = threads[c.id].at(-1)!; return (
          <button key={c.id} className="w-full text-left" onClick={() => { sfx.click(); set(c.id); }}><Card><Row glyph={c.avatar} title={c.name} sub={last.text} /></Card></button>
        ); })}
      </div>
    );
  }
  const c = CONTACTS.find((x) => x.id === chatWith)!;
  const msgs = threads[chatWith] ?? [];
  const send = () => {
    if (!text.trim()) return;
    say(chatWith, 'me', text.trim()); setText(''); sfx.pop();
    setTimeout(() => { say(chatWith, 'them', Math.random() > 0.5 ? c.line : REPLIES[Math.floor(Math.random() * REPLIES.length)]); sfx.notify(); }, 1200);
  };
  return (
    <div className="flex h-full flex-col">
      <button onClick={() => set(null)} className="flex items-center gap-2 border-b bg-white px-3 py-2 text-left text-sm font-bold">‹ <span className="text-xl">{c.avatar}</span>{c.name}</button>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.map((m) => <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === 'me' ? 'ml-auto bg-emerald-600 text-white' : 'bg-white text-slate-900 shadow-sm'}`}>{m.text}</div>)}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t bg-white p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2 text-[16px] text-slate-900 outline-none" />
        <button className="rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">Send</button>
      </form>
    </div>
  );
}
