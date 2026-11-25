import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, type TextInputInstance, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { TextField } from '@/components/ui/TextField';

import { getAuthErrorMessage } from '../auth-errors';
import {
  type CredentialErrors,
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateSignUp,
} from '../credentials';
import { useSignUp } from '../hooks/useAuthMutations';

export function SignUpForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmationRef = useRef<TextInputInstance>(null);
  const signUp = useSignUp();

  function handleSubmit() {
    const errors = validateSignUp(email, password, passwordConfirmation);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    signUp.mutate({ email, password, fullName });
  }

  // With email confirmation enabled, Supabase returns no session yet.
  if (signUp.isSuccess && !signUp.data.hasSession) {
    return (
      <View className="gap-4">
        <FormMessage
          tone="info"
          message={`Enviamos um link de confirmação para ${email.trim()}. Confirme o e-mail e depois entre com sua senha.`}
        />
        <Link href="/sign-in" replace className="text-center font-semibold text-bolt-600">
          Ir para o login
        </Link>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <TextField
        label="Nome"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Como você quer ser chamado"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        placeholder="voce@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmationRef.current?.focus()}
      />
      <TextField
        ref={confirmationRef}
        label="Confirmar senha"
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        error={fieldErrors.passwordConfirmation}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <FormMessage message={signUp.isError ? getAuthErrorMessage(signUp.error) : null} />

      <Button label="Criar conta" onPress={handleSubmit} loading={signUp.isPending} />

      <View className="flex-row justify-center gap-1">
        <Text className="text-ink-500 dark:text-ink-300">Já tem conta?</Text>
        <Link href="/sign-in" replace className="font-semibold text-bolt-600">
          Entrar
        </Link>
      </View>
    </View>
  );
}
