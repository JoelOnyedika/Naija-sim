/**
 * Builds the street cars (public/models/street/*.glb) from the owner's pack assets-src/street-cars-pack/low_poly_cars_pack.glb.
 * Run from the project root:
 *   npm i --no-save @gltf-transform/core @gltf-transform/extensions meshoptimizer sharp
 *   node tools/prepare-street-cars.mjs
 * Step 1 (tools/street-cars/extract.mjs) cuts the pack, where every colour of a model sits in a row and shares wheel/trim meshes, into single cars.
 * Step 2 (tools/street-cars/build.mjs, settings in cfg.json) picks the most neutral colour of each model as the template, simplifies it,
 * swaps the 280-triangle tyres for 40-triangle ones, shrinks the paint texture to 384 px WebP, aligns the car (front +z, wheels on y = 0, target length)
 * and writes two meshes: `body` (textured, game tints it) and `trim` (vertex colours). Then writes manifest.json.
 * Afterwards update the numbers in src/data/streetCars.ts from the printed table (npm run test:streetcars fails if they drift).
 */
import { execFileSync } from 'child_process';
for (const s of ['extract', 'build']) execFileSync('node', [`tools/street-cars/${s}.mjs`], { stdio: 'inherit' });
