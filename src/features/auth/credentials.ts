export const MIN_PASSWORD_LENGTH = 8; // keep in sync with supabase/config.jsonc

export type CredentialErrors = {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
};

// Intentionally permissive: the server is the source of truth for email validity.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSignIn(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) errors.email = 'Informe um e-mail válido.';
  if (password.length === 0) errors.password = 'Informe sua senha.';
  return errors;
}

export function validateSignUp(
  email: string,
  password: string,
  passwordConfirmation: string,
): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) errors.email = 'Informe um e-mail válido.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (passwordConfirmation !== password) {
    errors.passwordConfirmation = 'As senhas não coincidem.';
  }
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
