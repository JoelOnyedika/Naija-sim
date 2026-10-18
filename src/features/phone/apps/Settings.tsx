import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { restartLife } from '@/game/life';
import { useAuthStore } from '@/stores/authStore';
import { useFlowStore } from '@/stores/flowStore';
import { useLifeStore } from '@/stores/lifeStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Note, Segmented, Title } from '../ui';

const Toggle = ({ label, sub, on, tap }: { label: string; sub?: string; on: boolean; tap: () => void }) => (
  <button role="switch" aria-checked={on} onClick={() => { sfx.click(); tap(); }} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm">
    <span><span className="block text-sm font-bold">{label}</span>{sub && <span className="block text-xs leading-snug text-slate-500">{sub}</span>}</span>
    <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}><i className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></span>
  </button>
);
const Unavailable = ({ label, why }: { label: string; why: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 p-3.5 opacity-70" aria-disabled="true">
    <span><span className="block text-sm font-bold">{label}</span><span className="block text-xs leading-snug text-slate-500">{why}</span></span>
    <span className="shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">Not available yet</span>
  </div>
);
const LinkRow = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={() => { sfx.click(); onClick(); }} className="flex w-full items-center justify-between rounded-2xl bg-white p-3.5 text-left text-sm font-bold shadow-sm">{label}<ChevronRight size={18} className="text-slate-400" /></button>
);
const Back = ({ onClick, title }: { onClick: () => void; title: string }) => <button onClick={onClick} className="mb-1 px-1 text-sm font-bold text-accent">‹ Settings<span className="sr-only"> from {title}</span></button>;
const Section = ({ title, children }: { title: string; children: ReactNode }) => <><Title>{title}</Title><div className="space-y-2">{children}</div></>;

function PasswordForm({ done }: { done: () => void }) {
  const [cur, setCur] = useState(''), [next, setNext] = useState(''), [again, setAgain] = useState(''), [error, setError] = useState('');
  const field = (label: string, v: string, set: (s: string) => void, auto: string) => (
    <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}
      <input type="password" autoComplete={auto} value={v} onChange={(e) => { set(e.target.value); setError(''); }} className="mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] normal-case tracking-normal text-slate-900 outline-none ring-2 ring-transparent focus:ring-accent" />
    </label>
  );
  const submit = () => {
    if (next !== again) return setError('The new passwords do not match.');
    const e = useAuthStore.getState().changePassword(cur, next);
    if (e) { sfx.error(); return setError(e); }
    sfx.coin(); toast('Password changed', 'good'); done();
  };
  return (
    <Card>
      {field('Current password', cur, setCur, 'current-password')}{field('New password', next, setNext, 'new-password')}{field('Repeat new password', again, setAgain, 'new-password')}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">{error}</p>}
      <div className="mt-4 flex gap-2"><Btn tone="light" className="flex-1" onClick={done}>Cancel</Btn><Btn className="flex-1 !bg-accent" disabled={!cur || !next || !again} onClick={submit}>Change password</Btn></div>
      <Note>This changes the password of your account on this device only. Accounts are a local prototype, so there is no recovery if you forget it.</Note>
    </Card>
  );
}

/** A draft policy that describes what the game really does today. Update it whenever data handling changes. */
function PrivacyPolicy() {
  const P = ({ h, children }: { h: string; children: ReactNode }) => <div className="mt-3"><h4 className="text-[13px] font-bold">{h}</h4><p className="mt-0.5 text-[13px] leading-snug text-slate-600">{children}</p></div>;
  return (
    <Card>
      <p className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Draft policy for the prototype. Not a legal document.</p>
      <P h="What is stored">Your username, password, character, money, items, messages and settings are saved in this browser (local storage) on this device. Nothing is sent to a server, because the game has no server yet.</P>
      <P h="Passwords">Accounts are a local stand-in. Passwords are saved on this device in plain text and are not encrypted. Do not reuse a real password.</P>
      <P h="Other players">There is no multiplayer. Other players, chats and leaderboard names you see are fictional characters made by the game.</P>
      <P h="Money">All money is in-game Naira. No real payments, banks or financial services are connected.</P>
      <P h="Sharing and tracking">The game does not send your data to anyone and does not run analytics.</P>
      <P h="Deleting your data">Starting a new life resets the life you were playing. Clearing this site&apos;s data in your browser removes everything the game saved, including your account.</P>
      <P h="Changes">When the game gains online features, this policy will be rewritten to say exactly what is collected, where it is kept and for how long.</P>
    </Card>
  );
}

export function SettingsApp() {
  const s = useSettingsStore();
  const session = useAuthStore((a) => a.session);
  const hasLife = useLifeStore((l) => !!l.lifeType);
  const [view, setView] = useState<'main' | 'password' | 'privacy'>('main');
  const [confirm, setConfirm] = useState(false);
  const logout = () => { usePhoneStore.getState().closePhone(); useAuthStore.getState().logout(); useFlowStore.getState().go('landing'); };

  if (view === 'password') return <div className="p-3"><Back title="Change password" onClick={() => setView('main')} /><Title>Change password</Title><PasswordForm done={() => setView('main')} /></div>;
  if (view === 'privacy') return <div className="p-3"><Back title="Privacy policy" onClick={() => setView('main')} /><Title>Privacy policy</Title><PrivacyPolicy /></div>;

  return (
    <div className="p-3">
      <Section title="Appearance">
        <Card><p className="mb-2 text-sm font-bold">Theme</p><Segmented label="Theme" value={s.theme} onChange={s.setTheme} options={[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]} />
          <p className="mt-2 text-xs leading-snug text-slate-500">Changes how phone apps look. The game world is always shown as it is.</p></Card>
      </Section>
      <Section title="Performance and graphics">
        <Toggle label="Battery saver" sub="Stops decorative animation and keeps graphics at Low or below to save power." on={s.batterySaver} tap={() => s.setBatterySaver(!s.batterySaver)} />
        <Card><p className="mb-2 text-sm font-bold">Graphics</p><Segmented label="Graphics" value={s.graphics} onChange={s.setGraphics} options={[['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]} />
          <p className="mt-2 text-xs leading-snug text-slate-500">{s.graphics === 'auto' ? 'The game measures your frame rate and lowers or raises quality by itself.' : s.graphics === 'on' ? 'Best quality your device allows, with no automatic lowering (Battery saver still caps it at Low).' : 'Lowest quality: smaller render size and no shadows. Room lights and the whole game still work.'}</p></Card>
      </Section>
      <Section title="Sound"><Toggle label="Sound effects" on={s.sfx} tap={s.toggleSfx} /><Toggle label="Music" on={s.music} tap={s.toggleMusic} /></Section>
      <Section title="Messaging and profile">
        <Card><p className="mb-2 text-sm font-bold">Who can message me</p><Segmented label="Who can message me" value={s.messagePrivacy} onChange={s.setMessagePrivacy} options={[['everyone', 'Everyone'], ['friends', 'Only friends']]} />
          <p className="mt-2 text-xs leading-snug text-slate-500">{s.messagePrivacy === 'everyone' ? 'New people arrive as message requests. You choose whether to accept.' : 'Only players you added as contacts can message you. Everyone else is blocked, even from sending a request.'}</p></Card>
        <Toggle label="Show relationship status" sub="Shows Single (or your status later) on your profile. Off by default." on={s.showRelationship} tap={() => s.setShowRelationship(!s.showRelationship)} />
        <Unavailable label="Show email on profile" why="Accounts have no email address yet." />
      </Section>
      <Section title="Account and security">
        <Card><p className="text-sm font-bold">Signed in as {session ?? 'nobody'}</p><p className="text-xs text-slate-500">Local account on this device</p></Card>
        <LinkRow label="Change password" onClick={() => setView('password')} />
        <Unavailable label="Lock account" why="A lock needs a server to enforce it. Not possible in a local-only game." />
        <LinkRow label="Privacy policy" onClick={() => setView('privacy')} />
        <Btn tone="light" className="w-full" onClick={logout}>Log out</Btn>
      </Section>
      <Section title="Danger zone">
        <Card><p className="text-sm font-bold">Start a new life</p><p className="text-xs text-slate-500">Your current life is deleted. The roulette decides who you become.</p>
          {confirm ? <div className="mt-2 flex gap-2"><Btn tone="light" onClick={() => setConfirm(false)}>Keep playing</Btn><Btn tone="red" onClick={() => { usePhoneStore.getState().closePhone(); restartLife(); }}>Spin again</Btn></div> : <Btn tone="red" className="mt-2" onClick={() => setConfirm(true)} disabled={!hasLife}>Start New Life</Btn>}</Card>
      </Section>
      <p className="pt-2 text-center text-xs text-slate-400">Nigeria Life · prototype 0.2</p>
    </div>
  );
}
