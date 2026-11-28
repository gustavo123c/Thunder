import { ageGroup, ageOn, isValidEmail, maskBirthDate, parseBirthDate } from '../age';

const today = new Date(2026, 11, 1); // 1 Dec 2026, local time

test('masks digits as DD/MM/AAAA', () => {
  expect(maskBirthDate('3')).toBe('3');
  expect(maskBirthDate('3101')).toBe('31/01');
  expect(maskBirthDate('31012010')).toBe('31/01/2010');
  expect(maskBirthDate('31/01/2010999')).toBe('31/01/2010');
});

test('parses only real past dates', () => {
  expect(parseBirthDate('31/01/2010', today)).toBe('2010-01-31');
  expect(parseBirthDate('31/02/2010', today)).toBeNull();
  expect(parseBirthDate('01/01/1899', today)).toBeNull();
  expect(parseBirthDate('02/12/2026', today)).toBeNull();
  expect(parseBirthDate('01/12/2026', today)).toBe('2026-12-01');
  expect(parseBirthDate('1/1/2010', today)).toBeNull();
});

test('counts whole years around the birthday', () => {
  expect(ageOn('2014-12-01', today)).toBe(12);
  expect(ageOn('2014-12-02', today)).toBe(11);
  expect(ageOn('2008-11-30', today)).toBe(18);
});

test('groups ages by the 12 and 18 year limits', () => {
  expect(ageGroup(11)).toBe('too_young');
  expect(ageGroup(12)).toBe('minor');
  expect(ageGroup(17)).toBe('minor');
  expect(ageGroup(18)).toBe('adult');
});

test('accepts plausible e-mails', () => {
  expect(isValidEmail('mae@exemplo.com')).toBe(true);
  expect(isValidEmail(' pai@ex.com.br ')).toBe(true);
  expect(isValidEmail('sem-arroba.com')).toBe(false);
});
