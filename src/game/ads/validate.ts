import type { AdsConfig } from '@/types/ads';

/** Input validation for ad submissions. Client-side only: a server must repeat every one of these checks (docs/ADS_AND_MAP.md). */
export interface DetailsInput { advertiser: string; description: string; websiteUrl?: string }
export type Problems<T extends string> = Partial<Record<T, string>>;

export function validateDetails(i: DetailsInput): Problems<'advertiser' | 'description' | 'websiteUrl'> {
  const p: Problems<'advertiser' | 'description' | 'websiteUrl'> = {};
  const name = i.advertiser.trim(), desc = i.description.trim(), url = (i.websiteUrl ?? '').trim();
  if (name.length < 2) p.advertiser = 'Enter the business or advertiser name (at least 2 characters).';
  else if (name.length > 60) p.advertiser = 'Keep the name under 60 characters.';
  if (desc.length < 10) p.description = 'Describe the advertisement in at least 10 characters.';
  else if (desc.length > 300) p.description = 'Keep the description under 300 characters.';
  if (url) {
    const safe = safeUrl(url);
    if (!safe) p.websiteUrl = 'Enter a full web address starting with http:// or https://.';
    else if (url.length > 200) p.websiteUrl = 'That web address is too long.';
  }
  return p;
}

/** Only http(s) links are ever stored or rendered as links ("javascript:" and friends are rejected). */
export function safeUrl(raw: string): string | null {
  try { const u = new URL(raw); return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null; } catch { return null; }
}

export interface ImageMeta { type: string; size: number; width: number; height: number }
/** Returns a user-facing problem, or null if the image is acceptable. Pure, so it is tested without a browser. */
export function validateImageMeta(m: ImageMeta, cfg: AdsConfig['upload']): string | null {
  if (!cfg.types.includes(m.type)) return `Use a PNG, JPEG or WebP image (this file is ${m.type || 'an unknown type'}).`;
  if (m.size > cfg.maxBytes) return `That image is ${(m.size / 1048576).toFixed(1)} MB. The limit is ${(cfg.maxBytes / 1048576).toFixed(0)} MB.`;
  if (m.width < cfg.minWidth) return `The image is only ${m.width}px wide. Use at least ${cfg.minWidth}px so it stays sharp.`;
  if (m.width > cfg.maxWidth || m.height > cfg.maxWidth) return `The image is larger than ${cfg.maxWidth}px. Resize it first.`;
  const aspect = m.width / m.height;
  if (aspect < 1) return 'Use a wide or square image (taller images do not fit an advertising board).';
  if (aspect > cfg.maxAspect) return `That image is too wide (more than ${cfg.maxAspect}:1). Use roughly 2:1.`;
  return null;
}
