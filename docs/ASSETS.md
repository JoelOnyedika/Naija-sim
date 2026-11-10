# 3D assets: where they live and how to move them to a server

## Today: everything is local
- Car models are in `public/models/cars/*.glb` (about 1.8 MB for all six). Vite serves `public/` as-is, so the game loads them from its own site: `/models/cars/gtr.glb`.
- Your original, untouched files are kept in `assets-src/cars-original/` (not served, not shipped to players).
- `public/models/cars/manifest.json` lists each model's baked size and front direction.
- Only the **player's own** cars use these files: the garage at home, the Polanco Motors showroom and the car on the road during travel. Every other car (traffic, kekes, danfos, cabs, okadas) is built from simple shapes in code, so traffic stays cheap.
- The 3D travel scene is the only travel animation (the 2D versions were removed). If WebGL fails, a trip still plays its captions and arrives over a plain sky.

## Which game car uses which file
`src/data/vehicles.ts`: every car in the game has a `model` (file name without `.glb`). There are no procedural cars you can own any more: cars without a model were removed (old saves that owned them are refunded their full price once).

| Game car | File |
|---|---|
| Audi R8 | audi.glb |
| Dodge Challenger | dodge.glb |
| Tesla Roadster | tesla.glb |
| Nissan GT-R | gtr.glb |
| Lamborghini Huracan (id `supercar`) | huracan.glb |
| Koenigsegg Agera | agera.glb |

The Audi, Dodge and Tesla names are my reading of the shapes; rename them in `vehicles.ts` if they are different cars (display text only; do not change ids, saves use them).
Each car also has a picture for the dealership list: `public/models/cars/thumbs/<model>.webp`, rendered from the model by `tools/make-car-thumbs.py` (see the top of that file; re-run it after adding a car or changing a car's colour).

## Adding another car
1. Put the raw `.glb` in `assets-src/cars-original/` and add its name to the list in `tools/prepare-cars.mjs`. Front of the car must face **+z**. Name the paint material `MAT_BODY`, windows `MAT_GLASS`, tyres `MAT_TIRE` so the game can recolour them.
2. Run `node tools/prepare-cars.mjs` (the install line is at the top of that file).
3. Add an entry to `VEHICLES` in `src/data/vehicles.ts` with `model: '<file name without .glb>'`. Add a podium to the showroom in `src/data/interiors.ts` (the test `npm run test:venues` insists on one podium per car). Run `python3 tools/make-car-thumbs.py` to make its dealership picture.
Keep each car under roughly 10k triangles and 300 KB. They are drawn several at once in the showroom.

## Moving to a server or CDN later
1. Upload the `public/models/` folder as it is to your server or bucket (keep the `models/cars/...` structure).
2. Build the game with the base URL set: `VITE_ASSET_BASE=https://cdn.example.com/nigeria-life/ npm run build` (it must end with `/`). All model loading goes through `assetUrl()` in `src/core/assets.ts`, so nothing else changes.
3. The server must allow cross-origin loading (header `Access-Control-Allow-Origin: *`, or your game's domain) and should serve `.glb` as `model/gltf-binary` with long cache headers (the file names do not change, so rename a file when you replace it).
4. Because of that, you can also delete `public/models/` from the game build afterwards so players do not download it twice.

## Street cars (v33)
Cars you see on streets are real low-poly models too, not procedural shapes: `public/models/street/*.glb` (six files, about 280 KB together), built from your `low_poly_cars_pack.glb` (kept untouched in `assets-src/street-cars-pack/`, not shipped).

| File | Looks like | Triangles | Used for |
|---|---|---|---|
| sedan.glb | old saloon | 926 | traffic, the taxi (yellow + TAXI roof sign), roadblock and destination scenes, parked cars |
| hatch.glb | hatchback | 726 | traffic, parked cars |
| wagon.glb | family wagon | 588 | traffic (the old "suv" kind) |
| van.glb | panel van | 1,104 | traffic |
| pickup_s.glb | small pickup | 1,074 | traffic |
| pickup_l.glb | double-cab pickup | 770 | traffic, parked cars |

- Each file has two meshes: `body` (textured, painted near-white so the game tints it any colour) and `trim` (tyres, bumpers, wheel discs, vertex colours). Front faces +z, wheels on y = 0, one 384 px WebP texture. Traffic draws them instanced: two draw calls per model.
- Code: `src/data/streetCars.ts` (list, sizes, which traffic kind uses which model), `src/three/models/StreetCar.tsx` (one car, or an instanced fleet), `CarMesh` in `features/travel/vehicles3d.tsx` (taxi, roadblock, destinations), `Traffic` in `features/travel/Scene3D.tsx`, `ParkedCar` in `three/property/VenueSurround.tsx`.
- If a file is missing or broken the old procedural car is drawn instead (and a warning is logged), so a scene never breaks.
- Danfos, kekes and okadas are still procedural (the pack has no keke or okada, and the danfo carries its slogan, luggage and conductor). The panel van can replace the danfo body if you prefer.
- Rebuild or change them: edit `tools/street-cars/cfg.json` (target length, how much each part is simplified, texture size) and run `node tools/prepare-street-cars.mjs` (install line at the top of that file). Then copy the printed sizes into `src/data/streetCars.ts`; `npm run test:streetcars` fails if they drift or a file goes over budget (1,200 triangles, 120 KB).
- To use a different colour of a model as the base, change the `variants` list order or add a `sat` value in `cfg.json` (how much colour the base texture keeps; 0.3 now).
