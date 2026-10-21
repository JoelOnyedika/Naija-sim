import type { AdSubmission } from '@/types/ads';
import type { BillboardContent, BillboardDefinition } from '@/types/world';
import { effectiveStatus } from './slots';

/**
 * Billboard advertising providers. A board asks `resolveCreative` what to show; providers are tried in the configured
 * order and the first one that is available and has something for this board wins:
 *
 *   1. advertiser  a player's approved, running ad (the existing Sea/Billboard Ads purchase flow, unchanged)
 *   2. google      a Google ad provider. OFF: see GoogleProvider below and docs/ADS_PROVIDERS.md for why
 *   3. house       the board's own default artwork (always available, so a board is never blank)
 *
 * Nothing here counts impressions, simulates clicks or touches secrets. A real provider must report its own impressions
 * through its own supported mechanism, and any secret (ad-server key, signing key) lives on a server, never in this bundle.
 */
export type AdSource = 'advertiser' | 'network' | 'house';
export type AdCreative =
  | { kind: 'text'; source: AdSource; providerId: string; content: BillboardContent }
  | { kind: 'image'; source: AdSource; providerId: string; dataUrl: string; width: number; height: number; advertiser: string };

export type ConsentState = 'unknown' | 'granted' | 'denied';
export interface AdContext {
  def: BillboardDefinition;
  submissions: AdSubmission[];
  now: number;
  /** Admin/override fields for the default artwork (billboardStore). */
  override?: Partial<BillboardContent>;
  consent: ConsentState;
}
export interface Availability { available: boolean; reason?: string }
export interface AdProvider {
  id: string; label: string; source: AdSource;
  availability(ctx: AdContext): Availability;
  resolve(ctx: AdContext): AdCreative | null;
}

/** Public, non-secret configuration. Only VITE_-prefixed variables are ever read: those are public by definition. */
export interface AdProvidersConfig {
  order: string[];
  google: { enabled: boolean; publicClientId: string; creativeEndpoint: string };
}
const env = (k: string): string => { try { return String((import.meta as unknown as { env?: Record<string, string> }).env?.[k] ?? ''); } catch { return ''; } };
export const AD_PROVIDERS_CONFIG: AdProvidersConfig = {
  order: ['advertiser', 'google', 'house'],
  google: { enabled: false, publicClientId: env('VITE_GOOGLE_AD_CLIENT'), creativeEndpoint: env('VITE_AD_CREATIVE_ENDPOINT') },
};

/** Only a small PNG/JPEG/WebP data URL is ever drawn: nothing remote, nothing scriptable. */
export const isSafeImage = (u: string) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < 1_500_000;

export const advertiserProvider: AdProvider = {
  id: 'advertiser', label: 'Player advertisers', source: 'advertiser',
  availability: () => ({ available: true }),
  resolve: ({ def, submissions, now }) => {
    const ad = submissions.find((s) => s.kind === 'billboard' && s.slotId === def.id && effectiveStatus(s, now) === 'active');
    if (!ad || !isSafeImage(ad.imageDataUrl) || !(ad.imageWidth > 0) || !(ad.imageHeight > 0)) return null;
    return { kind: 'image', source: 'advertiser', providerId: 'advertiser', dataUrl: ad.imageDataUrl, width: ad.imageWidth, height: ad.imageHeight, advertiser: ad.advertiser };
  },
};

/**
 * Google. Deliberately inert. What I found when checking (details and links in docs/ADS_PROVIDERS.md):
 *  - AdMob is a mobile SDK product (Android / iOS / Unity). This is a web app, so it cannot use it.
 *  - AdSense units are page elements, and the program policies forbid altering the ad code or its delivery/presentation.
 *    Drawing one onto a 3D surface would do exactly that, so a Google ad cannot be made to fill a billboard texture.
 *  - What could be allowed (unconfirmed, needs Google's own sign-off): a normal ad unit shown in the page next to the game
 *    (not on the billboard), or Google Ad Manager serving creatives that YOUR server fetches under its terms.
 * So this provider reports why it is unavailable and never returns a creative. It will only ever become available once an
 * approved delivery route exists and is wired in `resolve`: the checks below are the minimum gate, not permission.
 */
export const googleProvider: AdProvider = {
  id: 'google', label: 'Google (not connected)', source: 'network',
  availability: (ctx) => {
    const g = AD_PROVIDERS_CONFIG.google;
    if (!g.enabled) return { available: false, reason: 'Google ads are switched off in the configuration.' };
    if (!g.publicClientId) return { available: false, reason: 'No public Google client id is configured.' };
    if (ctx.consent !== 'granted') return { available: false, reason: 'The player has not given advertising consent.' };
    if (!g.creativeEndpoint) return { available: false, reason: 'No approved server-side creative endpoint is configured.' };
    return { available: false, reason: 'No approved way to draw a Google ad on a 3D billboard has been verified with Google yet.' };
  },
  resolve: () => null,
};

export const houseProvider: AdProvider = {
  id: 'house', label: 'Default artwork', source: 'house',
  availability: () => ({ available: true }),
  resolve: ({ def, override }) => ({ kind: 'text', source: 'house', providerId: 'house', content: { ...def.content, ...override } }),
};

export const PROVIDERS: Record<string, AdProvider> = { advertiser: advertiserProvider, google: googleProvider, house: houseProvider };

export interface Resolution { creative: AdCreative; trace: { id: string; available: boolean; reason?: string; used: boolean }[] }

/** Ask providers in order. `house` is appended if missing, so the result is never empty. */
export function resolveCreative(ctx: AdContext, order: string[] = AD_PROVIDERS_CONFIG.order, providers: Record<string, AdProvider> = PROVIDERS): Resolution {
  const ids = order.includes('house') ? order : [...order, 'house'];
  const trace: Resolution['trace'] = [];
  let creative: AdCreative | null = null;
  for (const id of ids) {
    const p = providers[id]; if (!p) continue;
    const a = p.availability(ctx);
    if (!a.available || creative) { trace.push({ id, available: a.available, reason: a.reason, used: false }); continue; }
    let got: AdCreative | null = null;
    try { got = p.resolve(ctx); } catch { got = null; } // a misbehaving provider must never blank the board
    if (got) { creative = got; trace.push({ id, available: true, used: true }); } else trace.push({ id, available: true, used: false });
  }
  return { creative: creative ?? providers.house.resolve(ctx)!, trace };
}
