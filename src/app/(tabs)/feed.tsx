import { Screen } from '@/components/ui/Screen';
import { useUserId } from '@/features/auth';
import { FeedList } from '@/features/social';

export default function FeedScreen() {
  const viewerId = useUserId();

  return (
    <Screen className="px-0">
      <FeedList viewerId={viewerId} />
    </Screen>
  );
}
