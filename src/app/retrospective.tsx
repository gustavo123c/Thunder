import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserId } from '@/features/auth';
import { RetrospectiveView } from '@/features/progress';

export default function RetrospectiveScreen() {
  const userId = useUserId();

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-ink-900">
      <ScrollView contentContainerClassName="gap-5 px-4 pb-10 pt-4">
        <RetrospectiveView userId={userId} />
      </ScrollView>
    </SafeAreaView>
  );
}
