import { interpretCustomGoal } from '../custom-goal';

describe('interpretCustomGoal', () => {
  it.each([
    ['Foco em subida', 'hills'],
    ['Treino regenerativo pós-prova', 'recovery'],
    ['Quero melhorar minha velocidade com tiros', 'intervals'],
    ['Fartlek no parque', 'fartlek'],
    ['Preparação para meia maratona', 'long'],
    ['Treino de LIMIAR', 'tempo'],
    ['Corrida progressiva', 'progressive'],
    ['Só uma rodagem leve', 'easy'],
  ] as const)('"%s" → %s', (text, type) => {
    expect(interpretCustomGoal(text)).toMatchObject({ type, recognized: true });
  });

  it.each([
    ['Preparação para prova de 10km em 45 min', 270, 10],
    ['5k em 25min', 300, 5],
    ['5 km em 25:30', 306, 5],
    ['21 km em 1h50', 314, 21],
    ['10 km em 1:05:00', 390, 10],
    ['21,1 km em 1:50', 313, 21.1],
  ])('reads the race pace in "%s"', (text, pace, distance) => {
    const goal = interpretCustomGoal(text);
    expect(goal.racePaceSPerKm).toBe(pace);
    expect(goal.raceDistanceKm).toBe(distance);
  });

  it('a race goal without session words becomes race-specific threshold work', () => {
    expect(interpretCustomGoal('10 km em 50 min').type).toBe('tempo');
  });

  it('ignores implausible paces', () => {
    expect(interpretCustomGoal('10 km em 5 min').racePaceSPerKm).toBeNull();
  });

  it('falls back to an easy run when nothing matches', () => {
    expect(interpretCustomGoal('quero ficar bem')).toMatchObject({
      type: 'easy',
      recognized: false,
      racePaceSPerKm: null,
    });
  });
});
