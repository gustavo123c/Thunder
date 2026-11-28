import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth, useSignOut, useUserId } from '@/features/auth';
import { useDeleteAllWorkouts, useRecentWorkouts } from '@/features/workouts';
import { useThemePreference } from '@/theme/AppThemeProvider';
import { type ThemePreference, useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 font-mono-medium text-[11px] uppercase tracking-[1.5px] text-ink-400">
        {title}
      </Text>
      <Card className="gap-1 p-2">{children}</Card>
    </View>
  );
}

function Row({
  icon,
  label,
  detail,
  onPress,
  destructive = false,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-ink-700"
    >
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : theme.ink[300]} />
      <Text className={`flex-1 text-base ${destructive ? 'text-danger' : 'text-ink-50'}`}>
        {label}
      </Text>
      {detail ? <Text className="text-sm text-ink-400">{detail}</Text> : null}
      {onPress && !destructive ? (
        <Ionicons name="chevron-forward" size={18} color={theme.ink[500]} />
      ) : null}
    </Pressable>
  );
}

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

function AppearancePicker() {
  const { preference, setPreference } = useThemePreference();
  return (
    <View className="gap-2 px-2 py-2">
      <SegmentedControl
        accessibilityLabel="Aparência"
        options={APPEARANCE_OPTIONS}
        value={preference}
        onChange={setPreference}
      />
      <Text className="px-1 text-xs text-ink-400">
        {preference === 'system'
          ? 'Segue o modo claro ou escuro do seu celular.'
          : 'Salvo neste aparelho.'}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { session } = useAuth();
  const signOut = useSignOut();
  const userId = useUserId();
  const savedWorkouts = useRecentWorkouts(userId);
  const deleteAll = useDeleteAllWorkouts(userId);
  const savedCount = savedWorkouts.data?.length ?? 0;
  const version = Constants.expoConfig?.version ?? '—';

  function confirmSignOut() {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut.mutate() },
    ]);
  }

  function confirmDeleteAll() {
    Alert.alert(
      'Apagar todos os treinos salvos?',
      'Os treinos montados na aba Treino e os check-ins deles serão apagados. Suas corridas continuam no Histórico. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar todos',
          style: 'destructive',
          onPress: () =>
            deleteAll.mutate(undefined, {
              onError: () =>
                Alert.alert('Não foi possível apagar', 'Verifique sua conexão e tente de novo.'),
            }),
        },
      ],
    );
  }

  return (
    <ScrollView
      testID="settings-scroll"
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 px-4 pb-12 pt-4"
    >
      <Section title="Aparência">
        <AppearancePicker />
      </Section>

      <Section title="Conta">
        <Row icon="mail-outline" label="E-mail" detail={session?.user.email ?? ''} />
        <Row
          icon="create-outline"
          label="Editar perfil"
          onPress={() => router.push('/profile/edit')}
        />
        <Row
          icon="medical-outline"
          label="Questionário de saúde"
          onPress={() => router.push('/anamnese')}
        />
        <Row icon="log-out-outline" label="Sair" onPress={confirmSignOut} destructive />
      </Section>

      <Section title="Treinos">
        <Row
          icon="trash-outline"
          label="Apagar todos os treinos salvos"
          detail={savedCount === 0 ? 'Nenhum treino salvo' : undefined}
          onPress={savedCount > 0 && !deleteAll.isPending ? confirmDeleteAll : undefined}
          destructive={savedCount > 0}
        />
      </Section>

      <Section title="Ajuda">
        <Row
          icon="help-circle-outline"
          label="Central de ajuda"
          onPress={() => router.push('/help')}
        />
        <Row
          icon="library-outline"
          label="Base científica e fontes"
          onPress={() => router.push('/sources')}
        />
      </Section>

      <Section title="Saúde">
        <View className="px-3 py-2">
          <HealthDisclaimer variant="full" />
        </View>
      </Section>

      <Section title="Sobre">
        <Row icon="flash-outline" label="Thunder" detail={`versão ${version}`} />
        <View className="gap-2 px-3 py-2">
          <Text className="font-mono-medium text-xs uppercase tracking-wider text-ink-400">
            Créditos e licenças
          </Text>
          <Text className="text-sm leading-5 text-ink-300">
            Ilustração anatômica do mapa corporal: react-native-body-highlighter, © HichamELBSI,
            licença MIT.
          </Text>
          <Text className="text-sm leading-5 text-ink-300">
            Mapas: © Mapbox, © OpenStreetMap. Ícones: Ionicons (licença MIT).
          </Text>
        </View>
      </Section>
    </ScrollView>
  );
}
