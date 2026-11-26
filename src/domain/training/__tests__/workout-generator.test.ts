import type { PainEntry } from '../../health/body-regions';
import { adjustForPain } from '../pain-load';
import {
  BASE_SAFETY_NOTES,
  generateWorkout,
  RUN_WORKOUT_TYPES,
  TRAINING_LEVELS,
  WORKOUT_DURATIONS,
  type WorkoutPlan,
  type WorkoutRequest,
} from '../workout-generator';

const base: WorkoutRequest = {
  type: 'intervals',
  level: 'intermediate',
  durationMin: 45,
  pains: [],
  recentPaceSPerKm: 330, // 5:30 /km
};

const pain = (region: PainEntry['region'], intensity: number): PainEntry => ({
  region,
  side: 'left',
  intensity,
});

const main = (plan: WorkoutPlan) => plan.blocks.find((b) => b.phase === 'main')!;

describe('generateWorkout', () => {
  it.each(
    RUN_WORKOUT_TYPES.flatMap((type) =>
      TRAINING_LEVELS.flatMap((level) => WORKOUT_DURATIONS.map((d) => [type, level, d] as const)),
    ),
  )(
    '%s / %s / %i min is a running session close to the requested time',
    (type, level, durationMin) => {
      const plan = generateWorkout({ ...base, type, level, durationMin });
      expect(plan.blocks.map((b) => b.phase)).toEqual(['warmup', 'main', 'cooldown']);
      expect(plan.totalMinutes).toBe(plan.blocks.reduce((sum, b) => sum + b.minutes, 0));
      // Rep counts are whole numbers, so allow some slack around the requested time.
      expect(plan.totalMinutes).toBeGreaterThanOrEqual(durationMin * 0.6);
      expect(plan.totalMinutes).toBeLessThanOrEqual(durationMin * 1.3 + 5);
      expect(main(plan).items.length).toBeGreaterThan(0);
      expect(plan.safetyNotes).toEqual(expect.arrayContaining(BASE_SAFETY_NOTES));
    },
  );

  it('prescribes 200 m reps with 1:30 walking rest for beginners', () => {
    const plan = generateWorkout({ ...base, level: 'beginner', durationMin: 30 });
    const item = main(plan).items[0]!;
    expect(plan.title).toBe('Tiros de 200 m');
    expect(item).toMatchObject({ reps: '200 m', restS: 90 });
    expect(item.sets).toBeGreaterThanOrEqual(4);
    expect(item.detail).toMatch(/Recupere 1:30 caminhando/);
    // 5:30 - 55 s = 4:35 /km → 200 m in ≈ 0:55
    expect(item.target).toBe('4:35 /km · ≈ 0:55 por tiro (forte)');
  });

  it('uses 400 m reps for short intermediate sessions and 1 km reps for long ones', () => {
    expect(generateWorkout({ ...base, durationMin: 45 }).title).toBe('Tiros de 400 m');
    expect(generateWorkout({ ...base, durationMin: 60 }).title).toBe('Tiros de 1 km');
  });

  it('builds a fartlek with strong and easy stretches', () => {
    const item = main(generateWorkout({ ...base, type: 'fartlek' })).items[0]!;
    expect(item.reps).toBe('2 min forte + 1 min leve');
    expect(item.target).toMatch(/^Forte: 5:00 \/km .* · leve: 6:10 \/km/);
  });

  it('turns a short long run into an easy run', () => {
    expect(generateWorkout({ ...base, type: 'long', durationMin: 30 }).sessionType).toBe('easy');
    expect(generateWorkout({ ...base, type: 'long', durationMin: 90 }).sessionType).toBe('long');
  });

  it('uses perceived effort without recent runs', () => {
    const plan = generateWorkout({ ...base, type: 'tempo', recentPaceSPerKm: null });
    expect(main(plan).items[0]!.target).toMatch(/^Esforço confortavelmente forte/);
    expect(plan.safetyNotes.join(' ')).toMatch(/esforço percebido/);
  });
});

describe('pain lowers the running load', () => {
  it('mild calf pain swaps hills for a flat session and trims volume', () => {
    const plan = generateWorkout({ ...base, type: 'hills', pains: [pain('calf', 3)] });
    expect(plan.sessionType).not.toBe('hills');
    expect(plan.loadReductionPct).toBe(15);
    expect(plan.adaptations.join(' ')).toMatch(/terreno plano/);
    expect(plan.adaptations.join(' ')).toMatch(/Panturrilha esquerda \(leve\)/);
  });

  it('mild hamstring pain removes sprints but keeps quality work', () => {
    const load = adjustForPain('intervals', [pain('hamstring', 3)]);
    expect(load.type).toBe('tempo');
    expect(load.maxIntensity).toBe('threshold');
  });

  it('moderate knee pain allows only short, easy, flat running', () => {
    const plan = generateWorkout({ ...base, type: 'intervals', pains: [pain('knee', 6)] });
    expect(['easy', 'recovery']).toContain(plan.sessionType);
    expect(plan.loadReductionPct).toBe(40);
    expect(plan.adaptations.join(' ')).toMatch(/trocado por/);
    expect(plan.blocks.flatMap((b) => b.items).some((i) => /forte/.test(i.target ?? ''))).toBe(
      false,
    );
  });

  it('fewer reps with pain than without', () => {
    const healthy = main(generateWorkout({ ...base, type: 'tempo' })).items[0]!.sets!;
    const sore = main(generateWorkout({ ...base, type: 'tempo', pains: [pain('knee', 2)] }))
      .items[0]!.sets!;
    expect(sore).toBeLessThan(healthy);
  });

  it('severe leg pain suspends running', () => {
    const plan = generateWorkout({ ...base, pains: [pain('achilles', 9)] });
    expect(plan.sessionType).toBe('rest');
    expect(plan.title).toBe('Recuperação: sem corrida hoje');
    expect(plan.safetyNotes.join(' ')).toMatch(/médico ou fisioterapeuta/);
  });

  it('chest pain means no training at all', () => {
    const plan = generateWorkout({
      ...base,
      pains: [{ region: 'chest', side: 'center', intensity: 6 }],
    });
    expect(plan.title).toBe('Sem treino hoje');
    expect(plan.blocks).toEqual([]);
    expect(plan.adaptations[0]).toMatch(/atendimento médico/);
  });

  it('upper-body pain keeps the session', () => {
    const load = adjustForPain('intervals', [pain('shoulder', 6)]);
    expect(load).toMatchObject({ type: 'intervals', volumeFactor: 1 });
  });

  it('severe upper-body pain caps the intensity', () => {
    const load = adjustForPain('intervals', [pain('shoulder', 9)]);
    expect(load.maxIntensity).toBe('moderate');
  });
});

describe('advanced level', () => {
  const adv = { ...base, level: 'advanced' as const };

  it('prescribes VO2max 1 km reps with heart-rate zones', () => {
    const plan = generateWorkout({ ...adv, durationMin: 60 });
    const item = main(plan).items[0]!;
    expect(plan.title).toBe('Tiros de 1 km (VO2máx)');
    expect(item).toMatchObject({ reps: '1 km', restS: 150 });
    // 5:30 - 40 s = 4:50 /km
    expect(item.target).toBe('4:50 /km · ≈ 4:50 por tiro (forte) · Z5');
    expect(plan.safetyNotes.join(' ')).toMatch(/Zonas de frequência cardíaca/);
  });

  it('runs a continuous tempo run and finishes long runs stronger', () => {
    expect(main(generateWorkout({ ...adv, type: 'tempo' })).items[0]!.name).toBe(
      'Tempo run contínuo',
    );
    const long = main(generateWorkout({ ...adv, type: 'long', durationMin: 90 }));
    expect(long.items.map((i) => i.name)).toEqual(['Longão', 'Final em ritmo forte']);
    expect(long.items[1]!.target).toMatch(/Z3$/);
  });

  it('only advanced runners get heart-rate zones', () => {
    const plan = generateWorkout({ ...base, type: 'easy' });
    expect(main(plan).items[0]!.target).not.toMatch(/Z\d/);
  });
});

describe('custom goal ("Outro")', () => {
  it('builds the session the text asks for', () => {
    const plan = generateWorkout({ ...base, type: 'custom', customGoal: 'Foco em subida' });
    expect(plan.sessionType).toBe('hills');
    expect(plan.adaptations[0]).toBe(
      'Seu objetivo “Foco em subida” foi lido como: treino de subidas.',
    );
  });

  it('anchors paces on the race goal', () => {
    const plan = generateWorkout({
      ...base,
      type: 'custom',
      customGoal: 'Preparação para 10 km em 45 min',
    });
    expect(plan.sessionType).toBe('tempo');
    expect(plan.adaptations.join(' ')).toMatch(/Pace de prova: 4:30 \/km \(10 km\)/);
    // Threshold target = race pace.
    expect(main(plan).items[0]!.target).toMatch(/^4:30 \/km/);
  });

  it('explains when the text is not understood', () => {
    const plan = generateWorkout({ ...base, type: 'custom', customGoal: 'algo diferente' });
    expect(plan.sessionType).toBe('easy');
    expect(plan.adaptations[0]).toMatch(/Não reconhecemos/);
  });
});

describe('post-workout check-in feedback', () => {
  it('lowers the load one more level where the last workout left discomfort', () => {
    const withoutFeedback = generateWorkout({ ...base, pains: [pain('knee', 3)] });
    const withDiscomfort = generateWorkout({
      ...base,
      pains: [pain('knee', 3)],
      discomfortRegions: ['knee'],
    });
    expect(withoutFeedback.loadReductionPct).toBe(15);
    expect(withDiscomfort.loadReductionPct).toBe(40);
    expect(withDiscomfort.adaptations.join(' ')).toMatch(
      /desconforto após o último treino \(Joelho esquerdo\)/,
    );
  });
});
