import { motion } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { BOTTOM_STYLES, CLOTH_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useFlowStore } from '@/stores/flowStore';
import { AvatarPreview } from '@/three/avatar/AvatarPreview';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';

const TABS = ['Hair', 'Colour', 'Top', 'Bottom', 'Skin'] as const;
type Tab = (typeof TABS)[number];

const Swatches = ({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) => (
  <div className="flex flex-wrap gap-2.5">
    {colors.map((c) => (
      <motion.button key={c} whileTap={{ scale: 0.85 }} onClick={() => { sfx.pop(); onPick(c); }} aria-label={c}
        className={`h-11 w-11 rounded-full ring-2 transition ${value === c ? 'scale-110 ring-white' : 'ring-white/20'}`} style={{ background: c }} />
    ))}
  </div>
);

const Chips = <T extends string>({ items, value, onPick }: { items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((i) => (
      <motion.button key={i.id} whileTap={{ scale: 0.93 }} onClick={() => { sfx.pop(); onPick(i.id); }}
        className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${value === i.id ? 'bg-danfo text-night shadow-pop' : 'glass text-white'}`}>{i.label}</motion.button>
    ))}
  </div>
);

/** Modular: each tab is just a list of options. Add a slot by adding a tab + a field on Appearance. */
export function CharacterScreen() {
  const { appearance: a, set, randomize, finish } = useCharacterStore();
  const username = useAuthStore((s) => s.session);
  const go = useFlowStore((s) => s.go);
  const [tab, setTab] = useState<Tab>('Hair');

  return (
    <motion.div className="absolute inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-night-700 via-night to-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-naija/30 blur-3xl" />
      <div className="relative z-10 flex items-start justify-between px-4 pt-safe">
        <Logo />
        <button onClick={() => { sfx.click(); randomize(); }} className="glass rounded-full px-4 py-2 text-sm font-semibold">🎲 Randomise</button>
      </div>
      <div className="relative z-10 px-5 pt-3 text-center">
        <h1 className="font-display text-2xl font-extrabold">Create your character</h1>
        <p className="text-sm text-white/65">Looking good, {username ?? 'player'}. You can change your outfit later in the Boutique.</p>
      </div>
      <div className="relative min-h-0 flex-1"><AvatarPreview appearance={a} /></div>

      <motion.div className="glass-dark relative z-10 rounded-t-[2rem] p-4 pb-safe" initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => { sfx.click(); setTab(t); }} className="relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold">
              {tab === t && <motion.span layoutId="char-tab" className="absolute inset-0 rounded-full bg-white/15" />}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
        <div className="min-h-[7rem]">
          {tab === 'Hair' && <Chips items={HAIR_STYLES} value={a.hairStyle} onPick={(v) => set({ hairStyle: v })} />}
          {tab === 'Colour' && (<><p className="mb-2 text-xs text-white/60">Hair colour</p><Swatches colors={HAIR_COLORS} value={a.hairColor} onPick={(c) => set({ hairColor: c })} /></>)}
          {tab === 'Top' && (<><Chips items={TOP_STYLES} value={a.top} onPick={(v) => set({ top: v })} /><div className="mt-3"><Swatches colors={CLOTH_COLORS} value={a.topColor} onPick={(c) => set({ topColor: c })} /></div></>)}
          {tab === 'Bottom' && (<><Chips items={BOTTOM_STYLES} value={a.bottom} onPick={(v) => set({ bottom: v })} /><div className="mt-3"><Swatches colors={CLOTH_COLORS} value={a.bottomColor} onPick={(c) => set({ bottomColor: c })} /></div></>)}
          {tab === 'Skin' && (<><p className="mb-2 text-xs text-white/60">Skin tone</p><Swatches colors={SKIN_TONES} value={a.skin} onPick={(c) => set({ skin: c })} /></>)}
        </div>
        <Button size="lg" className="mt-3 w-full" onClick={() => { finish(); sfx.reward(); go('roulette'); }}>Continue to Life Roulette</Button>
      </motion.div>
    </motion.div>
  );
}
