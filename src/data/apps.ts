export type AppId =
  | 'jobs' | 'messages' | 'contacts' | 'guide' | 'food' | 'bank' | 'boutique' | 'forbes' | 'houses' | 'cars' | 'invite'
  | 'help' | 'invest' | 'betting' | 'family' | 'staff' | 'hustle' | 'motors' | 'companies' | 'shops' | 'police' | 'settings';

export interface AppDef { id: AppId; label: string; glyph: string; from: string; to: string; dock?: boolean }

/** Order = order on the home screen. Each app is an independent module in features/phone/apps. */
export const APPS: AppDef[] = [
  { id: 'messages', label: 'Messages', glyph: '💬', from: '#34D17A', to: '#0B8F4D', dock: true },
  { id: 'bank', label: 'Bank', glyph: '🏦', from: '#3B82F6', to: '#1E3A8A', dock: true },
  { id: 'food', label: 'Food', glyph: '🍛', from: '#FF9A3D', to: '#E4572E', dock: true },
  { id: 'jobs', label: 'Jobs', glyph: '💼', from: '#2DD4BF', to: '#0F766E', dock: true },
  { id: 'contacts', label: 'Contacts', glyph: '👥', from: '#94A3B8', to: '#475569' },
  { id: 'houses', label: 'Houses', glyph: '🏠', from: '#F59E0B', to: '#B45309' },
  { id: 'cars', label: 'Cars', glyph: '🚗', from: '#EF4444', to: '#991B1B' },
  { id: 'boutique', label: 'Boutique', glyph: '👗', from: '#F472B6', to: '#BE185D' },
  { id: 'forbes', label: 'Forbes', glyph: '📈', from: '#1F2937', to: '#030712' },
  { id: 'invest', label: 'Invest', glyph: '💹', from: '#4ADE80', to: '#15803D' },
  { id: 'betting', label: 'Betting', glyph: '🎰', from: '#A78BFA', to: '#5B21B6' },
  { id: 'hustle', label: 'Hustle', glyph: '⚡', from: '#FACC15', to: '#CA8A04' },
  { id: 'shops', label: 'Shops', glyph: '🛍️', from: '#FB7185', to: '#BE123C' },
  { id: 'companies', label: 'Companies', glyph: '🏢', from: '#60A5FA', to: '#1D4ED8' },
  { id: 'motors', label: 'Motors Corp', glyph: '🏎️', from: '#F87171', to: '#7F1D1D' },
  { id: 'family', label: 'Family', glyph: '👨🏾‍👩🏾‍👧🏾', from: '#FDBA74', to: '#C2410C' },
  { id: 'staff', label: 'Staff', glyph: '🧹', from: '#5EEAD4', to: '#0F766E' },
  { id: 'police', label: 'Police', glyph: '🚓', from: '#38BDF8', to: '#075985' },
  { id: 'invite', label: 'Invite', glyph: '🎟️', from: '#C084FC', to: '#7E22CE' },
  { id: 'guide', label: 'Guide', glyph: '📖', from: '#FDE047', to: '#A16207' },
  { id: 'help', label: 'Help', glyph: '❓', from: '#A3E635', to: '#4D7C0F' },
  { id: 'settings', label: 'Settings', glyph: '⚙️', from: '#9CA3AF', to: '#374151' },
];
export const getApp = (id: AppId) => APPS.find((a) => a.id === id)!;
