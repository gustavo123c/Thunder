import { Screen } from '@/components/ui/Screen';
import { useUserId } from '@/features/auth';
import { RunHistoryList } from '@/features/run-history';
import { PendingRunsBanner } from '@/features/run-tracking';

export default function HistoryScreen() {
  const userId = useUserId();

  return (
    <Screen className="px-0">
      <RunHistoryList userId={userId} header={<PendingRunsBanner userId={userId} />} />
    </Screen>
  );
}
