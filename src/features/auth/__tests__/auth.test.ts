import { GENERIC_AUTH_ERROR, NETWORK_AUTH_ERROR, getAuthErrorMessage } from '../auth-errors';
import { hasErrors, normalizeEmail, validateSignIn, validateSignUp } from '../credentials';

describe('getAuthErrorMessage', () => {
  it('maps known Supabase error codes', () => {
    expect(getAuthErrorMessage({ code: 'invalid_credentials' })).toBe(
      'E-mail ou senha incorretos.',
    );
    expect(getAuthErrorMessage({ code: 'user_already_exists' })).toBe(
      'Já existe uma conta com este e-mail.',
    );
  });

  it('detects network failures', () => {
    expect(getAuthErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      NETWORK_AUTH_ERROR,
    );
  });

  it('falls back to a generic message', () => {
    expect(getAuthErrorMessage({ code: 'something_new' })).toBe(GENERIC_AUTH_ERROR);
    expect(getAuthErrorMessage(null)).toBe(GENERIC_AUTH_ERROR);
    expect(getAuthErrorMessage('boom')).toBe(GENERIC_AUTH_ERROR);
  });
});

describe('credentials', () => {
  it('normalizes emails', () => {
    expect(normalizeEmail('  Ana@Thunder.App ')).toBe('ana@thunder.app');
  });

  it('validates sign in fields', () => {
    expect(hasErrors(validateSignIn('ana@thunder.app', 'x'))).toBe(false);
    expect(validateSignIn('ana', '')).toEqual({
      email: 'Informe um e-mail válido.',
      password: 'Informe sua senha.',
    });
  });

  it('requires 8+ char passwords that match on sign up', () => {
    expect(hasErrors(validateSignUp('ana@thunder.app', 'corrida123', 'corrida123'))).toBe(false);

    const errors = validateSignUp('ana@thunder.app', 'curta', 'outra');
    expect(errors.password).toMatch(/8 caracteres/);
    expect(errors.passwordConfirmation).toBe('As senhas não coincidem.');
  });
});
