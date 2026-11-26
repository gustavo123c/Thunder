import { useUserId } from '@/features/auth';
import { PainHistoryView } from '@/features/health';

export default function PainHistoryScreen() {
  return <PainHistoryView userId={useUserId()} />;
}
