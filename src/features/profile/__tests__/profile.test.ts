import type { Profile } from '@/domain/types/profile';

import {
  EMPTY_PROFILE_FORM,
  formValuesFromProfile,
  type ProfileFormValues,
  validateProfileForm,
} from '../profile-form';
import { profileFromRow, profileUpdateToRow } from '../profile.mapper';

const ALL_FIELDS = [
  'fullName',
  'username',
  'level',
  'weightKg',
  'heightCm',
  'mainGoal',
  'targetPace',
] as const;

const validForm: ProfileFormValues = {
  fullName: ' Ana  Souza ',
  username: 'ana.runner',
  level: 'beginner',
  weightKg: '62,5',
  heightCm: '168',
  mainGoal: 'improve_pace',
  targetPace: '6:15',
};

describe('validateProfileForm', () => {
  it('builds a typed update from valid input', () => {
    expect(validateProfileForm(validForm, ALL_FIELDS)).toEqual({
      ok: true,
      update: {
        fullName: 'Ana Souza',
        username: 'ana.runner',
        level: 'beginner',
        weightKg: 62.5,
        heightCm: 168,
        mainGoal: 'improve_pace',
        goalTargetPaceSPerKm: 375,
      },
    });
  });

  it('only validates the requested fields (onboarding steps)', () => {
    const result = validateProfileForm({ ...EMPTY_PROFILE_FORM, level: 'intermediate' }, ['level']);
    expect(result).toEqual({ ok: true, update: { level: 'intermediate' } });
  });

  it('returns Portuguese messages per field', () => {
    const result = validateProfileForm(EMPTY_PROFILE_FORM, ALL_FIELDS);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual({
      username: 'Escolha um nome de usuário.',
      level: 'Escolha seu nível.',
      weightKg: 'Informe seu peso.',
      heightCm: 'Informe sua altura.',
      mainGoal: 'Escolha sua meta principal.',
    });
  });

  it('clears the target pace when the goal does not use it', () => {
    const result = validateProfileForm({ ...validForm, mainGoal: 'complete_5k', targetPace: 'x' }, [
      'mainGoal',
      'targetPace',
    ]);
    expect(result).toEqual({
      ok: true,
      update: { mainGoal: 'complete_5k', goalTargetPaceSPerKm: null },
    });
  });

  it('explains the expected pace format', () => {
    const result = validateProfileForm({ ...validForm, targetPace: '615' }, ['targetPace']);
    expect(result).toEqual({
      ok: false,
      errors: { targetPace: 'Use o formato min:seg, ex.: 5:30.' },
    });
  });
});

describe('formValuesFromProfile', () => {
  it('round-trips a stored profile into form strings', () => {
    const profile: Profile = {
      id: 'u1',
      username: 'ana.runner',
      fullName: 'Ana',
      avatarUrl: null,
      level: 'beginner',
      weightKg: 62.5,
      heightCm: 168,
      birthDate: null,
      mainGoal: 'improve_pace',
      goalTargetPaceSPerKm: 375,
      onboardedAt: '2026-11-25T10:00:00Z',
    };
    expect(formValuesFromProfile(profile)).toEqual({
      fullName: 'Ana',
      username: 'ana.runner',
      level: 'beginner',
      weightKg: '62,5',
      heightCm: '168',
      mainGoal: 'improve_pace',
      targetPace: '6:15',
    });
  });
});

describe('profile mapper', () => {
  it('maps snake_case rows to the domain model, coercing numerics', () => {
    const profile = profileFromRow({
      id: 'u1',
      username: 'ana',
      full_name: 'Ana',
      avatar_url: null,
      level: 'intermediate',
      weight_kg: '70.50' as unknown as number, // PostgREST may return numeric as string
      height_cm: 175,
      birth_date: null,
      main_goal: 'complete_10k',
      goal_target_pace_s_per_km: null,
      onboarded_at: null,
      created_at: '2026-11-25T10:00:00Z',
      updated_at: '2026-11-25T10:00:00Z',
    });
    expect(profile.weightKg).toBe(70.5);
    expect(profile.fullName).toBe('Ana');
    expect(profile.onboardedAt).toBeNull();
  });

  it('sends only the fields that changed', () => {
    expect(profileUpdateToRow({ weightKg: 71, goalTargetPaceSPerKm: null })).toEqual({
      weight_kg: 71,
      goal_target_pace_s_per_km: null,
    });
  });
});
