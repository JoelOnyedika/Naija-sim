import { useState } from 'react';
import type { AdsConfig } from '@/types/ads';

/** Advertising rules and the (draft) refund policy. Rules are enforced by human review, not by software, and say so. */
export function Rules({ cfg, defaultOpen = false }: { cfg: AdsConfig; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white/[0.06] p-3 text-xs text-white/75">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between font-bold text-white">Advertising rules and refund policy<span aria-hidden>{open ? '–' : '+'}</span></button>
      {open && (
        <div className="mt-2 space-y-2">
          <ul className="list-disc space-y-1 pl-4">{cfg.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="rounded-lg bg-amber-400/10 p-2 text-amber-200"><b>Refunds.</b> {cfg.refundPolicy}</p>
        </div>
      )}
    </div>
  );
}
