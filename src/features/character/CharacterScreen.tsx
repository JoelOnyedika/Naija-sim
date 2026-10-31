import { motion } from 'framer-motion';
import { Check, Dices } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { ACCESSORIES, BEARD_STYLES, BODY_TYPES, BOTTOM_STYLES, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SHOE_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useFlowStore } from '@/stores/flowStore';
import { AvatarPreview, type PreviewFocus } from '@/three/avatar/AvatarPreview';
import { Logo } from '@/ui/Logo';

const TABS: { id: string; label: string; focus: PreviewFocus }[] = [
  { id: 'body', label: 'Body', focus: 'full' }, { id: 'hair', label: 'Hair', focus: 'head' }, { id: 'beard', label: 'Beard', focus: 'head' }, { id: 'top', label: 'Top', focus: 'upper' },
  { id: 'bottom', label: 'Bottom', focus: 'lower' }, { id: 'shoes', label: 'Shoes', focus: 'lower' }, { id: 'extras', label: 'Extras', focus: 'head' },
];

export const Swatches = ({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label?: string }) => (
  <div>
    {label && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">{label}</p>}
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button key={c} onClick={() => { sfx.pop(); onPick(c); }} aria-label={c} aria-pressed={value === c}
          className={`relative h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-ink transition ${value === c ? 'ring-accent-glow' : 'ring-white/15'}`} style={{ background: c }}>
          {value === c && <Check size={16} strokeWidth={3} className="absolute inset-0 m-auto text-white mix-blend-difference" />}
        </button>
      ))}
    </div>
  </div>
);

export const Chips = <T extends string>({ items, value, onPick }: { items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((i) => (
      <button key={i.id} aria-pressed={value === i.id} onClick={() => { sfx.pop(); onPick(i.id); }}
        className={`min-h-[2.4rem] rounded-md px-3.5 text-[13px] font-semibold transition-colors ${value === i.id ? 'bg-accent text-white shadow-accent' : 'bg-white/[0.07] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.12]'}`}>{i.label}</button>
    ))}
  </div>
);

/** Preview on top (or left on desktop), compact controls below (or on the right). The character is never covered. */
export function CharacterScreen() {
  const { appearance: a, set, randomize, finish, name, setName } = useCharacterStore();
  const username = useAuthStore((s) => s.session);
  const go = useFlowStore((s) => s.go);
  const [tab, setTab] = useState('body');
  const [touched, setTouched] = useState(false);
  const nameOk = name.trim().length >= 2;
  const focus = TABS.find((t) => t.id === tab)?.focus ?? 'full';

  return (
    <motion.div className="absolute inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-ink-700 via-ink to-ink md:flex-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="relative z-10 flex items-center justify-between px-3 pt-safe">
          <div className="flex items-center gap-2.5"><Logo /><span className="hidden text-sm text-white/55 sm:inline">Create your character{username ? ` · ${username}` : ''}</span></div>
          <button onClick={() => { sfx.click(); randomize(); }} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 text-[13px] font-semibold ring-1 ring-white/10"><Dices size={16} />Randomise</button>
        </header>
        <p className="relative z-10 -mt-0.5 px-3 text-[12px] text-white/50 sm:hidden">Create your character. Drag to rotate, pinch to zoom.</p>
        <div className="relative min-h-0 flex-1"><AvatarPreview appearance={a} focus={focus} /></div>
      </div>

      <motion.aside className="panel-solid relative z-10 flex max-h-[50vh] flex-col rounded-t-xl border-x-0 border-b-0 p-3 pb-safe md:max-h-none md:w-[24rem] md:rounded-none md:border-y-0 md:border-r-0 md:p-5" initial={{ y: 60 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        <label className="mb-2.5 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/50">Your character's name</span>
          <input value={name} maxLength={16} onChange={(e) => { setName(e.target.value); setTouched(true); }} placeholder="e.g. Tunde" autoComplete="off"
            className={`w-full rounded-lg bg-white/10 px-3.5 py-2.5 text-[16px] font-semibold text-white outline-none ring-1 placeholder:text-white/35 focus:ring-2 ${touched && !nameOk ? 'ring-rose-400' : 'ring-white/15 focus:ring-accent-glow'}`} />
          {touched && !nameOk && <span className="mt-1 block text-xs text-rose-300">Give your character a name (at least 2 letters).</span>}
        </label>
        <div className="no-scrollbar mb-2.5 flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { sfx.click(); setTab(t.id); }}
              className={`shrink-0 rounded-md px-3.5 py-2 text-[13px] font-semibold transition-colors ${tab === t.id ? 'bg-accent text-white' : 'text-white/65 hover:bg-white/[0.07]'}`}>{t.label}</button>
          ))}
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-2">
          {tab === 'body' && (<>
            <Chips items={BODY_TYPES} value={a.body ?? 'masc'} onPick={(v) => set({ body: v, ...(v === 'femme' ? { beard: 'none' } : {}) })} />
            <Swatches label="Skin tone" colors={SKIN_TONES} value={a.skin} onPick={(c) => set({ skin: c })} />
            <Swatches label="Eye colour" colors={EYE_COLORS} value={a.eye ?? EYE_COLORS[0]} onPick={(c) => set({ eye: c })} />
          </>)}
          {tab === 'beard' && ((a.body ?? 'masc') === 'femme'
            ? <p className="text-sm text-white/60">Beards are for the masculine body type. Switch it on the Body tab.</p>
            : <><Chips items={BEARD_STYLES} value={a.beard ?? 'none'} onPick={(v) => set({ beard: v })} /><Swatches label="Beard colour" colors={HAIR_COLORS} value={a.hairColor} onPick={(c) => set({ hairColor: c })} /><p className="text-xs text-white/50">Beard colour follows your hair colour.</p></>)}
          {tab === 'hair' && (<><Chips items={HAIR_STYLES} value={a.hairStyle} onPick={(v) => set({ hairStyle: v })} /><Swatches label="Hair colour" colors={HAIR_COLORS} value={a.hairColor} onPick={(c) => set({ hairColor: c })} /></>)}
          {tab === 'top' && (<><Chips items={TOP_STYLES} value={a.top} onPick={(v) => set({ top: v, ...(a.bottom === 'dress' ? { bottom: 'jeans' } : {}) })} /><Swatches label="Colour" colors={CLOTH_COLORS} value={a.topColor} onPick={(c) => set({ topColor: c })} /></>)}
          {tab === 'bottom' && (<><Chips items={BOTTOM_STYLES} value={a.bottom} onPick={(v) => set({ bottom: v })} />{a.bottom === 'dress' && <p className="text-xs text-white/50">A dress is one piece, so it replaces your top.</p>}<Swatches label={a.bottom === 'dress' ? 'Dress colour (uses top colour)' : 'Colour'} colors={CLOTH_COLORS} value={a.bottom === 'dress' ? a.topColor : a.bottomColor} onPick={(c) => set(a.bottom === 'dress' ? { topColor: c } : { bottomColor: c })} /></>)}
          {tab === 'shoes' && (<><Chips items={SHOE_STYLES} value={a.shoes} onPick={(v) => set({ shoes: v })} /><Swatches label="Colour" colors={CLOTH_COLORS} value={a.shoeColor} onPick={(c) => set({ shoeColor: c })} /></>)}
          {tab === 'extras' && <Chips items={ACCESSORIES} value={a.accessory} onPick={(v) => set({ accessory: v })} />}
        </div>
        <button onClick={() => { if (!nameOk) { setTouched(true); sfx.error(); return; } setName(name.trim()); finish(); sfx.reward(); go('roulette'); }} className="mt-1 h-12 w-full rounded-lg bg-accent text-[15px] font-bold text-white shadow-accent">Confirm and continue</button>
      </motion.aside>
    </motion.div>
  );
}
