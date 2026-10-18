import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';
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

export function MotorsApp() {
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-red-700 to-red-950 p-5 text-white"><p className="font-display text-2xl font-extrabold">Motors Corporation</p><p className="text-sm text-white/80">Nigeria's biggest dealership network. Own a showroom later; browse stock now.</p></div>
      <Title>Featured stock</Title>
      <div className="space-y-2">{VEHICLES.slice(-4).reverse().map((v) => <Card key={v.id}><Row glyph="🏎️" title={v.name} sub={v.blurb} right={<Btn onClick={() => usePhoneStore.getState().openApp('cars')}>View</Btn>} /></Card>)}</div>
    </div>
  );
}
