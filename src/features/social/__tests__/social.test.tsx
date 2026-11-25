import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { parseFeed, parseProfileStats } from '@/services/supabase/social-json';
import detailFixture from '@/services/supabase/__tests__/fixtures/run-detail.json';

import { fetchFeed, giveKudo } from '../api/social.api';
import { FeedList } from '../components/FeedList';
import { applyKudo, applyKudoToPages } from '../kudos-cache';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('../api/social.api', () => {
  const actual = jest.requireActual('../api/social.api');
  return { ...actual, fetchFeed: jest.fn(), giveKudo: jest.fn(), removeKudo: jest.fn() };
});

const VIEWER = 'viewer-1';
const feedJson = [
  {
    ...detailFixture,
    id: 'run-a',
    title: 'Longão de domingo',
    kudos_count: 2,
    has_kudo: false,
  },
  {
    ...detailFixture,
    id: 'run-b',
    user_id: VIEWER,
    title: 'Meu treino',
    author: { ...detailFixture.author, id: VIEWER },
  },
];

describe('kudos cache helpers', () => {
  const item = { id: 'r1', hasKudo: false, kudosCount: 2 };

  it('adds and removes a kudo on the matching run only', () => {
    expect(applyKudo(item, 'r1', true)).toEqual({ id: 'r1', hasKudo: true, kudosCount: 3 });
    expect(applyKudo(item, 'other', true)).toBe(item);
    expect(applyKudo({ ...item, kudosCount: 0, hasKudo: true }, 'r1', false).kudosCount).toBe(0);
  });

  it('is idempotent for repeated taps', () => {
    const liked = applyKudo(item, 'r1', true);
    expect(applyKudo(liked, 'r1', true)).toBe(liked);
  });

  it('updates every page of an infinite query', () => {
    const data = { pages: [[item], [{ ...item, id: 'r2' }]], pageParams: [null, 'x'] };
    expect(applyKudoToPages(data, 'r2', true)?.pages[1]?.[0]?.kudosCount).toBe(3);
    expect(applyKudoToPages(undefined, 'r2', true)).toBeUndefined();
  });
});

describe('social JSON parsing', () => {
  it('parses feed items with author and kudo state', () => {
    const [first] = parseFeed(feedJson);
    expect(first).toMatchObject({ id: 'run-a', hasKudo: false, kudosCount: 2 });
    expect(first?.author.username).toBe('ana.corre');
  });

  it('parses profile stats', () => {
    expect(
      parseProfileStats({
        profile: detailFixture.author,
        followers_count: 3,
        following_count: 1,
        is_following: true,
        runs_count: 12,
        total_distance_m: '61234.5',
      }),
    ).toMatchObject({ followersCount: 3, isFollowing: true, totalDistanceM: 61234.5 });
  });
});

describe('FeedList', () => {
  let queryClient: QueryClient;

  async function renderFeed() {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    await render(
      <QueryClientProvider client={queryClient}>
        <FeedList viewerId={VIEWER} />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    jest.mocked(fetchFeed).mockResolvedValue(parseFeed(feedJson));
  });
  afterEach(() => queryClient.clear());

  it('renders runs with their authors', async () => {
    await renderFeed();
    expect(await screen.findByText('Longão de domingo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Perfil de Ana Souza')).toBeOnTheScreen();
    expect(screen.getByLabelText('Perfil de Você')).toBeOnTheScreen();
  });

  it('gives a Raio optimistically', async () => {
    let resolveKudo: () => void = () => {};
    jest.mocked(giveKudo).mockReturnValue(new Promise<void>((r) => (resolveKudo = r)));
    await renderFeed();

    await userEvent.setup().press(await screen.findByLabelText('Dar raio. 2 raios'));
    // Updated before the server answers
    expect(screen.getByLabelText('Remover raio. 3 raios')).toBeOnTheScreen();
    expect(giveKudo).toHaveBeenCalledWith('run-a', VIEWER);
    resolveKudo();
  });

  it('rolls back the Raio when the server rejects it', async () => {
    jest.mocked(giveKudo).mockRejectedValue(new Error('offline'));
    await renderFeed();

    await userEvent.setup().press(await screen.findByLabelText('Dar raio. 2 raios'));
    await waitFor(() => expect(screen.getByLabelText('Dar raio. 2 raios')).toBeOnTheScreen());
  });

  it('does not let you give a Raio to your own run', async () => {
    await renderFeed();
    const ownKudos = (await screen.findAllByRole('button', { name: /raios/ }))[1];
    expect(ownKudos).toBeDisabled();
  });
});
