import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { WEAPONS, WEAPON_IDS, GUN } from '@/data/weapons';
import { buyWeapon, equip, whyNotBuy } from '@/game/weapons';
import { useEconomyStore } from '@/stores/economyStore';
import { useStoryStore } from '@/stores/storyStore';
import { useWeaponStore } from '@/stores/weaponStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Row, Title } from '../ui';

/** Brotherhood: a members-only message thread where "business" is offered, off the books (never in Shops). Appears after the initiation. */
export function BrotherhoodApp() {
  const c = useStoryStore((s) => s.confraternity), owned = useWeaponStore((s) => s.owned), equipped = useWeaponStore((s) => s.equipped), heat = useWeaponStore((s) => s.heat);
  const money = useEconomyStore((s) => s.money);
  if (!c.member) return <Card><p className="py-6 text-center text-sm text-slate-500">No messages.</p></Card>;
  const buy = (id: (typeof WEAPON_IDS)[number]) => { const r = buyWeapon(id); if (r.ok) { sfx.purchase(); toast(r.message, 'good'); } else { sfx.error(); toast(r.message, 'bad'); } };
  return (
    <div className="space-y-3">
      <Card className="bg-slate-900 text-white"><Row glyph="⚫" title={`${c.alias || 'Member'} · Rank ${c.rank}`} sub={`Reputation ${c.reputation} · Heat ${Math.round(heat)}${heat >= GUN.hotHeat ? ' (hot)' : ''}`} /></Card>
      <Card><div className="rounded-2xl bg-slate-100 p-3 text-[13px] text-slate-700">“Welcome, brother. Business dey open. No be everybody we sell to. Keep quiet.”</div></Card>
      <Title>Business</Title>
      {WEAPON_IDS.map((id) => {
        const w = WEAPONS[id], have = owned.includes(id), why = whyNotBuy(id, money);
        return (
          <Card key={id}>
            <Row glyph={w.glyph} title={w.name} sub={`${w.blurb} +${Math.round(w.fightBonus * 100)} fight points`} right={have ? <Btn tone={equipped === id ? 'green' : 'light'} onClick={() => { equip(equipped === id ? null : id); sfx.click(); }}>{equipped === id ? 'Carried' : 'Carry'}</Btn> : <Btn disabled={!!why} onClick={() => buy(id)}>{w.later ? 'Later' : formatNaira(w.price)}</Btn>} />
            {!have && why && <div className="px-1 pt-1 text-[11.5px] text-slate-500">{why}</div>}
          </Card>
        );
      })}
      <p className="px-2 text-[11.5px] text-slate-500">Police stops are harsher with a weapon on you: double sentence, and it is taken. Heat rises with use.</p>
    </div>
  );
}
