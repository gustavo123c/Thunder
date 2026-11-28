import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/FormMessage';
import { colors } from '@/theme/tokens';

import { useAcceptTerms } from '../hooks/useTerms';
import { TERMS_CHECKS } from '../terms-content';
import { TermsView } from './TermsView';

type CheckKey = keyof typeof TERMS_CHECKS;

/** Mandatory acceptance: the rest of the app stays locked until every box is checked. */
export function AcceptTerms({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const accept = useAcceptTerms(userId);
  const [checked, setChecked] = useState<Record<CheckKey, boolean>>({
    terms: false,
    health: false,
    age: false,
  });
  const allChecked = Object.values(checked).every(Boolean);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-8 pb-12 pt-6"
      showsVerticalScrollIndicator
    >
      <TermsView />

      <View className="gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4">
        {(Object.keys(TERMS_CHECKS) as CheckKey[]).map((key) => (
          <CheckRow
            key={key}
            label={TERMS_CHECKS[key]}
            checked={checked[key]}
            onToggle={() => setChecked((c) => ({ ...c, [key]: !c[key] }))}
          />
        ))}
      </View>

      <View className="gap-3">
        {accept.isError ? (
          <FormMessage message="Não foi possível registrar o aceite. Verifique sua conexão e tente de novo." />
        ) : null}
        <Button
          label="Aceitar e continuar"
          icon="checkmark"
          disabled={!allChecked}
          loading={accept.isPending}
          onPress={() => accept.mutate()}
        />
        {allChecked ? null : (
          <Text className="text-center text-xs text-ink-400">
            Marque as três opções para continuar.
          </Text>
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
