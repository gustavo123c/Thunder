import { router } from 'expo-router';

import { RunMediaGallery } from '@/components/media/RunMediaGallery';
import { RunCard } from '@/components/run/RunCard';
import type { FeedItem } from '@/services/supabase/social-json';

import { AuthorRow } from './AuthorRow';
import { SocialBar } from './SocialBar';

/** A run in a feed (home or group): author, metrics, media and Raio/comments. */
export function FeedRunCard({ item, viewerId }: { item: FeedItem; viewerId: string }) {
  return (
    <RunCard
      run={item}
      onPress={() => router.push(`/run/${item.id}`)}
      header={<AuthorRow author={item.author} isViewer={item.userId === viewerId} />}
      media={
        item.media.length > 0 ? (
          <RunMediaGallery media={item.media} size={84} maxVisible={4} />
        ) : undefined
      }
      footer={<SocialBar run={item} viewerId={viewerId} />}
    />
  );
}
