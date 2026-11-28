import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { Profile } from '@/domain/types/profile';

import { ProfileHeader } from '../components/ProfileHeader';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const profile: Profile = {
  id: 'u1',
  username: 'gustavo',
  fullName: 'Gustavo Costa',
  avatarUrl: null,
  level: 'beginner',
  weightKg: 70,
  heightCm: 175,
  birthDate: null,
  mainGoal: 'complete_5k',
  goalTargetPaceSPerKm: null,
  onboardedAt: '2026-11-01T00:00:00Z',
  healthConsentAt: null,
  sex: null,
};

it('opens edit profile, settings and help from the header', async () => {
  const user = userEvent.setup();
  await render(<ProfileHeader profile={profile} />);

  expect(screen.getByText('@gustavo')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Configurações' }));
  expect(router.push).toHaveBeenCalledWith('/settings');
  await user.press(screen.getByRole('button', { name: 'Editar perfil' }));
  expect(router.push).toHaveBeenCalledWith('/profile/edit');
  await user.press(screen.getByRole('button', { name: 'Ajuda' }));
  expect(router.push).toHaveBeenCalledWith('/help');
});
