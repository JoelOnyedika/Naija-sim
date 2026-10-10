import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { restartLife } from '@/game/life';
import { useAuthStore } from '@/stores/authStore';
import { useFlowStore } from '@/stores/flowStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/uiStore';
import { useLifeStore } from '@/stores/lifeStore';
import { VEHICLES } from '@/data/vehicles';
import { usePhoneStore } from '@/stores/phoneStore';
import { Btn, Card, Row, Title } from '../ui';

const Acc = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return <Card><button onClick={() => { sfx.click(); setOpen(!open); }} className="flex w-full items-center justify-between text-left text-sm font-bold">{q}<span>{open ? '−' : '+'}</span></button>{open && <p className="mt-2 text-[13px] leading-snug text-slate-600">{a}</p>}</Card>;
};

export function GuideApp() {
  return (
    <div className="space-y-2 p-3">
      <Acc q="How do I stay alive?" a="Keep Hunger, Thirst, Toilet, Energy and Hygiene up. Tap furniture at home to use it: bed to sleep, fridge to eat, toilet, shower or bucket to wash. Order food in the Food app." />
      <Acc q="How do I make money?" a="Work shifts in the Jobs app, take gigs in Hustle, or invest. Higher Charisma unlocks better jobs. Check your Bank for alerts." />
      <Acc q="How do I decorate?" a="Press Buy. Pick an item, drag the green ghost into place, rotate it, and confirm. Tap an item you already placed to move, store or sell it. Red means it does not fit." />
      <Acc q="How do I move house?" a="Open the Houses app, pick a listing and press Move In or Buy. Your furniture moves with you. Better homes unlock garages where your cars park." />
      <Acc q="What are tasks?" a="Small goals on the right side of the screen. Finish them to earn Charisma, Social and cash." />
      <Acc q="What is Lapo vs Nepo?" a="The Life Roulette decides your start. Lapo Baby is common and starts with little. Nepo Baby is rare and starts rich." />
    </div>
  );
}

export function HelpApp() {
  return (
    <div className="space-y-2 p-3">
      <Acc q="My game did not save" a="The prototype saves automatically in this browser. Clearing site data or using private mode will remove it." />
      <Acc q="I cannot place furniture" a="Red ghost means the spot is blocked or the item does not suit that area (beds need a room, plants can go outside)." />
      <Acc q="Why can I not see my cars?" a="Cars need parking. Homes with a garage or parking space show them. Move to a bigger place." />
      <Acc q="Sound is too loud" a="Open Settings on your phone and switch sound effects or music off." />
      <Card className="text-center text-sm text-slate-500">Need more help? support@nigerialife.example (placeholder)</Card>
    </div>
  );
}

export function InviteApp() {
  const me = useAuthStore((s) => s.session) ?? 'player';
  const code = `${me.slice(0, 4).toUpperCase()}-${(me.length * 7919 % 9000 + 1000)}`;
  return (
    <div className="space-y-3 p-3">
      <Card className="bg-violet-50 text-center"><p className="text-sm text-slate-600">Your invite code</p><p className="font-display text-3xl font-extrabold tracking-wider">{code}</p>
        <Btn className="mt-3" onClick={() => { void navigator.clipboard?.writeText(`Join me on Nigeria Life! Code ${code}`); toast('Invite copied', 'good'); }}>Copy invite</Btn></Card>
      <Card><Row glyph="👥" title="Friends joined" sub="0 so far. Rewards arrive with multiplayer." /></Card>
    </div>
  );
}

export function PoliceApp() {
  const act = (m: string) => { sfx.click(); toast(m); };
  return (
    <div className="space-y-2 p-3">
      <Card className="bg-sky-50 text-sm">Police services are a placeholder for the prototype.</Card>
      <Card><Row glyph="🚨" title="Emergency" sub="Call 112" right={<Btn tone="red" onClick={() => act('Calling 112… (mock)')}>Call</Btn>} /></Card>
      <Card><Row glyph="📝" title="Report an incident" sub="Theft, noise, fraud" right={<Btn onClick={() => act('Report filed. An officer will respond. (mock)')}>Report</Btn>} /></Card>
      <Card><Row glyph="🧾" title="Pay a fine" sub="No fines. Keep it that way." right={<Btn tone="light" disabled>None</Btn>} /></Card>
    </div>
  );
}

export function MotorsApp() {
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-red-700 to-red-950 p-5 text-white"><p className="font-display text-2xl font-extrabold">Motors Corporation</p><p className="text-sm text-white/80">Nigeria's biggest dealership network. Own a showroom later; browse stock now.</p></div>
      <Title>Featured stock</Title>
      <div className="space-y-2">{VEHICLES.slice(-4).reverse().map((v) => <Card key={v.id}><Row glyph="🏎️" title={v.name} sub={v.blurb} right={<Btn onClick={() => usePhoneStore.getState().openApp('cars')}>View</Btn>} /></Card>)}</div>
    </div>
  );
}

export function SettingsApp() {
  const { sfx: sfxOn, music, toggleSfx, toggleMusic } = useSettingsStore();
  const [confirm, setConfirm] = useState(false);
  const logout = () => { usePhoneStore.getState().closePhone(); useAuthStore.getState().logout(); useFlowStore.getState().go('landing'); };
  const T = ({ label, on, tap }: { label: string; on: boolean; tap: () => void }) => (
    <button onClick={() => { sfx.click(); tap(); }} className="flex w-full items-center justify-between rounded-2xl bg-white p-3.5 text-left shadow-sm"><span className="text-sm font-bold">{label}</span><span className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}><i className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></span></button>
  );
  return (
    <div className="space-y-2 p-3">
      <T label="Sound effects" on={sfxOn} tap={toggleSfx} /><T label="Music" on={music} tap={toggleMusic} />
      <Card><p className="text-sm font-bold">Account</p><p className="text-xs text-slate-500">Signed in as {useAuthStore.getState().session}</p><Btn tone="light" className="mt-2" onClick={logout}>Log out</Btn></Card>
      <Card><p className="text-sm font-bold">Start a new life</p><p className="text-xs text-slate-500">Your current life is deleted. The roulette decides who you become.</p>
        {confirm ? <div className="mt-2 flex gap-2"><Btn tone="light" onClick={() => setConfirm(false)}>Keep playing</Btn><Btn tone="red" onClick={() => { usePhoneStore.getState().closePhone(); restartLife(); }}>Spin again</Btn></div> : <Btn tone="red" className="mt-2" onClick={() => setConfirm(true)} disabled={!useLifeStore.getState().lifeType}>Start New Life</Btn>}</Card>
      <p className="pt-2 text-center text-xs text-slate-400">Nigeria Life · prototype 0.1</p>
    </div>
  );
}
