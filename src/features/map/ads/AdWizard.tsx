import { motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { billboardSlots, seaSlots, slotAvailability, slotProblem } from '@/game/ads/slots';
import { prepareImage, type PreparedImage } from '@/game/ads/image';
import { validateDetails } from '@/game/ads/validate';
import { useAdsStore } from '@/stores/adsStore';
import { useAdsUiStore, type Wizard } from '@/stores/adsUiStore';
import { toast } from '@/stores/uiStore';
import type { StateDefinition } from '@/types/world';
import { Button } from '@/ui/Button';
import { Price, useNow } from './common';
import { Rules } from './Rules';
import { SeaPicker } from './SeaPicker';

type Step = 'details' | 'place' | 'review' | 'done';
const STEPS: Step[] = ['details', 'place', 'review', 'done'];

/**
 * Create an ad, for either product: details and artwork -> placement -> review and SIMULATED checkout -> pending.
 * Nothing becomes visible in the world here: submission only creates a Pending ad that a moderator must approve.
 */
export function AdWizard({ state, wizard }: { state: StateDefinition; wizard: Wizard }) {
  const cfg = state.ads!;
  const subs = useAdsStore((s) => s.submissions);
  const [step, setStep] = useState<Step>('details');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [advertiser, setAdvertiser] = useState(''), [description, setDescription] = useState(''), [websiteUrl, setWebsiteUrl] = useState('');
  const [errs, setErrs] = useState<ReturnType<typeof validateDetails>>({});
  const [slotId, setSlotId] = useState<string | null>(wizard.slotId);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>();
  const file = useRef<HTMLInputElement>(null);
  const now = useNow(1000);
  const picker = useAdsUiStore((s) => s.picker);
  const sea = wizard.kind === 'sea';

  const boards = useMemo(() => billboardSlots(state), [state]);
  const seas = useMemo(() => seaSlots(state), [state]);
  const price = (sea ? seas.find((s) => s.id === slotId)?.price : boards.find((b) => b.id === slotId)?.price) ?? null;
  const days = sea ? cfg.seaDurationDays : cfg.billboardDurationDays;

  // the 3D map shows green/red markers only during the placement step of a Sea Ad; the picker is the single source of the choice
  useEffect(() => {
    if (sea && step === 'place') useAdsUiStore.getState().startPicker(slotId); else useAdsUiStore.getState().endPicker();
    return () => useAdsUiStore.getState().endPicker();
  }, [sea, step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sea && picker?.selected !== undefined && picker.selected !== slotId && step === 'place') setSlotId(picker.selected); }, [picker?.selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (id: string | null) => {
    setSlotId(id); useAdsUiStore.getState().pick(id);
    const p = sea ? seas.find((s) => s.id === id) : boards.find((b) => b.id === id);
    if (p) useAdsUiStore.getState().setFocus(sea ? [(p as { x: number }).x, (p as { z: number }).z] : (p as { position: [number, number] }).position);
  };

  const onFile = async (f?: File) => {
    if (!f) return; setBusy(true); setImgErr(null);
    const r = await prepareImage(f, cfg.upload); setBusy(false);
    if (r.ok) setImage(r.image); else { setImage(null); setImgErr(r.error); sfx.error(); }
  };
  const nextDetails = () => {
    const p = validateDetails({ advertiser, description, websiteUrl }); setErrs(p);
    if (!image) { setImgErr(imgErr ?? 'Upload your advertisement image.'); return; }
    if (Object.keys(p).length) { sfx.error(); return; }
    setStep('place');
  };
  const nextPlace = () => {
    if (!slotId) { setError('Choose a placement first.'); return; }
    const problem = slotProblem(state, subs.filter((s) => s.id !== draftId), wizard.kind, slotId, Date.now());
    if (problem) { setError(problem); sfx.error(); return; }
    setError(null); setStep('review');
  };
  const pay = () => {
    if (!image || !slotId || !agree) return;
    const d = useAdsStore.getState().saveDraft({ stateId: state.id, kind: wizard.kind, slotId, advertiser, description, websiteUrl, imageDataUrl: image.dataUrl, imageWidth: image.width, imageHeight: image.height }, draftId);
    if (!d.ok) { setError(d.error); sfx.error(); return; }
    setDraftId(d.id);
    const r = useAdsStore.getState().submit(d.id);
    if (!r.ok) { setError(r.error); sfx.error(); return; }
    if (useAdsStore.getState().storageError) toast(useAdsStore.getState().storageError!, 'bad');
    sfx.coin(); setStep('done');
  };
  const close = () => useAdsUiStore.getState().closeWizard();
  const idx = STEPS.indexOf(step);
  const selBoard = boards.find((b) => b.id === slotId);

  return (
    <motion.div className="absolute inset-x-0 bottom-0 z-[66] flex justify-center px-2 pb-[5.8rem]" initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="glass-dark relative max-h-[calc(100dvh-15.5rem)] w-full max-w-md space-y-3 overflow-y-auto rounded-[1.75rem] p-4" role="dialog" aria-label={sea ? 'Create a Sea Ad' : 'Advertise on a billboard'}>
        <button onClick={close} aria-label="Cancel and close" className="absolute right-3 top-3 text-white/60"><X size={18} /></button>
        <div className="pr-6"><h3 className="font-display text-xl font-bold">{sea ? 'Create a Sea Ad' : 'Advertise on a billboard'}</h3>
          <div className="mt-1 flex gap-1" aria-label={`Step ${idx + 1} of 4`}>{STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-danfo' : 'bg-white/15'}`} />)}</div></div>

        {step === 'details' && (
          <div className="space-y-2.5">
            <input ref={file} type="file" accept={cfg.upload.types.join(',')} hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
            <button onClick={() => file.current?.click()} className="flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/30 ring-1 ring-dashed ring-white/25" aria-label="Upload advertisement image">
              {image ? <img src={image.dataUrl} alt="Advertisement preview" className="h-full w-full object-contain" /> : <span className="flex flex-col items-center gap-1 text-sm text-white/70"><ImagePlus size={24} />{busy ? 'Reading image…' : 'Tap to upload artwork'}<span className="text-[11px] text-white/45">PNG, JPEG or WebP · up to {(cfg.upload.maxBytes / 1048576).toFixed(0)} MB · wide (about 2:1) works best</span></span>}
            </button>
            {imgErr && <p role="alert" className="text-xs font-semibold text-rose-300">{imgErr}</p>}
            {image && <p className="text-[11px] text-white/50">{image.width}×{image.height}px · proportions are kept, never stretched.</p>}
            <Field label="Business or advertiser name" value={advertiser} set={setAdvertiser} err={errs.advertiser} max={60} />
            <Field label="Description" value={description} set={setDescription} err={errs.description} max={300} area />
            <Field label="Website (optional)" value={websiteUrl} set={setWebsiteUrl} err={errs.websiteUrl} placeholder="https://" />
            <Button className="w-full" onClick={nextDetails}>Choose placement</Button>
          </div>
        )}

        {step === 'place' && (
          <div className="space-y-2.5">
            {sea ? <SeaPicker state={state} selected={slotId} onSelect={choose} /> : (
              <div className="space-y-1.5" role="radiogroup" aria-label="Billboard placements">
                {boards.map((b) => {
                  const a = slotAvailability(subs.filter((s) => s.id !== draftId), 'billboard', b.id, now), ok = a.state === 'available', on = b.id === slotId;
                  return (
                    <button key={b.id} role="radio" aria-checked={on} aria-disabled={!ok} onClick={() => { if (!ok) { sfx.error(); return; } choose(b.id); }}
                      className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ${on ? 'bg-danfo/20 ring-2 ring-danfo' : 'glass'} ${ok ? '' : 'opacity-55'}`}>
                      <span aria-hidden className="text-lg">{ok ? '🟢' : '🔴'}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{b.name}</span><span className="block truncate text-[11px] font-semibold text-danfo">📍 {b.location}</span><span className="block truncate text-[11px] text-white/55">{b.road ? `${b.road} · ` : ''}{b.sizeLabel}</span></span>
                      <span className="text-right"><Price n={b.price} /><span className="block text-[10px] font-bold">{ok ? '✓ Available' : a.state === 'reserved' ? '⏳ Reserved' : '✕ Booked'}</span></span>
                    </button>
                  );
                })}
              </div>
            )}
            {error && <p role="alert" className="text-xs font-semibold text-rose-300">{error}</p>}
            <div className="flex gap-2"><Button variant="quiet" onClick={() => setStep('details')}>Back</Button><Button className="flex-1" disabled={!slotId} onClick={nextPlace}>{price ? <>Review · <Price n={price} /></> : 'Review'}</Button></div>
          </div>
        )}

        {step === 'review' && image && price !== null && (
          <div className="space-y-2.5">
            <div className="aspect-[2/1] overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10"><img src={image.dataUrl} alt="How your ad will look" className="h-full w-full object-contain" /></div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl bg-white/[0.06] p-3 text-xs">
              <dt className="text-white/50">Advertiser</dt><dd className="text-right font-semibold">{advertiser.trim()}</dd>
              <dt className="text-white/50">Placement</dt><dd className="text-right font-semibold">{sea ? `Sea position ${slotId?.replace('sea-', '')}` : `${selBoard?.name} · ${selBoard?.location}`}</dd>
              <dt className="text-white/50">Runs for</dt><dd className="text-right font-semibold">{days} days after approval</dd>
              <dt className="text-white/50">Price</dt><dd className="text-right"><Price n={price} /></dd>
            </dl>
            <div className="rounded-2xl border-2 border-amber-300/70 bg-amber-400/10 p-3 text-sm"><b className="text-amber-200">SIMULATED PAYMENT.</b> This is a test checkout. No real money is charged and no payment provider is used. Your ad goes to <b>Pending review</b> and only appears in the world after it is approved.</div>
            <Rules cfg={cfg} defaultOpen />
            <label className="flex items-start gap-2 text-xs text-white/80"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />I have read the advertising rules and understand that review can reject this ad.</label>
            {error && <p role="alert" className="text-xs font-semibold text-rose-300">{error}</p>}
            <div className="flex gap-2"><Button variant="quiet" onClick={() => setStep('place')}>Back</Button><Button className="flex-1" disabled={!agree} onClick={pay}>Confirm simulated payment · {price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })}</Button></div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 text-center">
            <div className="text-5xl" aria-hidden>⏳</div>
            <h4 className="font-display text-xl font-bold">Submitted: pending review</h4>
            <p className="text-sm text-white/75">Your ad is <b>not live yet</b>. It will appear in the world once it is approved, and then run for {days} days. The position is reserved for you while it waits. Find it under “My ads”.</p>
            <p className="text-[11px] text-white/45">Simulated checkout: nothing was charged.</p>
            <Button className="w-full" onClick={close}>Done</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Field({ label, value, set, err, max, area, placeholder }: { label: string; value: string; set: (v: string) => void; err?: string; max?: number; area?: boolean; placeholder?: string }) {
  const cls = `w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ${err ? 'ring-rose-400' : 'ring-white/10 focus:ring-accent'}`;
  return (
    <label className="block text-xs font-semibold text-white/70">{label}
      {area ? <textarea value={value} onChange={(e) => set(e.target.value)} maxLength={max} rows={2} className={`mt-1 ${cls}`} aria-invalid={!!err} /> : <input value={value} onChange={(e) => set(e.target.value)} maxLength={max ?? 200} placeholder={placeholder} className={`mt-1 ${cls}`} aria-invalid={!!err} />}
      {err && <span role="alert" className="mt-0.5 block text-rose-300">{err}</span>}
    </label>
  );
}
