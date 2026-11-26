import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Screen } from './Screen';

type AuthScreenLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** Brand header + scrollable, keyboard-aware body for sign in / sign up. */
export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-8 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-bolt-500">
                <Ionicons name="flash" size={24} color={colors.onBolt} />
              </View>
              <Text className="text-4xl font-bold tracking-tight text-ink-50">Thunder</Text>
            </View>
            <Text className="text-2xl font-bold text-ink-50">{title}</Text>
            <Text className="text-base text-ink-300">{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
