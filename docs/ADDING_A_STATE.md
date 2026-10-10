# Adding a New State (example: Abuja)

Lagos is the first **content pack**, not the foundation. Adding a state is data plus (optionally) art. You should not edit houses, marketplace, ownership, map, location cards, search, saves, or the Houses app.

## The checklist

1. Create `src/content/abuja/` with `areas.ts`, `properties.ts`, `landmarks.ts`, `index.ts` (copy `content/lagos/` as a template).
2. Define the state in `index.ts` (id, name, country, tagline, areas, properties, layouts, mapData, visualData, startingProperties).
3. Add its areas and properties.
4. Add its landmarks (map data).
5. Provide a 3D scene (or reuse one) and any landmark models.
6. Register it: one line in `content/index.ts`, one line in `content/scenes.ts`.
7. Run `npm run validate:content` and `npm run smoke`.

## 1. Areas

```ts
// content/abuja/areas.ts
import type { AreaDefinition } from '@/types/world';
type Base = Omit<AreaDefinition, 'stateId' | 'propertyIds'>;

export const AREAS: Base[] = [
  { id: 'abuja.gwagwalada', name: 'Gwagwalada', tagline: 'Affordable and growing.', positioning: 'lowIncome',
    description: 'Satellite town with budget housing.', mapData: { position: [-14, 10], radius: 3, color: '#E4572E' } },
  { id: 'abuja.wuse',   name: 'Wuse',   positioning: 'midIncome',  /* ... */ mapData: { position: [0, 0], radius: 3.4, color: '#38BDF8' }, tagline: '', description: '' },
  { id: 'abuja.garki',  name: 'Garki',  positioning: 'midIncome',  /* ... */ mapData: { position: [4, 5], radius: 3, color: '#4BAE55' }, tagline: '', description: '' },
  { id: 'abuja.maitama', name: 'Maitama', positioning: 'affluent', /* ... */ mapData: { position: [6, -4], radius: 3, color: '#B8892F' }, tagline: '', description: '' },
  { id: 'abuja.asokoro', name: 'Asokoro', positioning: 'ultraLuxury', /* ... */ mapData: { position: [10, 2], radius: 3, color: '#FF4D6D' }, tagline: '', description: '' },
];
```

`positioning` is one of `lowIncome | workingClass | midIncome | affluent | ultraLuxury`; the UI shows its label automatically. `mapData.position` is in your scene's world units. `propertyIds` are attached automatically (see step 2).

## 2. Properties and layouts

Each entry pairs a listing with a layout builder. Reuse the generic builders in `world/layoutBuilders.ts` or write a `PropertyLayout` by hand.

```ts
// content/abuja/properties.ts
import { residence, selfContain } from '@/world/layoutBuilders';
import type { Palette, PropertyDefinition, PropertyLayout } from '@/types/world';

interface Entry { property: Omit<PropertyDefinition, 'stateId' | 'layoutId'>; layout: (id: string) => PropertyLayout }
const pal = (wall: string, trim: string, accent: string): Palette => ({ wall, trim, accent });

export const ENTRIES: Entry[] = [
  {
    property: {
      id: 'abuja.self-contain-gwagwalada', areaId: 'abuja.gwagwalada', name: 'Self Contain', category: 'starter',
      price: 1_200_000, unit: 'rooms', rooms: 1, bedrooms: 1, bathrooms: 1, garageBays: 0, parkingSpaces: 0,
      description: 'Compact self-contained unit.', cta: 'move_in', luxuryLevel: 2,
    },
    layout: (id) => selfContain({ id, palette: pal('#CFE0C3', '#4C7A4A', '#FFC21A') }),
  },
  {
    property: {
      id: 'abuja.4-bedroom-duplex-maitama', areaId: 'abuja.maitama', name: '4 Bedroom Detached Duplex', category: 'upperClass',
      price: 190_000_000, unit: 'bedrooms', rooms: 5, bedrooms: 4, bathrooms: 5, garageBays: 3, parkingSpaces: 0,
      description: 'Quiet, leafy and well secured.', cta: 'buy', luxuryLevel: 8,
    },
    layout: (id) => residence({ id, beds: 4, baths: 5, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass',
      palette: pal('#F6F1E7', '#FFFFFF', '#B8892F'), stairs: true, garageBays: 3, terrace: true, pillars: true, garden: 3.8,
      fence: 'ironbar', ground: 'paving', trees: 4, wallHeight: 3.2, grand: 0.6 }),
  },
];
```

Rules the validator enforces:

- Every `areaId` exists; every `layoutId` resolves (the template sets `layoutId = property.id`).
- `garageBays + parkingSpaces` ≤ car slots in the layout; bathroom/bedroom counts match the listing.
- Zones do not overlap and stay inside the plot; fixtures sit inside zones; connections produce doorways.
- Windows land on tall walls.

## 3. State definition

```ts
// content/abuja/index.ts
import type { StateDefinition } from '@/types/world';
import { AREAS } from './areas';
import { LANDMARKS } from './landmarks';
import { ENTRIES } from './properties';

const ID = 'abuja';
export const abuja: StateDefinition = {
  id: ID, name: 'Abuja', country: 'Nigeria', tagline: 'Build your capital story.',
  areas: AREAS.map((a) => ({ ...a, stateId: ID, propertyIds: ENTRIES.filter((e) => e.property.areaId === a.id).map((e) => e.property.id) })),
  properties: ENTRIES.map((e) => ({ ...e.property, stateId: ID, layoutId: e.property.id })),
  layouts: ENTRIES.map((e) => e.layout(e.property.id)),
  mapData: { center: [0, 0], bounds: 30, landmarks: LANDMARKS.map((l) => ({ ...l, stateId: ID })) },
  visualData: { sceneId: 'abuja', skyTop: '#3A86C8', skyBottom: '#F3E2B8', accent: '#0B8F4D' },
  startingProperties: { lapo: ['abuja.self-contain-gwagwalada'], nepo: ['abuja.4-bedroom-duplex-maitama'] },
};
```

A Nepo start must have at least as many car spaces as `LIFE_TYPES.nepo.startingVehicles` (the validator checks).

## 4. Landmarks (map data)

```ts
// content/abuja/landmarks.ts
import type { LandmarkDefinition } from '@/types/world';
export const LANDMARKS: Omit<LandmarkDefinition, 'stateId'>[] = [
  { id: 'abuja.millennium-park', areaId: 'abuja.maitama', name: 'Millennium Park', category: 'park', icon: '🌳', modelId: 'millenniumPark',
    position: [6, -2], tagline: 'Green and calm.', description: 'Walk, relax and meet people.',
    visit: { cost: 1000, seconds: 6, effects: { happiness: 14, social: 8, energy: -4 }, taskEvent: 'art' } },
];
```

`visit.effects` use stat keys (`hunger, thirst, bladder, happiness, energy, hygiene, health, social, charisma`). `taskEvent` fires `visit:<taskEvent>` for tasks.

## 5. Scene and assets

Create `content/abuja/scene/AbujaWorld.tsx` exporting a component `({ state }: { state: StateDefinition }) => JSX`. Draw terrain and landmark models; read `state.mapData.landmarks` and `state.areas` for positions. Map markers, area discs labels and cards are generated from data by `WorldView`, so the scene only needs art. Landmark models are keyed by `modelId`; unknown ids fall back to a block, so you can ship data first and art later.

If you want to start quickly, reuse a scene: set `visualData.sceneId` to an existing scene id (the markers will still come from Abuja's data).

## 6. Register

```ts
// content/index.ts
import { abuja } from './abuja';
export function registerContent() { [lagos, abuja].forEach(registerState); }

// content/scenes.ts
import { AbujaWorld } from './abuja/scene/AbujaWorld';
export function registerScenes() { registerScene('lagos', LagosWorld); registerScene('abuja', AbujaWorld); }
```

## 7. What happens automatically

- The Houses app shows Abuja's areas as filter chips, its properties in the listing, search/sort/category filters, plan previews, and the Move In / Buy flow.
- Ownership, active home, per-property furniture, and saves work by property id. A player can own homes in several states.
- The map shows Abuja's landmarks and areas; a state switcher appears in the map header once more than one state is registered (`mapStore.setState`).
- Starting a new life picks a start home from `startingProperties` of the **current** state (`mapStore.stateId`, defaults to the first registered state).

## 8. Things to review by hand

- **Landing/featured cards**: `data/featured.ts` is mock data shared by all states. Make it state-aware when real players exist.
- **Travel between states**: not implemented (no travel cost/time yet). Today the state in view is `mapStore.stateId`. A future "travel" system should set it.
- **Copy**: strings in `data/copy.ts` are national flavour. State-specific lines should live in the state pack.
- **Pricing**: scale prices per state in content (they are only data).

## Final check

```bash
npm run validate:content   # 0 errors expected
npm run smoke              # logic still passes
npm run build
```
