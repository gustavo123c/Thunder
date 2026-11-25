import type { RunRecord } from '@/domain/types/run';

export const VISIBILITY_COPY: Record<RunRecord['visibility'], { label: string; icon: string }> = {
  public: { label: 'Público', icon: '🌎' },
  followers: { label: 'Seguidores', icon: '👥' },
  private: { label: 'Só eu', icon: '🔒' },
};
