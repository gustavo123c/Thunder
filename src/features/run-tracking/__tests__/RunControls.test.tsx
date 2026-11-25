import { render, screen, userEvent } from '@testing-library/react-native';

import { RunControls } from '../components/RunControls';

const handlers = () => ({
  onStart: jest.fn(),
  onPause: jest.fn(),
  onResume: jest.fn(),
  onFinish: jest.fn(),
});

it('offers only "Iniciar" before a run', async () => {
  const h = handlers();
  await render(<RunControls status={null} pending={null} {...h} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Iniciar' }));
  expect(h.onStart).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeOnTheScreen();
});

it('requires pausing before finishing', async () => {
  const h = handlers();
  await render(<RunControls status="running" pending={null} {...h} />);
  expect(screen.getByRole('button', { name: 'Pausar' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeOnTheScreen();
});

it('shows resume and finish while paused', async () => {
  const h = handlers();
  const user = userEvent.setup();
  await render(<RunControls status="paused" pending={null} {...h} />);
  await user.press(screen.getByRole('button', { name: 'Retomar' }));
  await user.press(screen.getByRole('button', { name: 'Finalizar' }));
  expect(h.onResume).toHaveBeenCalled();
  expect(h.onFinish).toHaveBeenCalled();
});

it('disables every action while one is pending', async () => {
  const h = handlers();
  await render(<RunControls status="paused" pending="finish" {...h} />);
  expect(screen.getByRole('button', { name: 'Retomar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Finalizar' })).toBeDisabled();
});
