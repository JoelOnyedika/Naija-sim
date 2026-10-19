import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Moon, Search, Signal, Sun, Wifi } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { sfx } from '@/audio/sfx';
import { APPS, getApp, type AppId } from '@/data/apps';
import { cityName } from '@/data/land';
import { CATEGORIES, DOCK, FAVORITES } from '@/data/phoneLayout';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { currentStateId } from '@/stores/mapStore';
import { usePhoneStore } from '@/stores/phoneStore';
import type { PhoneType } from '@/types/game';
import { AppIcon, LibraryIcon } from './appIcons';

export type OpenApp = (id: AppId, e: MouseEvent) => void;

export function useClock() {
  const minutes = useClockStore((s) => s.minutes), anchor = useClockStore((s) => s.anchor);
  return clockParts(minutes, anchor);
}
const hhmm = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * The status bar. It floats over everything (home or app) so the clock is always on screen. iOS follows the reference design:
 * carrier on the left, signal, battery and a bold clock on the right. Android: bold clock on the left, icons on the right.
 * Tapping it opens the notification shade.
 */
export function StatusBar({ type, inApp }: { type: PhoneType; inApp: boolean }) {
  const t = useClock(), ios = type === 'ios';
  const notes = usePhoneStore((s) => s.notifications), unread = notes.filter((n) => !n.read).length;
  const [shade, setShade] = useState(false);
  const clock = <span className="text-[15px] font-bold tabular-nums tracking-tight" aria-label={`Time ${hhmm(t.date)}`}>{hhmm(t.date)}</span>;
  const battery = <span className="relative h-[11px] w-[22px] rounded-[3.5px] border border-current/70" aria-label="Battery"><i className="absolute inset-[1.5px] right-[4px] rounded-[1.5px] bg-current" /><i className="absolute -right-[3px] top-[3px] h-[4px] w-[1.5px] rounded-r bg-current/70" /></span>;
  return (
    <>
      <button onClick={() => { sfx.click(); setShade((v) => !v); if (!shade) usePhoneStore.getState().markRead(); }} aria-label={`Notifications${unread ? `, ${unread} new` : ''}`}
        className={`absolute inset-x-0 top-0 z-[45] flex h-11 w-full items-end justify-between px-7 pb-1.5 text-left ${inApp ? 'app-surface bg-white text-slate-900' : 'text-white'}`}>
        {ios ? <span className="text-[13px] font-semibold opacity-90">Naija Net</span> : <span className="flex items-center gap-1.5">{clock}{unread > 0 && <span className="h-2 w-2 rounded-full bg-hibiscus" />}</span>}
        <span className="flex items-center gap-1.5">
          {ios && unread > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-hibiscus px-1 text-[10px] font-bold text-white">{unread}</span>}
          {!ios && <><span className="text-[10px] font-bold">4G</span><Signal size={13} strokeWidth={2.4} /></>}<Wifi size={14} strokeWidth={2.4} />
          {battery}{!ios && <span className="text-[11px] font-semibold">82%</span>}
          {ios && <span className="ml-1">{clock}</span>}
        </span>
      </button>
      <AnimatePresence>
        {shade && (
          <motion.div initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="absolute inset-x-0 top-0 z-[60] max-h-[75%] overflow-y-auto rounded-b-3xl bg-slate-900/95 px-4 pb-4 pt-14 text-white shadow-2xl backdrop-blur-xl">
            <p className="mb-2 font-display font-bold">Notifications</p>
            {notes.length === 0 && <p className="py-4 text-center text-sm text-white/50">All caught up.</p>}
            {notes.slice(0, 8).map((n) => (
              <button key={n.id} onClick={() => { if (n.appId) usePhoneStore.getState().openApp(n.appId); setShade(false); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-left">
                <span className="text-2xl">{n.icon}</span><span className="min-w-0"><span className="block text-sm font-bold">{n.title}</span><span className="block truncate text-xs text-white/70">{n.body}</span></span>
              </button>
            ))}
            <button onClick={() => setShade(false)} aria-label="Close notifications" className="mx-auto mt-2 block h-1 w-10 rounded-full bg-white/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HomeIcon({ id, type, onOpen }: { id: AppId; type: PhoneType; onOpen: OpenApp }) {
  const app = getApp(id), unread = usePhoneStore((s) => s.notifications.filter((n) => !n.read && n.appId === id).length);
  return (
    <button onClick={(e) => onOpen(id, e)} className="relative flex min-w-0 flex-col items-center gap-1.5 active:opacity-70" aria-label={app.label}>
      <AppIcon app={app} variant={type} />
      <span className="w-full truncate text-center text-[11px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">{app.label}</span>
      {unread > 0 && <span className="absolute -right-0.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-hibiscus px-1 text-[11px] font-bold text-white ring-2 ring-black/20">{unread}</span>}
    </button>
  );
}

function Dock({ type, onOpen, onLibrary, libOpen }: { type: PhoneType; onOpen: OpenApp; onLibrary: () => void; libOpen: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-[30px] bg-white/25 p-3 backdrop-blur-xl" role="group" aria-label="Dock">
      {DOCK.map((id) => { const app = getApp(id); return (
        <button key={id} onClick={(e) => onOpen(id, e)} aria-label={app.label} className="relative flex justify-center active:opacity-70"><AppIcon app={app} variant={type} />
          <DockBadge id={id} /></button>); })}
      <button onClick={onLibrary} aria-label="App library" aria-pressed={libOpen} className="flex justify-center active:opacity-70"><LibraryIcon variant={type} active={libOpen} /></button>
    </div>
  );
}
function DockBadge({ id }: { id: AppId }) {
  const unread = usePhoneStore((s) => s.notifications.filter((n) => !n.read && n.appId === id).length);
  return unread > 0 ? <span className="absolute right-0 top-[-6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-hibiscus px-1 text-[11px] font-bold text-white ring-2 ring-black/20">{unread}</span> : null;
}

const phase = (h: number) => (h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night');

/** iOS home: two glass widgets (time and place, calendar), 12 favourite apps, then the dock. */
export function IosHome({ onOpen, onLibrary, libOpen }: { onOpen: OpenApp; onLibrary: () => void; libOpen: boolean }) {
  const t = useClock(), city = cityName(currentStateId()), day = t.date.getDate(), month = t.date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const night = t.hour < 6 || t.hour >= 19;
  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-4 pb-2 pt-14">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex aspect-square flex-col justify-between rounded-[26px] bg-white/20 p-4 text-white backdrop-blur-xl">
          <div><div className="flex items-center gap-1.5 text-[13px] font-semibold">{city}{night ? <Moon size={14} /> : <Sun size={14} />}</div>
            <div className="mt-1 font-display text-[40px] font-light leading-none tabular-nums">{hhmm(t.date)}</div></div>
          <div className="text-[13px] font-semibold">{phase(t.hour)}<div className="text-[12px] font-normal text-white/75">{t.weekday}</div></div>
        </div>
        <div className="flex aspect-square flex-col rounded-[26px] bg-white/85 p-4 text-slate-900 backdrop-blur-xl">
          <div className="text-[13px] font-bold text-rose-500">{t.weekday.slice(0, 3).toUpperCase()}, {month}</div>
          <div className="mt-auto font-display text-[68px] font-light leading-none tabular-nums">{day}</div>
          <div className="mt-1 text-[12px] text-slate-500">Today in {city}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4">{FAVORITES.map((id) => <HomeIcon key={id} id={id} type="ios" onOpen={onOpen} />)}</div>
      <div className="mt-auto pt-4"><Dock type="ios" onOpen={onOpen} onLibrary={onLibrary} libOpen={libOpen} /></div>
    </div>
  );
}

/** Android (One UI style) home: a big clock, 12 favourites, a search pill and the dock. */
export function AndroidHome({ onOpen, onLibrary, libOpen }: { onOpen: OpenApp; onLibrary: () => void; libOpen: boolean }) {
  const t = useClock(), city = cityName(currentStateId());
  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-4 pb-2 pt-14">
      <div className="px-1 text-white">
        <div className="font-display text-[72px] font-light leading-none tracking-tight tabular-nums">{t.time.replace(/ [AP]M/, '')}</div>
        <div className="mt-1.5 text-[15px] font-medium">{t.weekday}, {t.dateLabel}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[13px] text-white/75"><MapPin size={13} />{city}</div>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-x-2 gap-y-4">{FAVORITES.map((id) => <HomeIcon key={id} id={id} type="android" onOpen={onOpen} />)}</div>
      <div className="mt-auto space-y-3 pt-4">
        <button onClick={onLibrary} className="flex w-full items-center gap-3 rounded-full bg-white/90 px-4 py-3 text-left text-[14px] text-slate-500 shadow-lg"><Search size={18} />Search apps</button>
        <Dock type="android" onOpen={onOpen} onLibrary={onLibrary} libOpen={libOpen} />
      </div>
    </div>
  );
}

/** Every app, grouped, with search. This replaces scrolling through one long list: find by group or by typing. */
export function AppLibrary({ type, onOpen, focusSearch }: { type: PhoneType; onOpen: OpenApp; focusSearch: boolean }) {
  const [q, setQ] = useState(''), input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusSearch) input.current?.focus(); }, [focusSearch]);
  const n = q.trim().toLowerCase(), results = n ? APPS.filter((a) => a.label.toLowerCase().includes(n)) : [];
  const grid = (ids: AppId[]) => <div className="grid grid-cols-4 gap-x-2 gap-y-4">{ids.map((id) => <HomeIcon key={id} id={id} type={type} onOpen={onOpen} />)}</div>;
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black/40 pt-14 backdrop-blur-2xl" role="dialog" aria-label="App library">
      <div className="px-4"><label className={`flex items-center gap-2 bg-white/20 px-3.5 py-2.5 text-white ${type === 'ios' ? 'rounded-xl' : 'rounded-full'}`}><Search size={17} className="shrink-0 text-white/70" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" aria-label="Search apps" className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/60" /></label></div>
      <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-4">
        {n ? (results.length ? <section>{grid(results.map((a) => a.id))}</section> : <p className="pt-8 text-center text-sm text-white/70">No app called &ldquo;{q}&rdquo;.</p>)
          : CATEGORIES.map((c) => <section key={c.title}><h3 className="mb-2.5 px-1 text-[13px] font-semibold text-white/80">{c.title}</h3>{grid(c.apps)}</section>)}
      </div>
    </div>
  );
}
