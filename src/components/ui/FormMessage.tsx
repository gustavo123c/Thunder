import { Text, View } from 'react-native';

type FormMessageProps = {
  message: string | null | undefined;
  tone?: 'error' | 'info';
};

/** Form-level message (e.g. "E-mail ou senha incorretos."). Renders nothing when empty. */
export function FormMessage({ message, tone = 'error' }: FormMessageProps) {
  if (!message) return null;

  const isError = tone === 'error';

  return (
    <View
      accessibilityLiveRegion="polite"
      className={`rounded-xl px-4 py-3 dark:bg-ink-800 ${isError ? 'bg-red-50' : 'bg-bolt-50'}`}
    >
      <Text className={`text-sm ${isError ? 'text-danger' : 'text-ink-700 dark:text-ink-100'}`}>
        {message}
      </Text>
    </View>
  );
}
