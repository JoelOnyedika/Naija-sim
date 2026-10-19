import { LIFE_TYPES } from '@/data/lifeTypes';
import { useLifeStore } from '@/stores/lifeStore';
import type { PhoneType } from '@/types/game';

/** iOS-style for Nepo lives, Android (One UI style) for Lapo lives. */
export function usePhoneType(): PhoneType {
  const life = useLifeStore((s) => s.lifeType);
  return life ? LIFE_TYPES[life].phone : 'android';
}
