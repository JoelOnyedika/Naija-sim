import { ChevronLeft } from 'lucide-react';
import type { ComponentType } from 'react';
import { getApp, type AppId } from '@/data/apps';
import { BankApp } from './Bank';
import { BettingApp } from './Betting';
import { BoutiqueApp } from './Boutique';
import { CarsApp } from './Cars';
import { CompaniesApp } from './companies';
import { ContactsApp } from './Contacts';
import { FamilyApp } from './Family';
import { FoodApp } from './Food';
import { ForbesApp } from './Forbes';
import { HousesApp } from './Houses';
import { GuideApp, HelpApp, InviteApp, MotorsApp } from './Info';
import { CourtApp } from './court';
import { GamesApp } from './games';
import { GroceryApp } from './grocery';
import { PoliceApp } from './police';
import { RideApp } from './ride';
import { SettingsApp } from './Settings';
import { HustleApp } from './hustle';
import { InvestApp } from './invest';
import { JobsApp } from './Jobs';
import { MessagesApp } from './messages';
import { ShopsApp } from './Shops';
import { StaffApp } from './Staff';

/** App registry. Each app is an independent module: add a file, add a line here and one in data/apps.ts. */
const APP_COMPONENTS: Record<AppId, ComponentType> = {
  jobs: JobsApp, messages: MessagesApp, contacts: ContactsApp, guide: GuideApp, food: FoodApp, bank: BankApp, boutique: BoutiqueApp,
  forbes: ForbesApp, houses: HousesApp, cars: CarsApp, invite: InviteApp, help: HelpApp, invest: InvestApp, betting: BettingApp,
  family: FamilyApp, staff: StaffApp, hustle: HustleApp, motors: MotorsApp, companies: CompaniesApp, shops: ShopsApp, police: PoliceApp, settings: SettingsApp, court: CourtApp, games: GamesApp, ride: RideApp, grocery: GroceryApp,
};

export function AppView({ id, onBack }: { id: AppId; onBack: () => void }) {
  const app = getApp(id);
  const Body = APP_COMPONENTS[id];
  return (
    <div className="app-surface flex h-full flex-col bg-slate-100 text-slate-900">
      <div className="flex items-center gap-1 px-2 pb-3 pt-2 text-white" style={{ background: `linear-gradient(135deg, ${app.from}, ${app.to})` }}>
        <button onClick={onBack} aria-label="Back" className="rounded-full p-1.5"><ChevronLeft size={22} /></button>
        <span className="text-xl">{app.glyph}</span><h2 className="font-display text-lg font-bold">{app.label}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4"><Body /></div>
    </div>
  );
}
