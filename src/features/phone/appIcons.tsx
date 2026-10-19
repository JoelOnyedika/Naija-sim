import { BookOpen, Briefcase, Building2, Car, CircleHelp, Crown, Dices, Gauge, HeartHandshake, Home, Landmark, LayoutGrid, MessageCircle, Navigation, Scale, Settings, ShieldCheck, ShoppingCart, Shirt, Sparkles, Store, Ticket, TrendingUp, Users, Utensils, Zap, type LucideIcon } from 'lucide-react';
import type { AppDef, AppId } from '@/data/apps';
import type { PhoneType } from '@/types/game';

const ICONS: Record<AppId, LucideIcon> = {
  messages: MessageCircle, bank: Landmark, food: Utensils, jobs: Briefcase, contacts: Users, houses: Home, cars: Car, boutique: Shirt, forbes: Crown, invest: TrendingUp,
  betting: Dices, hustle: Zap, shops: Store, companies: Building2, motors: Gauge, family: HeartHandshake, staff: Sparkles, police: ShieldCheck, court: Scale,
  ride: Navigation, grocery: ShoppingCart, games: Dices, invite: Ticket, guide: BookOpen, help: CircleHelp, settings: Settings,
};
export const appIcon = (id: AppId): LucideIcon => ICONS[id];

/**
 * An app icon. iOS: a glossy squircle with a soft highlight. Android (One UI): a rounder, flatter tile. Both draw a white
 * vector glyph on the app's own colour, so every app stays recognisable at a glance.
 */
export function AppIcon({ app, variant, size = 56 }: { app: Pick<AppDef, 'id' | 'from' | 'to'>; variant: PhoneType; size?: number }) {
  const Icon = ICONS[app.id], ios = variant === 'ios';
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] ${ios ? 'rounded-[26%]' : 'rounded-[34%]'}`}
      style={{ width: size, height: size, background: `linear-gradient(${ios ? 160 : 145}deg, ${app.from}, ${app.to})` }} aria-hidden>
      {ios && <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />}
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} className="relative drop-shadow-sm" />
    </span>
  );
}

/** The App Library button in the dock (the purple grid in the reference design). */
export function LibraryIcon({ variant, size = 56, active }: { variant: PhoneType; size?: number; active?: boolean }) {
  const ios = variant === 'ios';
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] ${ios ? 'rounded-[26%]' : 'rounded-[34%]'} ${active ? 'ring-2 ring-white/70' : ''}`}
      style={{ width: size, height: size, background: 'linear-gradient(160deg,#8B5CF6,#5B21B6)' }} aria-hidden>
      {ios && <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />}
      <LayoutGrid size={Math.round(size * 0.48)} strokeWidth={1.9} className="relative" />
    </span>
  );
}
