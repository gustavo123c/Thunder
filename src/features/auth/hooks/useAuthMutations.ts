import { useMutation } from '@tanstack/react-query';

import { signIn, signOut, signUp, type SignUpInput } from '../api/auth.api';

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  });
}

export function useSignUp() {
  return useMutation({ mutationFn: (input: SignUpInput) => signUp(input) });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
