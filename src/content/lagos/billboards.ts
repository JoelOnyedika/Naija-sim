import type { BillboardDefinition } from '@/types/world';

type Base = Omit<BillboardDefinition, 'stateId'>;

/**
 * Lagos billboards. All brands are fictional placeholders. To change what a board shows, edit `content` here or call
 * `setBillboardContent` at runtime (see stores/billboardStore.ts). There is no ad server behind this.
 */
export const BILLBOARDS: Base[] = [
  { id: 'lagos.bb.mainland-east', areaId: 'lagos.mushin', position: [-8.8, -3], rotationY: 0.5, format: 'wide',
    content: { advertiser: 'Chop Naija', headline: 'Jollof in 20 minutes', subline: 'Order on your phone', bg: '#C23B3B', fg: '#FFFFFF', accent: '#FFC21A' } },
  { id: 'lagos.bb.mainland-west', areaId: 'lagos.agege', position: [-24, -6.2], rotationY: 0.5, format: 'standard',
    content: { advertiser: 'Zip Data', headline: 'Unlimited. Finally.', subline: 'Tap to subscribe', bg: '#12345B', fg: '#FFFFFF', accent: '#19C3A6' } },
  { id: 'lagos.bb.surulere', areaId: 'lagos.surulere', position: [-15.5, 6.2], rotationY: 0.5, format: 'wide',
    content: { advertiser: 'Mama Cares Rice', headline: 'Nothing like home', subline: 'Stew in every grain', bg: '#F4E3B5', fg: '#5B2A12', accent: '#C23B3B' } },
  { id: 'lagos.bb.island', areaId: 'lagos.lagos-island', position: [7.2, -1.6], rotationY: 0.5, format: 'wide',
    content: { advertiser: 'Naija Jams FM', headline: '99.9 · Non-stop Afrobeat', subline: 'Lagos sounds better here', bg: '#2A1B4D', fg: '#FFFFFF', accent: '#FF4D6D' } },
  { id: 'lagos.bb.ikoyi', areaId: 'lagos.ikoyi', position: [15.2, 3.2], rotationY: 0.5, format: 'standard',
    content: { advertiser: 'Eko Trust Bank', headline: 'Your money, safe', subline: 'Open an account in minutes', bg: '#1D4ED8', fg: '#FFFFFF', accent: '#DCE8FF' } },
  { id: 'lagos.bb.vi', areaId: 'lagos.victoria-island', position: [4.2, 13.8], rotationY: 0.5, format: 'wide',
    content: { advertiser: 'Nigeria Life', headline: 'New homes, new life', subline: 'Six homes. Your style.', bg: '#2F6BFF', fg: '#FFFFFF', accent: '#FFC21A' } },
  { id: 'lagos.bb.lekki-east', areaId: 'lagos.lekki', position: [30.2, 9.6], rotationY: 0.5, format: 'wide',
    content: { advertiser: 'Danfo Pay', headline: 'Pay with a tap', subline: 'Zero queue, zero wahala', bg: '#0B8F4D', fg: '#FFFFFF', accent: '#FFC21A' } },
  { id: 'lagos.bb.lekki-west', areaId: 'lagos.lekki', position: [19.4, 14.2], rotationY: 0.5, format: 'standard',
    content: { advertiser: 'Your ad here', headline: 'Advertise on Nigeria Life', subline: 'Placeholder board', bg: '#20262F', fg: '#FFFFFF', accent: '#5B93FF', meta: { placeholder: 'true' } } },
  // ---- Expanded map: boards along the new roads. All are open inventory ("Your ad here") until a player buys them.
  ...([
    ['airport-road', 'lagos.ikeja', [-15.8, -30], 'wide'], ['airport-gate', 'lagos.ikeja', [-21.5, -36], 'standard'],
    ['third-mainland', 'lagos.yaba', [-9, -9.4], 'wide'], ['ikorodu-road', 'lagos.mushin', [-20.2, -12], 'standard'],
    ['agege-road', 'lagos.agege', [-36, -9.6], 'standard'], ['apapa', undefined, [-20.5, 15.5], 'wide'],
    ['eko-hotel', 'lagos.victoria-island', [11.6, 10.2], 'standard'], ['atlantic', undefined, [11.5, 18.4], 'wide'],
    ['lekki-epe', 'lagos.lekki', [36, 10], 'wide'], ['ajah', undefined, [49, 12], 'standard'],
  ] as const).map(([k, areaId, position, format]): Base => ({
    id: `lagos.bb.${k}`, areaId, position: [position[0], position[1]], rotationY: 0.5, format,
    content: { advertiser: 'Your ad here', headline: 'Advertise on Nigeria Life', subline: 'Open billboard', bg: '#20262F', fg: '#FFFFFF', accent: '#5B93FF', meta: { placeholder: 'true' } },
  })),
];
