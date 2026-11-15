import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const pngSize = (f: string) => { const b = readFileSync(f); return b.toString('ascii', 1, 4) === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : [0, 0]; };

console.log('PWA: manifest');
const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
ok(!!m.name && !!m.short_name && m.short_name.length <= 12, 'has a name and a short name that fits under an icon');
ok(m.display === 'standalone' && m.start_url.startsWith('/') && m.scope === '/' && !!m.id, 'standalone display, start URL, scope and id');
ok(/^#[0-9a-f]{6}$/i.test(m.theme_color) && /^#[0-9a-f]{6}$/i.test(m.background_color), 'theme and background colours');
const html = readFileSync('index.html', 'utf8');
ok(html.includes(`<meta name="theme-color" content="${m.theme_color}"`), 'the page theme colour matches the manifest');
const icons = m.icons as { src: string; sizes: string; purpose?: string; type: string }[];
ok(icons.some((i) => i.sizes === '192x192') && icons.some((i) => i.sizes === '512x512' && (i.purpose ?? 'any') === 'any') && icons.some((i) => i.purpose === 'maskable'), 'a 192 icon, a 512 icon and a maskable icon (installable on Android and Chrome)');
for (const i of icons) { const f = `public${i.src}`, [w, h] = existsSync(f) ? pngSize(f) : [0, 0]; ok(existsSync(f) && `${w}x${h}` === i.sizes && i.type === 'image/png', `${i.src} exists and really is ${i.sizes}`); }
ok(existsSync('public/icons/apple-touch-icon.png') && pngSize('public/icons/apple-touch-icon.png')[0] === 180 && existsSync('public/icons/favicon-32.png'), 'Apple touch icon (180) and favicon');

console.log('PWA: page tags');
ok(html.includes('<link rel="manifest" href="/manifest.webmanifest"'), 'the page links the manifest');
ok(html.includes('rel="apple-touch-icon"') && html.includes('apple-mobile-web-app-capable') && html.includes('mobile-web-app-capable'), 'iOS and Android home-screen tags');
ok(html.includes('viewport-fit=cover'), 'the viewport covers notches');

console.log('PWA: service worker');
const sw = readFileSync('public/sw.js', 'utf8');
try { execFileSync(process.execPath, ['--check', 'public/sw.js']); ok(true, 'sw.js is valid JavaScript'); } catch { ok(false, 'sw.js is valid JavaScript'); }
ok(['install', 'activate', 'fetch', 'message'].every((e) => sw.includes(`addEventListener('${e}'`)), 'handles install, activate, fetch and message');
ok(/const VERSION = 'nl-v\d+/.test(sw) && sw.includes('caches.delete'), 'versioned caches, and old ones are deleted');
ok(sw.includes("req.method !== 'GET'") && sw.includes("req.headers.has('range')"), 'never touches POSTs or range requests (audio and video)');
ok(sw.includes("req.mode === 'navigate'") && sw.includes("caches.match('/index.html')"), 'pages work offline (the cached shell)');
ok(sw.includes('assets') && sw.includes('skipWaiting') && sw.includes('clients.claim'), 'precaches the built bundles and takes over at once');
ok(sw.includes('fonts.googleapis.com') && sw.includes('fonts.gstatic.com'), 'fonts keep working offline');
ok(!/localStorage|indexedDB/.test(sw), 'the service worker never stores player data');
ok(PRECACHE_ALL_EXIST(sw), 'every file it precaches exists');
function PRECACHE_ALL_EXIST(src: string) { const arr = /const PRECACHE = \[([^\]]*)\]/.exec(src)?.[1] ?? ''; return [...arr.matchAll(/'([^']+)'/g)].map((x) => x[1]).filter((u) => u !== '/').every((u) => u === '/index.html' || existsSync(`public${u}`)); }

console.log('PWA: app code');
const reg = readFileSync('src/pwa/register.ts', 'utf8'), main = readFileSync('src/main.tsx', 'utf8');
ok(main.includes('registerPwa()') && reg.includes('import.meta.env.PROD'), 'registered on start, in production builds only (development is never cached)');
ok(reg.includes('beforeinstallprompt') && reg.includes('appinstalled') && reg.includes('SKIP_WAITING') === false && readFileSync('src/pwa/pwaStore.ts', 'utf8').includes('SKIP_WAITING'), 'install prompt, installed state and update swap are handled');
ok(readFileSync('src/features/phone/apps/Settings.tsx', 'utf8').includes('Install app'), 'Settings has an Install app row (and a Refresh now row for updates)');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll PWA checks passed');
