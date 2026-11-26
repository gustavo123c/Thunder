import { type ComponentType, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import type { Profile } from '@/domain/types/profile';

import { useCheckUsername, useUpdateProfile } from '../hooks/useProfile';
import { type SetProfileField, useProfileFormState } from '../hooks/useProfileFormState';
import {
  formValuesFromProfile,
  type ProfileFormErrors,
  type ProfileFormField,
  type ProfileFormValues,
  USERNAME_TAKEN_MESSAGE,
  validateProfileForm,
} from '../profile-form';
import { describeSaveError, GENERIC_SAVE_ERROR } from '../save-errors';
import { BodyFields, GoalFields, IdentityFields, LevelFields } from './ProfileFields';

type StepFieldsProps = {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  setField: SetProfileField;
};

type Step = {
  title: string;
  subtitle: string;
  fields: readonly ProfileFormField[];
  Fields: ComponentType<StepFieldsProps>;
};

const STEPS: readonly Step[] = [
  {
    title: 'Bem-vindo ao Thunder ⚡',
    subtitle: 'Como você quer aparecer para outros corredores?',
    fields: ['fullName', 'username'],
    Fields: IdentityFields,
  },
  {
    title: 'Qual é o seu nível?',
    subtitle: 'Vamos ajustar métricas e dicas ao seu momento.',
    fields: ['level'],
    Fields: LevelFields,
  },
  {
    title: 'Sobre você',
    subtitle: 'Peso e altura deixam a estimativa de calorias mais precisa.',
    fields: ['weightKg', 'heightCm', 'sex'],
    Fields: BodyFields,
  },
  {
    title: 'Qual é a sua meta?',
    subtitle: 'Você pode mudar isso quando quiser no seu perfil.',
    fields: ['mainGoal', 'targetPace'],
    Fields: GoalFields,
  },
];

const ALL_FIELDS = STEPS.flatMap((step) => step.fields);

export function OnboardingFlow({ profile }: { profile: Profile }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const { values, errors, setErrors, setField } = useProfileFormState(
    formValuesFromProfile(profile),
  );
  const checkUsername = useCheckUsername(profile.id);
  const updateProfile = useUpdateProfile(profile.id);

  const step = STEPS[stepIndex] as Step;
  const isLastStep = stepIndex === STEPS.length - 1;
  const isBusy = checkUsername.isPending || updateProfile.isPending;

  async function ensureUsernameAvailable(username: string): Promise<boolean> {
    try {
      const taken = await checkUsername.mutateAsync(username);
      if (taken) setErrors({ username: USERNAME_TAKEN_MESSAGE });
      return !taken;
    } catch {
      setFormMessage(GENERIC_SAVE_ERROR);
      return false;
    }
  }

  async function finish() {
    const result = validateProfileForm(values, ALL_FIELDS);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    try {
      // Saving sets onboarded_at; the root guard (Stack.Protected) then swaps the
      // onboarding route for the tabs. Navigating here too would race with it.
      await updateProfile.mutateAsync({ update: result.update, completeOnboarding: true });
    } catch (error) {
      const { fieldErrors, message } = describeSaveError(error);
      setErrors(fieldErrors);
      setFormMessage(message);
      if (fieldErrors.username) setStepIndex(0);
    }
  }

  async function handleNext() {
    setFormMessage(null);
    const result = validateProfileForm(values, step.fields);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (step.fields.includes('username') && result.update.username) {
      const available = await ensureUsernameAvailable(result.update.username);
      if (!available) return;
    }
    if (isLastStep) {
      await finish();
    } else {
      setStepIndex((index) => index + 1);
    }
  }

  function handleBack() {
    setFormMessage(null);
    setStepIndex((index) => Math.max(0, index - 1));
  }

  const { Fields } = step;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-row gap-2 pb-2 pt-4">
        {STEPS.map((item, index) => (
          <View
            key={item.title}
            className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-bolt-500' : 'bg-ink-200 dark:bg-ink-700'}`}
          />
        ))}
      </View>
      <Text className="text-sm text-ink-400">
        Passo {stepIndex + 1} de {STEPS.length}
      </Text>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-3xl font-bold text-ink-900 dark:text-ink-50">{step.title}</Text>
          <Text className="text-base text-ink-500 dark:text-ink-300">{step.subtitle}</Text>
        </View>
        <Fields values={values} errors={errors} setField={setField} />
        <FormMessage message={formMessage} />
      </ScrollView>

      <View className="flex-row gap-3 pb-4 pt-2">
        {stepIndex > 0 ? (
          <Button label="Voltar" variant="secondary" onPress={handleBack} disabled={isBusy} />
        ) : null}
        <Button
          label={isLastStep ? 'Começar a correr' : 'Continuar'}
          onPress={() => void handleNext()}
          loading={isBusy}
          className="flex-1"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
