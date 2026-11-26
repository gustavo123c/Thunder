import { useLocalSearchParams } from 'expo-router';

import { JoinGroupForm } from '@/features/social';

/** Also opened by links like thunder://group/join?code=3FA9C21B */
export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <JoinGroupForm initialCode={code ?? ''} />;
}
