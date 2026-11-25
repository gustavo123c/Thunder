import { Text, View } from 'react-native';

import { OptionCard } from '@/components/ui/OptionCard';
import { TextField } from '@/components/ui/TextField';
import { RUNNER_GOALS, RUNNER_LEVELS } from '@/domain/types/profile';

import type { SetProfileField } from '../hooks/useProfileFormState';
import { GOAL_COPY, LEVEL_COPY } from '../labels';
import { needsTargetPace, type ProfileFormErrors, type ProfileFormValues } from '../profile-form';

type FieldsProps = {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  setField: SetProfileField;
};

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text className="text-sm text-danger">{message}</Text>;
}

export function IdentityFields({ values, errors, setField }: FieldsProps) {
  return (
    <View className="gap-4">
      <TextField
        label="Nome"
        value={values.fullName}
        onChangeText={(text) => setField('fullName', text)}
        error={errors.fullName}
        placeholder="Como você quer ser chamado"
        autoComplete="name"
      />
      <TextField
        label="Nome de usuário"
        value={values.username}
        onChangeText={(text) => setField('username', text)}
        error={errors.username}
        hint="É assim que seus amigos vão te encontrar."
        placeholder="ana.corre"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
      />
    </View>
  );
}

export function LevelFields({ values, errors, setField }: FieldsProps) {
  return (
    <View accessibilityRole="radiogroup" className="gap-3">
      {RUNNER_LEVELS.map((level) => (
        <OptionCard
          key={level}
          title={LEVEL_COPY[level].title}
          description={LEVEL_COPY[level].description}
          selected={values.level === level}
          onPress={() => setField('level', level)}
        />
      ))}
      <FieldError message={errors.level} />
    </View>
  );
}

export function BodyFields({ values, errors, setField }: FieldsProps) {
  return (
    <View className="gap-4">
      <TextField
        label="Peso"
        value={values.weightKg}
        onChangeText={(text) => setField('weightKg', text)}
        error={errors.weightKg}
        suffix="kg"
        placeholder="70"
        keyboardType="decimal-pad"
      />
      <TextField
        label="Altura"
        value={values.heightCm}
        onChangeText={(text) => setField('heightCm', text)}
        error={errors.heightCm}
        suffix="cm"
        placeholder="170"
        keyboardType="number-pad"
      />
      <Text className="text-sm text-ink-400">
        Usamos esses dados apenas para estimar as calorias das suas corridas.
      </Text>
    </View>
  );
}

export function GoalFields({ values, errors, setField }: FieldsProps) {
  return (
    <View className="gap-3">
      <View accessibilityRole="radiogroup" className="gap-3">
        {RUNNER_GOALS.map((goal) => (
          <OptionCard
            key={goal}
            title={GOAL_COPY[goal].title}
            description={GOAL_COPY[goal].description}
            selected={values.mainGoal === goal}
            onPress={() => setField('mainGoal', goal)}
          />
        ))}
      </View>
      <FieldError message={errors.mainGoal} />

      {needsTargetPace(values.mainGoal) ? (
        <TextField
          label="Pace alvo"
          value={values.targetPace}
          onChangeText={(text) => setField('targetPace', text)}
          error={errors.targetPace}
          suffix="/km"
          placeholder="5:30"
          hint="Quanto tempo você quer levar por quilômetro."
          keyboardType="numbers-and-punctuation"
        />
      ) : null}
    </View>
  );
}
