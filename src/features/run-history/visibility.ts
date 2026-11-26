import type { RunRecord } from '@/domain/types/run';

/** `icon` is an Ionicons name. */
export const VISIBILITY_COPY: Record<
  RunRecord['visibility'],
  { label: string; icon: 'globe-outline' | 'people-outline' | 'lock-closed-outline' }
> = {
  public: { label: 'Público', icon: 'globe-outline' },
  followers: { label: 'Seguidores e grupos', icon: 'people-outline' },
  private: { label: 'Só eu', icon: 'lock-closed-outline' },
};
