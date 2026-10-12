import type { CarSlot } from './layoutGeometry';

/**
 * Open parking bays and the future GLB car.
 *
 * Every bay is a plain rectangular zone (kind 'parking') in the layout; `carSlots(layout)` turns each into a CarSlot
 * (centre, yaw, size). A car model is placed with `fitModelToBay`, which does NOT assume the model's origin: it uses the
 * model's own bounding box, so a GLB whose origin is at its centre, a wheel or a corner still ends up centred in the
 * bay, standing on the ground and inside the bay lines.
 */
export const BAY_WIDTH = 2.8;   // across the car (m)
export const BAY_LENGTH = 5.5;  // along the car (m)
export const BAY_MARGIN = 0.15; // clearance kept between a shrunk model and the bay lines (m)

/** Local-space bounding box of a model at scale 1, e.g. from `new Box3().setFromObject(gltf.scene)`. */
export interface ModelBounds { min: readonly [number, number, number]; max: readonly [number, number, number] }
/** Which local axis the model's nose points along. glTF convention is +z, but check each asset. */
export type NoseAxis = '+z' | '-z' | '+x' | '-x';
const NOSE_YAW: Record<NoseAxis, number> = { '+z': 0, '-x': -Math.PI / 2, '-z': Math.PI, '+x': Math.PI / 2 };

export interface BayPose { position: [number, number, number]; rotationY: number; scale: number; fits: boolean }

/**
 * Where to put (and how to scale) a car model so it sits in `slot`.
 * - Apply as `<primitive object={scene} position={pose.position} rotation={[0, pose.rotationY, 0]} scale={pose.scale} />`.
 * - `unitScale` converts the asset's units to metres (1 for metres, 0.01 for centimetres).
 * - The model is only ever scaled DOWN to fit (never up), keeping `BAY_MARGIN` clear of the lines.
 * - Its lowest point sits exactly on the ground (y = 0); its bounding-box centre sits on the bay centre.
 */
export function fitModelToBay(slot: CarSlot, bounds: ModelBounds, opts: { nose?: NoseAxis; unitScale?: number; groundY?: number } = {}): BayPose {
  const nose = opts.nose ?? '+z', u = opts.unitScale ?? 1, groundY = opts.groundY ?? 0;
  const sx = (bounds.max[0] - bounds.min[0]) * u, sz = (bounds.max[2] - bounds.min[2]) * u;
  const alongZ = nose === '+z' || nose === '-z';
  const length = alongZ ? sz : sx, width = alongZ ? sx : sz;
  const k = Math.min(1, (slot.length - 2 * BAY_MARGIN) / Math.max(length, 1e-6), (slot.width - 2 * BAY_MARGIN) / Math.max(width, 1e-6));
  const scale = u * k;
  const yaw = slot.rotation - NOSE_YAW[nose];
  // bounding-box centre after scale + yaw (three.js: rotation about y maps (x, z) -> (x cos + z sin, -x sin + z cos))
  const cx = ((bounds.min[0] + bounds.max[0]) / 2) * scale, cz = ((bounds.min[2] + bounds.max[2]) / 2) * scale;
  const rx = cx * Math.cos(yaw) + cz * Math.sin(yaw), rz = -cx * Math.sin(yaw) + cz * Math.cos(yaw);
  return { position: [slot.x - rx, groundY - bounds.min[1] * scale, slot.z - rz], rotationY: yaw, scale, fits: k >= 1 };
}
