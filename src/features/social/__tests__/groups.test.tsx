import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, Share } from 'react-native';

import {
  createGroup,
  fetchGroupFeed,
  fetchLeaderboard,
  fetchMyGroups,
  joinGroup,
  leaveGroup,
  normalizeInviteCode,
} from '../api/groups.api';
import { GroupDetailView, inviteMessage } from '../components/GroupDetailView';
import { CreateGroupForm, JoinGroupForm } from '../components/GroupForms';
import { GroupsPanel } from '../components/GroupsPanel';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../api/groups.api', () => ({
  ...jest.requireActual('../api/groups.api'),
  fetchMyGroups: jest.fn(),
  createGroup: jest.fn(),
  joinGroup: jest.fn(),
  leaveGroup: jest.fn(),
  deleteGroup: jest.fn(),
  fetchLeaderboard: jest.fn(),
  fetchGroupFeed: jest.fn(),
}));

const group = {
  id: 'g1',
  name: 'Corre Galera',
  inviteCode: '3FA9C21B',
  ownerId: 'owner',
  memberCount: 3,
  createdAt: '2026-11-01T00:00:00Z',
};

const author = (id: string, fullName: string) => ({
  id,
  username: null,
  fullName,
  avatarUrl: null,
});

let queryClient: QueryClient | undefined;
async function renderWithQuery(node: React.ReactElement) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  await render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchMyGroups).mockResolvedValue([group]);
  jest.mocked(fetchGroupFeed).mockResolvedValue([]);
  jest.mocked(fetchLeaderboard).mockResolvedValue([
    { author: author('ana', 'Ana Souza'), distanceM: 12_500, runs: 3, movingTimeS: 4000 },
    { author: author('me', 'Gustavo'), distanceM: 8000, runs: 2, movingTimeS: 2800 },
    { author: author('bia', 'Bia Lima'), distanceM: 0, runs: 0, movingTimeS: 0 },
  ]);
});
afterEach(() => queryClient?.clear());

describe('groups', () => {
  it('normalizes invite codes', () => {
    expect(normalizeInviteCode(' 3fa9-c21b ')).toBe('3FA9C21B');
  });

  it('lists my groups and offers create / join', async () => {
    const user = userEvent.setup();
    await renderWithQuery(<GroupsPanel />);

    expect(await screen.findByText('Corre Galera')).toBeOnTheScreen();
    expect(screen.getByText('3 membros')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Entrar com código' }));
    expect(router.push).toHaveBeenCalledWith('/group/join');
    await user.press(screen.getByRole('button', { name: 'Grupo Corre Galera, 3 membros' }));
    expect(router.push).toHaveBeenCalledWith('/group/g1');
  });

  it('creates a group and opens it', async () => {
    jest.mocked(createGroup).mockResolvedValue('g-new');
    const user = userEvent.setup();
    await renderWithQuery(<CreateGroupForm />);

    expect(screen.getByRole('button', { name: 'Criar grupo' })).toBeDisabled();
    await user.type(screen.getByLabelText('Nome do grupo'), 'Pace de Domingo');
    await user.press(screen.getByRole('button', { name: 'Criar grupo' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/group/g-new'));
    expect(createGroup).toHaveBeenCalledWith('Pace de Domingo');
  });

  it('explains an unknown invite code', async () => {
    jest.mocked(joinGroup).mockRejectedValue({ code: 'P0002' });
    const user = userEvent.setup();
    await renderWithQuery(<JoinGroupForm initialCode="3fa9 c21b" />);

    await user.press(screen.getByRole('button', { name: 'Entrar no grupo' }));
    expect(await screen.findByText(/Código não encontrado/)).toBeOnTheScreen();
    expect(joinGroup).toHaveBeenCalledWith('3FA9C21B');
  });

  it('shows the weekly ranking with podium and the invite code', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const user = userEvent.setup();
    await renderWithQuery(<GroupDetailView groupId="g1" viewerId="me" />);

    expect(await screen.findByText('3FA9C21B')).toBeOnTheScreen();
    expect(
      await screen.findByLabelText('1º lugar, Ana Souza, 12,5 quilômetros em 3 corridas'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Gustavo (você)')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Convidar' }));
    expect(share).toHaveBeenCalledWith({ message: inviteMessage(group) });
    expect(inviteMessage(group)).toMatch(/código 3FA9C21B/);
  });

  it('lets a member leave the group', async () => {
    jest.mocked(leaveGroup).mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await renderWithQuery(<GroupDetailView groupId="g1" viewerId="me" />);

    await user.press(await screen.findByRole('button', { name: 'Sair do grupo' }));
    const buttons = alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Sair')!.onPress!();
    await waitFor(() => expect(leaveGroup).toHaveBeenCalledWith('g1', 'me'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('shows the group feed tab', async () => {
    const user = userEvent.setup();
    await renderWithQuery(<GroupDetailView groupId="g1" viewerId="me" />);
    await user.press(await screen.findByRole('tab', { name: 'Feed do grupo' }));
    expect(await screen.findByText('Nenhuma corrida ainda')).toBeOnTheScreen();
  });
});
