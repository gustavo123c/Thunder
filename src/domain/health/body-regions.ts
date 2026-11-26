/**
 * Body regions for the pain map. IDs mirror the pain_logs.region CHECK constraint.
 * `bilateral` regions are recorded per side (left/right); the rest use 'center'.
 */

export const BODY_REGIONS = [
  'neck',
  'trapezius',
  'shoulder',
  'upper_back',
  'chest',
  'biceps',
  'triceps',
  'elbow',
  'forearm',
  'wrist',
  'lower_back',
  'abdomen',
  'obliques',
  'hip',
  'glute',
  'groin',
  'quadriceps',
  'hamstring',
  'knee',
  'shin',
  'calf',
  'ankle',
  'achilles',
  'foot',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];
export type BodySide = 'left' | 'right' | 'center';
export type BodyView = 'front' | 'back';

type RegionInfo = {
  label: string;
  bilateral: boolean;
  /** Region of the legs/feet: matters most for running load. */
  lowerLimb: boolean;
  /** Views of the anatomy map where the region can be tapped ([] = list only). */
  views: readonly BodyView[];
};

export const REGION_INFO: Record<BodyRegion, RegionInfo> = {
  neck: { label: 'Pescoço', bilateral: false, lowerLimb: false, views: ['front', 'back'] },
  trapezius: { label: 'Trapézio', bilateral: false, lowerLimb: false, views: ['front', 'back'] },
  shoulder: { label: 'Ombro', bilateral: true, lowerLimb: false, views: ['front', 'back'] },
  upper_back: {
    label: 'Parte superior das costas',
    bilateral: false,
    lowerLimb: false,
    views: ['back'],
  },
  chest: { label: 'Peito', bilateral: false, lowerLimb: false, views: ['front'] },
  biceps: { label: 'Bíceps', bilateral: true, lowerLimb: false, views: ['front'] },
  triceps: { label: 'Tríceps', bilateral: true, lowerLimb: false, views: ['front', 'back'] },
  elbow: { label: 'Cotovelo', bilateral: true, lowerLimb: false, views: [] },
  forearm: { label: 'Antebraço', bilateral: true, lowerLimb: false, views: ['front', 'back'] },
  wrist: { label: 'Punho e mão', bilateral: true, lowerLimb: false, views: ['front', 'back'] },
  lower_back: { label: 'Lombar', bilateral: false, lowerLimb: false, views: ['back'] },
  abdomen: { label: 'Abdômen', bilateral: false, lowerLimb: false, views: ['front'] },
  obliques: { label: 'Oblíquo', bilateral: true, lowerLimb: false, views: ['front'] },
  hip: { label: 'Quadril', bilateral: true, lowerLimb: true, views: [] },
  glute: { label: 'Glúteo', bilateral: true, lowerLimb: true, views: ['back'] },
  groin: {
    label: 'Virilha e adutores',
    bilateral: false,
    lowerLimb: true,
    views: ['front', 'back'],
  },
  quadriceps: { label: 'Coxa (frente)', bilateral: true, lowerLimb: true, views: ['front'] },
  hamstring: { label: 'Posterior da coxa', bilateral: true, lowerLimb: true, views: ['back'] },
  knee: { label: 'Joelho', bilateral: true, lowerLimb: true, views: ['front'] },
  shin: { label: 'Canela', bilateral: true, lowerLimb: true, views: ['front'] },
  calf: { label: 'Panturrilha', bilateral: true, lowerLimb: true, views: ['back'] },
  ankle: { label: 'Tornozelo', bilateral: true, lowerLimb: true, views: ['front'] },
  achilles: { label: 'Tendão de Aquiles', bilateral: true, lowerLimb: true, views: ['back'] },
  foot: { label: 'Pé', bilateral: true, lowerLimb: true, views: ['front', 'back'] },
};

export type PainLevel = 'mild' | 'moderate' | 'severe';

/** Intensity presets offered in the UI (stored as 1–10). */
export const PAIN_PRESETS: Record<PainLevel, { intensity: number; label: string }> = {
  mild: { intensity: 3, label: 'Leve' },
  moderate: { intensity: 6, label: 'Moderada' },
  severe: { intensity: 9, label: 'Forte' },
};

export function painLevel(intensity: number): PainLevel {
  if (intensity >= 7) return 'severe';
  if (intensity >= 4) return 'moderate';
  return 'mild';
}

export type PainEntry = { region: BodyRegion; side: BodySide; intensity: number };

/** "Joelho esquerdo", "Lombar". */
export function describeRegion(region: BodyRegion, side: BodySide): string {
  const { label } = REGION_INFO[region];
  if (side === 'center') return label;
  // Feminine nouns take "esquerda/direita".
  const feminine = ['Coxa (frente)', 'Panturrilha', 'Canela'].includes(label);
  if (label === 'Punho e mão') return `Punho e mão ${side === 'left' ? 'esquerdos' : 'direitos'}`;
  const sideLabel =
    side === 'left' ? (feminine ? 'esquerda' : 'esquerdo') : feminine ? 'direita' : 'direito';
  return label === 'Coxa (frente)' ? `Coxa ${sideLabel} (frente)` : `${label} ${sideLabel}`;
}
