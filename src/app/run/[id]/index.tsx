import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useUserId } from '@/features/auth';
import { RunMediaSection } from '@/features/media';
import { RunCelebration } from '@/features/progress';
import { RunDetailView } from '@/features/run-history';
import { CommentsPreview, SocialBar } from '@/features/social';
import { currentActiveWorkout, useActiveWorkoutStore, WorkoutCheckIn } from '@/features/workouts';

export default function RunDetailScreen() {
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const userId = useUserId();
  const activeWorkout = currentActiveWorkout(useActiveWorkoutStore((s) => s.active));
  const clearWorkout = useActiveWorkoutStore((s) => s.clear);

  // Shown once, right after finishing a run (RecordView navigates with ?celebrate=1).
  const celebrating = celebrate === '1';

  function closeCelebration() {
    clearWorkout(); // the started workout is done
    router.setParams({ celebrate: undefined });
  }

  return (
    <>
      <RunDetailView
        runId={id}
        viewerId={userId}
        renderMedia={(detail) => (
          <RunMediaSection
            runId={detail.id}
            media={detail.media}
            ownerId={detail.userId === userId ? userId : null}
          />
        )}
        renderSocial={(detail) => (
          <View className="gap-6">
            <SocialBar run={detail} viewerId={userId} />
            <CommentsPreview runId={detail.id} viewerId={userId} />
          </View>
        )}
      />
      {celebrating ? (
        <RunCelebration userId={userId} runId={id} visible onClose={closeCelebration}>
          {activeWorkout?.forPain ? (
            <WorkoutCheckIn userId={userId} workoutId={activeWorkout.id} runId={id} />
          ) : null}
        </RunCelebration>
      ) : null}
    </>
  );
}
