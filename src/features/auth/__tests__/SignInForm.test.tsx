import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';

import { signIn } from '../api/auth.api';
import { SignInForm } from '../components/SignInForm';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return { Link: ({ children }: { children: string }) => <Text>{children}</Text> };
});

jest.mock('../api/auth.api', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
}));

const mockedSignIn = jest.mocked(signIn);
let queryClient: QueryClient;

async function renderForm() {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <SignInForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => queryClient.clear());

it('validates fields before calling the API', async () => {
  const user = userEvent.setup();
  await renderForm();

  await user.press(screen.getByRole('button', { name: 'Entrar' }));

  expect(screen.getByText('Informe um e-mail válido.')).toBeOnTheScreen();
  expect(screen.getByText('Informe sua senha.')).toBeOnTheScreen();
  expect(mockedSignIn).not.toHaveBeenCalled();
});

it('shows a Portuguese message for wrong credentials', async () => {
  const user = userEvent.setup();
  mockedSignIn.mockRejectedValue({ code: 'invalid_credentials', status: 400 });
  await renderForm();

  await user.type(screen.getByLabelText('E-mail'), 'ana@thunder.app');
  await user.type(screen.getByLabelText('Senha'), 'errada123');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));

  expect(mockedSignIn).toHaveBeenCalledWith('ana@thunder.app', 'errada123');
  expect(await screen.findByText('E-mail ou senha incorretos.')).toBeOnTheScreen();
});
