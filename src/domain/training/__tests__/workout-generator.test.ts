import type { PainEntry } from '../../health/body-regions';
import { EXERCISES } from '../exercises';
import {
  BASE_SAFETY_NOTES,
  generateWorkout,
  WORKOUT_DURATIONS,
  WORKOUT_GOALS,
  type WorkoutPlan,
  type WorkoutRequest,
} from '../workout-generator';

const base: WorkoutRequest = {
  goal: 'pace',
  level: 'intermediate',
  durationMin: 45,
  pains: [],
  recentPaceSPerKm: 330, // 5:30 /km
};

const allItemNames = (plan: WorkoutPlan) =>
  plan.blocks.flatMap((block) => block.items.map((item) => item.name));

const exerciseNamesLoading = (region: string) =>
  EXERCISES.filter((e) => (e.loads as readonly string[]).includes(region)).map((e) => e.name);

describe('generateWorkout', () => {
  it.each(WORKOUT_GOALS.flatMap((goal) => WORKOUT_DURATIONS.map((d) => [goal, d] as const)))(
    '%s / %i min: warm-up + main + cool-down add up to the requested time',
    (goal, durationMin) => {
      const plan = generateWorkout({ ...base, goal, durationMin });
      expect(plan.blocks.map((b) => b.phase)).toEqual(['warmup', 'main', 'cooldown']);
      expect(plan.blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(durationMin);
      expect(plan.blocks.every((b) => b.items.length > 0)).toBe(true);
    },
  );

  it('always includes the professional-guidance safety notes', () => {
    expect(generateWorkout(base).safetyNotes).toEqual(expect.arrayContaining(BASE_SAFETY_NOTES));
  });

  it('sets target paces from the recent average pace', () => {
    const main = generateWorkout(base).blocks[1]!;
    expect(main.items[0]?.target).toBe('5:05 /km (forte)'); // 5:30 - 25 s
    const easy = generateWorkout({ ...base, goal: 'endurance' }).blocks[1]!;
    expect(easy.items[0]?.target).toBe('6:15 /km (leve)'); // 5:30 + 45 s
  });

  it('uses perceived effort when there is no pace history', () => {
    const plan = generateWorkout({ ...base, recentPaceSPerKm: null });
    expect(plan.blocks[1]?.items[0]?.target).toMatch(/^Esforço forte/);
  });

  it('gives beginners run/walk intervals and no plyometrics or advanced lifts', () => {
    const plan = generateWorkout({ ...base, level: 'beginner' });
    expect(plan.blocks[1]?.items[0]?.name).toBe('Intervalado corrida/caminhada');
    const strength = generateWorkout({ ...base, level: 'beginner', goal: 'strength' });
    expect(allItemNames(strength)).not.toContain('Levantamento terra unilateral');
    expect(allItemNames(strength)).not.toContain('Agachamento com salto');
  });

  it('suspends running and avoids loading a severely painful knee', () => {
    const pains: PainEntry[] = [{ region: 'knee', side: 'left', intensity: 9 }];
    const plan = generateWorkout({ ...base, pains });

    expect(plan.title).toBe('Recuperação ativa');
    const names = allItemNames(plan);
    expect(names.some((n) => /corrida|Tiros|Trote/i.test(n))).toBe(false);
    for (const loaded of exerciseNamesLoading('knee')) expect(names).not.toContain(loaded);
    expect(plan.adaptations[0]).toMatch(/Corrida suspensa/);
    expect(plan.adaptations.join(' ')).toMatch(/Joelho esquerdo/);
    expect(plan.safetyNotes.join(' ')).toMatch(/médico ou fisioterapeuta/);
  });

  it('swaps hard running for low-impact cardio with moderate leg pain', () => {
    const plan = generateWorkout({
      ...base,
      pains: [{ region: 'achilles', side: 'right', intensity: 5 }],
    });
    const main = plan.blocks[1]!;
    expect(main.title).toBe('Cardio de baixo impacto');
    expect(main.items[0]?.name).not.toMatch(/corrida|tiros/i);
    expect(allItemNames(plan)).not.toContain('Elevação de panturrilha');
  });

  it('keeps running with mild pain but adds a caution', () => {
    const plan = generateWorkout({
      ...base,
      pains: [{ region: 'calf', side: 'left', intensity: 2 }],
    });
    expect(plan.blocks[1]?.title).toBe('Parte principal — velocidade');
    expect(plan.adaptations.join(' ')).toMatch(/Desconforto leve/);
  });

  it('removes upper-body exercises that load a painful shoulder', () => {
    const plan = generateWorkout({
      ...base,
      goal: 'strength',
      pains: [{ region: 'shoulder', side: 'right', intensity: 6 }],
    });
    const names = allItemNames(plan);
    expect(names).not.toContain('Prancha');
    expect(names).not.toContain('Flexão de braços');
    expect(names).toContain('Dead bug');
  });

  it('reduces reps for exercises near a mildly painful region', () => {
    const normal = generateWorkout({ ...base, goal: 'strength' });
    const mild = generateWorkout({
      ...base,
      goal: 'strength',
      pains: [{ region: 'glute', side: 'left', intensity: 2 }],
    });
    const bridge = (plan: WorkoutPlan) =>
      plan.blocks[1]!.items.find((i) => i.name === 'Ponte de glúteo');
    expect(Number(bridge(mild)?.reps)).toBeLessThan(Number(bridge(normal)?.reps));
    expect(bridge(mild)?.detail).toMatch(/desconforto leve/);
  });
});
