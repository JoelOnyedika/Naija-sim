import { motion } from 'framer-motion';
import { Check, Dices } from 'lucide-react';
import { useState } from 'react';
import type { Appearance } from '@/types/game';
import { sfx } from '@/audio/sfx';
import { ACCESSORIES, BAG_COLORS, BAG_STYLES, BEARD_STYLES, BODY_TYPES, BOTTOM_STYLES, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SHOE_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useFlowStore } from '@/stores/flowStore';
import { AvatarPreview, type PreviewFocus } from '@/three/avatar/AvatarPreview';
import { Logo } from '@/ui/Logo';

const TABS: { id: string; label: string; icon: string; focus: PreviewFocus }[] = [
  { id: 'body', label: 'Body', icon: '🧍', focus: 'full' }, { id: 'hair', label: 'Hair', icon: '💇', focus: 'head' }, { id: 'beard', label: 'Beard', icon: '🧔', focus: 'head' }, { id: 'top', label: 'Top', icon: '👕', focus: 'upper' },
  { id: 'bottom', label: 'Bottom', icon: '👖', focus: 'lower' }, { id: 'shoes', label: 'Shoes', icon: '👟', focus: 'lower' }, { id: 'extras', label: 'Extras', icon: '🕶️', focus: 'head' },
];
/** One-tap starting looks. They only set clothes, hair and accessories, never skin tone, so the player's choice of face stays. */
const LOOKS: { id: string; label: string; icon: string; set: Partial<Appearance> }[] = [
  { id: 'street', label: 'Street', icon: '🔥', set: { body: 'masc', hairStyle: 'bowl', top: 'vest', topColor: '#1B1F24', bottom: 'jeans', bottomColor: '#1B1F24', shoes: 'sneakers', shoeColor: '#F4F1EA', accessory: 'stud', bag: 'none' } },
  { id: 'campus', label: 'Campus', icon: '🎓', set: { body: 'masc', hairStyle: 'fade', top: 'tee', topColor: '#0B8F4D', bottom: 'jeans', bottomColor: '#2B4C7E', shoes: 'sneakers', shoeColor: '#FFFFFF', accessory: 'glasses', bag: 'backpack' } },
  { id: 'bigman', label: 'Big Man', icon: '💼', set: { body: 'masc', hairStyle: 'lowcut', top: 'kaftan', topColor: '#FFFFFF', bottom: 'trousers', bottomColor: '#1B1F24', shoes: 'boots', shoeColor: '#1B1F24', accessory: 'chain', bag: 'none' } },
  { id: 'sporty', label: 'Sporty', icon: '⚽', set: { body: 'masc', hairStyle: 'fade', top: 'jersey', topColor: '#0B8F4D', bottom: 'shorts', bottomColor: '#FFFFFF', shoes: 'sneakers', shoeColor: '#FFC21A', accessory: 'cap', bag: 'none' } },
  { id: 'fine', label: 'Fine Girl', icon: '✨', set: { body: 'femme', beard: 'none', hairStyle: 'braids', top: 'tee', topColor: '#FFC21A', bottom: 'skirt', bottomColor: '#1B1F24', shoes: 'sandals', shoeColor: '#C9A66B', accessory: 'earrings', bag: 'handbag' } },
];

export const Swatches = ({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label?: string }) => (
  <div>
    {label && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">{label}</p>}
    <div className="flex flex-wrap gap-2 px-1 py-1">
      {colors.map((c) => (
        <button key={c} onClick={() => { sfx.pop(); onPick(c); }} aria-label={c} aria-pressed={value === c}
          className={`relative h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-ink transition active:scale-90 ${value === c ? 'scale-110 ring-danfo' : 'ring-white/15'}`} style={{ background: c }}>
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
        className={`min-h-[2.6rem] rounded-xl px-4 text-[13px] font-bold transition-all active:scale-95 ${value === i.id ? 'cta-naija' : 'bg-white/[0.07] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.12]'}`}>{i.label}</button>
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
    <motion.div className="absolute inset-0 flex flex-col overflow-hidden bg-ink md:flex-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="relative z-10 flex items-center justify-between px-3 pt-safe">
          <div className="flex items-center gap-2.5"><Logo /><span className="hidden text-sm text-white/55 sm:inline">Create your character{username ? ` · ${username}` : ''}</span></div>
          <button onClick={() => { sfx.click(); randomize(); }} className="cta-ghost flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold"><Dices size={16} />Randomise</button>
        </header>
        <p className="relative z-10 -mt-0.5 px-3 text-[12px] text-white/50 sm:hidden">Create your character. Drag to rotate, pinch to zoom.</p>
        <div className="relative min-h-0 flex-1"><div className="stage-bg absolute inset-0" /><div className="stage-ring" /><AvatarPreview appearance={a} focus={focus} /></div>
      </div>

      <motion.aside className="panel-solid relative z-10 flex max-h-[50vh] flex-col rounded-t-xl border-x-0 border-b-0 p-3 pb-safe md:max-h-none md:w-[24rem] md:rounded-none md:border-y-0 md:border-r-0 md:p-5" initial={{ y: 60 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        <label className="mb-2.5 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/50">Your character's name</span>
          <input value={name} maxLength={16} onChange={(e) => { setName(e.target.value); setTouched(true); }} placeholder="e.g. Tunde" autoComplete="off"
            className={`w-full rounded-lg bg-white/10 px-3.5 py-2.5 text-[16px] font-semibold text-white outline-none ring-1 placeholder:text-white/35 focus:ring-2 ${touched && !nameOk ? 'ring-rose-400' : 'ring-white/15 focus:ring-accent-glow'}`} />
          {touched && !nameOk && <span className="mt-1 block text-xs text-rose-300">Give your character a name (at least 2 letters).</span>}
        </label>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Quick looks</p>
        <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
          {LOOKS.map((l) => <button key={l.id} onClick={() => { sfx.reward(); set(l.set); }} className="feature-chip flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold active:scale-95"><span>{l.icon}</span>{l.label}</button>)}
        </div>
        <div className="no-scrollbar mb-2.5 flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { sfx.click(); setTab(t.id); }}
              className={`tab-pill flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold ${tab === t.id ? 'bg-white text-ink' : 'text-white/65 hover:bg-white/[0.07]'}`}><span>{t.icon}</span>{t.label}</button>
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
          {tab === 'extras' && (<><Chips items={ACCESSORIES} value={a.accessory} onPick={(v) => set({ accessory: v })} /><p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Bag</p><Chips items={BAG_STYLES} value={a.bag ?? 'none'} onPick={(v) => set({ bag: v })} />{(a.bag ?? 'none') !== 'none' && <Swatches label="Bag colour" colors={BAG_COLORS} value={a.bagColor ?? BAG_COLORS[0]} onPick={(c) => set({ bagColor: c })} />}</>)}
        </div>
        <button onClick={() => { if (!nameOk) { setTouched(true); sfx.error(); return; } setName(name.trim()); finish(); sfx.reward(); go('roulette'); }} className="cta-naija mt-1 h-14 w-full rounded-2xl font-display text-lg font-extrabold">Confirm and continue</button>
      </motion.aside>
    </motion.div>
  );
}
