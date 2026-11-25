import { useUserId } from '@/features/auth';
import { useProfile } from '@/features/profile';
import { RecordView } from '@/features/run-tracking';

export default function RecordScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);

  return <RecordView userId={userId} weightKg={profile?.weightKg ?? null} />;
}
