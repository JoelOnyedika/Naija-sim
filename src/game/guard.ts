/**
 * Double-tap protection for player-triggered money actions. One submission at a time, and the same request repeated
 * within a short window is ignored. (Scheduled events use ledger idempotency keys instead.)
 */
let busy = false;
const recent = new Map<string, number>();
const WINDOW_MS = 1500;

export function guarded<T extends { ok: boolean }>(key: string, run: () => T, dup: T): T {
  const now = Date.now();
  const at = recent.get(key);
  if (busy || (at !== undefined && now - at < WINDOW_MS)) return dup;
  busy = true;
  try {
    const r = run();
    if (r.ok) recent.set(key, now);
    return r;
  } finally { busy = false; }
}
/** Test hook: forget remembered requests. */
export const clearGuard = () => recent.clear();
