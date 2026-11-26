import { useState } from 'react';

import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useUserId } from '@/features/auth';
import { FeedList, GroupsPanel } from '@/features/social';

type FeedTab = 'feed' | 'groups';

const TABS = [
  { value: 'feed', label: 'Feed' },
  { value: 'groups', label: 'Grupos' },
] as const satisfies readonly { value: FeedTab; label: string }[];

export default function FeedScreen() {
  const viewerId = useUserId();
  const [tab, setTab] = useState<FeedTab>('feed');

  const switcher = (
    <SegmentedControl
      role="tab"
      accessibilityLabel="Feed ou grupos"
      options={TABS}
      value={tab}
      onChange={setTab}
    />
  );

  return (
    <Screen className="px-0">
      {tab === 'feed' ? (
        <FeedList viewerId={viewerId} header={switcher} />
      ) : (
        <GroupsPanel header={switcher} />
      )}
    </Screen>
  );
}
