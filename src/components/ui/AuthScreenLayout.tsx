import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

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
            <Text className="text-4xl font-black text-ink-900 dark:text-ink-50">
              Thunder <Text className="text-bolt-500">⚡</Text>
            </Text>
            <Text className="text-2xl font-bold text-ink-900 dark:text-ink-50">{title}</Text>
            <Text className="text-base text-ink-500 dark:text-ink-300">{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
