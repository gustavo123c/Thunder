export type RunningExperience = 'none' | 'beginner' | 'intermediate' | 'advanced';

export const RUNNING_EXPERIENCE_LABELS: Record<RunningExperience, string> = {
  none: 'Nunca corri',
  beginner: 'Iniciante (menos de 1 ano)',
  intermediate: 'Intermediário (1–3 anos)',
  advanced: 'Avançado (mais de 3 anos)',
};

export const PAR_Q_KEYS = [
  'heart_condition',
  'chest_pain_exercise',
  'dizziness',
  'bone_joint',
  'bp_medication',
] as const;

export type ParQKey = (typeof PAR_Q_KEYS)[number];

export const PAR_Q_QUESTIONS: Record<ParQKey, string> = {
  heart_condition: 'Seu médico já disse que você tem algum problema cardíaco?',
  chest_pain_exercise: 'Você sente dor no peito ao se exercitar?',
  dizziness:
    'Você teve tonturas, perdeu o equilíbrio ou perdeu a consciência nos últimos 12 meses?',
  bone_joint: 'Você tem alguma condição óssea ou articular que piora com exercício?',
  bp_medication: 'Você usa algum medicamento para pressão ou coração?',
};

export const HEALTH_CONDITIONS = [
  'Cardíacas',
  'Pressão alta',
  'Diabetes',
  'Asma',
  'Nenhuma',
  'Outra',
] as const;

export interface AnamneseDraft {
  runningExperience: RunningExperience | null;
  weeklyFrequency: number | null;
  currentInjuries: string[];
  pastInjuries: string[];
  surgeries: string;
  healthConditions: string[];
  medications: string;
  parQ: Partial<Record<ParQKey, boolean>>;
  consented: boolean;
}

export interface Anamnese extends AnamneseDraft {
  id: string;
  userId: string;
  parQRisk: boolean;
  createdAt: string;
  updatedAt: string;
}

export function computeParQRisk(parQ: Partial<Record<ParQKey, boolean>>): boolean {
  return PAR_Q_KEYS.some((k) => parQ[k] === true);
}

export function emptyDraft(): AnamneseDraft {
  return {
    runningExperience: null,
    weeklyFrequency: null,
    currentInjuries: [],
    pastInjuries: [],
    surgeries: '',
    healthConditions: [],
    medications: '',
    parQ: {},
    consented: false,
  };
}
