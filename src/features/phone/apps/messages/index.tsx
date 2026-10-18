import { useState } from 'react';
import { resolvePeer } from '@/game/peers';
import { usePhoneStore } from '@/stores/phoneStore';
import { Conversation } from './Conversation';
import { MessagesList, type Section } from './List';
import { NewGroup } from './NewGroup';

/** Messages: Chats, Groups and Message Requests. Message text lives in phoneStore; the rules are in game/social.ts. */
export function MessagesApp() {
  const chatWith = usePhoneStore((s) => s.chatWith), set = usePhoneStore((s) => s.setChatWith);
  const [creating, setCreating] = useState(false), [section, setSection] = useState<Section>('chats');
  const peer = chatWith ? resolvePeer(chatWith) : undefined;
  if (creating) return <NewGroup done={(id) => { setCreating(false); setSection('groups'); if (id) set(id); }} />;
  if (peer) return <Conversation key={peer.id} contact={peer} onBack={() => set(null)} />;
  return <MessagesList section={section} setSection={setSection} onOpen={set} onNewGroup={() => setCreating(true)} />;
}
