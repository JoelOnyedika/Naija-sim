import { AnimatePresence, motion } from 'framer-motion';
import { FOODS } from '@/data/foods';
import { eatFood } from '@/game/interactions';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useUiStore } from '@/stores/uiStore';

export function FoodPicker() {
  const uid = useUiStore((s) => s.foodPickerUid);
  const set = useUiStore((s) => s.setFoodPicker);
  const inv = useInventoryStore((s) => s.items);
  const foods = FOODS.filter((f) => (inv[f.id] ?? 0) > 0);
  return (
    <AnimatePresence>
      {uid && (
        <motion.div className="absolute inset-0 z-[75] flex items-end justify-center bg-black/40 px-3 pb-3 backdrop-blur-[2px] sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set(null)}>
          <motion.div className="glass-dark w-full max-w-sm rounded-[2rem] p-5" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-display text-xl font-bold">What are you eating?</h3>
            <div className="space-y-2">
              {foods.length === 0 && <p className="text-sm text-white/65">Nothing left. Order food on your phone.</p>}
              {foods.map((f) => (
                <motion.button key={f.id} whileTap={{ scale: 0.97 }} onClick={() => { eatFood(f.id, uid); set(null); }} className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left">
                  <span className="text-3xl">{f.glyph}</span>
                  <span className="flex-1"><span className="block font-semibold">{f.name}</span><span className="text-xs text-white/60">{f.blurb}</span></span>
                  <span className="rounded-lg bg-night/70 px-2 py-1 text-xs font-bold">×{inv[f.id]}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
