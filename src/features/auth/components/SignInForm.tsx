import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, type TextInputInstance, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { TextField } from '@/components/ui/TextField';

import { getAuthErrorMessage } from '../auth-errors';
import { type CredentialErrors, hasErrors, validateSignIn } from '../credentials';
import { useSignIn } from '../hooks/useAuthMutations';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const passwordRef = useRef<TextInputInstance>(null);
  const signIn = useSignIn();

  function handleSubmit() {
    const errors = validateSignIn(email, password);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    signIn.mutate({ email, password });
  }

  return (
    <View className="gap-4">
      <TextField
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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <FormMessage message={signIn.isError ? getAuthErrorMessage(signIn.error) : null} />

      <Button label="Entrar" onPress={handleSubmit} loading={signIn.isPending} />

      <View className="flex-row justify-center gap-1">
        <Text className="text-ink-500 dark:text-ink-300">Ainda não tem conta?</Text>
        <Link href="/sign-up" replace className="font-semibold text-bolt-600">
          Criar conta
        </Link>
      </View>
    </View>
  );
}
