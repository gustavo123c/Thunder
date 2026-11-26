import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { useAuth, useSignOut } from '@/features/auth';
import { colors } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-400">
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
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-ink-700"
    >
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.ink[300]} />
      <Text className={`flex-1 text-base ${destructive ? 'text-danger' : 'text-ink-50'}`}>
        {label}
      </Text>
      {detail ? <Text className="text-sm text-ink-400">{detail}</Text> : null}
      {onPress && !destructive ? (
        <Ionicons name="chevron-forward" size={18} color={colors.ink[500]} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { session } = useAuth();
  const signOut = useSignOut();
  const version = Constants.expoConfig?.version ?? '—';

  function confirmSignOut() {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut.mutate() },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-ink-900" contentContainerClassName="gap-6 px-4 pb-12 pt-4">
      <Section title="Conta">
        <Row icon="mail-outline" label="E-mail" detail={session?.user.email ?? ''} />
        <Row
          icon="create-outline"
          label="Editar perfil"
          onPress={() => router.push('/profile/edit')}
        />
        <Row icon="log-out-outline" label="Sair" onPress={confirmSignOut} destructive />
      </Section>

      <Section title="Saúde">
        <View className="px-3 py-2">
          <HealthDisclaimer variant="full" />
        </View>
      </Section>

      <Section title="Sobre">
        <Row icon="flash-outline" label="Thunder" detail={`versão ${version}`} />
        <View className="gap-2 px-3 py-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-ink-400">
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
