import type { BodyRegion } from '../health/body-regions';

export type ExerciseCategory = 'mobility' | 'strength' | 'core' | 'plyometric' | 'cardio';

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** Regions that bear meaningful load; the exercise is skipped if one hurts. */
  loads: readonly BodyRegion[];
  /** Too demanding for beginners (e.g. plyometrics). */
  intermediateOnly?: boolean;
  /** Short how-to shown in the plan. */
  cue: string;
};

/** Curated library of runner-friendly exercises. */
export const EXERCISES: readonly Exercise[] = [
  // Mobility (warm-up / cool-down)
  {
    id: 'hip_circles',
    name: 'Círculos de quadril',
    category: 'mobility',
    loads: [],
    cue: 'Mãos na cintura, círculos amplos e lentos para cada lado.',
  },
  {
    id: 'leg_swings',
    name: 'Balanço de pernas',
    category: 'mobility',
    loads: ['hip'],
    cue: 'Apoiado na parede, balance a perna para frente e para trás.',
  },
  {
    id: 'ankle_mobility',
    name: 'Mobilidade de tornozelo',
    category: 'mobility',
    loads: [],
    cue: 'Joelho em direção à parede sem tirar o calcanhar do chão.',
  },
  {
    id: 'cat_cow',
    name: 'Gato-camelo',
    category: 'mobility',
    loads: ['wrist', 'forearm'],
    cue: 'Em quatro apoios, alterne arredondar e arquear a coluna devagar.',
  },
  {
    id: 'thoracic_rotation',
    name: 'Rotação torácica',
    category: 'mobility',
    loads: [],
    cue: 'Deitado de lado, abra o braço de cima acompanhando com o olhar.',
  },
  {
    id: 'march',
    name: 'Marcha no lugar',
    category: 'mobility',
    loads: [],
    cue: 'Eleve os joelhos alternadamente, ritmo confortável.',
  },
  {
    id: 'hamstring_stretch',
    name: 'Alongamento de posterior',
    category: 'mobility',
    loads: [],
    cue: 'Perna estendida apoiada, incline o tronco sem forçar. 30 s cada lado.',
  },
  {
    id: 'quad_stretch',
    name: 'Alongamento de quadríceps',
    category: 'mobility',
    loads: [],
    cue: 'Em pé, segure o pé atrás do corpo. 30 s cada lado.',
  },
  {
    id: 'calf_stretch',
    name: 'Alongamento de panturrilha',
    category: 'mobility',
    loads: [],
    cue: 'Mãos na parede, perna de trás estendida. 30 s cada lado.',
  },
  {
    id: 'breathing',
    name: 'Respiração diafragmática',
    category: 'mobility',
    loads: [],
    cue: 'Deitado, inspire pelo nariz enchendo o abdômen, solte devagar.',
  },

  // Strength
  {
    id: 'squat',
    name: 'Agachamento livre',
    category: 'strength',
    loads: ['quadriceps', 'knee', 'glute', 'hip'],
    cue: 'Pés na largura do quadril, desça como se fosse sentar, joelhos alinhados aos pés.',
  },
  {
    id: 'lunge',
    name: 'Afundo alternado',
    category: 'strength',
    loads: ['quadriceps', 'knee', 'glute', 'hip'],
    cue: 'Passo à frente, desça até os dois joelhos formarem 90°.',
  },
  {
    id: 'step_up',
    name: 'Subida no degrau',
    category: 'strength',
    loads: ['quadriceps', 'knee', 'glute'],
    cue: 'Suba em um degrau firme empurrando com o calcanhar da perna de cima.',
  },
  {
    id: 'glute_bridge',
    name: 'Ponte de glúteo',
    category: 'strength',
    loads: ['glute', 'hamstring'],
    cue: 'Deitado, pés no chão, eleve o quadril contraindo os glúteos.',
  },
  {
    id: 'single_leg_rdl',
    name: 'Levantamento terra unilateral',
    category: 'strength',
    loads: ['hamstring', 'glute', 'lower_back', 'ankle'],
    intermediateOnly: true,
    cue: 'Em uma perna, incline o tronco à frente com a coluna neutra.',
  },
  {
    id: 'calf_raise',
    name: 'Elevação de panturrilha',
    category: 'strength',
    loads: ['calf', 'achilles', 'ankle', 'foot'],
    cue: 'Suba na ponta dos pés e desça devagar (3 s).',
  },
  {
    id: 'clamshell',
    name: 'Ostra (clamshell)',
    category: 'strength',
    loads: ['hip', 'glute'],
    cue: 'Deitado de lado, joelhos dobrados, abra o joelho de cima sem girar o quadril.',
  },
  {
    id: 'wall_sit',
    name: 'Cadeira isométrica',
    category: 'strength',
    loads: ['quadriceps', 'knee'],
    cue: 'Costas na parede, joelhos a ~90°, sustente.',
  },
  {
    id: 'push_up',
    name: 'Flexão de braços',
    category: 'strength',
    loads: ['chest', 'shoulder', 'triceps', 'elbow', 'wrist'],
    cue: 'Corpo alinhado; pode apoiar os joelhos para facilitar.',
  },
  {
    id: 'band_row',
    name: 'Remada com elástico',
    category: 'strength',
    loads: ['upper_back', 'shoulder', 'biceps', 'forearm', 'elbow'],
    cue: 'Puxe o elástico até a costela, aproximando as escápulas.',
  },

  // Core
  {
    id: 'plank',
    name: 'Prancha',
    category: 'core',
    loads: ['abdomen', 'shoulder', 'forearm', 'elbow', 'lower_back'],
    cue: 'Antebraços no chão, corpo em linha reta, sem deixar o quadril cair.',
  },
  {
    id: 'side_plank',
    name: 'Prancha lateral',
    category: 'core',
    loads: ['abdomen', 'obliques', 'shoulder', 'forearm', 'elbow'],
    cue: 'Apoie um antebraço, quadril alto e alinhado.',
  },
  {
    id: 'dead_bug',
    name: 'Dead bug',
    category: 'core',
    loads: ['abdomen'],
    cue: 'Deitado, estenda braço e perna opostos mantendo a lombar no chão.',
  },
  {
    id: 'bird_dog',
    name: 'Bird dog',
    category: 'core',
    loads: ['lower_back', 'wrist'],
    cue: 'Em quatro apoios, estenda braço e perna opostos, coluna estável.',
  },

  // Plyometrics
  {
    id: 'jump_squat',
    name: 'Agachamento com salto',
    category: 'plyometric',
    loads: ['quadriceps', 'knee', 'calf', 'achilles', 'ankle', 'foot'],
    intermediateOnly: true,
    cue: 'Agache e salte com explosão, aterrissando suave.',
  },
  {
    id: 'skips',
    name: 'Skipping',
    category: 'plyometric',
    loads: ['calf', 'achilles', 'ankle', 'foot', 'hip'],
    cue: 'Corrida no lugar elevando os joelhos, com apoio na ponta dos pés.',
  },

  // Low-impact cardio (alternatives to running)
  {
    id: 'bike',
    name: 'Bicicleta (ergométrica ou rua)',
    category: 'cardio',
    loads: ['quadriceps', 'knee'],
    cue: 'Ritmo em que dá para conversar.',
  },
  {
    id: 'brisk_walk',
    name: 'Caminhada rápida',
    category: 'cardio',
    loads: ['foot', 'ankle'],
    cue: 'Passos firmes, braços ativos.',
  },
  {
    id: 'upper_body_cardio',
    name: 'Circuito de braços e tronco',
    category: 'cardio',
    loads: ['shoulder', 'biceps', 'triceps', 'elbow'],
    cue: 'Socos no ar, polichinelo de braços, sentado se preciso.',
  },
];
