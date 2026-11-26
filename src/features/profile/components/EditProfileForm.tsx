import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import type { Profile } from '@/domain/types/profile';

import { useUpdateProfile } from '../hooks/useProfile';
import { useProfileFormState } from '../hooks/useProfileFormState';
import { formValuesFromProfile, type ProfileFormField, validateProfileForm } from '../profile-form';
import { describeSaveError } from '../save-errors';
import { BodyFields, GoalFields, IdentityFields, LevelFields } from './ProfileFields';

const EDITABLE_FIELDS: readonly ProfileFormField[] = [
  'fullName',
  'username',
  'level',
  'weightKg',
  'heightCm',
  'sex',
  'mainGoal',
  'targetPace',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-ink-50">{title}</Text>
      {children}
    </View>
  );
}

export function EditProfileForm({ profile }: { profile: Profile }) {
  const { values, errors, setErrors, setField } = useProfileFormState(
    formValuesFromProfile(profile),
  );
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const updateProfile = useUpdateProfile(profile.id);

  async function handleSave() {
    setFormMessage(null);
    const result = validateProfileForm(values, EDITABLE_FIELDS);
    if (!result.ok) {
      setErrors(result.errors);
      setFormMessage('Revise os campos destacados.');
      return;
    }
    try {
      await updateProfile.mutateAsync({ update: result.update });
      router.back();
    } catch (error) {
      const { fieldErrors, message } = describeSaveError(error);
      setErrors(fieldErrors);
      setFormMessage(message ?? 'Revise os campos destacados.');
    }
  }

  const fieldProps = { values, errors, setField };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-8 px-4 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Identidade">
          <IdentityFields {...fieldProps} />
        </Section>
        <Section title="Nível">
          <LevelFields {...fieldProps} />
        </Section>
        <Section title="Corpo">
          <BodyFields {...fieldProps} />
        </Section>
        <Section title="Meta">
          <GoalFields {...fieldProps} />
        </Section>
      </ScrollView>
      <View className="gap-3 px-4 pb-6 pt-2">
        <FormMessage message={formMessage} />
        <Button
          label="Salvar alterações"
          onPress={() => void handleSave()}
          loading={updateProfile.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
