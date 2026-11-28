import { RUNNER_GOALS } from '../../types/profile';

import { suggestionsForGoal } from '../goal-suggestions';
import { TRAINING_LEVELS } from '../workout-generator';

test('every goal and level gets distinct suggestions', () => {
  for (const goal of RUNNER_GOALS) {
    for (const level of TRAINING_LEVELS) {
      const list = suggestionsForGoal(goal, level);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(new Set(list.map((s) => s.type)).size).toBe(list.length);
    }
  }
});

test('beginners trying to improve pace get fartlek instead of intervals', () => {
  const types = suggestionsForGoal('improve_pace', 'beginner').map((s) => s.type);
  expect(types).toContain('fartlek');
  expect(types).not.toContain('intervals');
  expect(suggestionsForGoal('improve_pace', 'advanced').map((s) => s.type)).toContain('intervals');
});

test('long runs grow with the level', () => {
  const long = (level: 'beginner' | 'advanced') =>
    suggestionsForGoal('increase_endurance', level).find((s) => s.type === 'long')?.durationMin;
  expect(long('beginner')).toBe(60);
  expect(long('advanced')).toBe(90);
});

test('beginners on a 5 km goal do not repeat the easy run', () => {
  const types = suggestionsForGoal('complete_5k', 'beginner').map((s) => s.type);
  expect(types).toEqual(['easy', 'fartlek']);
});
