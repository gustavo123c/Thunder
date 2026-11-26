/**
 * Rule-based running workout generator: intervals, fartlek, threshold, hills,
 * progression, easy, long and recovery runs. Deterministic and offline; the output
 * shape is the one a future AI generator must return.
 *
 * Target paces come from the runner's recent average pace (P, s/km):
 *   recovery P+75 · easy P+40 · long P+50 · moderate P+15 · threshold P-15 ·
 *   1 km reps P-30 · 400 m reps P-45 · 200 m reps P-55.
 *   VO2max reps (advanced) P-40.
 * Without recent runs, targets are given as perceived effort. Advanced runners also
 * get heart-rate zones (Z1–Z5).
 * Pain on the body map reduces the load (see pain-load.ts); a free-text goal ("Outro")
 * is read by custom-goal.ts.
 */
import type { BodyRegion, PainEntry } from '../health/body-regions';
import { interpretCustomGoal } from './custom-goal';
import {
  adjustForPain,
  type Intensity,
  INTENSITY_ORDER,
  type LoadAdjustment,
  RUN_WORKOUT_TYPES,
  type RunWorkoutType,
} from './pain-load';

export { RUN_WORKOUT_TYPES, type RunWorkoutType };

export const WORKOUT_DURATIONS = [20, 30, 45, 60, 90] as const;
export type WorkoutDuration = (typeof WORKOUT_DURATIONS)[number];

export const TRAINING_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

export type WorkoutRequest = {
  /** 'custom' = "Outro": the session is read from `customGoal`. */
  type: RunWorkoutType | 'custom';
  level: TrainingLevel;
  durationMin: WorkoutDuration;
  pains: readonly PainEntry[];
  /** Recent average pace (s/km); null = targets by perceived effort. */
  recentPaceSPerKm: number | null;
  /** Free text typed under "Outro". */
  customGoal?: string;
  /** Regions where the last workout left the runner uncomfortable (check-in feedback). */
  discomfortRegions?: readonly BodyRegion[];
};

export type WorkoutPhase = 'warmup' | 'main' | 'cooldown';

export type WorkoutItem = {
  name: string;
  detail: string;
  durationMin?: number;
  sets?: number;
  reps?: string; // "400 m", "1 min forte + 2 min leve"
  restS?: number;
  /** "4:30 /km · ≈ 1:48 por tiro" or an effort description. */
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
  /** Session prescribed (absent in plans saved before running sessions existed). */
  sessionType?: RunWorkoutType | 'rest';
  /** Main-set volume cut because of pain, in percent (0 = none). */
  loadReductionPct?: number;
};

// ---------------------------------------------------------------------------
// Paces and efforts
// ---------------------------------------------------------------------------

type Zone =
  'recovery' | 'easy' | 'long' | 'moderate' | 'threshold' | 'vo2' | 'rep1k' | 'rep400' | 'rep200';

const ZONE_OFFSET: Record<Zone, number> = {
  recovery: 75,
  easy: 40,
  long: 50,
  moderate: 15,
  threshold: -15,
  vo2: -40,
  rep1k: -30,
  rep400: -45,
  rep200: -55,
};

const ZONE_INTENSITY: Record<Zone, Intensity> = {
  recovery: 'recovery',
  easy: 'easy',
  long: 'easy',
  moderate: 'moderate',
  threshold: 'threshold',
  vo2: 'hard',
  rep1k: 'hard',
  rep400: 'hard',
  rep200: 'hard',
};

const EFFORT: Record<Intensity, string> = {
  recovery: 'muito leve — conversa fácil (3/10)',
  easy: 'leve — dá para conversar (4/10)',
  moderate: 'moderado — frases curtas (6/10)',
  threshold: 'confortavelmente forte (7/10)',
  hard: 'forte — difícil falar (8–9/10)',
};

/** Typical recent pace when the runner has no data (only for time estimates). */
const DEFAULT_PACE: Record<TrainingLevel, number> = {
  beginner: 420,
  intermediate: 345,
  advanced: 300,
};

/** Heart-rate zones shown to advanced runners (≈ % of max heart rate). */
const HR_ZONE: Record<Intensity, string> = {
  recovery: 'Z1',
  easy: 'Z2',
  moderate: 'Z3',
  threshold: 'Z4',
  hard: 'Z5',
};

export const HR_ZONES_NOTE =
  'Zonas de frequência cardíaca (aprox., % da FC máxima): Z1 50–60% · Z2 60–70% · Z3 70–80% · Z4 80–90% · Z5 90–100%. Use um relógio ou cinta com FC.';

const INTENSITY_ZONE: Record<Intensity, Zone> = {
  recovery: 'recovery',
  easy: 'easy',
  moderate: 'moderate',
  threshold: 'threshold',
  hard: 'rep400',
};

function formatPace(seconds: number): string {
  const rounded = Math.round(seconds / 5) * 5; // nearest 5 s
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

function formatClock(seconds: number): string {
  const rounded = Math.round(seconds / 5) * 5;
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

type Context = {
  level: TrainingLevel;
  recentPace: number | null;
  load: LoadAdjustment;
};

/** Caps a zone at the session's maximum intensity. */
function capped(zone: Zone, ctx: Context): Zone {
  const limit = INTENSITY_ORDER.indexOf(ctx.load.maxIntensity);
  return INTENSITY_ORDER.indexOf(ZONE_INTENSITY[zone]) > limit
    ? INTENSITY_ZONE[ctx.load.maxIntensity]
    : zone;
}

function paceFor(zone: Zone, ctx: Context): number {
  return (ctx.recentPace ?? DEFAULT_PACE[ctx.level]) + ZONE_OFFSET[capped(zone, ctx)];
}

/** "4:30 /km (forte)" or the effort description when there's no recent pace. */
function target(zone: Zone, ctx: Context, repDistanceM?: number): string {
  const effective = capped(zone, ctx);
  const intensity = ZONE_INTENSITY[effective];
  const effort = EFFORT[intensity];
  const hr = ctx.level === 'advanced' ? ` · ${HR_ZONE[intensity]}` : '';
  if (ctx.recentPace === null) return `Esforço ${effort}${hr}`;
  const pace = paceFor(effective, ctx);
  const perRep = repDistanceM ? ` · ≈ ${formatClock((pace * repDistanceM) / 1000)} por tiro` : '';
  return `${formatPace(pace)} /km${perRep} (${effort.split(' — ')[0]!.split(' (')[0]})${hr}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const fmtRest = (s: number) => (s >= 60 ? `${formatClock(s)}` : `${s} s`);

// ---------------------------------------------------------------------------
// Main sets — each returns items and the minutes they take
// ---------------------------------------------------------------------------

type MainSet = { title: string; items: WorkoutItem[]; minutes: number };

function repeats(
  ctx: Context,
  budgetMin: number,
  opts: {
    name: string;
    distanceM: number;
    zone: Zone;
    restS: number;
    restHow: string;
    min: number;
    max: number;
    detail: string;
  },
): MainSet {
  const repS = (paceFor(opts.zone, ctx) * opts.distanceM) / 1000;
  const fit = Math.floor((budgetMin * 60 * ctx.load.volumeFactor) / (repS + opts.restS));
  const sets = clamp(fit, Math.min(opts.min, Math.max(3, fit)), opts.max);
  return {
    title: opts.name,
    minutes: Math.round((sets * (repS + opts.restS)) / 60),
    items: [
      {
        name: opts.name,
        detail: `${opts.detail} Recupere ${fmtRest(opts.restS)} ${opts.restHow} entre as repetições.`,
        sets,
        reps: opts.distanceM >= 1000 ? `${opts.distanceM / 1000} km` : `${opts.distanceM} m`,
        restS: opts.restS,
        target: target(opts.zone, ctx, opts.distanceM),
      },
    ],
  };
}

function cycles(
  ctx: Context,
  budgetMin: number,
  opts: {
    name: string;
    title: string;
    workMin: number;
    easyMin: number;
    work: Zone;
    easy: Zone;
    workLabel: string;
    easyLabel: string;
    detail: string;
    min: number;
    max: number;
  },
): MainSet {
  const per = opts.workMin + opts.easyMin;
  const fit = Math.floor((budgetMin * ctx.load.volumeFactor) / per);
  const sets = clamp(fit, Math.min(opts.min, Math.max(2, fit)), opts.max);
  const fmt = (m: number) => (m < 1 ? `${m * 60} s` : `${m} min`);
  return {
    title: opts.title,
    minutes: Math.round(sets * per),
    items: [
      {
        name: opts.name,
        detail: opts.detail,
        sets,
        reps: `${fmt(opts.workMin)} ${opts.workLabel} + ${fmt(opts.easyMin)} ${opts.easyLabel}`,
        target: `${opts.workLabel[0]!.toUpperCase()}${opts.workLabel.slice(1)}: ${target(opts.work, ctx)} · ${opts.easyLabel}: ${target(opts.easy, ctx)}`,
      },
    ],
  };
}

function continuous(
  ctx: Context,
  budgetMin: number,
  name: string,
  title: string,
  zone: Zone,
  detail: string,
): MainSet {
  const minutes = Math.max(10, Math.round(budgetMin * ctx.load.volumeFactor));
  return {
    title,
    minutes,
    items: [{ name, detail, durationMin: minutes, target: target(zone, ctx) }],
  };
}

function intervals(ctx: Context, budget: number): MainSet {
  if (ctx.level === 'beginner' || budget <= 15) {
    return repeats(ctx, budget, {
      name: 'Tiros de 200 m',
      distanceM: 200,
      zone: 'rep200',
      restS: 90,
      restHow: 'caminhando',
      min: 4,
      max: 10,
      detail: 'Corra 200 m forte, com passadas soltas e braços ativos.',
    });
  }
  if (ctx.level === 'advanced' && !ctx.load.noSpeed) {
    if (budget <= 25) {
      return repeats(ctx, budget, {
        name: 'Tiros de 400 m (VO2máx)',
        distanceM: 400,
        zone: 'rep400',
        restS: 60,
        restHow: 'trotando',
        min: 8,
        max: 12,
        detail: 'Corra 400 m bem forte, com recuperação curta para manter o coração alto.',
      });
    }
    return repeats(ctx, budget, {
      name: 'Tiros de 1 km (VO2máx)',
      distanceM: 1000,
      zone: 'vo2',
      restS: 150,
      restHow: 'trotando',
      min: 4,
      max: 6,
      detail: 'Ritmo de 3 a 5 km de prova. Mantenha todos os tiros iguais.',
    });
  }
  if (budget <= 30) {
    return repeats(ctx, budget, {
      name: 'Tiros de 400 m',
      distanceM: 400,
      zone: 'rep400',
      restS: 90,
      restHow: 'trotando',
      min: 5,
      max: 10,
      detail: 'Corra 400 m forte e mantenha todos os tiros no mesmo ritmo.',
    });
  }
  return repeats(ctx, budget, {
    name: 'Tiros de 1 km',
    distanceM: 1000,
    zone: 'rep1k',
    restS: 120,
    restHow: 'trotando',
    min: 3,
    max: 6,
    detail: 'Corra 1 km forte e controlado — o último deve sair igual ao primeiro.',
  });
}

function fartlek(ctx: Context, budget: number): MainSet {
  const beginner = ctx.level === 'beginner';
  const advanced = ctx.level === 'advanced';
  const workMin = beginner ? 1 : advanced ? 3 : 2;
  const easyMin = beginner ? 2 : 1;
  return cycles(ctx, budget, {
    name: `Fartlek ${workMin} min / ${easyMin} min`,
    title: 'Fartlek',
    workMin,
    easyMin,
    work: 'rep1k',
    easy: 'easy',
    workLabel: 'forte',
    easyLabel: 'leve',
    detail:
      'Alterne trechos fortes e leves sem parar de correr. Use o relógio ou referências do caminho (postes, esquinas).',
    min: 4,
    max: 15,
  });
}

function tempo(ctx: Context, budget: number): MainSet {
  if (ctx.level === 'beginner') {
    return cycles(ctx, budget, {
      name: 'Blocos de limiar',
      title: 'Limiar',
      workMin: 4,
      easyMin: 2,
      work: 'threshold',
      easy: 'easy',
      workLabel: 'limiar',
      easyLabel: 'trote',
      detail: 'Ritmo "confortavelmente forte": dá para falar poucas palavras.',
      min: 2,
      max: 6,
    });
  }
  if (ctx.level === 'advanced') {
    const minutes = clamp(Math.round(budget * 0.75 * ctx.load.volumeFactor), 12, 40);
    return {
      title: 'Tempo run',
      minutes,
      items: [
        {
          name: 'Tempo run contínuo',
          detail: 'Ritmo de limiar sustentado: forte, mas controlado do primeiro ao último minuto.',
          durationMin: minutes,
          target: target('threshold', ctx),
        },
      ],
    };
  }
  return repeats(ctx, budget, {
    name: 'Repetições de 600 m no limiar',
    distanceM: 600,
    zone: 'threshold',
    restS: 90,
    restHow: 'trotando',
    min: 4,
    max: 8,
    detail: 'Ritmo "confortavelmente forte", constante do início ao fim.',
  });
}

function hills(ctx: Context, budget: number): MainSet {
  const beginner = ctx.level === 'beginner';
  const upS = beginner ? 30 : ctx.level === 'advanced' ? 90 : 60;
  const downS = beginner ? 90 : ctx.level === 'advanced' ? 150 : 120;
  const fit = Math.floor((budget * 60 * ctx.load.volumeFactor) / (upS + downS));
  const sets = clamp(fit, Math.min(4, Math.max(3, fit)), beginner ? 8 : 10);
  return {
    title: 'Subidas',
    minutes: Math.round((sets * (upS + downS)) / 60),
    items: [
      {
        name: `Subidas de ${upS} s`,
        detail: `Suba ${upS} s forte numa ladeira moderada, com passadas curtas e tronco levemente à frente. Desça ${beginner ? 'caminhando' : 'trotando'} para recuperar.`,
        sets,
        reps: `${upS} s`,
        restS: downS,
        target: `Esforço ${EFFORT[ZONE_INTENSITY[capped('rep1k', ctx)]]}${
          ctx.level === 'advanced' ? ` · ${HR_ZONE[ZONE_INTENSITY[capped('rep1k', ctx)]]}` : ''
        }`,
      },
    ],
  };
}

function progressive(ctx: Context, budget: number): MainSet {
  const minutes = Math.max(12, Math.round(budget * ctx.load.volumeFactor));
  const zones: Zone[] =
    ctx.level === 'beginner' ? ['easy', 'moderate'] : ['easy', 'moderate', 'threshold'];
  const each = Math.round(minutes / zones.length);
  const names = ['Início leve', 'Meio moderado', 'Final forte e controlado'];
  return {
    title: 'Progressivo',
    minutes: each * zones.length,
    items: zones.map((zone, i) => ({
      name: names[i]!,
      detail:
        i === 0 ? 'Comece devagar, soltando o corpo.' : 'Acelere um pouco sem perder o controle.',
      durationMin: each,
      target: target(zone, ctx),
    })),
  };
}

function easy(ctx: Context, budget: number): MainSet {
  if (ctx.level === 'beginner') {
    return cycles(ctx, budget, {
      name: 'Rodagem com caminhada',
      title: 'Rodagem',
      workMin: 4,
      easyMin: 1,
      work: 'easy',
      easy: 'recovery',
      workLabel: 'corrida leve',
      easyLabel: 'caminhada',
      detail: 'Corra leve e caminhe 1 min para recuperar. Respiração sempre confortável.',
      min: 2,
      max: 12,
    });
  }
  return continuous(
    ctx,
    budget,
    'Rodagem contínua',
    'Rodagem',
    'easy',
    'Ritmo constante e confortável — base aeróbica.',
  );
}

function long(ctx: Context, budget: number): MainSet {
  if (ctx.level === 'beginner') {
    return cycles(ctx, budget, {
      name: 'Longão com caminhada',
      title: 'Longão',
      workMin: 8,
      easyMin: 2,
      work: 'long',
      easy: 'recovery',
      workLabel: 'corrida leve',
      easyLabel: 'caminhada',
      detail: 'O mais importante é o tempo em movimento, não a velocidade.',
      min: 2,
      max: 10,
    });
  }
  const base = continuous(
    ctx,
    budget,
    'Longão',
    'Longão',
    'long',
    'Ritmo lento e constante. Hidrate-se a cada 20–30 min se passar de 1 hora.',
  );
  if (ctx.level !== 'advanced' || ctx.load.maxIntensity === 'easy' || base.minutes < 50)
    return base;
  // Advanced: finish the long run at a stronger, race-like effort.
  const finish = Math.round(base.minutes * 0.25);
  return {
    title: 'Longão',
    minutes: base.minutes,
    items: [
      { ...base.items[0]!, durationMin: base.minutes - finish },
      {
        name: 'Final em ritmo forte',
        detail: 'Termine o longão acelerando para um ritmo moderado/forte, sem chegar ao limite.',
        durationMin: finish,
        target: target('moderate', ctx),
      },
    ],
  };
}

function recovery(ctx: Context, budget: number): MainSet {
  if (ctx.level === 'beginner') {
    return cycles(ctx, budget, {
      name: 'Trote regenerativo',
      title: 'Regenerativo',
      workMin: 2,
      easyMin: 1,
      work: 'recovery',
      easy: 'recovery',
      workLabel: 'trote',
      easyLabel: 'caminhada',
      detail: 'Bem leve: o objetivo é soltar a musculatura, não treinar forte.',
      min: 3,
      max: 15,
    });
  }
  return continuous(
    ctx,
    budget,
    'Trote regenerativo',
    'Regenerativo',
    'recovery',
    'Bem leve: o objetivo é soltar a musculatura, não treinar forte.',
  );
}

const MAIN_SETS: Record<RunWorkoutType, (ctx: Context, budget: number) => MainSet> = {
  intervals,
  fartlek,
  tempo,
  hills,
  progressive,
  easy,
  long,
  recovery,
};

export const SESSION_TITLES: Record<RunWorkoutType, string> = {
  intervals: 'Treino de tiros',
  fartlek: 'Fartlek',
  tempo: 'Treino de limiar',
  hills: 'Treino de subidas',
  progressive: 'Progressivo',
  easy: 'Rodagem',
  long: 'Longão',
  recovery: 'Regenerativo',
};

const QUALITY: readonly RunWorkoutType[] = ['intervals', 'fartlek', 'tempo', 'hills'];

// ---------------------------------------------------------------------------
// Warm-up / cool-down
// ---------------------------------------------------------------------------

function warmup(type: RunWorkoutType, ctx: Context, totalMin: number): WorkoutBlock {
  const short = totalMin <= 30;
  if (!QUALITY.includes(type)) {
    return {
      phase: 'warmup',
      title: 'Aquecimento',
      minutes: 5,
      items: [
        {
          name: 'Caminhada rápida + trote bem leve',
          detail: 'Comece caminhando e passe ao trote quando o corpo aquecer.',
          durationMin: 5,
          target: target('recovery', ctx),
        },
      ],
    };
  }
  const items: WorkoutItem[] = [
    {
      name: 'Trote leve',
      detail: 'Aumente o ritmo aos poucos.',
      durationMin: short ? 5 : ctx.level === 'beginner' ? 8 : 10,
      target: target('easy', ctx),
    },
    {
      name: 'Educativos',
      detail:
        'Skipping baixo, anfersen (calcanhar no glúteo) e elevação de joelhos: 2 × 20 m cada.',
      durationMin: short ? 2 : 3,
    },
  ];
  if (!ctx.load.noSpeed && type !== 'tempo' && totalMin > 20) {
    items.push({
      name: 'Acelerações',
      detail: 'Acelere aos poucos até ~80% do esforço e desacelere. Volte caminhando.',
      sets: 3,
      reps: '80 m',
      durationMin: 2,
    });
  }
  return {
    phase: 'warmup',
    title: 'Aquecimento',
    minutes: items.reduce((sum, item) => sum + (item.durationMin ?? 0), 0),
    items,
  };
}

function cooldown(type: RunWorkoutType, totalMin: number): WorkoutBlock {
  const jog = QUALITY.includes(type) && totalMin > 30 ? 5 : 3;
  const stretch = totalMin > 30 ? 3 : 2;
  return {
    phase: 'cooldown',
    title: 'Desaquecimento',
    minutes: jog + stretch,
    items: [
      {
        name: 'Trote leve ou caminhada',
        detail: 'Reduza o ritmo até a respiração normalizar.',
        durationMin: jog,
      },
      {
        name: 'Alongamento leve',
        detail: 'Panturrilha, posterior e frente da coxa: 30 s cada lado, sem forçar.',
        durationMin: stretch,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const BASE_SAFETY_NOTES = [
  'Treino gerado automaticamente: não substitui a orientação de um profissional de Educação Física ou de um médico.',
  'Pare imediatamente se sentir dor aguda, tontura, falta de ar fora do normal ou dor no peito.',
];

function restPlan(request: WorkoutRequest, load: LoadAdjustment): WorkoutPlan {
  const walk = Math.max(10, Math.round(request.durationMin / 2));
  return {
    title: load.stop ? 'Sem treino hoje' : 'Recuperação: sem corrida hoje',
    summary: load.stop ? 'Descanso' : `${walk} min de caminhada leve`,
    totalMinutes: load.stop ? 0 : walk,
    sessionType: 'rest',
    loadReductionPct: 100,
    blocks: load.stop
      ? []
      : [
          {
            phase: 'main',
            title: 'Recuperação ativa',
            minutes: walk,
            items: [
              {
                name: 'Caminhada leve',
                detail:
                  'Só se não doer. Se doer ao caminhar, troque por descanso ou por bicicleta/natação leves.',
                durationMin: walk,
                target: `Esforço ${EFFORT.recovery}`,
              },
            ],
          },
        ],
    adaptations: load.stop
      ? load.notes
      : [
          'Dor forte em pernas, quadril ou lombar: corrida suspensa hoje para não agravar a lesão.',
          ...load.notes,
        ],
    safetyNotes: [
      ...BASE_SAFETY_NOTES,
      'Dor forte merece avaliação: procure um médico ou fisioterapeuta antes de voltar a correr.',
    ],
  };
}

const LEVEL_LABEL: Record<TrainingLevel, string> = {
  beginner: 'iniciante',
  intermediate: 'intermediário',
  advanced: 'avançado',
};

export function generateWorkout(request: WorkoutRequest): WorkoutPlan {
  // "Outro": read the free-text goal (session type and, if any, target race pace).
  const custom = request.type === 'custom' ? interpretCustomGoal(request.customGoal ?? '') : null;
  const requestedType: RunWorkoutType = custom ? custom.type : (request.type as RunWorkoutType);
  // A race goal sets the reference: its pace becomes the threshold target.
  const referencePace =
    custom?.racePaceSPerKm != null ? custom.racePaceSPerKm + 15 : request.recentPaceSPerKm;

  const load = adjustForPain(requestedType, request.pains, request.discomfortRegions ?? []);
  if (load.volumeFactor === 0) return restPlan(request, load);

  // A long run needs time: under 45 min it is just an easy run.
  let type = load.type;
  if (type === 'long' && request.durationMin < 45) type = 'easy';

  const ctx: Context = { level: request.level, recentPace: referencePace, load };
  const warm = warmup(type, ctx, request.durationMin);
  const cool = cooldown(type, request.durationMin);
  const budget = Math.max(8, request.durationMin - warm.minutes - cool.minutes);
  const main = MAIN_SETS[type](ctx, budget);

  // Quality sets are capped (no 20 × 200 m): fill a long session with easy running after them.
  const leftover = budget - main.minutes;
  if (QUALITY.includes(type) && leftover >= 8 && load.volumeFactor === 1) {
    main.items.push({
      name: 'Rodagem leve',
      detail: 'Depois da parte forte, complete o tempo correndo leve.',
      durationMin: leftover,
      target: target('easy', ctx),
    });
    main.minutes += leftover;
  }

  const adaptations: string[] = [];
  if (custom) {
    const goal = (request.customGoal ?? '').trim();
    adaptations.push(
      custom.recognized
        ? `Seu objetivo “${goal}” foi lido como: ${SESSION_TITLES[custom.type].toLowerCase()}.`
        : `Não reconhecemos um tipo de treino em “${goal}”: montamos uma rodagem leve. Tente palavras como tiros, subida, limiar, longão ou “10 km em 50 min”.`,
    );
    if (custom.racePaceSPerKm !== null) {
      adaptations.push(
        `Pace de prova: ${formatPace(custom.racePaceSPerKm)} /km (${custom.raceDistanceKm} km). Os ritmos do treino partem dele.`,
      );
    }
  }
  if (type !== requestedType && load.type === type) {
    adaptations.push(
      `${SESSION_TITLES[requestedType]} trocado por ${SESSION_TITLES[type].toLowerCase()} por causa das dores marcadas.`,
    );
  }
  const reduction = Math.round((1 - load.volumeFactor) * 100);
  if (reduction > 0) adaptations.push(`Volume da parte principal reduzido em ${reduction}%.`);
  if (load.maxIntensity !== 'hard') {
    adaptations.push(`Intensidade máxima: ${EFFORT[load.maxIntensity].split(' (')[0]}.`);
  }
  if (load.flatOnly) adaptations.push('Prefira terreno plano e macio (pista, parque, esteira).');
  adaptations.push(...load.notes);

  const safetyNotes = [...BASE_SAFETY_NOTES];
  if (request.pains.length > 0) {
    safetyNotes.push('Se a dor aumentar durante o treino, reduza para caminhada e encerre.');
  }
  if (request.level === 'advanced') safetyNotes.push(HR_ZONES_NOTE);
  if (referencePace === null) {
    safetyNotes.push(
      'Sem corridas recentes, os ritmos estão por esforço percebido (escala de 0 a 10).',
    );
  }

  const totalMinutes = warm.minutes + main.minutes + cool.minutes;
  const levelLabel = LEVEL_LABEL[request.level];

  return {
    title: type === 'intervals' ? main.title : SESSION_TITLES[type],
    summary: `${totalMinutes} min · nível ${levelLabel}${request.pains.length > 0 ? ' · ajustado às suas dores' : ''}`,
    totalMinutes,
    sessionType: type,
    loadReductionPct: reduction,
    blocks: [
      warm,
      { phase: 'main', title: main.title, minutes: main.minutes, items: main.items },
      cool,
    ],
    adaptations,
    safetyNotes,
  };
}
