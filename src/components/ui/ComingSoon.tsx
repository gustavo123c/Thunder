import { Text, View } from 'react-native';

import { Screen } from './Screen';

type ComingSoonProps = {
  title: string;
  description: string;
};

/** Temporary placeholder used by screens whose module is not built yet. */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Screen className="items-center justify-center">
      <View className="items-center gap-2">
        <Text className="text-2xl font-bold text-ink-900 dark:text-ink-50">{title}</Text>
        <Text className="text-center text-base text-ink-500 dark:text-ink-300">{description}</Text>
      </View>
    </Screen>
  );
}
