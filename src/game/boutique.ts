import { BOUTIQUE, type BoutiqueItem } from '@/data/clothing';
import { formatNaira } from '@/core/format';
import { useCharacterStore } from '@/stores/characterStore';
import { useEconomyStore } from '@/stores/economyStore';
import { canPreview } from '@/data/boutiqueMeta';
import { guarded } from './guard';

/**
 * Boutique purchase. One wardrobe: `characterStore.ownedClothes` is the single list of what you own, used by the Boutique and by
 * the wardrobe in your house. Buying checks the balance, charges once through the ledger, then adds the item. Items you own
 * (or that are free) are never charged again. Bags are collectable but cannot be worn on the character yet.
 */
export type Result = { ok: true; bought: boolean; worn: boolean } | { ok: false; error: string };
export const isOwned = (it: BoutiqueItem) => it.price === 0 || useCharacterStore.getState().ownedClothes.includes(it.id);

export function buyAndWear(id: string, wear = true): Result {
  const it = BOUTIQUE.find((x) => x.id === id);
  if (!it) return { ok: false, error: 'That item does not exist.' };
  const owned = isOwned(it);
  if (!owned && it.price > useEconomyStore.getState().money) return { ok: false, error: `${it.name} costs ${formatNaira(it.price)}. You do not have enough.` };
  return guarded(`boutique|${id}`, () => {
    if (!owned) {
      if (!useEconomyStore.getState().debit(it.price, `Boutique: ${it.name}`, 'purchase', 'Boutique', { ref: { type: 'boutique', id }, description: 'Clothing' })) return { ok: false, error: 'The payment could not be made.' } as Result;
      useCharacterStore.getState().own(id);
    }
    const worn = wear && canPreview(it);
    if (worn) useCharacterStore.getState().equip(it);
    return { ok: true, bought: !owned, worn } as Result;
  }, { ok: false, error: 'That purchase was already submitted.' } as Result);
}
