import type { AppId } from './apps';

/**
 * Where apps live. Home shows FAVORITES in a 4-column grid with DOCK below; every app is also in the App Library, grouped by
 * CATEGORIES, so nothing is hidden and nothing needs paging or hidden scrolling. Each app must appear in exactly one category.
 */
export const FAVORITES: AppId[] = ['contacts', 'grocery', 'ride', 'boutique', 'invest', 'companies', 'hustle', 'houses', 'cars', 'forbes', 'food', 'settings'];
export const DOCK: AppId[] = ['messages', 'bank', 'jobs'];
export const CATEGORIES: { title: string; apps: AppId[] }[] = [
  { title: 'Money', apps: ['bank', 'invest', 'companies', 'betting'] },
  { title: 'Work', apps: ['jobs', 'hustle', 'staff'] },
  { title: 'Social', apps: ['messages', 'contacts', 'family', 'games'] },
  { title: 'Daily life', apps: ['grocery', 'food', 'ride', 'boutique', 'houses', 'cars', 'shops', 'motors'] },
  { title: 'Law and order', apps: ['police', 'court'] },
  { title: 'More', apps: ['forbes', 'guide', 'help', 'invite', 'settings'] },
];
