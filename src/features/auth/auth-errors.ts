/**
 * Maps Supabase Auth errors to Portuguese messages.
 * Accepts a structural shape so it works with AuthError and plain objects (tests).
 */

type AuthErrorLike = {
  code?: string | undefined;
  name?: string | undefined;
  status?: number | undefined;
  message?: string | undefined;
};

const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  email_address_invalid: 'E-mail inválido.',
  signup_disabled: 'Novos cadastros estão temporariamente desativados.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos.',
};

export const GENERIC_AUTH_ERROR = 'Algo deu errado. Tente novamente.';
export const NETWORK_AUTH_ERROR = 'Sem conexão com o servidor. Verifique sua internet.';

export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return GENERIC_AUTH_ERROR;

  const { code, name, status } = error as AuthErrorLike;

  if (code && MESSAGES_BY_CODE[code]) return MESSAGES_BY_CODE[code];
  if (name === 'AuthRetryableFetchError' || status === 0) return NETWORK_AUTH_ERROR;
  if (status === 429) return MESSAGES_BY_CODE.over_request_rate_limit ?? GENERIC_AUTH_ERROR;

  return GENERIC_AUTH_ERROR;
}
