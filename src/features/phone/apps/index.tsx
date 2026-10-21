import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { getApp, type AppId } from '@/data/apps';
import { BottomSlot } from '../bottomSlot';
import { usePhoneType } from '../usePhoneType';
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
import { GuideApp, HelpApp, MotorsApp } from './Info';
import { InviteApp } from './Invite';
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

/**
 * One screen for every app. The header follows the phone: iOS has a centred title with a back chevron, Android (One UI) has a
 * large left-aligned title under a back arrow. Content scrolls in the middle; the app's navigation bar (its <Tabs>) draws into
 * the strip at the bottom, so it never scrolls out of sight.
 */
export function AppView({ id, onBack, statusPad = true }: { id: AppId; onBack: () => void; statusPad?: boolean }) {
  const app = getApp(id), Body = APP_COMPONENTS[id], ios = usePhoneType() === 'ios';
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const top = statusPad ? '2.9rem' : '0.5rem';
  return (
    <BottomSlot.Provider value={slot}>
      <div className="app-surface flex h-full flex-col bg-slate-100 text-slate-900">
        {ios ? (
          <header className="shrink-0 border-b border-slate-200 bg-white px-2 pb-2" style={{ paddingTop: top }}>
            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
              <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full text-accent"><ChevronLeft size={26} /></button>
              <h2 className="text-center text-[17px] font-semibold">{app.label}</h2><span />
            </div>
          </header>
        ) : (
          <header className="shrink-0 bg-slate-100 px-4 pb-2" style={{ paddingTop: top }}>
            <button onClick={onBack} aria-label="Back" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-800 active:bg-slate-200"><ArrowLeft size={24} /></button>
            <h2 className="mt-0.5 text-[28px] font-bold leading-tight tracking-tight">{app.label}</h2>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><Body /></div>
        <div ref={setSlot} className="relative shrink-0" />
      </div>
    </BottomSlot.Provider>
  );
}
