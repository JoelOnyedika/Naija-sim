import type { Appearance } from '@/types/game';
import type { ActionKind } from '@/three/avatar/Avatar';

/**
 * Named, recurring characters. They use the existing low-poly character system (types/Appearance, three/character/build.ts):
 * no new models. Brotherhood members share a look (black shirt and trousers, black bracelet, a small insignia, sometimes a beret) but
 * each one has a different face, hair, build, accessory, idle pose and way of talking. Add a person here and the interaction system,
 * dialogue and objective markers can use them straight away.
 */
export interface CastDef {
  id: string; name: string; /** shown under the name in cinematic dialogue */ role: string; description: string;
  appearance: Appearance;
  /** body-language poses they fall back on when standing around, in turn */ idle: ActionKind[];
  /** how they use their hands while speaking */ talk: ActionKind;
  /** one line that captures them, used by tests and writers */ personality: string;
  greeting: string;
}
const BASE: Appearance = { skin: '#8D5A3B', hairStyle: 'fade', hairColor: '#111', top: 'shirt', topColor: '#101216', bottom: 'trousers', bottomColor: '#15171B', shoes: 'sneakers', shoeColor: '#1A1A1A', accessory: 'none', body: 'masc', eye: '#2B1B12', beard: 'none' };
const look = (o: Partial<Appearance>): Appearance => ({ ...BASE, ...o });

export const CAST: Record<string, CastDef> = {
  bayo: { id: 'bayo', name: 'Senior Bayo', role: '400 Level · SUG Welfare', description: 'Calm, charming, always watching who needs a friend.', greeting: 'Fresher! Come, come.',
    appearance: look({ skin: '#7A4A2E', hairStyle: 'fade', beard: 'stubble', accessory: 'chain', bro: 'beret', frame: { w: 1.03, h: 1.05 }, shoeColor: '#2A1B12' }), idle: ['crossed', 'idle', 'gesture'], talk: 'gesture', personality: 'smooth, patient, never raises his voice' },
  tobi: { id: 'tobi', name: 'Tobi', role: '200 Level', description: 'Quiet. Watches more than he speaks.', greeting: '...',
    appearance: look({ skin: '#5E3A24', hairStyle: 'afro', hairColor: '#0C0A09', top: 'tee', bro: 'plain', frame: { w: 0.93, h: 1.0 } }), idle: ['crossed', 'idle'], talk: 'talk', personality: 'nervous, loyal, the lookout' },
  seaman: { id: 'seaman', name: 'Seaman', role: '300 Level', description: 'Big laugh, bigger appetite. Shares his rice with everyone.', greeting: 'My guy!',
    appearance: look({ skin: '#8A5836', hairStyle: 'bald', beard: 'full', top: 'tee', accessory: 'cap', topColor: '#0E1013', bro: 'plain', frame: { w: 1.12, h: 1.03 } }), idle: ['crossed', 'gesture'], talk: 'gesture', personality: 'loud, warm, loves food and football' },
  pablo: { id: 'pablo', name: 'Pablo', role: '300 Level', description: 'Fast talker with an opinion on everything.', greeting: 'Ah! New face!',
    appearance: look({ skin: '#A0693F', hairStyle: 'dreads', hairColor: '#1B120C', beard: 'goatee', accessory: 'glasses', bro: 'plain', frame: { w: 0.92, h: 1.08 } }), idle: ['gesture', 'wave', 'idle'], talk: 'gesture', personality: 'talkative, restless, jokes first' },
  baron: { id: 'baron', name: 'Baron', role: '500 Level', description: 'Rarely speaks. When he does, everyone listens.', greeting: 'Hm.',
    appearance: look({ skin: '#4E3020', hairStyle: 'lowcut', beard: 'moustache', accessory: 'stud', top: 'vest', bro: 'beret', frame: { w: 1.0, h: 0.97 } }), idle: ['idle', 'crossed'], talk: 'talk', personality: 'serious, measured, the elder of the group' },
};
export const castDef = (id: string): CastDef | undefined => CAST[id];
export const BROTHERHOOD_IDS = ['bayo', 'tobi', 'seaman', 'pablo', 'baron'] as const;
