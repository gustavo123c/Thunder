/**
 * Profile business rules. Limits mirror the CHECK constraints in
 * supabase/migrations/20261125000000_initial_schema.sql — keep them in sync.
 *
 * Validators return error *codes*; user-facing copy lives in the profile feature.
 */

export const PROFILE_LIMITS = {
  username: { min: 3, max: 30, pattern: /^[A-Za-z0-9_.]+$/ },
  fullName: { max: 80 },
  weightKg: { min: 20, max: 300 },
  heightCm: { min: 100, max: 250 },
  targetPaceSPerKm: { min: 120, max: 1200 }, // 2:00 to 20:00 /km
} as const;

export type ValidationResult<T, E extends string> =
  { ok: true; value: T } | { ok: false; error: E };

export type UsernameError = 'required' | 'too_short' | 'too_long' | 'invalid_chars';
export type NumberRangeError = 'required' | 'not_a_number' | 'out_of_range';
export type FullNameError = 'too_long';

function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

function fail<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

export function validateUsername(input: string): ValidationResult<string, UsernameError> {
  const value = input.trim();
  const { min, max, pattern } = PROFILE_LIMITS.username;

  if (value.length === 0) return fail('required');
  if (value.length < min) return fail('too_short');
  if (value.length > max) return fail('too_long');
  if (!pattern.test(value)) return fail('invalid_chars');
  return ok(value);
}

export function validateFullName(input: string): ValidationResult<string | null, FullNameError> {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length > PROFILE_LIMITS.fullName.max) return fail('too_long');
  return ok(value.length > 0 ? value : null);
}

/** Accepts "72", "72.5" or "72,5" (pt-BR keyboards). */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function validateRange(
  input: string,
  { min, max }: { min: number; max: number },
  { decimals }: { decimals: number },
): ValidationResult<number, NumberRangeError> {
  if (input.trim().length === 0) return fail('required');

  const parsed = parseDecimal(input);
  if (parsed === null) return fail('not_a_number');

  const factor = 10 ** decimals;
  const rounded = Math.round(parsed * factor) / factor;
  if (rounded < min || rounded > max) return fail('out_of_range');
  return ok(rounded);
}

export function validateWeightKg(input: string): ValidationResult<number, NumberRangeError> {
  return validateRange(input, PROFILE_LIMITS.weightKg, { decimals: 1 });
}

export function validateHeightCm(input: string): ValidationResult<number, NumberRangeError> {
  return validateRange(input, PROFILE_LIMITS.heightCm, { decimals: 0 });
}

/** Parses a pace typed as "m:ss" (e.g. "5:30") into seconds per km. */
export function parsePaceInput(input: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(input.trim());
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

export function validateTargetPace(input: string): ValidationResult<number, NumberRangeError> {
  if (input.trim().length === 0) return fail('required');

  const seconds = parsePaceInput(input);
  if (seconds === null) return fail('not_a_number');

  const { min, max } = PROFILE_LIMITS.targetPaceSPerKm;
  if (seconds < min || seconds > max) return fail('out_of_range');
  return ok(seconds);
}

/** Body mass index (kg/m²), one decimal; null without both measurements. */
export function bodyMassIndex(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}
