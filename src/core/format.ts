export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const formatNaira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

/**
 * Display-only short form for tight spaces (₦1.2M, ₦45B). Never feed the result back into a calculation:
 * balances stay plain numbers in the stores.
 */
export function formatNairaCompact(n: number): string {
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? '-' : '';
  if (abs < 1_000_000) return `${sign}₦${abs.toLocaleString('en-NG')}`;
  const units: [number, string][] = [[1e6, 'M'], [1e9, 'B'], [1e12, 'T']];
  let i = abs >= 1e12 ? 2 : abs >= 1e9 ? 1 : 0;
  const trim = (x: number) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10);
  let v = trim(abs / units[i][0]);
  if (v >= 1000 && i < units.length - 1) { i += 1; v = trim(abs / units[i][0]); }
  return `${sign}₦${v}${units[i][1]}`;
}

export const formatDuration = (s: number) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
