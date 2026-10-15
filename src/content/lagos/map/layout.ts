import type { MapLayout } from '@/types/world';

/**
 * Lagos map as data. x = east, z = south (map units; one unit is roughly 1 km at this stylised scale).
 * Geography follows the real city: the mainland (Agege, Mushin, Yaba, Ikeja) in the west and north-west with Murtala
 * Muhammed International Airport north of Ikeja; Lagos Island in the middle; Ikoyi and Banana Island east of it;
 * Victoria Island south of the island with Eko Atlantic reclaimed from the Atlantic on its south side; Lekki and Ajah
 * running east; Apapa port and the industrial belt south-west across the harbour.
 * To change the city, edit this file: the scene, roads, Sea Ads zone and billboards are all derived from it.
 */
export const LAGOS_LAYOUT: MapLayout = {
  sea: { x0: -62, x1: 78, z0: -58, z1: 46 },
  slabs: [
    { id: 'mainland-core', name: 'Mainland (Mushin, Surulere, Yaba)', kind: 'dense', cx: -17.5, cz: -7, w: 25, d: 30, ground: '#8FAE7A', density: 1.0, tall: 0.5, tin: true, streets: 5 },
    { id: 'mainland-north', label: 'Ikeja / Alausa', name: 'Ikeja / Alausa', kind: 'civic', cx: -17.5, cz: -28, w: 25, d: 12, ground: '#9DB886', density: 0.45, tall: 0.7, streets: 6 },
    { id: 'airport', label: 'Murtala Muhammed Airport', name: 'Murtala Muhammed Airport', kind: 'airport', cx: -17.5, cz: -41, w: 34, d: 14, ground: '#B4BFA2', density: 0, tall: 0 },
    { id: 'mainland-west', label: 'Agege', name: 'Agege / Ifako', kind: 'dense', cx: -37, cz: -10, w: 14, d: 26, ground: '#93AE7B', density: 0.8, tall: 0.4, tin: true, streets: 5 },
    { id: 'apapa', label: 'Apapa Port', name: 'Apapa Port and industrial belt', kind: 'industrial', cx: -24, cz: 18, w: 22, d: 12, ground: '#A9A99A', density: 0, tall: 0 },
    { id: 'island', name: 'Lagos Island', kind: 'market', areaId: 'lagos.lagos-island', cx: 4, cz: 2, w: 8, d: 10, ground: '#A7B58E', density: 0.9, tall: 1.0, streets: 2.5 },
    { id: 'ikoyi', name: 'Ikoyi', kind: 'estate', areaId: 'lagos.ikoyi', cx: 13, cz: 0, w: 6, d: 8, ground: '#86B07C', density: 0.5, tall: 0.6 },
    { id: 'banana', name: 'Banana Island', kind: 'resort', areaId: 'lagos.banana-island', cx: 21, cz: -4.5, w: 6, d: 7, ground: '#7FB57F', density: 0.35, tall: 0.5 },
    { id: 'vi', name: 'Victoria Island', kind: 'business', areaId: 'lagos.victoria-island', cx: 10, cz: 12, w: 14, d: 6, ground: '#A2B48D', density: 0.8, tall: 1.6, streets: 3 },
    { id: 'atlantic', label: 'Eko Atlantic', name: 'Eko Atlantic', kind: 'business', cx: 14, cz: 20, w: 14, d: 10, ground: '#C9C3AE', density: 0.55, tall: 3.2, streets: 3.5 },
    { id: 'lekki', name: 'Lekki', kind: 'estate', areaId: 'lagos.lekki', cx: 24.5, cz: 12, w: 15, d: 8, ground: '#9DB885', density: 0.55, tall: 0.8, streets: 4 },
    { id: 'lekki-east', label: 'Lekki Phase 1', name: 'Lekki Phase 1 and estates', kind: 'estate', cx: 39, cz: 12, w: 14, d: 8, ground: '#98B681', density: 0.45, tall: 0.6, streets: 4 },
    { id: 'ajah', label: 'Ajah', name: 'Ajah', kind: 'dense', cx: 51, cz: 14, w: 10, d: 6, ground: '#9CB383', density: 0.6, tall: 0.5, tin: true, streets: 3 },
  ],
  nodes: [
    // mainland
    { id: 'agege', x: -42, z: -8 }, { id: 'ifako', x: -30, z: -8 }, { id: 'oshodi', x: -18, z: -8 }, { id: 'yaba-e', x: -5, z: -8 },
    { id: 'mushin-s', x: -18, z: 4 }, { id: 'surulere', x: -10, z: 4 }, { id: 'apapa-link-n', x: -22, z: 8 }, { id: 'apapa-link-s', x: -22, z: 12 },
    { id: 'ikeja', x: -18, z: -22 }, { id: 'alausa', x: -18, z: -28 }, { id: 'airport-gate', x: -18, z: -34 }, { id: 'terminal', x: -18, z: -39 },
    { id: 'ikeja-w', x: -28, z: -22 }, { id: 'ikeja-e', x: -8, z: -22 },
    { id: 'apapa-c', x: -24, z: 18 }, { id: 'apapa-w', x: -32, z: 18 }, { id: 'apapa-e', x: -15, z: 18 },
    // islands
    { id: 'isl-n', x: 0, z: -2.5 }, { id: 'isl-c', x: 4, z: 2 }, { id: 'isl-e', x: 8, z: 0 }, { id: 'isl-s', x: 4.5, z: 7 },
    { id: 'ikoyi-w', x: 10, z: 0 }, { id: 'ikoyi-c', x: 13, z: 0 }, { id: 'ikoyi-e', x: 16, z: 1.5 }, { id: 'ikoyi-ne', x: 16, z: -2.5 }, { id: 'banana-w', x: 18, z: -3.5 }, { id: 'banana-c', x: 21, z: -4.5 },
    { id: 'vi-w', x: 5, z: 9 }, { id: 'vi-c', x: 10, z: 12 }, { id: 'vi-e', x: 17, z: 12 }, { id: 'vi-s', x: 14, z: 15 }, { id: 'atl-c', x: 14, z: 20 }, { id: 'atl-w', x: 8.5, z: 20 }, { id: 'atl-e', x: 19.5, z: 20 },
    { id: 'lekki-nw', x: 19.5, z: 8.2 }, { id: 'lekki-c', x: 25, z: 12 }, { id: 'lekki-e', x: 32, z: 12 }, { id: 'lekki2-c', x: 39, z: 12 }, { id: 'lekki2-e', x: 46, z: 12 }, { id: 'ajah-c', x: 51, z: 14 }, { id: 'ajah-e', x: 55, z: 14 },
  ],
  edges: [
    { a: 'agege', b: 'ifako', cls: 'major', name: 'Agege Motor Road' }, { a: 'ifako', b: 'oshodi', cls: 'major', name: 'Agege Motor Road' },
    { a: 'oshodi', b: 'yaba-e', cls: 'major', name: 'Ikorodu Road' },
    { a: 'yaba-e', b: 'isl-n', cls: 'major', bridge: true, buses: 4, name: 'Third Mainland Bridge' },
    { a: 'oshodi', b: 'ikeja', cls: 'major', name: 'Ikorodu Road' }, { a: 'ikeja', b: 'alausa', cls: 'major', name: 'Obafemi Awolowo Way' },
    { a: 'alausa', b: 'airport-gate', cls: 'major', name: 'Airport Road' }, { a: 'airport-gate', b: 'terminal', cls: 'major', name: 'Airport Road' },
    { a: 'ikeja-w', b: 'ikeja', cls: 'secondary', name: 'Oba Akran Avenue' }, { a: 'ikeja', b: 'ikeja-e', cls: 'secondary', name: 'Oba Akran Avenue' },
    { a: 'ikeja-w', b: 'ifako', cls: 'secondary' }, { a: 'ikeja-e', b: 'yaba-e', cls: 'secondary' },
    { a: 'oshodi', b: 'mushin-s', cls: 'secondary', name: 'Apapa-Oshodi Expressway' }, { a: 'mushin-s', b: 'surulere', cls: 'secondary' },
    { a: 'surulere', b: 'yaba-e', cls: 'secondary', name: 'Funsho Williams Avenue' },
    { a: 'mushin-s', b: 'apapa-link-n', cls: 'major', name: 'Apapa-Oshodi Expressway' },
    { a: 'apapa-link-n', b: 'apapa-link-s', cls: 'major', bridge: true, name: 'Apapa Bridge' },
    { a: 'apapa-link-s', b: 'apapa-c', cls: 'major', name: 'Creek Road' }, { a: 'apapa-c', b: 'apapa-w', cls: 'secondary' }, { a: 'apapa-c', b: 'apapa-e', cls: 'secondary' },
    { a: 'isl-n', b: 'isl-c', cls: 'major', name: 'Broad Street' }, { a: 'isl-c', b: 'isl-e', cls: 'major', name: 'Ahmadu Bello Way' }, { a: 'isl-c', b: 'isl-s', cls: 'major', name: 'Marina' },
    { a: 'isl-e', b: 'ikoyi-w', cls: 'major', bridge: true, name: 'Falomo Bridge' }, { a: 'ikoyi-w', b: 'ikoyi-c', cls: 'major', name: 'Awolowo Road' },
    { a: 'ikoyi-c', b: 'ikoyi-e', cls: 'major' }, { a: 'ikoyi-c', b: 'ikoyi-ne', cls: 'secondary' },
    { a: 'ikoyi-ne', b: 'banana-w', cls: 'secondary', bridge: true }, { a: 'banana-w', b: 'banana-c', cls: 'local' },
    { a: 'ikoyi-e', b: 'lekki-nw', cls: 'major', bridge: true, cable: true, buses: 2, name: 'Lekki-Ikoyi Link Bridge' },
    { a: 'isl-s', b: 'vi-w', cls: 'major', bridge: true, buses: 1, name: 'Marina Link' }, { a: 'vi-w', b: 'vi-c', cls: 'major', name: 'Adetokunbo Ademola Street' },
    { a: 'vi-c', b: 'vi-e', cls: 'major', name: 'Ahmadu Bello Way' }, { a: 'vi-c', b: 'vi-s', cls: 'secondary' },
    { a: 'vi-s', b: 'atl-c', cls: 'major', name: 'Eko Atlantic Boulevard' }, { a: 'atl-w', b: 'atl-c', cls: 'secondary' }, { a: 'atl-c', b: 'atl-e', cls: 'secondary' },
    { a: 'vi-e', b: 'lekki-c', cls: 'major', name: 'Lekki-Epe Expressway' }, { a: 'lekki-nw', b: 'lekki-c', cls: 'secondary' },
    { a: 'lekki-c', b: 'lekki-e', cls: 'major', name: 'Lekki-Epe Expressway' }, { a: 'lekki-e', b: 'lekki2-c', cls: 'major', name: 'Lekki-Epe Expressway' },
    { a: 'lekki2-c', b: 'lekki2-e', cls: 'major', name: 'Lekki-Epe Expressway' }, { a: 'lekki2-e', b: 'ajah-c', cls: 'major' }, { a: 'ajah-c', b: 'ajah-e', cls: 'secondary' },
  ],
};
