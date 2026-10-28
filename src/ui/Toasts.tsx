import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/stores/uiStore';
import { usePhoneStore } from '@/stores/phoneStore';

const tone = { info: 'panel text-white', good: 'bg-emerald-500/90 text-white', bad: 'bg-rose-500/90 text-white' };

/** Toasts + the in-world notification banner that drops in when the phone is closed. */
export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const banner = useUiStore((s) => s.banner);
  const hide = useUiStore((s) => s.hideBanner);
  const openPhone = usePhoneStore((s) => s.openPhone);
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.1rem)] z-[90] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ y: -16, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={`max-w-sm rounded-lg px-3.5 py-2 text-sm font-medium shadow-glass ${tone[t.tone]}`}>{t.text}</motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[95] flex justify-center px-3">
        <AnimatePresence>
          {banner && (
            <motion.button key={banner.id}
              initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -90, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={() => { hide(); openPhone(); }} drag="y" dragConstraints={{ top: -80, bottom: 0 }} onDragEnd={(_, i) => i.offset.y < -20 && hide()}
              className="glass-dark pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-3xl px-4 py-3 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">{banner.icon}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{banner.title}</span><span className="block truncate text-[13px] text-white/75">{banner.body}</span></span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
