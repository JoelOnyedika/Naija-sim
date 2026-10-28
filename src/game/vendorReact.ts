import { npcRegistry } from '@/data/npcs';
import { vendorLine, type VendorMoment } from '@/data/vendors';
import { useVendorTalk } from '@/stores/vendorTalkStore';

/** If a vendor works at this prop, they say something about what just happened. */
export function vendorReact(itemUid: string | undefined, moment: VendorMoment) {
  if (!itemUid || !npcRegistry.has(`npc:vendor:${itemUid}`)) return;
  useVendorTalk.getState().say(itemUid, vendorLine(moment));
}
