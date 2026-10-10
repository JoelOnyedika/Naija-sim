import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { BOUTIQUE } from '@/data/clothing';
import { copy } from '@/data/copy';
import { useCharacterStore } from '@/stores/characterStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { AvatarPreview } from '@/three/avatar/AvatarPreview';
import { Btn, Card, Row } from '../ui';

export function BoutiqueApp() {
  const { appearance, ownedClothes, wear, own } = useCharacterStore();
  const buy = (id: string) => {
    const it = BOUTIQUE.find((b) => b.id === id)!;
    const owned = ownedClothes.includes(id);
    if (!owned && !useEconomyStore.getState().debit(it.price, it.name, 'purchase')) { sfx.error(); return toast(copy.broke(), 'bad'); }
    if (!owned) { own(id); sfx.purchase(); }
    wear(it.slot, it.style as never, it.color); sfx.pop(); toast(`Wearing ${it.name}`, 'good');
  };
  return (
    <div className="p-3">
      <div className="h-44 overflow-hidden rounded-3xl bg-gradient-to-b from-rose-100 to-rose-200"><AvatarPreview appearance={appearance} speed={0.8} zoom={1.1} /></div>
      <div className="mt-3 space-y-2">{BOUTIQUE.map((b) => (
        <Card key={b.id}><Row glyph={b.glyph} title={b.name} sub={<span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ background: b.color }} />{b.slot === 'top' ? 'Top' : 'Bottom'}</span>} right={<Btn tone={ownedClothes.includes(b.id) ? 'light' : 'dark'} onClick={() => buy(b.id)}>{ownedClothes.includes(b.id) ? 'Wear' : formatNaira(b.price)}</Btn>} /></Card>
      ))}</div>
    </div>
  );
}
