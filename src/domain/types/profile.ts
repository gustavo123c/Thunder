export const RUNNER_LEVELS = ['beginner', 'intermediate'] as const;
export type RunnerLevel = (typeof RUNNER_LEVELS)[number];

export const RUNNER_GOALS = [
  'complete_5k',
  'complete_10k',
  'improve_pace',
  'increase_endurance',
  'lose_weight',
] as const;
export type RunnerGoal = (typeof RUNNER_GOALS)[number];

export const BODY_SEXES = ['male', 'female'] as const;
export type BodySex = (typeof BODY_SEXES)[number];

export type Profile = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  level: RunnerLevel | null;
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string | null; // ISO date (YYYY-MM-DD)
  mainGoal: RunnerGoal | null;
  goalTargetPaceSPerKm: number | null;
  onboardedAt: string | null; // ISO timestamp
  /** Used to pick the body-map model; optional. */
  sex: BodySex | null;
};

/** Fields the user can edit (onboarding and profile edit). */
export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'username'
    | 'fullName'
    | 'level'
    | 'weightKg'
    | 'heightCm'
    | 'birthDate'
    | 'mainGoal'
    | 'goalTargetPaceSPerKm'
    | 'sex'
  >
>;

export function isOnboarded(profile: Pick<Profile, 'onboardedAt'> | null | undefined): boolean {
  return Boolean(profile?.onboardedAt);
}
