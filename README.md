# Nigeria Life

A mobile-first 3D Nigerian life-simulation prototype. React + TypeScript + Vite + React Three Fiber + Zustand + Tailwind + Framer Motion. No backend; everything runs locally with mock data and saves to `localStorage`.

## Run it

```bash
npm install
npm run dev              # http://localhost:5173 (use the printed network URL on your phone)
npm run build            # typecheck + production build
npm run validate:content # checks every state's properties/layouts/starting homes
npm run smoke            # headless logic test (life start, buying, placing, moving house...)
```

Node 18+.

## What is in the vertical slice

Landing page with a live 3D Lagos (landmarks, danfo buses, online counter) → mock sign up / login → character creation (3D avatar) → **Life Roulette** (Lapo Baby common, Nepo Baby rare) → life summary → your 3D home with HUD, tasks, stats, **Buy mode** (catalog + ghost placement), a **phone** (iOS-style for Nepo, Android-style for Lapo) with 22 apps, a **map**, and a Nigerian **property catalogue** (29 listings from Face-Me-I-Face-You to a Waterfront Mansion).

## Read next

- [`docs/DEVELOPER.md`](docs/DEVELOPER.md): architecture, systems, how to extend anything.
- [`docs/ADDING_A_STATE.md`](docs/ADDING_A_STATE.md): add Abuja (or any state) as data, step by step.

## Prototype notes

- Auth is a **mock** (plain-text accounts in localStorage). Replace `stores/authStore.ts` when you add a backend.
- Sounds and music are **synthesised placeholders** (WebAudio). Swap `audio/sfx.ts` / `audio/music.ts` bodies for real files; call sites stay the same.
- All 3D is **procedural** (no model files). `three/models/registry.tsx` shows where GLB models would plug in.
- Not built yet, on purpose: rentals, landlords, rental income, property portfolios, multiplayer, payments, multi-storey interiors.
