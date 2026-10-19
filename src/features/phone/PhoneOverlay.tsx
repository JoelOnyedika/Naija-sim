import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronUp, Circle, LayoutGrid, Square, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/audio/sfx';
import { getApp } from '@/data/apps';
import { usePhoneStore } from '@/stores/phoneStore';
import type { PhoneType } from '@/types/game';
import { AppView } from './apps';
import { AndroidHome, AppLibrary, IosHome, StatusBar, type OpenApp } from './HomeScreens';
import { usePhoneType } from './usePhoneType';

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
  const wallpaper = ios
    ? 'radial-gradient(120% 55% at 15% 0%, #8f72f2 0%, transparent 60%), radial-gradient(90% 55% at 100% 45%, #3a6ff0 0%, transparent 62%), linear-gradient(170deg,#4a2fb5 0%,#2b2c8c 45%,#12235a 100%)'
    : 'radial-gradient(110% 55% at 85% 0%, #38bdf8 0%, transparent 60%), radial-gradient(80% 50% at 0% 70%, #6366f1 0%, transparent 62%), linear-gradient(175deg,#1e40af 0%,#1d2f6f 50%,#0b1226 100%)';
  return (
    <div className={`relative h-full w-full overflow-hidden bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)] ${ios ? 'rounded-[3rem] border-[9px] border-[#0b0b0d]' : 'rounded-[2.4rem] border-[7px] border-[#16181c]'}`}>
      <div className="absolute inset-0" style={{ background: wallpaper }} />
      {ios ? <div className="absolute left-1/2 top-2.5 z-50 h-[1.65rem] w-[6.4rem] -translate-x-1/2 rounded-full bg-black" /> : <div className="absolute left-1/2 top-3 z-50 h-3 w-3 -translate-x-1/2 rounded-full bg-black ring-2 ring-white/10" />}
      {children}
    </div>
  );
}

/** The phone: pulls down from the top over the live 3D home. iPhone-style for Nepo lives, Samsung One UI style for Lapo lives. */
export function PhoneOverlay() {
  const open = usePhoneStore((s) => s.open), appId = usePhoneStore((s) => s.appId), switcher = usePhoneStore((s) => s.switcher), origin = usePhoneStore((s) => s.origin);
  const type = usePhoneType(), screen = useRef<HTMLDivElement>(null);
  const [lib, setLib] = useState(false), [libFocus, setLibFocus] = useState(false);
  useEffect(() => { if (!open) { setLib(false); setLibFocus(false); } }, [open]);
  const inApp = !!appId && !getApp(appId).fullscreen;

  const openApp: OpenApp = (id, e) => {
    sfx.pop(); setLib(false);
    const r = screen.current?.getBoundingClientRect(), b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    usePhoneStore.getState().openApp(id, r ? { x: ((b.left + b.width / 2 - r.left) / r.width) * 100, y: ((b.top + b.height / 2 - r.top) / r.height) * 100 } : { x: 50, y: 50 });
  };
  const close = () => { sfx.phoneClose(); usePhoneStore.getState().closePhone(); };
  const home = () => { sfx.close(); if (appId) usePhoneStore.getState().closeApp(); else setLib(false); };
  const showLibrary = (focus = false) => { sfx.click(); usePhoneStore.getState().closeApp(); setLibFocus(focus); setLib((v) => (focus ? true : !v)); };
  const Home = type === 'ios' ? IosHome : AndroidHome;
  const navTone = inApp ? 'app-surface bg-white text-slate-500' : 'text-white/80';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex justify-center">
      <AnimatePresence>
        {open && (
          <motion.div key="phone" className="pointer-events-auto relative mt-[calc(env(safe-area-inset-top,0px)+0.4rem)] h-[min(84vh,760px)] w-[min(94vw,380px)]"
            initial={{ y: '-115%', rotateX: -25, scale: 0.92 }} animate={{ y: 0, rotateX: 0, scale: 1 }} exit={{ y: '-115%', rotateX: -25, scale: 0.92 }} transition={{ type: 'spring', stiffness: 230, damping: 26 }}
            style={{ transformPerspective: 1200, transformOrigin: 'top center' }}>
            <button onClick={close} aria-label="Close phone" className="glass-dark absolute -right-1 -top-1 z-[60] flex h-9 w-9 items-center justify-center rounded-full">{type === 'ios' ? <ChevronUp size={20} /> : <X size={18} />}</button>
            <Shell type={type}>
              <div ref={screen} className="relative flex h-full flex-col">
                <div className="relative min-h-0 flex-1">
                  {!lib && <Home onOpen={openApp} onLibrary={() => showLibrary(false)} libOpen={lib} />}
                  {lib && <AppLibrary type={type} onOpen={openApp} focusSearch={libFocus} />}
                  <AnimatePresence>
                    {inApp && (
                      <motion.div key={appId} className="absolute inset-0 z-20 overflow-hidden bg-slate-100" style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
                        initial={{ scale: 0.12, opacity: 0, borderRadius: '2.2rem' }} animate={{ scale: 1, opacity: 1, borderRadius: '0rem' }} exit={{ scale: 0.12, opacity: 0, borderRadius: '2.2rem' }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                        <AppView id={appId!} onBack={home} statusPad />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>{switcher && <Switcher key="sw" />}</AnimatePresence>
                  {appId && getApp(appId).fullscreen && createPortal(<div className="fixed inset-0 z-[200] bg-slate-100" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}><AppView id={appId} onBack={home} statusPad={false} /></div>, document.body)}
                </div>
                <StatusBar type={type} inApp={inApp} />
                {type === 'ios' ? (
                  <div className={`relative z-30 flex items-center justify-center pb-1 pt-0.5 ${navTone}`}>
                    <button onClick={home} aria-label="Home" className="flex h-7 w-44 items-center justify-center"><span className={`h-1.5 w-32 rounded-full ${inApp ? 'bg-slate-900/70' : 'bg-white/70'}`} /></button>
                    <button onClick={() => usePhoneStore.getState().setSwitcher(!switcher)} aria-label="Recent apps" className="absolute right-6"><LayoutGrid size={16} /></button>
                  </div>
                ) : (
                  <div className={`relative z-30 flex items-center justify-around py-2.5 ${navTone} ${inApp ? 'border-t border-slate-200' : 'bg-black/25'}`}>
                    <button onClick={() => usePhoneStore.getState().setSwitcher(!switcher)} aria-label="Recent apps"><Square size={16} /></button>
                    <button onClick={() => { usePhoneStore.getState().setSwitcher(false); home(); }} aria-label="Home"><Circle size={18} /></button>
                    <button onClick={home} aria-label="Back"><ChevronLeft size={21} /></button>
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
