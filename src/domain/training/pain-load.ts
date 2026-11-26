/**
 * Turns the pains marked on the body map into load adjustments for a running session:
 * how much volume to cut, how fast the runner may go, which session types to swap and
 * whether to stay on flat ground. Conservative by design — when in doubt, run easier.
 */
import {
  type BodyRegion,
  describeRegion,
  type PainEntry,
  painLevel,
  type PainLevel,
} from '../health/body-regions';

export const RUN_WORKOUT_TYPES = [
  'intervals',
  'fartlek',
  'tempo',
  'hills',
  'progressive',
  'easy',
  'long',
  'recovery',
] as const;
export type RunWorkoutType = (typeof RUN_WORKOUT_TYPES)[number];

/** Highest effort allowed in the session, from lowest to highest. */
export const INTENSITY_ORDER = ['recovery', 'easy', 'moderate', 'threshold', 'hard'] as const;
export type Intensity = (typeof INTENSITY_ORDER)[number];

/** Sessions with top-speed or explosive efforts. */
const SPEED_SESSIONS: readonly RunWorkoutType[] = ['intervals', 'fartlek', 'hills'];

/** Next safer session when one is not advisable (always ends in recovery). */
const SAFER: Record<RunWorkoutType, RunWorkoutType> = {
  hills: 'fartlek',
  intervals: 'tempo',
  fartlek: 'progressive',
  tempo: 'easy',
  progressive: 'easy',
  long: 'easy',
  easy: 'recovery',
  recovery: 'recovery',
};

type RegionRule = {
  /** Sessions that load this region the most. */
  avoid: readonly RunWorkoutType[];
  /** Top speed strains it (sprints, short fast reps). */
  noSpeed: boolean;
  /** Climbs or descents strain it. */
  flat: boolean;
  /** Why, shown to the user. */
  reason: string;
};

const LOWER_LEG: RegionRule = {
  avoid: ['hills', 'intervals'],
  noSpeed: true,
  flat: true,
  reason: 'impulsão e impacto em subidas e tiros sobrecarregam a região',
};

const RULES: Partial<Record<BodyRegion, RegionRule>> = {
  foot: { ...LOWER_LEG, reason: 'o impacto de tiros e subidas sobrecarrega o pé' },
  ankle: { ...LOWER_LEG, reason: 'mudanças de ritmo e subidas exigem muito do tornozelo' },
  achilles: { ...LOWER_LEG, reason: 'subidas e tiros tracionam o tendão de Aquiles' },
  calf: { ...LOWER_LEG, reason: 'subidas e tiros exigem muita impulsão da panturrilha' },
  shin: {
    avoid: ['hills', 'intervals', 'long'],
    noSpeed: true,
    flat: true,
    reason: 'a canela sofre com impacto repetido e volume alto',
  },
  knee: {
    avoid: ['hills', 'long'],
    noSpeed: false,
    flat: true,
    reason: 'descidas e treinos longos sobrecarregam o joelho',
  },
  quadriceps: {
    avoid: ['hills'],
    noSpeed: true,
    flat: true,
    reason: 'subidas, descidas e velocidade exigem muito da coxa',
  },
  hamstring: {
    avoid: ['intervals'],
    noSpeed: true,
    flat: false,
    reason: 'velocidade máxima é o principal risco para o posterior da coxa',
  },
  glute: {
    avoid: ['hills', 'long'],
    noSpeed: true,
    flat: true,
    reason: 'exige estabilidade do quadril',
  },
  hip: {
    avoid: ['hills', 'long'],
    noSpeed: true,
    flat: true,
    reason: 'exige estabilidade do quadril',
  },
  groin: {
    avoid: ['intervals', 'fartlek'],
    noSpeed: true,
    flat: false,
    reason: 'mudanças bruscas de ritmo sobrecarregam os adutores',
  },
  lower_back: {
    avoid: ['hills', 'long'],
    noSpeed: false,
    flat: true,
    reason: 'subidas e treinos longos aumentam a carga na lombar',
  },
  abdomen: { avoid: [], noSpeed: true, flat: false, reason: 'esforço máximo exige muito do core' },
  obliques: { avoid: [], noSpeed: true, flat: false, reason: 'esforço máximo exige muito do core' },
};

/** Regions that change running load (legs, hips, lower back). */
function isRunningRegion(region: BodyRegion): boolean {
  const rule = RULES[region];
  return rule !== undefined && rule.avoid.length > 0;
}

/** Volume kept per pain level in a running region. */
const VOLUME_FACTOR: Record<PainLevel, number> = { mild: 0.85, moderate: 0.6, severe: 0 };

export type LoadAdjustment = {
  /** Session actually prescribed (may differ from the requested one). */
  type: RunWorkoutType;
  /** 0 = no running today; otherwise fraction of the normal main-set volume. */
  volumeFactor: number;
  maxIntensity: Intensity;
  flatOnly: boolean;
  noSpeed: boolean;
  /** Suggest seeing a professional / stopping. */
  seeProfessional: boolean;
  /** Chest pain: don't train at all. */
  stop: boolean;
  /** Human explanations (pt-BR). */
  notes: string[];
};

function capIntensity(current: Intensity, cap: Intensity): Intensity {
  return INTENSITY_ORDER.indexOf(current) > INTENSITY_ORDER.indexOf(cap) ? cap : current;
}

export function adjustForPain(
  requested: RunWorkoutType,
  pains: readonly PainEntry[],
): LoadAdjustment {
  const result: LoadAdjustment = {
    type: requested,
    volumeFactor: 1,
    maxIntensity: 'hard',
    flatOnly: false,
    noSpeed: false,
    seeProfessional: false,
    stop: false,
    notes: [],
  };

  const avoid = new Set<RunWorkoutType>();
  let worstRunning: PainLevel | null = null;

  for (const pain of pains) {
    const level = painLevel(pain.intensity);
    const where = describeRegion(pain.region, pain.side);

    if (pain.region === 'chest' && level !== 'mild') {
      result.stop = true;
      result.seeProfessional = true;
      continue;
    }

    const rule = RULES[pain.region];
    if (!rule || !isRunningRegion(pain.region)) {
      // Upper body / core: running is fine, but keep it comfortable when it hurts a lot.
      if (rule?.noSpeed && level !== 'mild') {
        result.noSpeed = true;
        result.notes.push(`${where}: sem esforço máximo — ${rule.reason}.`);
      } else if (level === 'severe') {
        result.maxIntensity = capIntensity(result.maxIntensity, 'moderate');
        result.notes.push(`${where}: dor forte — intensidade limitada a moderada.`);
      }
      continue;
    }

    if (worstRunning === null || VOLUME_FACTOR[level] < VOLUME_FACTOR[worstRunning]) {
      worstRunning = level;
    }
    rule.avoid.forEach((t) => avoid.add(t));
    if (rule.flat) result.flatOnly = true;
    if (rule.noSpeed) result.noSpeed = true;
    if (level !== 'mild')
      result.notes.push(`${where} (${level === 'severe' ? 'forte' : 'moderada'}): ${rule.reason}.`);
    else result.notes.push(`${where} (leve): ${rule.reason} — carga um pouco menor.`);
  }

  if (result.stop) {
    result.type = 'recovery';
    result.volumeFactor = 0;
    result.maxIntensity = 'recovery';
    result.notes = [
      'Dor no peito: não treine hoje. Se a dor for forte, vier com falta de ar, suor frio ou irradiar para o braço, procure atendimento médico imediatamente.',
    ];
    return result;
  }

  if (worstRunning === 'severe') {
    result.type = 'recovery';
    result.volumeFactor = 0;
    result.maxIntensity = 'recovery';
    result.seeProfessional = true;
    return result;
  }

  if (worstRunning === 'moderate') {
    // Only easy running, shorter, on flat ground.
    result.maxIntensity = capIntensity(result.maxIntensity, 'easy');
    result.flatOnly = true;
    result.noSpeed = true;
  } else if (worstRunning === 'mild' && result.noSpeed) {
    result.maxIntensity = capIntensity(result.maxIntensity, 'threshold');
  }
  if (worstRunning) result.volumeFactor = VOLUME_FACTOR[worstRunning];

  // Swap the session until it suits every restriction.
  const fitsRestrictions = (type: RunWorkoutType) =>
    !avoid.has(type) &&
    !(result.noSpeed && SPEED_SESSIONS.includes(type)) &&
    !(result.maxIntensity === 'easy' && !['easy', 'recovery', 'long'].includes(type));
  let type = requested;
  while (!fitsRestrictions(type) && type !== 'recovery') type = SAFER[type];
  if (result.maxIntensity === 'easy' && type === 'long') type = 'easy';
  result.type = type;

  return result;
}
