import { NPC } from '@/data/balance';
import { INTERIORS } from '@/data/interiors';
import { makeNpcs } from '@/data/npcs';
import { useChatStore } from '@/stores/chatStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { channelFor } from './chat';

const LINES: Record<string, string[]> = {
  market: ['Oga, come and see fabric!', 'Last price, last price!', 'Abeg make room, I dey pass!', 'This one na original.', 'Customer, wetin you dey find?'],
  church: ['God is good.', 'Praise the Lord!', 'The choir is on fire today.', 'Good morning, church.', 'Amen!'],
  gallery: ['Look at the colours on that one.', 'Who made this piece?', 'I could stare at this all day.', 'Lagos artists are different.'],
  stadium: ['Referee, are you blind?!', 'GOAL! Did you see that?', 'Up Naija!', 'Pass the ball, pass the ball!'],
  club: ['DJ, play that one again!', 'Bottle service on the left!', 'This place is packed tonight.', 'Who is paying for the table?', 'Lagos nights are unmatched.'],
  showroom: ['That Range Rover is clean.', 'How much for the G-Wagon?', 'Test drive, please.'],
};
let nextAt = 0;
/** Ambient lines from NPCs in the LOCAL channel only, always marked as NPCs. They never speak in global chat and never pose as players. */
export function stepChatter(now = Date.now(), rnd: () => number = Math.random) {
  const here = useInteriorStore.getState().current;
  if (!here || !INTERIORS[here.kind].chat || here.npcCount <= 0) return;
  if (now < nextAt) return;
  nextAt = now + (NPC.chatterSeconds[0] + (NPC.chatterSeconds[1] - NPC.chatterSeconds[0]) * rnd()) * 1000;
  const ch = channelFor('local', here); if (!ch) return;
  const npc = makeNpcs(here.kind, here.seed, here.npcCount)[Math.floor(rnd() * here.npcCount)];
  const lines = LINES[here.kind] ?? ['Hello.'];
  useChatStore.getState().receive(ch, 'local', { id: npc.id, name: npc.name, kind: 'npc' }, lines[Math.floor(rnd() * lines.length)], now);
}
export const resetChatter = () => { nextAt = 0; };
