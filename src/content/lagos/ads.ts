import type { AdsConfig } from '@/types/ads';

/**
 * Lagos advertising configuration. EVERY price, duration and limit lives here (naira, whole numbers) so nothing is
 * hard-coded in components. Values are development placeholders. Change them freely; running ads keep the price and
 * duration they were bought with.
 */
export const LAGOS_ADS: AdsConfig = {
  seaDurationDays: 3,
  seaSlot: { w: 4.6, h: 2.3, pitchX: 6, pitchZ: 3.6 },
  seaTiers: [
    { id: 'coastal', label: 'Coastal (next to the shore)', maxDistToLand: 4, price: 150_000 },
    { id: 'harbour', label: 'Harbour (mid distance)', maxDistToLand: 14, price: 90_000 },
    { id: 'open', label: 'Open sea', maxDistToLand: Infinity, price: 45_000 },
  ],
  billboardDurationDays: 7,
  billboardBasePrice: { wide: 600_000, standard: 400_000 },
  billboardTierMultiplier: { prime: 2.2, standard: 1, local: 0.6 },
  billboardTierById: {
    'lagos.bb.island': 'prime', 'lagos.bb.vi': 'prime', 'lagos.bb.ikoyi': 'prime', 'lagos.bb.eko-hotel': 'prime', 'lagos.bb.atlantic': 'prime',
    'lagos.bb.third-mainland': 'prime', 'lagos.bb.airport-road': 'prime', 'lagos.bb.airport-gate': 'prime', 'lagos.bb.lekki-epe': 'prime',
    'lagos.bb.agege-road': 'local', 'lagos.bb.mainland-west': 'local', 'lagos.bb.ajah': 'local', 'lagos.bb.ikorodu-road': 'local',
  },
  billboardSizeLabel: { wide: 'Roadside wide, 3:1', standard: 'Standard, 2:1' },
  upload: { maxBytes: 2 * 1024 * 1024, types: ['image/png', 'image/jpeg', 'image/webp'], minWidth: 400, maxWidth: 6000, maxAspect: 4, storeWidth: 800 },
  rules: [
    'No sexual or adult content of any kind.',
    'No advertising for competing games or game-like products.',
    'No hateful, violent, deceptive or illegal content.',
    'You must own the artwork or have the right to use it.',
    'Every submission is reviewed by a person before it goes live. Nothing is filtered automatically, so a submission can be rejected after you have gone through the simulated checkout.',
  ],
  refundPolicy: 'DRAFT, not final: the refund and no-refund rules for rejected or removed ads have not been decided yet and must be written and reviewed before any real payment is introduced. Today every payment is simulated and no money moves.',
};
