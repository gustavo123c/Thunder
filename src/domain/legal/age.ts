/** Youngest age allowed to use the app (LGPD art. 14: under 12 needs verifiable parental consent). */
export const MIN_AGE = 12;
/** Below this, a parent or legal guardian must agree to the terms. */
export const ADULT_AGE = 18;

/** Formats typed digits as DD/MM/AAAA while the user types. */
export function maskBirthDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "31/01/2010" → "2010-01-31"; null when incomplete, impossible or in the future. */
export function parseBirthDate(text: string, today: Date): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    year < 1900
  ) {
    return null;
  }
  const iso = `${yyyy}-${mm}-${dd}`;
  return iso > localIsoDate(today) ? null : iso;
}

/** Whole years between an ISO birth date and `today` (local calendar). */
export function ageOn(birthIso: string, today: Date): number {
  const [year, month, day] = birthIso.split('-').map(Number) as [number, number, number];
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export type AgeGroup = 'too_young' | 'minor' | 'adult';

export function ageGroup(age: number): AgeGroup {
  if (age < MIN_AGE) return 'too_young';
  return age < ADULT_AGE ? 'minor' : 'adult';
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

function localIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
