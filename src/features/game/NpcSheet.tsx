import { MessageCircle } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { INTERIORS } from '@/data/interiors';
import { npcRegistry } from '@/data/npcs';
import { attemptPickpocket, sentenceMinutesFor, successChance } from '@/game/crime';
import { TALK_OPTIONS, talkTo } from '@/game/talk';
import { useInteriorStore } from '@/stores/interiorStore';
import { useJailStore } from '@/stores/jailStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { toast } from '@/stores/uiStore';
import { Sheet } from './VenueSheets';

/**
 * A person in a venue. Quick conversations land in your phone's Messages as a real chat with them (and they reply);
 * the pickpocket option is a clearly marked risk at the bottom.
 */
export function NpcSheet() {
  const id = useInteriorStore((s) => s.selectedNpc), here = useInteriorStore((s) => s.current);
  const crim = useJailStore((s) => s.criminality);
  const close = () => useInteriorStore.getState().selectNpc(null);
  const npc = id ? npcRegistry.get(id) : undefined, def = here ? INTERIORS[here.kind] : null;
  const talk = (optionId: string) => {
    if (!npc) return;
    const r = talkTo(npc.id, optionId);
    if (r.ok) { sfx.pop(); toast(r.message, 'good'); } else { sfx.error(); toast(r.message, 'bad'); }
  };
  const openChat = () => { if (!npc) return; const ph = usePhoneStore.getState(); if (!ph.threads[npc.id]) ph.say(npc.id, 'them', npc.greeting); ph.setChatWith(npc.id); ph.openPhone(); ph.openApp('messages'); close(); sfx.phoneOpen(); };
  const steal = () => {
    if (!npc) return; const r = attemptPickpocket(npc.id);
    if (!r.ok) { sfx.error(); toast(r.message, 'bad'); return; }
    if (r.outcome === 'stolen') { sfx.coin(); toast(`${r.message} +${formatNaira(r.amount)}`, 'good'); } else { sfx.error(); toast(r.message, 'bad'); }
    close();
  };
  return (
    <Sheet open={!!npc} label="Person" onClose={close} z={90}>
      {npc && def && (
        <div className="pr-1">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/15 text-xl font-extrabold" style={{ background: npc.appearance.topColor }}>{npc.name[0]}</div>
            <div className="min-w-0"><div className="font-display text-xl font-extrabold leading-tight">{npc.name}</div><div className="truncate text-[13px] text-white/65">{npc.role}</div><div className="text-[11px] text-white/40">Character, not a real player</div></div>
          </div>
          <div className="mt-3 rounded-2xl rounded-tl-sm bg-white/[0.08] px-3.5 py-2.5 text-[14px] leading-snug text-white/90">“{npc.starter}”</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TALK_OPTIONS.map((o) => (
              <button key={o.id} onClick={() => talk(o.id)} className="flex flex-col items-start rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left active:bg-white/10">
                <span className="text-xl">{o.glyph}</span><span className="mt-0.5 text-[14px] font-bold">{o.label}</span><span className="text-[11px] font-semibold text-emerald-300/90">{o.hint}</span>
              </button>
            ))}
          </div>
          <button onClick={openChat} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-bold active:bg-white/20"><MessageCircle size={17} />Open your messages with {npc.name}</button>
          {def.crowd && (
            <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-rose-300"><span aria-hidden>🚨</span>Risky: pick their pocket</div>
              <div className="mt-1 text-[12px] leading-snug text-white/70">{Math.round(successChance(crim) * 100)}% chance it works. If you are caught you go to jail for {sentenceMinutesFor(crim)} minutes{crim ? ` (wanted level ${crim})` : ''}.</div>
              <button onClick={steal} className="mt-2 h-10 w-full rounded-xl bg-rose-600 text-sm font-extrabold active:bg-rose-700">Try it</button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
