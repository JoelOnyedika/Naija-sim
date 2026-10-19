import './mockStorage';
(globalThis as any).window = globalThis; // sendMessage schedules replies with window.setTimeout; also turns persistence on
const { registerContent } = await import('../src/content');
registerContent();
const S = await import('../src/game/social');
const { startNewLife } = await import('../src/game/life');
const { useSocialStore } = await import('../src/stores/socialStore');
const { usePhoneStore, MAX_PINS } = await import('../src/stores/phoneStore');
const { useSettingsStore } = await import('../src/stores/settingsStore');
const { useEconomyStore } = await import('../src/stores/economyStore');
const { sendTransfer } = await import('../src/game/bank');
const { clearGuard } = await import('../src/game/guard');
const { runDueEvents } = await import('../src/game/scheduler');
const { useClockStore } = await import('../src/stores/clockStore');
const { PLAYERS } = await import('../src/data/players');
const { resolvePeer } = await import('../src/game/peers');

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const soc = () => useSocialStore.getState(), ph = () => usePhoneStore.getState();
const fresh = () => { startNewLife('lapo'); clearGuard(); useSettingsStore.getState().setMessagePrivacy('everyone'); };
const A = PLAYERS[0].id, B = PLAYERS[1].id, C = PLAYERS[2].id;

console.log('Contacts');
fresh();
ok(S.searchPlayers('lekki').map((p) => p.id).join() === A && S.searchPlayers('@LEKKI').length === 1 && S.searchPlayers('').length === 0 && S.searchPlayers('zzzz').length === 0, 'search finds players by username (case and @ ignored), and nothing for empty or unknown');
ok(S.addContact(A).ok && !S.addContact(A).ok && !S.addContact('p:nobody').ok && S.isContact(A), 'add a contact once; duplicates and unknown players are refused');
ok(S.removeContact(A).ok && !S.isContact(A) && !S.removeContact(A).ok, 'remove a contact');
ok(resolvePeer('mama')?.subtitle.startsWith('Mom') === true && resolvePeer('mama')?.kind === 'npc', 'Mom is a defined scripted contact (not a player account)');

console.log('Message requests and privacy');
fresh();
ok(S.deliveryPolicy(A) === 'request', 'a stranger with privacy "Everyone" is a request');
ok(S.receiveFromPlayer(A, 'Hello!') === 'requested' && S.pendingRequests().length === 1 && !ph().threads[A], 'their first message goes to Message Requests, not Chats');
ok(S.receiveFromPlayer(A, 'Hello again') === 'duplicate' && S.pendingRequests().length === 1, 'a second message does not create a second request');
const req = S.pendingRequests()[0];
ok(S.acceptRequest(req.id).ok && ph().threads[A]?.length === 1 && ph().threads[A][0].text === 'Hello!' && S.pendingRequests().length === 0, 'accepting moves it into Chats with their message');
ok(!S.acceptRequest(req.id).ok, 'a request cannot be accepted twice');
ok(S.deliveryPolicy(A) === 'direct' && S.receiveFromPlayer(A, 'Thanks') === 'delivered' && ph().threads[A].length === 2, 'after accepting, their later messages go straight to Chats');
ok(S.receiveFromPlayer(B, 'Hi') === 'requested', 'another stranger still needs a request');
ok(S.rejectRequest(S.pendingRequests()[0].id).ok && S.deliveryPolicy(B) === 'blocked' && S.receiveFromPlayer(B, 'Please?') === 'blocked' && S.pendingRequests().length === 0, 'rejecting blocks further requests from them');
S.addContact(C);
ok(S.deliveryPolicy(C) === 'direct' && S.receiveFromPlayer(C, 'Hey') === 'delivered' && S.pendingRequests().length === 0, 'a contact you added goes straight to Chats');
console.log('"Only friends" privacy');
useSettingsStore.getState().setMessagePrivacy('friends');
const D = PLAYERS[3].id;
ok(S.deliveryPolicy(D) === 'blocked' && S.receiveFromPlayer(D, 'Hi') === 'blocked' && S.pendingRequests().length === 0, 'with "Only friends", a stranger cannot even send a request');
ok(S.deliveryPolicy(C) === 'direct' && S.receiveFromPlayer(C, 'Still here') === 'delivered', 'people you added can still message you');
ok(S.deliveryPolicy(A) === 'blocked', 'someone you only approved earlier is not a friend, so they are blocked too');
useSettingsStore.getState().setMessagePrivacy('everyone');
ok(S.deliveryPolicy(A) === 'direct', 'switching back to "Everyone" restores approved players');
console.log('The simulated contact event');
fresh();
useClockStore.setState({ minutes: 480 }); runDueEvents();
ok(S.pendingRequests().length === 0, 'nothing happens at the start of a life');
useClockStore.setState({ minutes: 480 + 2 * 1440 + 5 }); runDueEvents(); runDueEvents(); runDueEvents();
ok(S.pendingRequests().length === 1, 'after two game days one simulated player sends a request, once however often the event runs');
useSettingsStore.getState().setMessagePrivacy('friends');
useClockStore.setState({ minutes: 480 + 4 * 1440 + 5 }); runDueEvents();
ok(S.pendingRequests().length === 1, 'under "Only friends" the next attempt is blocked');
useSettingsStore.getState().setMessagePrivacy('everyone');

console.log('Sending');
fresh();
ok(!S.sendMessage('mama', '   ').ok && !S.sendMessage('mama', 'x'.repeat(501)).ok && !S.sendMessage('nobody', 'hi').ok, 'empty, too-long and unknown-chat messages are refused');
ok(S.sendMessage('mama', 'Hello Mama').ok && ph().threads.mama.at(-1)!.text === 'Hello Mama', 'sending to a character works');
ok(S.sendMessage(A, 'Hi Larry').ok && soc().outbound[A] === 'accepted', 'a player who accepts strangers will reply to your first message');
ok(S.sendMessage(PLAYERS.find((p) => !p.acceptsStrangers)!.id, 'Hi').ok && soc().outbound[PLAYERS.find((p) => !p.acceptsStrangers)!.id] === 'pending', 'a player who does not accept strangers leaves your message pending');

console.log('Groups');
fresh();
const g1 = S.createGroup({ name: '  Weekend   Crew ', icon: '🎉', members: ['mama', A, A] });
ok(g1.ok && !!g1.group && g1.group.name === 'Weekend Crew' && g1.group.members.length === 2, 'a group is created with a tidy name and no duplicate members');
ok(soc().groups.length === 1 && resolvePeer(g1.group!.id)?.kind === 'group' && ph().threads[g1.group!.id].length === 1, 'it appears in the groups list with its first system message');
clearGuard();
ok(!S.createGroup({ name: 'weekend crew', icon: '🎉', members: [A, 'mama'] }).ok && soc().groups.length === 1, 'the same group cannot be created twice (rapid taps or later)');
ok(!S.createGroup({ name: '', icon: '🎉', members: [A] }).ok && !S.createGroup({ name: 'x'.repeat(31), icon: '🎉', members: [A] }).ok && !S.createGroup({ name: 'Solo', icon: '🎉', members: [] }).ok && !S.createGroup({ name: 'Bad icon', icon: 'x', members: [A] }).ok, 'name, size and icon are validated');
ok(!S.createGroup({ name: 'With bank', icon: '🎉', members: ['bank'] }).ok && !S.createGroup({ name: 'Ghost', icon: '🎉', members: ['p:ghost'] }).ok, 'businesses and unknown people cannot be added');
ok(S.sendMessage(g1.group!.id, 'Who is coming?').ok && ph().threads[g1.group!.id].length === 2, 'you can post in a group');
ok(S.leaveGroup(g1.group!.id).ok && soc().groups.length === 0 && !ph().threads[g1.group!.id], 'leaving a group removes it and its messages');

console.log('Pins, deleting, read state');
fresh();
S.sendMessage('mama', 'one'); S.sendMessage('mama', 'two'); S.sendMessage('mama', 'three'); S.sendMessage('mama', 'four');
const ids = ph().threads.mama.map((m) => m.id);
ok(ids.slice(0, MAX_PINS).every((id) => ph().pin('mama', id)) && !ph().pin('mama', ids[3]), `at most ${MAX_PINS} messages can be pinned in one chat`);
ok(ph().pin('mama', ids[0]) && !ph().threads.mama[0].pinned && ph().pin('mama', ids[3]), 'unpinning frees a slot');
useEconomyStore.getState().reset(1_000_000);
sendTransfer({ to: 'dj_kele', amount: 50_000 }); const ledgerBefore = useEconomyStore.getState().transactions.length, moneyBefore = useEconomyStore.getState().money;
ok(S.deleteChat('p:dj_kele').ok && !ph().threads['p:dj_kele'] && useEconomyStore.getState().transactions.length === ledgerBefore && useEconomyStore.getState().money === moneyBefore, 'deleting a chat (that has a transfer in it) leaves the bank ledger and balance alone');
S.deleteChat('mama'); S.deleteChat(A); // start from empty chats
ph().say('mama', 'them', 'hi'); ph().say(A, 'them', 'yo');
ok(S.unreadCount('mama') === 1 && S.unreadCount(A) === 1, 'unread counts are per chat');
ph().markAllRead();
ok(S.unreadCount('mama') === 0 && S.unreadCount(A) === 0, 'mark all as read clears every chat');

console.log(fails ? `\n${fails} social check(s) FAILED` : '\nAll social checks passed');
process.exit(fails ? 1 : 0);
