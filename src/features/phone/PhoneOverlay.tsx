import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronUp, Circle, LayoutGrid, Signal, Square, Wifi, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { APPS, getApp, type AppDef, type AppId } from '@/data/apps';
import { LIFE_TYPES } from '@/data/lifeTypes';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { useLifeStore } from '@/stores/lifeStore';
import { usePhoneStore } from '@/stores/phoneStore';
import type { PhoneType } from '@/types/game';
import { createPortal } from 'react-dom';
import { AppView } from './apps';

function useClock() {
  const minutes = useClockStore((s) => s.minutes), anchor = useClockStore((s) => s.anchor);
  return clockParts(minutes, anchor);
}

function StatusBar({ type }: { type: PhoneType }) {
  const t = useClock();
  const unread = usePhoneStore((s) => s.notifications.filter((n) => !n.read).length);
  const [shade, setShade] = useState(false);
  const notes = usePhoneStore((s) => s.notifications);
  return (
    <>
      <button onClick={() => { sfx.click(); setShade((v) => !v); if (!shade) usePhoneStore.getState().markRead(); }} className="relative z-30 flex w-full items-center justify-between px-6 pb-1 pt-3 text-[12px] font-semibold text-white" aria-label="Status bar">
        {type === 'ios' ? <span className="tabular-nums">{t.time.replace(' AM', '').replace(' PM', '')}</span> : <span className="tabular-nums">{t.time} · {t.weekday.slice(0, 3)} {t.dateLabel}</span>}
        <span className="flex items-center gap-1.5">
          {unread > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-hibiscus px-1 text-[10px] font-bold">{unread}</span>}
          <span className="text-[10px] font-bold">{type === 'ios' ? '5G' : '4G'}</span><Signal size={13} />{type === 'ios' && <Wifi size={13} />}
          <span className="flex items-center gap-0.5"><span className="relative h-2.5 w-5 rounded-[3px] border border-white/80"><i className="absolute inset-0.5 right-1 rounded-[1px] bg-white" /></span>{type === 'android' && <span className="text-[10px]">82%</span>}</span>
        </span>
      </button>
      <AnimatePresence>
        {shade && (
          <motion.div initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="absolute inset-x-0 top-0 z-40 max-h-[70%] overflow-y-auto rounded-b-3xl bg-slate-900/95 p-4 pt-12 text-white backdrop-blur" onClick={() => setShade(false)}>
            <p className="mb-2 font-display font-bold">Notifications</p>
            {notes.length === 0 && <p className="py-4 text-center text-sm text-white/50">All caught up.</p>}
            {notes.slice(0, 8).map((n) => (
              <button key={n.id} onClick={(e) => { e.stopPropagation(); if (n.appId) usePhoneStore.getState().openApp(n.appId); setShade(false); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-left">
                <span className="text-2xl">{n.icon}</span><span className="min-w-0"><span className="block text-sm font-bold">{n.title}</span><span className="block truncate text-xs text-white/70">{n.body}</span></span>
              </button>
            ))}
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Icon({ app, type, onOpen }: { app: AppDef; type: PhoneType; onOpen: (id: AppId, e: React.MouseEvent) => void }) {
  const unread = usePhoneStore((s) => s.notifications.filter((n) => !n.read && n.appId === app.id).length);
  return (
    <motion.button whileTap={{ scale: 0.88 }} onClick={(e) => onOpen(app.id, e)} className="relative flex flex-col items-center gap-1" aria-label={app.label}>
      <span className={`relative flex h-[3.4rem] w-[3.4rem] items-center justify-center text-[1.65rem] shadow-lg ${type === 'ios' ? 'rounded-[1.2rem]' : 'rounded-full'}`} style={{ background: `linear-gradient(160deg, ${app.from}, ${app.to})` }}>
        <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/30 to-transparent" /><span className="relative drop-shadow">{app.glyph}</span>
      </span>
      <span className="text-[10.5px] font-medium text-white drop-shadow">{app.label}</span>
      {unread > 0 && <span className="absolute -right-0.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-hibiscus px-1 text-[11px] font-bold ring-2 ring-black/30">{unread}</span>}
    </motion.button>
  );
}

function HomeScreen({ type, onOpen }: { type: PhoneType; onOpen: (id: AppId, e: React.MouseEvent) => void }) {
  const t = useClock();
  const dock = type === 'ios' ? APPS.filter((a) => a.dock) : [];
  const grid = APPS.filter((a) => !dock.includes(a));
  return (
    <div className="flex h-full flex-col px-4 pb-3">
      {type === 'android' ? (
        <div className="mb-3 mt-2 px-1"><div className="font-display text-5xl font-light text-white">{t.time.replace(/ [AP]M/, '')}</div><div className="text-sm text-white/80">{t.weekday}, {t.dateLabel}</div></div>
      ) : (
        <div className="mb-2 mt-5 text-center"><div className="text-sm font-semibold text-white/85">{t.weekday}, {t.dateLabel}</div></div>
      )}
      <div className="no-scrollbar grid flex-1 grid-cols-4 content-start gap-x-2 gap-y-3.5 overflow-y-auto pt-1">{grid.map((a) => <Icon key={a.id} app={a} type={type} onOpen={onOpen} />)}</div>
      {type === 'ios' ? (
        <div className="mt-2 grid grid-cols-4 gap-2 rounded-[1.8rem] bg-white/20 p-2.5 backdrop-blur-xl">{dock.map((a) => <Icon key={a.id} app={a} type={type} onOpen={onOpen} />)}</div>
      ) : (
        <div className="mt-2 flex items-center gap-2 rounded-full bg-white/20 px-4 py-2.5 text-sm text-white/85 backdrop-blur-xl">🔍 Search apps</div>
      )}
    </div>
  );
}

function Switcher() {
  const recents = usePhoneStore((s) => s.recents);
  const open = usePhoneStore((s) => s.openApp);
  const set = usePhoneStore((s) => s.setSwitcher);
  return (
    <motion.div className="absolute inset-0 z-30 flex flex-col bg-black/60 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set(false)}>
      <p className="px-6 pt-14 font-display text-lg font-bold text-white">Recent apps</p>
      <div className="no-scrollbar flex flex-1 snap-x items-center gap-4 overflow-x-auto px-8">
        {recents.length === 0 && <p className="w-full text-center text-sm text-white/60">No recent apps.</p>}
        {recents.map((id, i) => { const a = getApp(id); return (
          <motion.button key={id} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} onClick={(e) => { e.stopPropagation(); sfx.pop(); open(id, { x: 50, y: 50 }); }} className="flex h-[60%] w-44 shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-white text-slate-900 shadow-xl">
            <span className="flex items-center gap-2 px-3 py-3 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}>{a.glyph} {a.label}</span>
            <span className="flex-1 bg-slate-100" />
          </motion.button>
        ); })}
      </div>
      <button onClick={() => { usePhoneStore.setState({ recents: [] }); }} className="mx-auto mb-14 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white">Clear all</button>
    </motion.div>
  );
}

function Shell({ type, children }: { type: PhoneType; children: ReactNode }) {
  const ios = type === 'ios';
  return (
    <div className={`relative h-full w-full overflow-hidden bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)] ${ios ? 'rounded-[3rem] border-[9px] border-[#0b0b0d]' : 'rounded-[2.1rem] border-[7px] border-[#1a1d21]'}`}>
      <div className="absolute inset-0" style={{ background: ios ? 'linear-gradient(170deg,#3a2d8f 0%,#1c1a52 45%,#0e2a4a 100%)' : 'linear-gradient(170deg,#0b7a63 0%,#0d4f5c 50%,#122b3f 100%)' }} />
      {ios ? <div className="absolute left-1/2 top-2.5 z-50 h-[1.65rem] w-[6.4rem] -translate-x-1/2 rounded-full bg-black" /> : <div className="absolute left-1/2 top-2.5 z-50 h-3 w-3 -translate-x-1/2 rounded-full bg-black ring-2 ring-white/10" />}
      {children}
    </div>
  );
}

/** The phone: pulls down from the top over the live 3D home. iOS-style for Nepo, Android-style for Lapo. */
export function PhoneOverlay() {
  const open = usePhoneStore((s) => s.open);
  const appId = usePhoneStore((s) => s.appId);
  const switcher = usePhoneStore((s) => s.switcher);
  const lifeType = useLifeStore((s) => s.lifeType);
  const type: PhoneType = lifeType ? LIFE_TYPES[lifeType].phone : 'android';
  const screen = useRef<HTMLDivElement>(null);

  const openApp = (id: AppId, e: React.MouseEvent) => {
    sfx.pop();
    const r = screen.current?.getBoundingClientRect(), b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const origin = r ? { x: ((b.left + b.width / 2 - r.left) / r.width) * 100, y: ((b.top + b.height / 2 - r.top) / r.height) * 100 } : { x: 50, y: 50 };
    usePhoneStore.getState().openApp(id, origin);
  };
  const close = () => { sfx.phoneClose(); usePhoneStore.getState().closePhone(); };
  const home = () => { sfx.close(); usePhoneStore.getState().closeApp(); };
  const origin = usePhoneStore((s) => s.origin);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex justify-center">
      <AnimatePresence>
        {open && (
          <motion.div
            key="phone" className="pointer-events-auto relative mt-[calc(env(safe-area-inset-top,0px)+0.4rem)] h-[min(80vh,720px)] w-[min(92vw,372px)]"
            initial={{ y: '-115%', rotateX: -25, scale: 0.92 }} animate={{ y: 0, rotateX: 0, scale: 1 }} exit={{ y: '-115%', rotateX: -25, scale: 0.92 }} transition={{ type: 'spring', stiffness: 230, damping: 26 }}
            style={{ transformPerspective: 1200, transformOrigin: 'top center' }}
          >
            <button onClick={close} aria-label="Close phone" className="glass-dark absolute -right-1 -top-1 z-[60] flex h-9 w-9 items-center justify-center rounded-full">{type === 'ios' ? <ChevronUp size={20} /> : <X size={18} />}</button>
            <Shell type={type}>
              <div ref={screen} className="relative flex h-full flex-col">
                <StatusBar type={type} />
                <div className="relative min-h-0 flex-1">
                  <HomeScreen type={type} onOpen={openApp} />
                  <AnimatePresence>
                    {appId && !getApp(appId).fullscreen && (
                      <motion.div key={appId} className="absolute inset-0 z-20 overflow-hidden bg-slate-100" style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
                        initial={{ scale: 0.12, opacity: 0, borderRadius: '2.2rem' }} animate={{ scale: 1, opacity: 1, borderRadius: '0rem' }} exit={{ scale: 0.12, opacity: 0, borderRadius: '2.2rem' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                        <AppView id={appId} onBack={home} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>{switcher && <Switcher key="sw" />}</AnimatePresence>
                  {appId && getApp(appId).fullscreen && createPortal(<div className="fixed inset-0 z-[200] bg-slate-100" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}><AppView id={appId} onBack={home} /></div>, document.body)}
                </div>
                {type === 'ios' ? (
                  <div className="relative z-30 flex items-center justify-center pb-2 pt-1">
                    <button onClick={home} aria-label="Home" className="h-1.5 w-28 rounded-full bg-white/70" />
                    <button onClick={() => usePhoneStore.getState().setSwitcher(!switcher)} aria-label="Recent apps" className="absolute right-6 text-white/70"><LayoutGrid size={16} /></button>
                  </div>
                ) : (
                  <div className="relative z-30 flex items-center justify-around bg-black/30 py-2.5 text-white/80">
                    <button onClick={home} aria-label="Back"><ChevronLeft size={20} /></button>
                    <button onClick={() => { usePhoneStore.getState().setSwitcher(false); home(); }} aria-label="Home"><Circle size={18} /></button>
                    <button onClick={() => usePhoneStore.getState().setSwitcher(!switcher)} aria-label="Recent apps"><Square size={16} /></button>
                  </div>
                )}
              </div>
            </Shell>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
