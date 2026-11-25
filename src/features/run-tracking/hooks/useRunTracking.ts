import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { syncPendingRuns, uploadStoredRun } from '../api/run-upload.api';
import { supabaseRunUploader } from '../api/supabase-run-uploader';
import { defaultRunTitle } from '../run-title';
import { runRecorder, runRepository } from '../services/recorder';
import { useRunSessionStore } from '../store/run-session.store';
import type { LocationPermission } from '../types';
import { expoLocationTracker } from '../services/expo-location-tracker';

/** Query key prefix invalidated whenever runs are uploaded. */
export const RUNS_QUERY_KEY = ['runs'] as const;

/**
 * Binds the recorder to the UI store, restores an interrupted run and uploads
 * pending runs (at start and whenever the app returns to the foreground).
 * Mount once, inside the signed-in area.
 */
export function useRunTrackingBootstrap(userId: string): void {
  const setSnapshot = useRunSessionStore((s) => s.setSnapshot);
  const setReady = useRunSessionStore((s) => s.setReady);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = runRecorder.subscribe(setSnapshot);
    void runRecorder
      .restore()
      .catch((error: unknown) => console.warn('[run-recorder] restore failed', error))
      .finally(setReady);
    return unsubscribe;
  }, [setSnapshot, setReady]);

  useEffect(() => {
    const sync = async () => {
      const result = await syncPendingRuns(userId, {
        repository: runRepository,
        uploader: supabaseRunUploader,
      });
      if (result.uploaded.length > 0) {
        await queryClient.invalidateQueries({ queryKey: RUNS_QUERY_KEY });
      }
    };
    void sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => subscription.remove();
  }, [userId, queryClient]);
}

export function useLocationPermission() {
  const [permission, setPermission] = useState<LocationPermission | null>(null);

  useEffect(() => {
    void expoLocationTracker.getPermission().then(setPermission);
  }, []);

  const request = useCallback(async () => {
    const result = await expoLocationTracker.requestPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, request };
}

export type FinishOutcome =
  | { status: 'uploaded'; runId: string }
  /** Saved on the device; will be uploaded automatically later. */
  | { status: 'pending' };

type Pending = 'start' | 'pause' | 'resume' | 'finish' | 'discard' | null;

export const RUN_ERROR_MESSAGES = {
  start: 'Não foi possível iniciar o GPS. Verifique se a localização está ativada.',
  generic: 'Algo deu errado. Tente novamente.',
} as const;

/** Start / pause / resume / finish actions with loading and error state for the UI. */
export function useRunControls({ userId, weightKg }: { userId: string; weightKg: number | null }) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const run = useCallback(async <T>(action: Exclude<Pending, null>, task: () => Promise<T>) => {
    setPending(action);
    setError(null);
    try {
      return await task();
    } catch (cause) {
      console.warn(`[run-controls] ${action} failed`, cause);
      setError(action === 'start' ? RUN_ERROR_MESSAGES.start : RUN_ERROR_MESSAGES.generic);
      return undefined;
    } finally {
      setPending(null);
    }
  }, []);

  const start = () =>
    run('start', async () => {
      await runRecorder.start(userId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

  const pause = () =>
    run('pause', async () => {
      await runRecorder.pause();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });

  const resume = () =>
    run('resume', async () => {
      await runRecorder.resume();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });

  const discard = () => run('discard', () => runRecorder.discard());

  const finish = () =>
    run('finish', async (): Promise<FinishOutcome> => {
      const startedAt = runRecorder.snapshot().run?.session.periods[0]?.startedAt ?? Date.now();
      const finished = await runRecorder.finish({ weightKg, title: defaultRunTitle(startedAt) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const runId = await uploadStoredRun(finished, {
          repository: runRepository,
          uploader: supabaseRunUploader,
        });
        await queryClient.invalidateQueries({ queryKey: RUNS_QUERY_KEY });
        return { status: 'uploaded', runId };
      } catch (uploadError) {
        console.warn('[run-controls] upload deferred', uploadError);
        return { status: 'pending' };
      }
    });

  return { start, pause, resume, finish, discard, pending, error };
}
