export interface ContactDef {
  id: string; name: string; role: string; avatar: string; group: 'family' | 'friend' | 'business' | 'npc'; line: string;
  /** 'npc' = scripted character; 'player' = a real player (none exist yet: there is no multiplayer backend). */
  kind?: 'npc' | 'player';
  /** Shown as @username for player contacts. */
  username?: string;
  /** Can receive bank transfers. NPCs have no account balance, so the money simply leaves the player's account. */
  canReceiveMoney?: boolean;
  /** 'mom' marks the preloaded parent contact that Contacts always shows first. It is a scripted character, not a player account. */
  special?: 'mom';
}
/** How a contact is labelled in lists: players as @username, NPCs by name. */
export const contactLabel = (c: ContactDef) => (c.kind === 'player' && c.username ? `@${c.username}` : c.name);
export const CONTACTS: ContactDef[] = [
  { id: 'mama', name: 'Mama', role: 'Mom', avatar: '👩🏾', group: 'family', special: 'mom', kind: 'npc', line: 'Have you eaten? Do not skip meals.' },
  { id: 'daddy', name: 'Daddy', role: 'Family', avatar: '👨🏾‍🦳', group: 'family', line: 'Work hard. Respect your elders.' },
  { id: 'tunde', name: 'Tunde (Yaba)', role: 'Friend', avatar: '🧑🏾', group: 'friend', line: 'Guy, wetin dey happen? Link up this weekend.' },
  { id: 'chioma', name: 'Chioma', role: 'Friend', avatar: '👩🏾‍🦱', group: 'friend', line: 'Quilox on Saturday? I dey come.' },
  { id: 'bashir', name: 'Bashir the Suya Man', role: 'Business', avatar: '🧔🏾', group: 'business', line: 'Extra yaji, always.' },
  { id: 'eko-bank', name: 'Eko Trust Bank', role: 'Business', avatar: '🏦', group: 'business', line: 'Your trusted partner across Nigeria.' },
  { id: 'landlady', name: 'Mrs. Adeyemi', role: 'Neighbour', avatar: '👵🏾', group: 'npc', line: 'Do not make noise after 10pm.' },
  { id: 'agent', name: 'Seun Properties', role: 'Estate agent', avatar: '🧑🏾‍💼', group: 'business', line: 'I get a nice flat for you. Just say the word.' },
];
