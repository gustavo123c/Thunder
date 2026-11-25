import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

/** Base container for every screen: safe areas + themed background. */
export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900" edges={['top']}>
      <View className={`flex-1 px-4 ${className}`}>{children}</View>
    </SafeAreaView>
  );
}
