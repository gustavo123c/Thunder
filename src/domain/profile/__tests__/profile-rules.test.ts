import { isOnboarded } from '../../types/profile';
import {
  bodyMassIndex,
  parseDecimal,
  parsePaceInput,
  validateFullName,
  validateHeightCm,
  validateTargetPace,
  validateUsername,
  validateWeightKg,
} from '../profile-rules';

describe('validateUsername', () => {
  it('accepts letters, digits, dot and underscore, trimming spaces', () => {
    expect(validateUsername('  ana.runner_01 ')).toEqual({ ok: true, value: 'ana.runner_01' });
  });

  it.each([
    ['', 'required'],
    ['ab', 'too_short'],
    ['a'.repeat(31), 'too_long'],
    ['ana runner', 'invalid_chars'],
    ['joão', 'invalid_chars'],
  ])('rejects %p with %p', (input, error) => {
    expect(validateUsername(input)).toEqual({ ok: false, error });
  });
});

describe('validateFullName', () => {
  it('collapses whitespace and returns null when empty', () => {
    expect(validateFullName('  Ana   Souza ')).toEqual({ ok: true, value: 'Ana Souza' });
    expect(validateFullName('   ')).toEqual({ ok: true, value: null });
  });

  it('rejects names longer than 80 chars', () => {
    expect(validateFullName('a'.repeat(81))).toEqual({ ok: false, error: 'too_long' });
  });
});

describe('parseDecimal', () => {
  it('accepts dot or comma as decimal separator', () => {
    expect(parseDecimal('72.5')).toBe(72.5);
    expect(parseDecimal('72,5')).toBe(72.5);
    expect(parseDecimal('72')).toBe(72);
  });

  it('rejects anything else', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('-5')).toBeNull();
    expect(parseDecimal('7a')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
  });
});

describe('validateWeightKg', () => {
  it('rounds to one decimal', () => {
    expect(validateWeightKg('72,46')).toEqual({ ok: true, value: 72.5 });
  });

  it('enforces the database range (20–300 kg)', () => {
    expect(validateWeightKg('19.9')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateWeightKg('300')).toEqual({ ok: true, value: 300 });
    expect(validateWeightKg('')).toEqual({ ok: false, error: 'required' });
    expect(validateWeightKg('abc')).toEqual({ ok: false, error: 'not_a_number' });
  });
});

describe('validateHeightCm', () => {
  it('rounds to whole centimeters within 100–250', () => {
    expect(validateHeightCm('175.4')).toEqual({ ok: true, value: 175 });
    expect(validateHeightCm('99')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateHeightCm('251')).toEqual({ ok: false, error: 'out_of_range' });
  });
});

describe('parsePaceInput / validateTargetPace', () => {
  it('parses m:ss into seconds per km', () => {
    expect(parsePaceInput('5:30')).toBe(330);
    expect(parsePaceInput('12:05')).toBe(725);
  });

  it('rejects malformed paces', () => {
    expect(parsePaceInput('5:60')).toBeNull();
    expect(parsePaceInput('530')).toBeNull();
    expect(parsePaceInput('5:3')).toBeNull();
  });

  it('enforces 2:00–20:00 /km', () => {
    expect(validateTargetPace('5:30')).toEqual({ ok: true, value: 330 });
    expect(validateTargetPace('1:59')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateTargetPace('20:01')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateTargetPace('')).toEqual({ ok: false, error: 'required' });
  });
});

describe('isOnboarded', () => {
  it('depends only on onboardedAt', () => {
    expect(isOnboarded(null)).toBe(false);
    expect(isOnboarded({ onboardedAt: null })).toBe(false);
    expect(isOnboarded({ onboardedAt: '2026-11-25T10:00:00Z' })).toBe(true);
  });
});

describe('bodyMassIndex', () => {
  it('computes kg/m² with one decimal', () => {
    expect(bodyMassIndex(70, 175)).toBe(22.9);
  });
  it('is null without both measurements', () => {
    expect(bodyMassIndex(null, 175)).toBeNull();
    expect(bodyMassIndex(70, null)).toBeNull();
  });
});
