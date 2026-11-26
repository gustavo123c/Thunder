import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { TextField } from '@/components/ui/TextField';

import {
  GROUP_NAME_MAX,
  GROUP_NAME_MIN,
  type GroupErrorCode,
  groupErrorCode,
  normalizeInviteCode,
} from '../api/groups.api';
import { useCreateGroup, useJoinGroup } from '../hooks/useGroups';

const ERROR_COPY: Record<GroupErrorCode, string> = {
  not_found: 'Código não encontrado. Confira as letras e os números.',
  full: 'Este grupo já está cheio (máximo de 50 membros).',
  invalid_name: `O nome precisa ter de ${GROUP_NAME_MIN} a ${GROUP_NAME_MAX} caracteres.`,
  unknown: 'Não foi possível concluir agora. Tente novamente.',
};

function FormScreen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-ink-900"
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-4 pb-10 pt-6"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function CreateGroupForm() {
  const [name, setName] = useState('');
  const create = useCreateGroup();
  const valid = name.trim().length >= GROUP_NAME_MIN;

  return (
    <FormScreen>
      <Text className="text-sm leading-5 text-ink-300">
        Dê um nome ao grupo. Depois é só mandar o código de convite para seus amigos.
      </Text>
      <TextField
        label="Nome do grupo"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Corredores do Parque"
        maxLength={GROUP_NAME_MAX}
        autoFocus
        returnKeyType="done"
      />
      <FormMessage message={create.isError ? ERROR_COPY[groupErrorCode(create.error)] : null} />
      <Button
        label="Criar grupo"
        icon="add"
        disabled={!valid}
        loading={create.isPending}
        onPress={() =>
          create.mutate(name, {
            onSuccess: (id) => router.replace(`/group/${id}`),
          })
        }
      />
    </FormScreen>
  );
}

export function JoinGroupForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const join = useJoinGroup();
  const normalized = normalizeInviteCode(code);

  return (
    <FormScreen>
      <Text className="text-sm leading-5 text-ink-300">
        Digite o código que seu amigo enviou. Ele aparece na página do grupo.
      </Text>
      <TextField
        label="Código de convite"
        value={code}
        onChangeText={setCode}
        placeholder="Ex.: 3FA9C21B"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={!initialCode}
        maxLength={16}
        returnKeyType="done"
      />
      <FormMessage message={join.isError ? ERROR_COPY[groupErrorCode(join.error)] : null} />
      <View>
        <Button
          label="Entrar no grupo"
          icon="enter-outline"
          disabled={normalized.length < 6}
          loading={join.isPending}
          onPress={() =>
            join.mutate(normalized, {
              onSuccess: (id) => router.replace(`/group/${id}`),
            })
          }
        />
      </View>
    </FormScreen>
  );
}
