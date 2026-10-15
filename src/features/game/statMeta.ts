import { Bath, Beef, Droplet, HeartPulse, Smile, Sparkles, Toilet, Users, Zap, type LucideIcon } from 'lucide-react';
import type { StatKey } from '@/types/game';

/** Label, icon and colour of each need: shared by the stats bar and the profile sheet. */
export const STAT_META: Record<StatKey, { label: string; Icon: LucideIcon; color: string }> = {
  hunger: { label: 'Hunger', Icon: Beef, color: '#FF8A3D' }, thirst: { label: 'Thirst', Icon: Droplet, color: '#38BDF8' },
  bladder: { label: 'Toilet', Icon: Toilet, color: '#A3E635' }, happiness: { label: 'Happiness', Icon: Smile, color: '#F472B6' },
  energy: { label: 'Energy', Icon: Zap, color: '#FFC21A' }, hygiene: { label: 'Hygiene', Icon: Bath, color: '#2DD4BF' },
  health: { label: 'Health', Icon: HeartPulse, color: '#F87171' }, social: { label: 'Social', Icon: Users, color: '#A78BFA' },
  charisma: { label: 'Charisma', Icon: Sparkles, color: '#34D399' },
};
