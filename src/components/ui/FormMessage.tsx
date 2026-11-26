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
      className={`rounded-xl border px-4 py-3 ${isError ? 'border-danger/30 bg-danger/10' : 'border-bolt-500/30 bg-bolt-500/10'}`}
    >
      <Text className={`text-sm ${isError ? 'text-danger' : 'text-ink-100'}`}>{message}</Text>
    </View>
  );
}
