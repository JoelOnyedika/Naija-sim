import { SPREAD } from '../src/content/lagos/spread';
import './mockStorage';
import { registerContent } from '../src/content';
import { CITY_CATALOG } from '../src/content/cities';
import { formatNaira } from '../src/core/format';
import { billboardSlots, effectiveStatus, liveAds, seaSlots, slotAvailability } from '../src/game/ads/slots';
import { validateDetails, validateImageMeta } from '../src/game/ads/validate';
import { useAdsStore } from '../src/stores/adsStore';
import { distToSegment, isOnLand, nearestRoad, roadSegments, roadsConnected } from '../src/world/mapGeometry';
import { getState } from '../src/world/registry';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const lagos = getState('lagos')!, layout = lagos.mapData.layout!, cfg = lagos.ads!;
const DAY = 86_400_000;

// ---------------------------------------------------------------- map
const rc = roadsConnected(layout);
ok(rc.connected, `every road node is reachable from the first (${layout.nodes.length} nodes, ${layout.edges.length} edges)${rc.unreachable.length ? ' unreachable: ' + rc.unreachable : ''}`);
ok(rc.dangling.length === 0, `no isolated road nodes${rc.dangling.length ? ': ' + rc.dangling : ''}`);
const nodes = new Map(layout.nodes.map((n) => [n.id, n]));
ok(layout.edges.every((e) => nodes.has(e.a) && nodes.has(e.b)), 'every road edge references real nodes');
for (const e of layout.edges) {
  const a = nodes.get(e.a)!, b = nodes.get(e.b)!;
  const onA = isOnLand(layout, a.x, a.z, 0.3), onB = isOnLand(layout, b.x, b.z, 0.3);
  ok(onA && onB, `${e.a} -> ${e.b}: both ends are on land`);
  const mid = isOnLand(layout, (a.x + b.x) / 2, (a.z + b.z) / 2, 0);
  ok(e.bridge ? !mid || Math.hypot(a.x - b.x, a.z - b.z) < 6 : mid, `${e.a} -> ${e.b}: ${e.bridge ? 'bridge crosses water' : 'road stays on land'}`);
}
for (const l of lagos.mapData.landmarks) {
  ok(isOnLand(layout, l.position[0], l.position[1], 0.1), `landmark ${l.id} is on land`);
  ok(nearestRoad(layout, l.position[0], l.position[1]).d < 5.5 * SPREAD, `landmark ${l.id} is near a road (${nearestRoad(layout, l.position[0], l.position[1]).d.toFixed(1)})`);
}
for (const b of lagos.mapData.billboards ?? []) {
  const d = nearestRoad(layout, b.position[0], b.position[1]).d;
  ok(isOnLand(layout, b.position[0], b.position[1], 0) && d >= 0.9 && d <= 6.5, `billboard ${b.id} is on land, off the carriageway, close to a road (${d.toFixed(1)})`);
}
// the airport has its two runways and the terminal landmark exists
ok(layout.slabs.some((s) => s.kind === 'airport') && lagos.mapData.landmarks.some((l) => l.id === 'lagos.mmia'), 'airport slab and terminal landmark exist');
ok(lagos.mapData.landmarks.filter((l) => l.category === 'government').length >= 3, 'government landmarks exist for the Government category');

// ---------------------------------------------------------------- sea slots
const sea = seaSlots(lagos);
ok(sea.length >= 150, `${sea.length} sea slots generated`);
ok(new Set(sea.map((s) => s.id)).size === sea.length, 'sea slot ids are unique');
ok(sea.every((s) => layout.slabs.every((l) => Math.abs(s.x - l.cx) > l.w / 2 + s.w / 2 || Math.abs(s.z - l.cz) > l.d / 2 + s.h / 2)), 'no sea slot overlaps land');
ok(sea.every((s) => s.x >= layout.sea.x0 && s.x <= layout.sea.x1 && s.z >= layout.sea.z0 && s.z <= layout.sea.z1), 'every sea slot is inside the sea zone');
const bridges = roadSegments(layout).filter((r) => r.edge.bridge);
ok(sea.every((s) => bridges.every((b) => distToSegment(s.x, s.z, b.a, b.b) > s.h / 2 + 1)), 'no sea slot sits under a bridge');
let overlap = 0;
for (let i = 0; i < sea.length; i++) for (let j = i + 1; j < sea.length; j++) if (Math.abs(sea[i].x - sea[j].x) < sea[i].w && Math.abs(sea[i].z - sea[j].z) < sea[i].h) overlap++;
ok(overlap === 0, 'sea slots never overlap each other');
ok(new Set(sea.map((s) => s.tier)).size >= 2 && sea.every((s) => cfg.seaTiers.some((t) => t.id === s.tier && t.price === s.price)), 'sea prices come from the config tiers');
const boards = billboardSlots(lagos);
ok(boards.length === lagos.mapData.billboards!.length && boards.every((b) => b.price > 0), `${boards.length} billboard slots, each with its own price`);
ok(new Set(boards.map((b) => b.price)).size > 1, 'billboard prices differ by size and tier');

// billboard locations are in plain words
const loc = (id: string) => boards.find((b) => b.id === id)!.location;
ok(boards.every((b) => b.location.length > 3), 'every billboard has a readable location');
ok(loc('lagos.bb.airport-gate').includes('Murtala Muhammed'), `airport board: "${loc('lagos.bb.airport-gate')}"`);
ok(loc('lagos.bb.eko-hotel').includes('Eko Hotel'), `Eko Hotel board: "${loc('lagos.bb.eko-hotel')}"`);

// ---------------------------------------------------------------- validation
ok(Object.keys(validateDetails({ advertiser: 'A', description: 'short' })).length === 2, 'short name and description are rejected');
ok(!!validateDetails({ advertiser: 'Mama Put', description: 'Best jollof in Yaba, open daily.', websiteUrl: 'javascript:alert(1)' }).websiteUrl, 'javascript: URLs are rejected');
ok(Object.keys(validateDetails({ advertiser: 'Mama Put', description: 'Best jollof in Yaba, open daily.', websiteUrl: 'https://mamaput.example' })).length === 0, 'valid details and https URL pass');
const up = cfg.upload;
ok(!!validateImageMeta({ type: 'image/gif', size: 1000, width: 800, height: 400 }, up), 'GIF is rejected');
ok(!!validateImageMeta({ type: 'image/png', size: up.maxBytes + 1, width: 800, height: 400 }, up), 'oversized upload is rejected');
ok(!!validateImageMeta({ type: 'image/png', size: 1000, width: 100, height: 50 }, up), 'tiny image is rejected');
ok(!!validateImageMeta({ type: 'image/png', size: 1000, width: 400, height: 800 }, up), 'tall image is rejected');
ok(validateImageMeta({ type: 'image/png', size: 1000, width: 1600, height: 800 }, up) === null, '2:1 image is accepted');
ok(validateImageMeta({ type: 'image/jpeg', size: 1000, width: 1200, height: 900 }, up) === null, 'other valid aspect ratios are accepted');

// ---------------------------------------------------------------- lifecycle
const S = () => useAdsStore.getState();
const base = { stateId: 'lagos', kind: 'sea' as const, advertiser: 'Mama Put', description: 'Best jollof in Yaba, open daily.', imageDataUrl: 'data:image/webp;base64,AAAA', imageWidth: 800, imageHeight: 400 };
const slotA = sea[0].id, slotB = sea[1].id;
ok(!S().saveDraft({ ...base, slotId: 'sea-999-999' }).ok, 'a position that is not on the water is rejected');
ok(!S().saveDraft({ ...base, slotId: slotA, imageDataUrl: '' }).ok, 'a draft without an image is rejected');
const d1 = S().saveDraft({ ...base, slotId: slotA }); ok(d1.ok, 'a valid draft saves');
const id1 = (d1 as { id: string }).id;
ok(S().submissions.find((s) => s.id === id1)!.status === 'draft' && liveAds(S().submissions, 'sea', Date.now()).length === 0, 'a draft is never live');
ok(S().submit(id1).ok, 'simulated checkout moves the draft to pending');
const sub1 = S().submissions.find((s) => s.id === id1)!;
ok(sub1.status === 'pending' && sub1.paymentStatus === 'simulated', 'pending ad is marked as a SIMULATED payment');
ok(liveAds(S().submissions, 'sea', Date.now()).length === 0, 'a pending ad is not rendered as live');
ok(slotAvailability(S().submissions, 'sea', slotA, Date.now()).state === 'reserved', 'a pending ad reserves its position (red in the picker)');
ok(!S().saveDraft({ ...base, advertiser: 'Rival Co', slotId: slotA }).ok, 'a second ad cannot take a reserved position');
const t0 = Date.now();
ok(S().approve(id1, t0).ok, 'approval activates the ad');
const act = S().submissions.find((s) => s.id === id1)!;
ok(act.status === 'active' && act.activatedAt === t0 && act.expiresAt === t0 + 3 * DAY, 'expiry is exactly 3 days after activation');
ok(liveAds(S().submissions, 'sea', t0 + 3 * DAY - 1).length === 1, 'still live one millisecond before expiry');
ok(effectiveStatus(act, t0 + 3 * DAY) === 'expired' && liveAds(S().submissions, 'sea', t0 + 3 * DAY).length === 0, 'expired exactly at 3 days, even before any sweep runs');
ok(slotAvailability(S().submissions, 'sea', slotA, t0 + 1000).state === 'occupied', 'a live ad occupies its position');
ok(!S().saveDraft({ ...base, advertiser: 'Rival Co', slotId: slotA }).ok, 'a live ad blocks the same position');

// persistence: the stored JSON keeps the timestamps, and a reload restores them without resetting the clock
const raw = localStorage.getItem('nigerialife.ads'); ok(!!raw && raw.includes(String(t0 + 3 * DAY)), 'timestamps are written to storage');
useAdsStore.setState({ submissions: [] }); // simulates a fresh page: memory is empty, only storage survives
localStorage.setItem('nigerialife.ads', raw!);
await useAdsStore.persist.rehydrate();
ok(S().submissions.find((s) => s.id === id1)?.expiresAt === t0 + 3 * DAY, 'after a reload the expiry timestamp is unchanged (the 3 days are not reset)');

// expiry sweep releases the slot
ok(S().sweep(t0 + 3 * DAY) === 1 && S().submissions.find((s) => s.id === id1)!.status === 'expired', 'sweep marks it expired');
ok(slotAvailability(S().submissions, 'sea', slotA, t0 + 3 * DAY).state === 'available', 'the position is free again after expiry');
const d2 = S().saveDraft({ ...base, advertiser: 'Rival Co', slotId: slotA }); ok(d2.ok, 'another advertiser can now take it');

// rejection frees the position and never shows
const d3 = S().saveDraft({ ...base, advertiser: 'Third Co', slotId: slotB }) as { ok: true; id: string };
S().submit(d3.id); ok(S().reject(d3.id, 'Breaks rule 2', t0).ok, 'a pending ad can be rejected');
ok(S().submissions.find((s) => s.id === d3.id)!.status === 'rejected' && liveAds(S().submissions, 'sea', t0).every((s) => s.id !== d3.id), 'a rejected ad is never live');
ok(slotAvailability(S().submissions, 'sea', slotB, t0).state === 'available', 'a rejected ad releases its position');
ok(!S().approve(d3.id).ok, 'a rejected ad cannot be approved');

// billboards are a separate inventory
const bb = boards[0];
const b1 = S().saveDraft({ ...base, kind: 'billboard', slotId: bb.id }) as { ok: true; id: string };
ok(b1.ok && S().submit(b1.id).ok && S().approve(b1.id, t0).ok, 'a billboard ad goes draft -> pending -> active');
ok(S().submissions.find((s) => s.id === b1.id)!.expiresAt === t0 + cfg.billboardDurationDays * DAY, 'billboard duration comes from its own config');
ok(slotAvailability(S().submissions, 'sea', bb.id, t0).state === 'available', 'billboard and sea inventories do not interfere');
ok(!S().saveDraft({ ...base, kind: 'billboard', advertiser: 'Rival', slotId: bb.id }).ok, 'two ads cannot share a billboard');
ok(!S().saveDraft({ ...base, kind: 'billboard', slotId: 'sea-0-0' }).ok, 'a sea slot id is not a billboard');

// ---------------------------------------------------------------- money and cities
ok(formatNaira(150000) === '₦150,000' && formatNaira(45000) === '₦45,000', 'prices format as naira');
ok(!!getState('lagos') && CITY_CATALOG.filter((c) => c.id !== 'lagos').every((c) => !getState(c.id)), 'only Lagos is playable; Abuja, Port Harcourt and Edo are catalogue-only');
ok(CITY_CATALOG.map((c) => c.id).join() === 'lagos,abuja,port-harcourt,edo', 'selector lists Lagos, Abuja, Port Harcourt, Edo State');

console.log(fails ? `\n${fails} FAILED` : '\nAll ads and map checks passed');
process.exit(fails ? 1 : 0);
