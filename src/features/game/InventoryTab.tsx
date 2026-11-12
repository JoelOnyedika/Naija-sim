import { MEMBER_ITEMS } from '@/data/story';
import { WEAPONS } from '@/data/weapons';
import { equip } from '@/game/weapons';
import { useStoryStore } from '@/stores/storyStore';
import { useWeaponStore } from '@/stores/weaponStore';

/** Profile > Inventory: what a member carries (the bracelet, weapons with a carry toggle) and the Brotherhood rank. Empty for everyone else. */
export function InventoryTab() {
  const c = useStoryStore((s) => s.confraternity), items = useStoryStore((s) => s.items), owned = useWeaponStore((s) => s.owned), equipped = useWeaponStore((s) => s.equipped);
  const mine = MEMBER_ITEMS.filter((i) => items.includes(i.id));
  if (!mine.length && !owned.length) return <p className="py-10 text-center text-sm text-white/55">You are not carrying anything special.</p>;
  return (
    <div className="space-y-3">
      {c.member && <div className="rounded-2xl bg-white/[0.06] p-3 text-[13px]"><div className="font-bold">⚫ Brotherhood: Rank {c.rank}</div><div className="text-white/60">Reputation {c.reputation}</div></div>}
      {mine.map((i) => <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3"><span className="text-2xl">{i.glyph}</span><span className="text-[14px] font-bold">{i.name}</span></div>)}
      {owned.map((id) => { const w = WEAPONS[id]; return (
        <div key={id} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3"><span className="text-2xl">{w.glyph}</span><div className="min-w-0 flex-1"><div className="text-[14px] font-bold">{w.name}</div><div className="text-[11.5px] text-white/55">+{Math.round(w.fightBonus * 100)} fight points · {w.ammoPerClip} per clip</div></div>
          <button onClick={() => equip(equipped === id ? null : id)} aria-pressed={equipped === id} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${equipped === id ? 'bg-emerald-400 text-slate-900' : 'bg-white/10'}`}>{equipped === id ? 'Equipped' : 'Equip'}</button></div>
      ); })}
    </div>
  );
}
