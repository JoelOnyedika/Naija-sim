import './mockStorage';
import { readFileSync, readdirSync } from 'node:fs';
import { registerContent } from '../src/content';
import { AD_PROVIDERS_CONFIG, PROVIDERS, advertiserProvider, googleProvider, isSafeImage, resolveCreative, type AdContext, type AdProvider } from '../src/game/ads/providers';
import { getState } from '../src/world/registry';
import type { AdSubmission } from '../src/types/ads';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const def = getState('lagos')!.mapData.billboards![0];
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const now = 1_000_000;
const sub = (o: Partial<AdSubmission> = {}): AdSubmission => ({ id: 's1', stateId: 'lagos', kind: 'billboard', slotId: def.id, advertiser: 'Mama Put', description: 'd', imageDataUrl: PNG, imageWidth: 600, imageHeight: 200, price: 1, status: 'active', paymentStatus: 'simulated', createdAt: 0, activatedAt: 0, expiresAt: now + 10_000, durationMs: 10_000, ...o });
const ctx = (o: Partial<AdContext> = {}): AdContext => ({ def, submissions: [], now, consent: 'unknown', ...o });

console.log('Resolution order');
let r = resolveCreative(ctx());
ok(r.creative.source === 'house' && r.creative.kind === 'text', 'no advertiser: the board shows its default artwork');
ok(r.trace.map((t) => t.id).join() === 'advertiser,google,house', 'providers are tried in the configured order');
r = resolveCreative(ctx({ submissions: [sub()] }));
ok(r.creative.source === 'advertiser' && r.creative.kind === 'image' && r.creative.advertiser === 'Mama Put', 'an approved running player ad replaces the default');
for (const st of ['draft', 'pending', 'rejected', 'expired'] as const) ok(resolveCreative(ctx({ submissions: [sub({ status: st })] })).creative.source === 'house', `a ${st} ad is never shown`);
ok(resolveCreative(ctx({ submissions: [sub({ expiresAt: now - 1 })] })).creative.source === 'house', 'an ad past its expiry time goes back to the default (computed from timestamps)');
ok(resolveCreative(ctx({ submissions: [sub({ slotId: 'someone.else' })] })).creative.source === 'house', 'an ad bought for another board is not shown here');
ok(resolveCreative(ctx({ submissions: [sub({ imageDataUrl: 'https://evil.example/x.png' })] })).creative.source === 'house', 'a non data-URL image is refused (nothing remote is ever loaded)');
ok(resolveCreative(ctx({ submissions: [sub({ imageDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })] })).creative.source === 'house', 'SVG data URLs are refused');
ok(!isSafeImage('javascript:alert(1)') && isSafeImage(PNG), 'the image check accepts small raster data URLs only');
ok(resolveCreative(ctx({ submissions: [sub({ imageWidth: 0 })] })).creative.source === 'house', 'an image with invalid dimensions is refused');
r = resolveCreative(ctx({ override: { headline: 'NEW HEADLINE' } }));
ok(r.creative.kind === 'text' && r.creative.content.headline === 'NEW HEADLINE', 'the default artwork still honours the board override');

console.log('Google provider is honest and inert');
const cases: AdContext[] = [ctx(), ctx({ consent: 'granted' }), ctx({ consent: 'denied' })];
ok(cases.every((c) => !googleProvider.availability(c).available && !!googleProvider.availability(c).reason), 'it is unavailable in every state and always says why');
ok(googleProvider.resolve(ctx({ consent: 'granted' })) === null, 'it never returns a creative');
ok(AD_PROVIDERS_CONFIG.google.enabled === false, 'it is switched off in the configuration');
ok(resolveCreative(ctx({ consent: 'granted' })).trace.find((t) => t.id === 'google')?.used === false, 'with consent granted the board still does not use it');
const reasons = new Set(['off', 'client', 'consent', 'endpoint'].map(() => ''));
void reasons;
ok(/switched off/.test(googleProvider.availability(ctx()).reason!), 'the first reason given is the master switch');

console.log('Robustness');
const bad: AdProvider = { id: 'bad', label: 'bad', source: 'network', availability: () => ({ available: true }), resolve: () => { throw new Error('boom'); } };
const boom = resolveCreative(ctx(), ['bad', 'house'], { ...PROVIDERS, bad });
ok(boom.creative.source === 'house' && boom.trace[0].used === false, 'a provider that throws can never blank a board');
const noHouse = resolveCreative(ctx(), ['advertiser']);
ok(noHouse.creative.source === 'house', 'the default artwork is always appended, so the result is never empty');
const fake: AdProvider = { id: 'net', label: 'net', source: 'network', availability: () => ({ available: true }), resolve: () => ({ kind: 'text', source: 'network', providerId: 'net', content: { advertiser: 'Net', headline: 'From a network', bg: '#000', fg: '#fff', accent: '#f00' } }) };
ok(resolveCreative(ctx({ submissions: [sub()] }), ['advertiser', 'net', 'house'], { ...PROVIDERS, net: fake }).creative.source === 'advertiser', 'a player ad outranks a network provider');
ok(resolveCreative(ctx(), ['net', 'house'], { ...PROVIDERS, net: fake }).creative.source === 'network', 'an available network provider outranks the default artwork');
ok(advertiserProvider.availability(ctx()).available, 'the advertiser provider is always available (it just may have nothing)');

console.log('No secrets, no fake metrics');
const files = ['src/game/ads/providers.ts', 'src/three/world/Billboards.tsx'];
const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');
ok(!/(secret|private[_ ]?key|api[_-]?key|sk-[A-Za-z0-9]{10})/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'no secret, key or token appears in the provider code');
const envReads = [...src.matchAll(/env\('([A-Z_]+)'\)/g)].map((m) => m[1]);
ok(envReads.length > 0 && envReads.every((k) => k.startsWith('VITE_')), `only public VITE_ variables are read (${envReads.join(', ')})`);
ok(!/impression(s)?\s*(\+\+|\+=|=)|\bclicks?\s*(\+\+|\+=)/i.test(src), 'nothing counts or simulates impressions or clicks');
ok(/resolveCreative\(/.test(readFileSync('src/three/world/Billboards.tsx', 'utf8')), 'the 3D billboards get their content from the provider layer');
ok(readdirSync('docs').includes('ADS_PROVIDERS.md'), 'docs/ADS_PROVIDERS.md explains the provider limits');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll ads provider checks passed');
