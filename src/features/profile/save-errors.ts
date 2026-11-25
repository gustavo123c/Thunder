import { UsernameTakenError } from './api/profile.api';
import { type ProfileFormErrors, USERNAME_TAKEN_MESSAGE } from './profile-form';

export const GENERIC_SAVE_ERROR =
  'Não foi possível salvar. Verifique sua conexão e tente novamente.';

/** Splits a save failure into a field error (username taken) or a form-level message. */
export function describeSaveError(error: unknown): {
  fieldErrors: ProfileFormErrors;
  message: string | null;
} {
  if (error instanceof UsernameTakenError) {
    return { fieldErrors: { username: USERNAME_TAKEN_MESSAGE }, message: null };
  }
  return { fieldErrors: {}, message: GENERIC_SAVE_ERROR };
}
