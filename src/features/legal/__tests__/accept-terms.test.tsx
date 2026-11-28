import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { acceptTerms } from '../api/terms.api';
import { AcceptTerms } from '../components/AcceptTerms';
import { TERMS_CHECKS, TERMS_SECTIONS } from '../terms-content';

jest.mock('@/services/supabase/client', () => ({ supabase: {} }));
jest.mock('../api/terms.api', () => ({ acceptTerms: jest.fn(), fetchTermsAcceptance: jest.fn() }));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});
const renderWithQuery = (ui: ReactElement) =>
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(acceptTerms).mockResolvedValue(undefined);
});
afterEach(() => queryClient.clear());

it('shows the terms and only accepts after every box is checked', async () => {
  const user = userEvent.setup();
  await renderWithQuery(<AcceptTerms userId="u1" onSignOut={jest.fn()} />);

  expect(screen.getByText(TERMS_SECTIONS[0]!.title)).toBeOnTheScreen();
  const button = screen.getByRole('button', { name: 'Aceitar e continuar' });
  expect(button).toBeDisabled();

  await user.press(screen.getByRole('checkbox', { name: TERMS_CHECKS.terms }));
  await user.press(screen.getByRole('checkbox', { name: TERMS_CHECKS.health }));
  expect(button).toBeDisabled();
  await user.press(screen.getByRole('checkbox', { name: TERMS_CHECKS.age }));
  expect(button).toBeEnabled();

  await user.press(button);
  await waitFor(() => expect(acceptTerms).toHaveBeenCalledWith('u1'));
});

it('lets the person sign out without accepting', async () => {
  const onSignOut = jest.fn();
  await renderWithQuery(<AcceptTerms userId="u1" onSignOut={onSignOut} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Sair da conta' }));
  expect(onSignOut).toHaveBeenCalled();
  expect(acceptTerms).not.toHaveBeenCalled();
});

it('keeps the draft free of blanket liability waivers', () => {
  const text = TERMS_SECTIONS.flatMap((s) => s.paragraphs)
    .join(' ')
    .toLowerCase();
  expect(text).not.toMatch(/isent[ao]s? de (qualquer|toda)|não nos responsabilizamos/);
  expect(text).toContain('código de defesa do consumidor');
});
