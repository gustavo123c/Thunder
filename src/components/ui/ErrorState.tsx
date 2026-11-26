import { Text, View } from 'react-native';

import { Button } from './Button';
import { Screen } from './Screen';

type Action = { label: string; onPress: () => void; loading?: boolean };

type ErrorStateProps = {
  title: string;
  description: string;
  primaryAction: Action;
  secondaryAction?: Action;
};

export function ErrorState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <Screen className="justify-center gap-6">
      <View className="items-center gap-2">
        <Text className="text-center font-display text-[22px] text-ink-50">{title}</Text>
        <Text className="text-center text-base text-ink-300">{description}</Text>
      </View>
      <View className="gap-3">
        <Button {...primaryAction} />
        {secondaryAction ? <Button variant="ghost" {...secondaryAction} /> : null}
      </View>
    </Screen>
  );
}
