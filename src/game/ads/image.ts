import type { AdsConfig } from '@/types/ads';
import { validateImageMeta } from './validate';

/** Browser-only: read an uploaded file, validate it, and downscale it to a small data URL for storage and as a texture. */
export interface PreparedImage { dataUrl: string; width: number; height: number }

export async function prepareImage(file: File, cfg: AdsConfig['upload']): Promise<{ ok: true; image: PreparedImage } | { ok: false; error: string }> {
  if (!cfg.types.includes(file.type)) return { ok: false, error: validateImageMeta({ type: file.type, size: file.size, width: 9999, height: 9999 }, cfg) ?? 'Unsupported file.' };
  if (file.size > cfg.maxBytes) return { ok: false, error: validateImageMeta({ type: file.type, size: file.size, width: cfg.minWidth, height: 1 }, cfg) ?? 'File too large.' };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = url; });
    const problem = validateImageMeta({ type: file.type, size: file.size, width: img.naturalWidth, height: img.naturalHeight }, cfg);
    if (problem) return { ok: false, error: problem };
    const scale = Math.min(1, cfg.storeWidth / img.naturalWidth), w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); if (!g) return { ok: false, error: 'This browser cannot process images.' };
    g.drawImage(img, 0, 0, w, h);
    // re-encoding also strips metadata and any non-image payload from the original file
    const dataUrl = cv.toDataURL('image/webp', 0.86).startsWith('data:image/webp') ? cv.toDataURL('image/webp', 0.86) : cv.toDataURL('image/jpeg', 0.86);
    return { ok: true, image: { dataUrl, width: w, height: h } };
  } catch { return { ok: false, error: 'That file could not be read as an image. Try another one.' }; }
  finally { URL.revokeObjectURL(url); }
}
