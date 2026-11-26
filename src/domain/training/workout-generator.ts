import { type PainEntry, painLevel, REGION_INFO, describeRegion } from '../health/body-regions';
import type { RunnerLevel } from '../types/profile';
import { type Exercise, type ExerciseCategory, EXERCISES } from './exercises';

/**
 * Rule-based personalized workout generator. Deterministic and offline; the
 * output shape is the same one a future AI generator must return.
 */

export const WORKOUT_GOALS = ['pace', 'endurance', 'strength'] as const;
export type WorkoutGoal = (typeof WORKOUT_GOALS)[number];
export const WORKOUT_DURATIONS = [20, 30, 45, 60] as const;
export type WorkoutDuration = (typeof WORKOUT_DURATIONS)[number];

export type WorkoutRequest = {
  goal: WorkoutGoal;
  level: RunnerLevel;
  durationMin: WorkoutDuration;
  pains: readonly PainEntry[];
  /** Recent average pace (s/km) to set target paces; null = use perceived effort. */
  recentPaceSPerKm: number | null;
};

export type WorkoutPhase = 'warmup' | 'main' | 'cooldown';

export type WorkoutItem = {
  name: string;
  detail: string;
  durationMin?: number;
  sets?: number;
  reps?: string; // "12" or "30 s"
  restS?: number;
  /** "5:40 /km" or effort description. */
  target?: string;
};

export type WorkoutBlock = {
  phase: WorkoutPhase;
  title: string;
  minutes: number;
  items: WorkoutItem[];
};

export type WorkoutPlan = {
  title: string;
  summary: string;
  totalMinutes: number;
  blocks: WorkoutBlock[];
  /** What changed because of reported pain. */
  adaptations: string[];
  safetyNotes: string[];
};

// ---------------------------------------------------------------------------
// Pain analysis
// ---------------------------------------------------------------------------

type PainProfile = {
  /** Highest intensity among leg/foot regions (0 = none). */
  lowerLimbMax: number;
  /** Regions to avoid loading (moderate or severe pain). */
  avoid: Set<string>;
  /** Regions with mild pain: keep, but go easier. */
  caution: Set<string>;
  severeEntries: PainEntry[];
};

function analyzePains(pains: readonly PainEntry[]): PainProfile {
  const profile: PainProfile = {
    lowerLimbMax: 0,
    avoid: new Set(),
    caution: new Set(),
    severeEntries: [],
  };
  for (const pain of pains) {
    const level = painLevel(pain.intensity);
    if (REGION_INFO[pain.region].lowerLimb) {
      profile.lowerLimbMax = Math.max(profile.lowerLimbMax, pain.intensity);
    }
    if (level === 'mild') profile.caution.add(pain.region);
    else profile.avoid.add(pain.region);
    if (level === 'severe') profile.severeEntries.push(pain);
  }
  return profile;
}

function isSafe(exercise: Exercise, level: RunnerLevel, pain: PainProfile): boolean {
  if (exercise.intermediateOnly && level === 'beginner') return false;
  if (exercise.category === 'plyometric' && (pain.lowerLimbMax >= 1 || pain.avoid.size > 0)) {
    return false; // no impact work while anything hurts
  }
  return !exercise.loads.some((region) => pain.avoid.has(region));
}

function pick(
  category: ExerciseCategory,
  count: number,
  level: RunnerLevel,
  pain: PainProfile,
  exclude: readonly string[] = [],
): Exercise[] {
  return EXERCISES.filter(
    (e) => e.category === category && !exclude.includes(e.id) && isSafe(e, level, pain),
  ).slice(0, count);
}

// ---------------------------------------------------------------------------
// Pace helpers
// ---------------------------------------------------------------------------

function formatPace(seconds: number): string {
  const rounded = Math.round(seconds / 5) * 5; // nearest 5 s
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')} /km`;
}

const EFFORT = {
  easy: 'leve — dá para conversar',
  moderate: 'moderado — respiração acelerada, frases curtas',
  hard: 'forte — difícil falar, mas controlado',
} as const;

function target(intensity: keyof typeof EFFORT, recentPace: number | null): string {
  if (recentPace === null) return `Esforço ${EFFORT[intensity]}`;
  const offset = { easy: 45, moderate: 0, hard: -25 }[intensity];
  return `${formatPace(recentPace + offset)} (${EFFORT[intensity].split(' — ')[0]})`;
}

// ---------------------------------------------------------------------------
// Time split
// ---------------------------------------------------------------------------

function splitTime(total: number): { warmup: number; main: number; cooldown: number } {
  const warmup = Math.max(5, Math.round(total * 0.2));
  const cooldown = Math.max(5, Math.round(total * 0.15));
  return { warmup, cooldown, main: total - warmup - cooldown };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function mobilityBlock(
  phase: 'warmup' | 'cooldown',
  minutes: number,
  level: RunnerLevel,
  pain: PainProfile,
  canRun: boolean,
): WorkoutBlock {
  const items: WorkoutItem[] = [];
  if (phase === 'warmup') {
    const drills = pick('mobility', 4, level, pain, [
      'hamstring_stretch',
      'quad_stretch',
      'calf_stretch',
      'breathing',
    ]);
    const perDrill = canRun ? 1 : Math.max(1, Math.floor(minutes / drills.length));
    drills.forEach((d) => items.push({ name: d.name, detail: d.cue, durationMin: perDrill }));
    const used = perDrill * drills.length;
    if (canRun && minutes - used > 0) {
      items.push({
        name: 'Trote leve',
        detail: 'Aumente o ritmo aos poucos.',
        durationMin: minutes - used,
        target: `Esforço ${EFFORT.easy}`,
      });
    }
  } else {
    if (canRun) {
      items.push({
        name: 'Trote ou caminhada',
        detail: 'Reduza o ritmo até a respiração normalizar.',
        durationMin: Math.min(3, minutes - 2),
      });
    }
    const stretches = pick('mobility', 3, level, pain, [
      'hip_circles',
      'leg_swings',
      'ankle_mobility',
      'march',
    ]);
    const remaining = minutes - (items[0]?.durationMin ?? 0);
    const per = Math.max(1, Math.floor(remaining / Math.max(1, stretches.length)));
    stretches.forEach((s) => items.push({ name: s.name, detail: s.cue, durationMin: per }));
  }
  return {
    phase,
    title: phase === 'warmup' ? 'Aquecimento' : 'Desaquecimento',
    minutes,
    items,
  };
}

function runningIntervals(minutes: number, request: WorkoutRequest): WorkoutItem[] {
  const pace = request.recentPaceSPerKm;
  if (request.level === 'beginner') {
    const reps = Math.max(3, Math.floor(minutes / 3));
    return [
      {
        name: 'Intervalado corrida/caminhada',
        detail: '1 min correndo mais rápido + 2 min caminhando.',
        sets: reps,
        reps: '1 min',
        restS: 120,
        target: target('moderate', pace),
      },
    ];
  }
  const reps = Math.max(3, Math.floor(minutes / 5));
  return [
    {
      name: 'Tiros de 3 minutos',
      detail: '3 min forte + 2 min trote leve de recuperação.',
      sets: reps,
      reps: '3 min',
      restS: 120,
      target: target('hard', pace),
    },
  ];
}

function enduranceRun(minutes: number, request: WorkoutRequest): WorkoutItem[] {
  if (request.level === 'beginner') {
    const cycles = Math.max(2, Math.floor(minutes / 5));
    return [
      {
        name: 'Corrida contínua com pausas',
        detail: '4 min de corrida leve + 1 min de caminhada.',
        sets: cycles,
        reps: '4 min + 1 min',
        target: target('easy', request.recentPaceSPerKm),
      },
    ];
  }
  return [
    {
      name: 'Corrida contínua (rodagem)',
      detail: 'Ritmo constante e confortável — base aeróbica.',
      durationMin: minutes,
      target: target('easy', request.recentPaceSPerKm),
    },
  ];
}

function strengthCircuit(
  minutes: number,
  level: RunnerLevel,
  pain: PainProfile,
  emphasis: 'runner' | 'recovery',
): WorkoutItem[] {
  const strength = pick('strength', emphasis === 'recovery' ? 3 : 4, level, pain);
  const core = pick('core', 2, level, pain);
  const exercises = [...strength, ...core];
  const sets = minutes >= 30 ? 3 : 2;
  const baseReps = level === 'beginner' ? 10 : 14;

  return exercises.map((exercise) => {
    const mild = exercise.loads.some((r) => pain.caution.has(r));
    const isometric = exercise.id.includes('plank') || exercise.id === 'wall_sit';
    const reps = isometric
      ? `${level === 'beginner' ? 20 : 40} s`
      : String(Math.round(baseReps * (mild ? 0.7 : 1)));
    return {
      name: exercise.name,
      detail: mild ? `${exercise.cue} Vá com calma: você relatou desconforto leve.` : exercise.cue,
      sets,
      reps,
      restS: level === 'beginner' ? 60 : 45,
    };
  });
}

function lowImpactCardio(minutes: number, pain: PainProfile): WorkoutItem[] {
  const option = pick('cardio', 3, 'beginner', pain)[0];
  if (!option) return [];
  return [
    {
      name: option.name,
      detail: `${option.cue} Substitui a corrida enquanto a dor não melhora.`,
      durationMin: minutes,
      target: `Esforço ${EFFORT.easy}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const GOAL_TITLES: Record<WorkoutGoal, string> = {
  pace: 'Treino para melhorar o pace',
  endurance: 'Treino de resistência',
  strength: 'Fortalecimento para corredores',
};

export const BASE_SAFETY_NOTES = [
  'Este treino foi gerado automaticamente e não substitui a orientação de um profissional de Educação Física ou de um médico.',
  'Pare imediatamente se sentir dor aguda, tontura, falta de ar fora do normal ou dor no peito.',
];

export function generateWorkout(request: WorkoutRequest): WorkoutPlan {
  const pain = analyzePains(request.pains);
  const time = splitTime(request.durationMin);
  const adaptations: string[] = [];
  const safetyNotes = [...BASE_SAFETY_NOTES];

  // Running is allowed only without moderate/severe leg pain.
  const severeLeg = pain.lowerLimbMax >= 7;
  const moderateLeg = pain.lowerLimbMax >= 4 && !severeLeg;
  const mildLeg = pain.lowerLimbMax >= 1 && pain.lowerLimbMax < 4;
  const canRun = !severeLeg && !moderateLeg;

  let goal = request.goal;
  let main: WorkoutItem[];
  let mainTitle: string;

  if (severeLeg) {
    goal = 'strength';
    mainTitle = 'Recuperação ativa';
    main = [
      ...strengthCircuit(Math.round(time.main * 0.6), request.level, pain, 'recovery'),
      ...lowImpactCardio(Math.round(time.main * 0.4), pain),
    ];
    adaptations.push(
      'Corrida suspensa: você marcou dor forte em pernas ou pés. O treino virou recuperação ativa sem impacto.',
    );
    safetyNotes.push(
      'Dor forte merece avaliação: procure um médico ou fisioterapeuta antes de voltar a correr.',
    );
  } else if (moderateLeg && request.goal !== 'strength') {
    mainTitle = 'Cardio de baixo impacto';
    main = lowImpactCardio(time.main, pain);
    adaptations.push(
      'Sem tiros nem corrida forte: com dor moderada nas pernas, trocamos por cardio de baixo impacto.',
    );
  } else if (goal === 'pace') {
    mainTitle = 'Parte principal — velocidade';
    main = runningIntervals(time.main, request);
  } else if (goal === 'endurance') {
    mainTitle = 'Parte principal — resistência';
    main = enduranceRun(time.main, request);
  } else {
    mainTitle = 'Circuito de força';
    main = strengthCircuit(time.main, request.level, pain, 'runner');
  }

  if (mildLeg && canRun && goal !== 'strength') {
    adaptations.push(
      'Desconforto leve nas pernas: mantenha o ritmo confortável e reduza o volume se a dor aumentar.',
    );
  }

  const avoided = request.pains
    .filter((p) => painLevel(p.intensity) !== 'mild')
    .map((p) => describeRegion(p.region, p.side));
  if (avoided.length > 0) {
    adaptations.push(`Exercícios que sobrecarregam ${avoided.join(', ')} foram retirados.`);
  }
  if (pain.avoid.size > 0 || pain.lowerLimbMax > 0) {
    adaptations.push('Exercícios de salto (pliometria) foram retirados enquanto houver dor.');
  }

  return {
    title: severeLeg ? 'Recuperação ativa' : GOAL_TITLES[goal],
    summary: `${request.durationMin} min · nível ${request.level === 'beginner' ? 'iniciante' : 'intermediário'}${
      request.pains.length > 0 ? ' · adaptado às suas dores' : ''
    }`,
    totalMinutes: request.durationMin,
    blocks: [
      mobilityBlock('warmup', time.warmup, request.level, pain, canRun),
      { phase: 'main', title: mainTitle, minutes: time.main, items: main },
      mobilityBlock('cooldown', time.cooldown, request.level, pain, canRun),
    ],
    adaptations,
    safetyNotes,
  };
}
