import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { TextField } from '@/components/ui/TextField';
import {
  ageGroup,
  ageOn,
  isValidEmail,
  maskBirthDate,
  MIN_AGE,
  parseBirthDate,
} from '@/domain/legal/age';
import { colors } from '@/theme/tokens';

import { useAcceptTerms } from '../hooks/useTerms';
import { TERMS_CHECKS } from '../terms-content';
import { TermsView } from './TermsView';

/** Mandatory acceptance: the rest of the app stays locked until it is recorded. */
export function AcceptTerms({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const accept = useAcceptTerms(userId);
  const [today] = useState(() => new Date());
  const [birthText, setBirthText] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [checked, setChecked] = useState({ terms: false, health: false, guardian: false });

  const birthDate = parseBirthDate(birthText, today);
  const group = birthDate ? ageGroup(ageOn(birthDate, today)) : null;
  const birthError = birthText.length === 10 && !birthDate ? 'Confira a data (DD/MM/AAAA).' : null;
  const minor = group === 'minor';
  const guardianOk =
    !minor || (guardianName.trim().length >= 3 && isValidEmail(guardianEmail) && checked.guardian);
  const ready =
    birthDate !== null && group !== 'too_young' && guardianOk && checked.terms && checked.health;

  function toggle(key: keyof typeof checked) {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
  }

  function submit() {
    if (!birthDate || !ready) return;
    accept.mutate({
      birthDate,
      guardian: minor ? { name: guardianName, email: guardianEmail } : null,
    });
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-8 pb-12 pt-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <TermsView />

      <View className="gap-4 rounded-[20px] border border-hairline bg-ink-800 p-4">
        <TextField
          label="Data de nascimento"
          value={birthText}
          onChangeText={(text) => setBirthText(maskBirthDate(text))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          error={birthError}
        />

        {group === 'too_young' ? (
          <Text testID="too-young" className="text-sm leading-5 text-ink-100">
            O Thunder pode ser usado a partir de {MIN_AGE} anos. Não é possível continuar com esta
            conta.
          </Text>
        ) : null}

        {minor ? (
          <View className="gap-3">
            <Text className="text-sm leading-5 text-ink-300">
              Para menores de 18 anos, um dos pais ou o responsável legal precisa ler e concordar
              com estes termos.
            </Text>
            <TextField
              label="Nome do responsável"
              value={guardianName}
              onChangeText={setGuardianName}
              autoCapitalize="words"
              maxLength={120}
            />
            <TextField
              label="E-mail do responsável"
              value={guardianEmail}
              onChangeText={setGuardianEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={
                guardianEmail.length > 3 && !isValidEmail(guardianEmail)
                  ? 'Confira o e-mail.'
                  : null
              }
            />
            <CheckRow
              label={TERMS_CHECKS.guardian}
              checked={checked.guardian}
              onToggle={() => toggle('guardian')}
            />
          </View>
        ) : null}

        {group === 'too_young' ? null : (
          <>
            <CheckRow
              label={TERMS_CHECKS.terms}
              checked={checked.terms}
              onToggle={() => toggle('terms')}
            />
            <CheckRow
              label={TERMS_CHECKS.health}
              checked={checked.health}
              onToggle={() => toggle('health')}
            />
          </>
        )}
      </View>

      <View className="gap-3">
        {accept.isError ? (
          <FormMessage message="Não foi possível registrar o aceite. Verifique sua conexão e tente de novo." />
        ) : null}
        {group === 'too_young' ? null : (
          <Button
            label="Aceitar e continuar"
            icon="checkmark"
            disabled={!ready}
            loading={accept.isPending}
            onPress={submit}
          />
        )}
        <Button label="Sair da conta" variant="ghost" onPress={onSignOut} />
      </View>
    </ScrollView>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onToggle}
      hitSlop={4}
      className="flex-row items-start gap-3 py-1 active:opacity-70"
    >
      <View
        className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${
          checked ? 'border-bolt-500 bg-bolt-500' : 'border-ink-400'
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={colors.onBolt} /> : null}
      </View>
      <Text className="flex-1 text-sm leading-5 text-ink-100">{label}</Text>
    </Pressable>
  );
}
