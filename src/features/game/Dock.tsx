import { motion } from 'framer-motion';
import { House, Map, ShoppingBag, Smartphone, type LucideIcon } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { exitBuild } from '@/game/buy';
import { useEconomyStore } from '@/stores/economyStore';
import { useEditorStore } from '@/stores/editorStore';
import { usePhoneStore } from '@/stores/phoneStore';
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
  const placing = useEditorStore((s) => !!s.draft);
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
    <motion.nav className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-[70] flex justify-center px-3" initial={{ y: 90 }} animate={{ y: placing ? 140 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}>
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
  );
}
