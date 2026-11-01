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
