import { motion } from 'framer-motion';
import { House, Map, ShoppingBag, Smartphone, type LucideIcon } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { useEditorStore } from '@/stores/editorStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useUiStore } from '@/stores/uiStore';

type Id = 'home' | 'buy' | 'map' | 'phone';
const ITEMS: { id: Id; label: string; Icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', Icon: House }, { id: 'buy', label: 'Buy', Icon: ShoppingBag }, { id: 'map', label: 'Map', Icon: Map }, { id: 'phone', label: 'Phone', Icon: Smartphone },
];

/** Floating rounded dock. Nothing here navigates away from the 3D world. */
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
    if (phone.open) { phone.closePhone(); }
    useEditorStore.getState().setDraft(null);
    if (id === 'home') { ui.setMode('home'); sfx.open(); }
    else if (id === 'buy') { if (ui.mode === 'buy') { ui.setMode('home'); sfx.close(); } else { ui.startBuy(useEconomyStore.getState().money); sfx.open(); } }
    else { ui.setMode(ui.mode === 'map' ? 'home' : 'map'); sfx.open(); }
  };

  return (
    <motion.nav className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-[70] flex justify-center px-4" initial={{ y: 90 }} animate={{ y: placing ? 140 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}>
      <div className="glass-dark pointer-events-auto flex w-full max-w-sm items-center justify-between rounded-[1.75rem] p-1.5">
        {ITEMS.map(({ id, label, Icon }) => (
          <motion.button key={id} whileTap={{ scale: 0.9 }} onClick={() => press(id)} aria-label={label} aria-current={active === id} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2.5 text-[11px] font-semibold">
            {active === id && <motion.span layoutId="dock-pill" className="absolute inset-0 rounded-2xl bg-gradient-to-b from-danfo to-danfo-deep shadow-pop" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className={`relative flex flex-col items-center gap-0.5 ${active === id ? 'text-night' : 'text-white/75'}`}>
              <motion.span animate={{ y: active === id ? -1 : 0, scale: active === id ? 1.12 : 1 }}><Icon size={22} strokeWidth={active === id ? 2.6 : 2} /></motion.span>
              {label}
            </span>
            {id === 'phone' && unread > 0 && <span className="absolute right-4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hibiscus px-1 text-[10px] font-bold ring-2 ring-night">{unread}</span>}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
}
