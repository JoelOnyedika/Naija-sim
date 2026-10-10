export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const formatNaira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

export const formatDuration = (s: number) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
