import { readFileSync } from 'node:fs';
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const buy = readFileSync('src/features/game/BuyMode.tsx', 'utf8');
const menu = readFileSync('src/features/game/ActionMenu.tsx', 'utf8');

console.log('Overlays must receive taps');
// BuyMode's root layer is pointer-events-none, so anything inside it that is not wrapped in a pointer-events-auto layer is dead to taps.
// That is exactly why the item information panel could not be closed (X, backdrop and Back button all ignored).
ok(/key="buy" className="pointer-events-none/.test(buy), 'BuyMode root is a pointer-events-none layer (the reason overlays inside it need pointer-events-auto)');
ok(/key="info" className="pointer-events-auto /.test(buy), 'the item information overlay opts back in to taps, so the X, the backdrop and Back to the catalogue work');
ok(/aria-label="Close information"/.test(buy) && /onClick=\{close\}>\s*<motion\.div role="dialog"/.test(buy), 'the information panel has a close button and a tap-outside-to-close backdrop');
ok(/e\.key === 'Escape'/.test(buy), 'Escape also closes the information panel');
ok(/setInfoItem\(null\)/.test(buy.split('export function BuyMode')[1]), 'leaving Buy mode or starting a placement dismisses an open information panel');
ok(/key="menu" className="pointer-events-auto /.test(menu) && /aria-label="Close actions"/.test(menu), 'the action menu opts in to taps and has a close button');
ok(/snap-x/.test(menu) && /overflow-x-auto/.test(menu), 'the action menu is a horizontal snap-scrolling row');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll UI guard checks passed');
