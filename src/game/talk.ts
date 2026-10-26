import { npcRegistry } from '@/data/npcs';
import type { Effects } from '@/types/game';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { usePhoneStore, phoneEpoch } from '@/stores/phoneStore';
import { notifyMessage } from './social';
import { sfx } from '@/audio/sfx';

/**
 * Quick conversations with the people in a venue. Each one sends a real message into your DMs (Messages app, in a chat with that
 * person), and they answer a moment later. It earns a little social, fun and communication skill. A person can be spoken to with
 * the same line only once a minute, so it cannot be farmed.
 */
export interface TalkOption { id: string; glyph: string; label: string; hint: string; chance?: number; effects: Effects; failEffects?: Effects; me: string[]; them: string[]; failThem?: string[]; xp: number }
export const TALK_OPTIONS: TalkOption[] = [
  { id: 'hello', glyph: '👋', label: 'Say hello', hint: '+Social', effects: { social: 3 }, xp: 1, me: ['How far? 👋', 'E kaaro! How you dey?', 'Good day o! 🙌'], them: ['I dey o! And you?', 'Ah, my person! I dey fine.', 'Welcome, welcome!'] },
  { id: 'gist', glyph: '💬', label: 'Gist', hint: '+Fun  +Social', effects: { happiness: 3, social: 5 }, xp: 2, me: ['Wetin dey happen for this area today?', 'Abeg gist me. Wetin you hear?', 'Any gist? I wan hear everything.'], them: ['Ah! You never hear? Come make I tell you...', 'Omo, the gist plenty. Make we talk later in this chat.', 'Na so I dey hear am too. We go talk more.'] },
  { id: 'joke', glyph: '😂', label: 'Crack a joke', hint: '60%  +Fun  +Social', chance: 0.6, effects: { happiness: 6, social: 4 }, failEffects: { social: -1, happiness: -1 }, xp: 2, me: ['Why NEPA no dey carry light? Because them dey chop am. 😂', 'I wan tell you a joke, but wait: network don spoil.', 'My account balance and my sense of humour: both dey low. 😅'], them: ['Hahaha! You get mouth o! 😂😂', 'Stop it, you want make I laugh for here? 🤣', 'That one don land. Respect!'], failThem: ['...okay. 🙂', 'Hmm. Try another one.', 'Na so?'] },
  { id: 'fit', glyph: '✨', label: 'Hype their outfit', hint: '+Fun  +Social', effects: { happiness: 4, social: 4 }, xp: 2, me: ['Your outfit is mad! Where you buy am?', 'Ah, see fit! You dey dress.', 'Omo, the drip is on another level. ✨'], them: ['Thank you! My tailor in Yaba did it.', 'Ahn ahn, you are too kind! 😊', 'Na you dey shine pass!'] },
];
const used = new Map<string, number>();
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

export function talkTo(npcId: string, optionId: string): { ok: boolean; message: string } {
  const npc = npcRegistry.get(npcId), opt = TALK_OPTIONS.find((o) => o.id === optionId);
  if (!npc || !opt) return { ok: false, message: 'They are gone.' };
  const key = `${npcId}:${optionId}`, last = used.get(key) ?? 0;
  if (Date.now() - last < 60000) return { ok: false, message: `${npc.name} is still answering that one. Try something else.` };
  used.set(key, Date.now());
  const phone = usePhoneStore.getState(), win = opt.chance === undefined || Math.random() < opt.chance;
  phone.say(npcId, 'me', pick(opt.me));
  useStatsStore.getState().apply(win ? opt.effects : (opt.failEffects ?? {}));
  if (win) useSkillStore.getState().add('communication', opt.xp);
  const e = phoneEpoch();
  setTimeout(() => { if (e !== phoneEpoch()) return; const reply = win ? pick(opt.them) : pick(opt.failThem ?? opt.them); usePhoneStore.getState().say(npcId, 'them', reply); notifyMessage(npcId, reply); sfx.notify(); }, 1400 + Math.random() * 1200);
  return { ok: true, message: win ? `You and ${npc.name} are talking. Check your messages.` : `${npc.name} did not laugh. Try again in a minute.` };
}
