import {
  type BodyRegion,
  type BodySide,
  type BodyView,
  REGION_INFO,
} from '@/domain/health/body-regions';
import type { BodySex } from '@/domain/types/profile';

import {
  type AnatomyDrawing,
  type AnatomySlug,
  female_back,
  female_front,
  male_back,
  male_front,
} from './anatomy-data';

export const DRAWINGS: Record<BodySex, Record<BodyView, AnatomyDrawing>> = {
  male: { front: male_front, back: male_back },
  female: { front: female_front, back: female_back },
};

/** Muscle shape (drawing) → pain region. Head and hair are not interactive. */
const SLUG_TO_REGION: Record<BodyView, Partial<Record<AnatomySlug, BodyRegion>>> = {
  front: {
    neck: 'neck',
    trapezius: 'trapezius',
    deltoids: 'shoulder',
    chest: 'chest',
    biceps: 'biceps',
    triceps: 'triceps',
    forearm: 'forearm',
    hands: 'wrist',
    abs: 'abdomen',
    obliques: 'obliques',
    adductors: 'groin',
    quadriceps: 'quadriceps',
    knees: 'knee',
    tibialis: 'shin',
    calves: 'calf',
    ankles: 'ankle',
    feet: 'foot',
  },
  back: {
    neck: 'neck',
    trapezius: 'trapezius',
    deltoids: 'shoulder',
    'upper-back': 'upper_back',
    triceps: 'triceps',
    forearm: 'forearm',
    hands: 'wrist',
    'lower-back': 'lower_back',
    gluteal: 'glute',
    adductors: 'groin',
    hamstring: 'hamstring',
    calves: 'calf',
    ankles: 'achilles', // back of the ankle
    feet: 'foot',
  },
};

/**
 * Screen side → the person's anatomical side. Front view: they face you, so the
 * left of the screen is their RIGHT. Back view: sides match.
 */
export function anatomicalSide(screenSide: 'left' | 'right' | 'center', view: BodyView): BodySide {
  if (screenSide === 'center') return 'center';
  if (view === 'back') return screenSide;
  return screenSide === 'left' ? 'right' : 'left';
}

export type MusclePath = {
  d: string;
  region: BodyRegion | null; // null = decorative (head, hair)
  side: BodySide;
};

/** Paths of one drawing with their region and anatomical side. */
export function musclePaths(sex: BodySex, view: BodyView): MusclePath[] {
  return DRAWINGS[sex][view].paths.map((path) => {
    const region = SLUG_TO_REGION[view][path.slug] ?? null;
    if (!region) return { d: path.d, region: null, side: 'center' };
    const side = REGION_INFO[region].bilateral ? anatomicalSide(path.screenSide, view) : 'center';
    return { d: path.d, region, side };
  });
}

/** Unique tappable region/side pairs of a view (for the accessible list). */
export function tappableRegions(sex: BodySex, view: BodyView) {
  const seen = new Map<string, { region: BodyRegion; side: BodySide }>();
  for (const { region, side } of musclePaths(sex, view)) {
    if (region && !seen.has(`${region}:${side}`)) seen.set(`${region}:${side}`, { region, side });
  }
  return [...seen.values()];
}
