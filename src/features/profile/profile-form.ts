import {
  type FullNameError,
  type NumberRangeError,
  PROFILE_LIMITS,
  type UsernameError,
  validateFullName,
  validateHeightCm,
  validateTargetPace,
  validateUsername,
  validateWeightKg,
} from '@/domain/profile/profile-rules';
import type {
  BodySex,
  Profile,
  ProfileUpdate,
  RunnerGoal,
  RunnerLevel,
} from '@/domain/types/profile';
import { formatPaceValue } from '@/lib/format';

/** Raw form state: text inputs stay as strings until validated. */
export type ProfileFormValues = {
  fullName: string;
  username: string;
  level: RunnerLevel | null;
  weightKg: string;
  heightCm: string;
  /** Optional: null = prefers not to say. */
  sex: BodySex | null;
  mainGoal: RunnerGoal | null;
  targetPace: string; // "m:ss"
};

export type ProfileFormField = keyof ProfileFormValues;
export type ProfileFormErrors = Partial<Record<ProfileFormField, string>>;

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  fullName: '',
  username: '',
  level: null,
  weightKg: '',
  heightCm: '',
  sex: null,
  mainGoal: null,
  targetPace: '',
};

/** Target pace is only asked (and required) for the "improve pace" goal. */
export function needsTargetPace(goal: RunnerGoal | null): boolean {
  return goal === 'improve_pace';
}

const USERNAME_MESSAGES: Record<UsernameError, string> = {
  required: 'Escolha um nome de usuário.',
  too_short: `Use pelo menos ${PROFILE_LIMITS.username.min} caracteres.`,
  too_long: `Use no máximo ${PROFILE_LIMITS.username.max} caracteres.`,
  invalid_chars: 'Use apenas letras sem acento, números, ponto e _.',
};

const FULL_NAME_MESSAGES: Record<FullNameError, string> = {
  too_long: `Use no máximo ${PROFILE_LIMITS.fullName.max} caracteres.`,
};

function rangeMessage(error: NumberRangeError, field: string, range: string): string {
  switch (error) {
    case 'required':
      return `Informe ${field}.`;
    case 'not_a_number':
      return 'Digite apenas números.';
    case 'out_of_range':
      return `Valor deve estar entre ${range}.`;
  }
}

export const USERNAME_TAKEN_MESSAGE = 'Este nome de usuário já está em uso.';

export function formValuesFromProfile(profile: Profile): ProfileFormValues {
  return {
    fullName: profile.fullName ?? '',
    username: profile.username ?? '',
    level: profile.level,
    weightKg: profile.weightKg?.toString().replace('.', ',') ?? '',
    heightCm: profile.heightCm?.toString() ?? '',
    sex: profile.sex,
    mainGoal: profile.mainGoal,
    targetPace:
      profile.goalTargetPaceSPerKm === null ? '' : formatPaceValue(profile.goalTargetPaceSPerKm),
  };
}

export type ProfileFormResult =
  { ok: true; update: ProfileUpdate } | { ok: false; errors: ProfileFormErrors };

/**
 * Validates the given fields of the form and builds the matching update.
 * Onboarding validates one step at a time; profile edit validates everything.
 */
export function validateProfileForm(
  values: ProfileFormValues,
  fields: readonly ProfileFormField[],
): ProfileFormResult {
  const errors: ProfileFormErrors = {};
  const update: ProfileUpdate = {};
  const has = (field: ProfileFormField) => fields.includes(field);

  if (has('fullName')) {
    const result = validateFullName(values.fullName);
    if (result.ok) update.fullName = result.value;
    else errors.fullName = FULL_NAME_MESSAGES[result.error];
  }

  if (has('username')) {
    const result = validateUsername(values.username);
    if (result.ok) update.username = result.value;
    else errors.username = USERNAME_MESSAGES[result.error];
  }

  if (has('level')) {
    if (values.level) update.level = values.level;
    else errors.level = 'Escolha seu nível.';
  }

  if (has('weightKg')) {
    const result = validateWeightKg(values.weightKg);
    const { min, max } = PROFILE_LIMITS.weightKg;
    if (result.ok) update.weightKg = result.value;
    else errors.weightKg = rangeMessage(result.error, 'seu peso', `${min} e ${max} kg`);
  }

  if (has('heightCm')) {
    const result = validateHeightCm(values.heightCm);
    const { min, max } = PROFILE_LIMITS.heightCm;
    if (result.ok) update.heightCm = result.value;
    else errors.heightCm = rangeMessage(result.error, 'sua altura', `${min} e ${max} cm`);
  }

  if (has('sex')) {
    update.sex = values.sex;
  }

  if (has('mainGoal')) {
    if (values.mainGoal) update.mainGoal = values.mainGoal;
    else errors.mainGoal = 'Escolha sua meta principal.';
  }

  if (has('targetPace')) {
    if (needsTargetPace(values.mainGoal)) {
      const result = validateTargetPace(values.targetPace);
      if (result.ok) update.goalTargetPaceSPerKm = result.value;
      else if (result.error === 'not_a_number')
        errors.targetPace = 'Use o formato min:seg, ex.: 5:30.';
      else errors.targetPace = rangeMessage(result.error, 'o pace alvo', '2:00 e 20:00 /km');
    } else {
      update.goalTargetPaceSPerKm = null;
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, update };
}
