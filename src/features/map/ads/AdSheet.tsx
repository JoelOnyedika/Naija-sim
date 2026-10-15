import { motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useMemo } from 'react';
import { billboardSlots, effectiveStatus, seaSlots, slotAvailability } from '@/game/ads/slots';
import { safeUrl } from '@/game/ads/validate';
import { useAdsStore } from '@/stores/adsStore';
import { useAdsUiStore, type Sheet } from '@/stores/adsUiStore';
import type { StateDefinition } from '@/types/world';
import { Button } from '@/ui/Button';
import { Price, StatusBadge, timeLeft, useNow } from './common';
import { Rules } from './Rules';

/** Bottom-up sheet for a tapped billboard or a tapped floating sea ad. Dismiss with the X, the backdrop or by tapping the map. */
export function AdSheet({ state, sheet }: { state: StateDefinition; sheet: NonNullable<Sheet> }) {
  const subs = useAdsStore((s) => s.submissions);
  const now = useNow(1000);
  const close = () => useAdsUiStore.getState().openSheet(null);
  const cfg = state.ads!;
  const boards = useMemo(() => billboardSlots(state), [state]);
  const seas = useMemo(() => seaSlots(state), [state]);

  let body: React.ReactNode = null;
  if (sheet.type === 'billboard') {
    const slot = boards.find((b) => b.id === sheet.slotId), def = state.mapData.billboards?.find((b) => b.id === sheet.slotId);
    if (!slot || !def) return null;
    const a = slotAvailability(subs, 'billboard', slot.id, now), ad = a.by && effectiveStatus(a.by, now) === 'active' ? a.by : null;
    const area = state.areas.find((x) => x.id === slot.areaId);
    body = (
      <>
        <AdFace image={ad?.imageDataUrl} fallback={<div className="flex h-full w-full flex-col justify-center px-4" style={{ background: def.content.bg, color: def.content.fg }}><div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: def.content.accent }}>{def.content.advertiser}</div><div className="font-display text-lg font-extrabold leading-tight">{def.content.headline}</div></div>} />
        <Title name={ad?.advertiser ?? slot.name} sub={ad ? slot.name : def.content.meta?.placeholder ? 'This board is open for advertising' : 'Sample advertisement'} badge={ad ? <StatusBadge status="active" /> : null} />
        {ad && <p className="text-sm text-white/80">{ad.description}</p>}
        <Site url={ad?.websiteUrl} />
        <Facts rows={[
          ['Location', <span key="l">{slot.location}{slot.road ? <i className="block font-normal text-white/60">{slot.road}</i> : null}</span>], ...(area ? [['District', area.name] as [string, string]] : []), ['Size and type', slot.sizeLabel], ['Tier', slot.tier],
          ['Price', <Price key="p" n={slot.price} />], ['Duration', `${Math.round(slot.durationMs / 86_400_000)} days once approved`],
          ['Availability', a.state === 'available' ? '✓ Available' : a.state === 'reserved' ? '⏳ Reserved (waiting for approval)' : `✕ Booked · ${a.by?.expiresAt ? timeLeft(a.by.expiresAt - now) : ''}`],
        ]} />
        <Button className="w-full" disabled={a.state !== 'available'} onClick={() => useAdsUiStore.getState().startWizard({ kind: 'billboard', slotId: slot.id })}>{a.state === 'available' ? 'Advertise your business here' : 'Not available right now'}</Button>
      </>
    );
  } else {
    const ad = subs.find((s) => s.id === sheet.submissionId);
    if (!ad) return null;
    const status = effectiveStatus(ad, now), slot = seas.find((s) => s.id === ad.slotId), tier = cfg.seaTiers.find((t) => t.id === slot?.tier);
    body = (
      <>
        <AdFace image={ad.imageDataUrl} />
        <Title name={ad.advertiser} sub="Floating Sea Ad" badge={<StatusBadge status={status} />} />
        <p className="text-sm text-white/80">{ad.description}</p>
        <Site url={ad.websiteUrl} />
        <Facts rows={[['Position', slot ? `Sea ${ad.slotId.replace('sea-', '')} · ${tier?.label ?? ''}` : ad.slotId], ['Status', status === 'active' && ad.expiresAt ? `Live · ${timeLeft(ad.expiresAt - now)}` : status === 'pending' ? 'Waiting for review: not visible in the world yet' : status === 'rejected' ? `Rejected${ad.rejectReason ? `: ${ad.rejectReason}` : ''}` : status === 'expired' ? 'Expired: the position is free again' : 'Draft'], ['Paid', ad.paymentStatus === 'simulated' ? <span key="s">{<Price n={ad.price} />} <i className="text-white/50">(simulated, no money moved)</i></span> : 'Not submitted']]} />
        {slot && status === 'active' && <Button variant="quiet" className="w-full" onClick={() => useAdsUiStore.getState().setFocus([slot.x, slot.z])}>Show it on the map</Button>}
      </>
    );
  }
  return (
    <motion.div className="absolute inset-0 z-[62]" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>
      <div className="absolute inset-0" onClick={close} aria-hidden />
      <motion.div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[5.8rem]" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <div className="glass-dark relative max-h-[calc(100dvh-16rem)] w-full max-w-md space-y-2.5 overflow-y-auto rounded-[1.75rem] p-4" role="dialog" aria-label="Advertisement details">
          <button onClick={close} aria-label="Close" className="absolute right-3 top-3 text-white/60"><X size={18} /></button>
          {body}
          <Rules cfg={cfg} />
        </div>
      </motion.div>
    </motion.div>
  );
}

const AdFace = ({ image, fallback }: { image?: string; fallback?: React.ReactNode }) => (
  <div className="aspect-[2/1] w-full overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">{image ? <img src={image} alt="Advertisement artwork" className="h-full w-full object-contain" /> : fallback}</div>
);
const Title = ({ name, sub, badge }: { name: string; sub: string; badge: React.ReactNode }) => (
  <div className="pr-6"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-bold leading-tight">{name}</h3>{badge}</div><div className="text-sm font-semibold text-danfo">{sub}</div></div>
);
function Site({ url }: { url?: string }) {
  const safe = url ? safeUrl(url) : null;
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 break-all text-sm font-semibold text-accent-glow underline"><ExternalLink size={13} />{safe.replace(/^https?:\/\//, '')}</a> : null;
}
const Facts = ({ rows }: { rows: [string, React.ReactNode][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl bg-white/[0.06] p-3 text-xs">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-white/50">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}</dl>
);
