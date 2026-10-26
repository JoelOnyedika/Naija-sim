import { motion } from 'framer-motion';
import { House, Map, Menu, ShoppingBag, Smartphone, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { sfx } from '@/audio/sfx';
import { exitBuild } from '@/game/buy';
import { useEconomyStore } from '@/stores/economyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useFinishStore } from '@/stores/finishStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useUiStore } from '@/stores/uiStore';

type Id = 'home' | 'buy' | 'map' | 'phone';
const ITEMS: { id: Id; label: string; Icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', Icon: House }, { id: 'buy', label: 'Buy', Icon: ShoppingBag }, { id: 'map', label: 'Map', Icon: Map }, { id: 'phone', label: 'Phone', Icon: Smartphone },
];

/** Bottom navigation. The active destination is always blue. Nothing here navigates away from the 3D world. */
export function Dock() {
  const mode = useUiStore((s) => s.mode);
  const phoneOpen = usePhoneStore((s) => s.open);
  const unread = usePhoneStore((s) => s.notifications.filter((n) => !n.read).length);
  // The dock steps aside whenever a bottom action bar (furniture placement or a floor/wall preview) needs the space.
  const placingFurniture = useEditorStore((s) => !!s.draft);
  const previewingFinish = useFinishStore((s) => !!(s.preview.floor || s.preview.wall));
  const placing = placingFurniture || previewingFinish; // (hooks above run every render, never short-circuited)
  // Inside a venue the menu can be folded away behind one small button, to make room for the chat panel and the view.
  const hiddenFlag = useUiStore((s) => s.dockHidden), inVenue = useInteriorStore((s) => !!s.current); // (both hooks always run)
  const folded = hiddenFlag && inVenue;
  useEffect(() => { document.documentElement.style.setProperty('--dock-gap', folded || placing ? '0.7rem' : '4.9rem'); return () => { document.documentElement.style.removeProperty('--dock-gap'); }; }, [folded, placing]);
  const active: Id = phoneOpen ? 'phone' : mode === 'buy' ? 'buy' : mode === 'map' ? 'map' : 'home';

  const press = (id: Id) => {
    const ui = useUiStore.getState(), phone = usePhoneStore.getState();
    if (id === 'phone') {
      if (phone.open) { phone.closePhone(); sfx.phoneClose(); } else { phone.openPhone(); sfx.phoneOpen(); }
      return;
    }
    if (phone.open) phone.closePhone();
    if (id === 'home') { if (ui.mode === 'buy') exitBuild(); else { ui.setMode('home'); sfx.open(); } return; }
    if (id === 'buy') { if (ui.mode === 'buy') exitBuild(); else { useEditorStore.setState({ draft: null }); ui.startBuy(useEconomyStore.getState().money); sfx.open(); } return; }
    if (ui.mode === 'buy') useEditorStore.setState({ draft: null, dragging: false });
    ui.setMode(ui.mode === 'map' ? 'home' : 'map'); sfx.open();
  };

  return (
    <>
    <motion.nav className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-[70] flex justify-center px-3" initial={{ y: 90 }} animate={{ y: placing || folded ? 140 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}>
      <div className="panel pointer-events-auto flex w-full max-w-sm items-center justify-between gap-1 rounded-xl p-1">
        {ITEMS.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <motion.button key={id} whileTap={{ scale: 0.94 }} onClick={() => press(id)} aria-label={label} aria-current={on} className="relative flex min-h-[3.1rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold">
              {on && <motion.span layoutId="dock-active" className="absolute inset-0 rounded-lg bg-accent shadow-accent" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className={`relative flex flex-col items-center gap-0.5 ${on ? 'text-white' : 'text-white/65'}`}>
                <Icon size={21} strokeWidth={on ? 2.5 : 2} />
                {label}
              </span>
              {id === 'phone' && unread > 0 && <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-hibiscus px-1 text-[10px] font-bold ring-2 ring-ink">{unread}</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
    {folded && (
      <button onClick={() => { sfx.open(); useUiStore.getState().setDockHidden(false); }} aria-label="Show the menu" className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom,0px)+0.7rem)] right-3 z-[78] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-night/90 shadow-lg backdrop-blur active:bg-white/10">
        <Menu size={22} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hibiscus px-1 text-[10px] font-bold ring-2 ring-ink">{unread}</span>}
      </button>
    )}
    </>
  );
}
