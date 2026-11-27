/**
 * Pain zones of the 3D body model (assets/models/body-*.glb). Each zone is a material
 * named `zone_<region>_<side>` (see scripts/blender/split_body_zones.py); the app picks
 * and colors zones by that name.
 */
import { BODY_REGIONS, type BodyRegion, type BodySide, REGION_INFO } from './body-regions';

/** Runner zones painted on the 3D model, in the order they appear on the body. */
export const BODY_3D_REGIONS = [
  'foot',
  'ankle',
  'achilles',
  'shin',
  'calf',
  'knee',
  'quadriceps',
  'hamstring',
  'it_band',
  'hip',
  'lower_back',
] as const satisfies readonly BodyRegion[];

export type Body3DRegion = (typeof BODY_3D_REGIONS)[number];

export type ZoneRef = { region: BodyRegion; side: BodySide };

const SIDES: readonly BodySide[] = ['left', 'right', 'center'];

/** "zone_it_band_left" → { region: 'it_band', side: 'left' }; anything else → null. */
export function parseZoneName(name: string): ZoneRef | null {
  const match = /^zone_([a-z_]+)_(left|right|center)$/.exec(name);
  if (!match) return null;
  const region = match[1] as BodyRegion;
  const side = match[2] as BodySide;
  if (!(BODY_REGIONS as readonly string[]).includes(region) || !SIDES.includes(side)) return null;
  return { region, side };
}

export function zoneName({ region, side }: ZoneRef): string {
  return `zone_${region}_${side}`;
}

/** Every zone material the model must contain (left/right legs + central lower back). */
export function expectedZoneNames(): string[] {
  return BODY_3D_REGIONS.flatMap((region) =>
    region === 'lower_back'
      ? [zoneName({ region, side: 'center' })]
      : (['left', 'right'] as const).map((side) => zoneName({ region, side })),
  );
}

/** Rotation (radians, around the vertical axis) that faces the camera with `view`. */
export function viewRotation(view: 'front' | 'back'): number {
  return view === 'front' ? 0 : Math.PI;
}

/** Normalizes an angle to (-π, π] so "Frente/Costas" turn the short way round. */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let a = ((angle % twoPi) + twoPi) % twoPi;
  if (a > Math.PI) a -= twoPi;
  return a;
}

/** Shortest rotation from `current` to `target` (both radians). */
export function shortestRotation(current: number, target: number): number {
  return current + normalizeAngle(target - current);
}

/**
 * Every region/side the runner can report, for the list alternative to the 3D model
 * (the upper body is only reachable here).
 */
export function allRegionTargets(): ZoneRef[] {
  return BODY_REGIONS.flatMap((region): ZoneRef[] =>
    REGION_INFO[region].bilateral
      ? (['left', 'right'] as const).map((side) => ({ region, side }))
      : [{ region, side: 'center' as const }],
  );
}
