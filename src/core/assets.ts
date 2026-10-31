/**
 * Where static game assets (3D models) are loaded from. Today everything is local: files in `public/` are served by the app itself.
 * To move them to a server or CDN later, set VITE_ASSET_BASE (for example `https://cdn.example.com/nigeria-life/`) at build time
 * and upload the `public/models/` folder there unchanged. Nothing else in the code needs to change. See docs/ASSETS.md.
 */
// `env` is missing when the code runs outside Vite (the node test scripts), so fall back to the site root.
const env = (import.meta as unknown as { env?: { VITE_ASSET_BASE?: string; BASE_URL?: string } }).env;
const base = env?.VITE_ASSET_BASE ?? env?.BASE_URL ?? '/';
export const assetUrl = (path: string): string => `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\//, '')}`;
