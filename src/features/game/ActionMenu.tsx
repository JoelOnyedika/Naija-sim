import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { blockedReason, usesOf } from '@/data/activities';
import { getFurniture } from '@/data/items';
import { formatNaira } from '@/core/format';
import { useActiveHome } from '@/game/active';
import { chooseActivity } from '@/game/interactions';
import { describeUse } from '@/game/itemInfo';
import { useEconomyStore } from '@/stores/economyStore';
import { useSkillStore } from '@/stores/skillStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * The action menu for objects with several activities (desk, speaker, disco light). It shows what each choice costs, needs,
 * changes and pays BEFORE the player starts it. Choices that cannot start say why and are disabled. Nothing is charged here:
 * the cost is taken and the effects applied only once the character has walked over and the activity really starts.
 */
export function ActionMenu() {
  const uid = useUiStore((s) => s.actionMenuUid);
  const close = () => useUiStore.getState().setActionMenu(null);
  const home = useActiveHome();
  const money = useEconomyStore((s) => s.money);
  const skills = useSkillStore((s) => s.xp); // re-render when XP changes (level gates)
  void skills;
  const item = uid ? home?.placed.find((p) => p.uid === uid) : undefined;
  const def = item ? getFurniture(item.defId) : undefined;
  return (
    <AnimatePresence>
      {item && def && (
        <motion.div key="menu" className="absolute inset-0 z-[75] flex items-end justify-center bg-black/40 px-3 pb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div role="dialog" aria-label={`${def.name} actions`} onClick={(e) => e.stopPropagation()} className="panel max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl p-4" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{def.glyph}</span>
              <div className="min-w-0 flex-1 font-display text-[17px] font-extrabold leading-tight">{def.name}</div>
              <button onClick={close} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10"><X size={18} /></button>
            </div>
            <div className="mt-3 space-y-2">
              {usesOf(def).map((u) => {
                const d = describeUse(u);
                const why = blockedReason(u, home?.placed ?? [], (id) => useSkillStore.getState().level(id)) ?? (u.cost && money < u.cost ? 'You cannot afford this.' : null);
                return (
                  <button key={u.id ?? u.label} disabled={!!why} onClick={() => chooseActivity(item, u.id ?? '')} className={`w-full rounded-lg bg-white/[0.07] px-3 py-2.5 text-left active:scale-[0.98] ${why ? 'opacity-55' : ''}`}>
                    <div className="flex items-center justify-between text-[14px] font-bold"><span>{d.label}</span><span className="text-[12px] font-semibold text-white/60">{u.seconds}s</span></div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.effects.map((e) => <span key={e.label} className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${e.delta > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{e.delta > 0 ? '+' : ''}{e.label.startsWith('Money') ? formatNaira(e.delta) : e.delta} {e.label}</span>)}
                      {d.skill && <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11.5px] font-semibold text-sky-300">{d.skill}</span>}
                    </div>
                    {d.cost > 0 && <div className="mt-1 text-[12px] text-rose-300">Costs {formatNaira(d.cost)}</div>}
                    {why && <div className="mt-1 text-[12px] font-semibold text-amber-300">{why}</div>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
