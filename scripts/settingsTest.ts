import './mockStorage';

// zustand's persist reads `window.localStorage`. Node has no window, so provide one BEFORE the stores load; otherwise
// persistence is silently off and these tests would prove nothing about saving.
(globalThis as any).window = globalThis;
const { tierFloor, useSettingsStore } = await import('../src/stores/settingsStore');
const { useAuthStore } = await import('../src/stores/authStore');

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const s = () => useSettingsStore.getState();

console.log('Settings');
ok(!!useSettingsStore.persist, 'persistence is active in this test');
ok(s().theme === 'light' && s().graphics === 'auto' && s().batterySaver === false && s().sfx && s().music, 'defaults: light theme, graphics Auto, battery saver off, sound on');
s().setTheme('dark'); s().setGraphics('off'); s().setBatterySaver(true);
ok(s().theme === 'dark' && s().graphics === 'off' && s().batterySaver, 'settings change');
ok(JSON.parse(localStorage.getItem('nigerialife.settings')!).state.theme === 'dark', 'settings are written to storage');
ok(s().messagePrivacy === 'everyone', 'message privacy defaults to Everyone');
s().setMessagePrivacy('friends'); ok(JSON.parse(localStorage.getItem('nigerialife.settings')!).state.messagePrivacy === 'friends', 'message privacy is saved'); s().setMessagePrivacy('everyone');
ok(tierFloor({ batterySaver: true }) === 2 && tierFloor({ batterySaver: false }) === 0, 'battery saver keeps graphics at the low tier or below');

// A save made before theme/graphics existed must keep its sound settings and gain the new defaults.
// A real page load starts from the default state, so put the store back to its defaults before rehydrating.
useSettingsStore.setState(useSettingsStore.getInitialState(), true);
localStorage.setItem('nigerialife.settings', JSON.stringify({ state: { sfx: false, music: false }, version: 1 }));
await useSettingsStore.persist.rehydrate();
console.log('   rehydrated:', JSON.stringify({ sfx: s().sfx, music: s().music, theme: s().theme, graphics: s().graphics, batterySaver: s().batterySaver }));
ok(s().sfx === false && s().music === false && s().theme === 'light' && s().graphics === 'auto', 'an older settings save keeps its values and gets the new defaults');

console.log('Account');
const a = useAuthStore.getState();
ok(a.signup('joel', 'secret1') === null, 'sign up');
ok(useAuthStore.getState().changePassword('wrong', 'newpass') !== null, 'wrong current password is refused');
ok(useAuthStore.getState().changePassword('secret1', 'abc') !== null, 'too-short new password is refused');
ok(useAuthStore.getState().changePassword('secret1', 'secret1') !== null, 'reusing the same password is refused');
ok(useAuthStore.getState().changePassword('secret1', 'newpass') === null, 'a valid change succeeds');
useAuthStore.getState().logout();
ok(useAuthStore.getState().login('joel', 'secret1') !== null, 'the old password no longer works');
ok(useAuthStore.getState().login('joel', 'newpass') === null, 'the new password works');
useAuthStore.getState().logout(); useAuthStore.getState().google();
ok(useAuthStore.getState().changePassword('', 'whatever') !== null, 'a Google (mock) account has no password to change');

console.log(fails ? `\n${fails} settings check(s) FAILED` : '\nAll settings checks passed');
process.exit(fails ? 1 : 0);
