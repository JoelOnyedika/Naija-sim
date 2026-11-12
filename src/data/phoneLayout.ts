import type { AppId } from './apps';

/**
 * Where apps live. Home shows HOME_ITEMS (apps and folders) in a 4-column grid with DOCK below; every app is also in the App Library, grouped by
 * CATEGORIES, so nothing is hidden and nothing needs paging or hidden scrolling. Each app must appear in exactly one category.
 */
/** A folder on the home screen (like iOS and Android): one icon that opens a small panel with its apps. */
export interface HomeFolder { folder: true; id: string; title: string; apps: AppId[] }
export type HomeItem = AppId | HomeFolder;
/** The 12 slots of the home screen, in order. A slot is an app or a folder. */
export const HOME_ITEMS: HomeItem[] = [
  'contacts', 'grocery', 'ride', 'boutique',
  { folder: true, id: 'loans', title: 'Loans', apps: ['ofay', 'falmfay', 'kwikkash'] },
  { folder: true, id: 'money', title: 'Money', apps: ['invest', 'companies', 'betting'] },
  'hustle', 'houses', 'cars', 'forbes', 'food', 'settings',
];
export const isFolder = (i: HomeItem): i is HomeFolder => typeof i !== 'string';
/** Every app that is visible on the home screen, folders included. */
export const FAVORITES: AppId[] = HOME_ITEMS.flatMap((i) => (isFolder(i) ? i.apps : [i]));
export const DOCK: AppId[] = ['messages', 'bank', 'jobs'];
export const CATEGORIES: { title: string; apps: AppId[] }[] = [
  { title: 'Money', apps: ['bank', 'invest', 'companies', 'betting', 'aircraft', 'ofay', 'falmfay', 'kwikkash'] },
  { title: 'Work', apps: ['jobs', 'hustle', 'staff'] },
  { title: 'Social', apps: ['messages', 'contacts', 'family', 'games'] },
  { title: 'Daily life', apps: ['grocery', 'food', 'ride', 'boutique', 'houses', 'cars', 'shops', 'motors'] },
  { title: 'Law and order', apps: ['police', 'court'] },
  { title: 'More', apps: ['brotherhood', 'forbes', 'guide', 'help', 'invite', 'settings'] },
];
