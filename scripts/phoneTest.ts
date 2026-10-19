import { APPS } from '../src/data/apps';
import { CATEGORIES, DOCK, FAVORITES } from '../src/data/phoneLayout';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const ids = APPS.map((a) => a.id);

console.log('Phone layout');
const inLibrary = CATEGORIES.flatMap((c) => c.apps);
ok(ids.every((id) => inLibrary.includes(id)), 'every app can be found in the App Library');
ok(new Set(inLibrary).size === inLibrary.length && inLibrary.every((id) => ids.includes(id)), 'each app is in exactly one library group, and every listed app exists');
ok(FAVORITES.length === 12 && new Set(FAVORITES).size === 12 && FAVORITES.every((id) => ids.includes(id)), 'home shows 12 distinct, real apps (a 4 x 3 grid)');
ok(DOCK.length === 3 && DOCK.every((id) => ids.includes(id)) && DOCK.every((id) => !FAVORITES.includes(id)), 'the dock holds 3 apps plus the library button, none repeated on the home grid');
ok(DOCK.includes('messages') && DOCK.includes('bank'), 'Messages and Bank are one tap away in the dock');
ok(CATEGORIES.every((c) => c.apps.length <= 8), 'no library group is long enough to need scrolling inside it');

console.log(fails ? `\n${fails} phone layout check(s) FAILED` : '\nAll phone layout checks passed');
process.exit(fails ? 1 : 0);
