import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { HelpCenter } from '../components/HelpCenter';
import { SourcesView } from '../components/SourcesView';
import { HELP_CATEGORIES, searchHelp } from '../help-content';
import { SOURCE_GROUPS } from '../sources';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('help content', () => {
  it('covers the four main topics', () => {
    expect(HELP_CATEGORIES.map((c) => c.id)).toEqual(['run', 'body', 'workouts', 'progress']);
  });

  it('searches without accents or case', () => {
    const results = searchHelp('GRUPO codigo');
    expect(results.flatMap((c) => c.articles.map((a) => a.id))).toEqual(['groups']);
    expect(searchHelp('xyz-nada')).toEqual([]);
    expect(searchHelp('')).toHaveLength(HELP_CATEGORIES.length);
  });

  it('every source has an https link', () => {
    for (const source of SOURCE_GROUPS.flatMap((g) => g.sources)) {
      expect(source.url).toMatch(/^https:\/\//);
    }
  });
});

describe('HelpCenter', () => {
  it('opens a tutorial and filters by search', async () => {
    const user = userEvent.setup();
    await render(<HelpCenter />);

    await user.press(screen.getByRole('button', { name: 'Como gravar uma corrida' }));
    expect(screen.getByText(/Toque em Iniciar/)).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Buscar na ajuda'), 'medalhas');
    expect(screen.getByText('Medalhas')).toBeOnTheScreen();
    expect(screen.queryByText('Como gravar uma corrida')).not.toBeOnTheScreen();
  });
});

describe('SourcesView', () => {
  it('lists references with the honest disclaimer and opens links', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<SourcesView />);
    expect(screen.getByText(/não foram revisadas nem validadas/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('link', { name: /Diretrizes da OMS/ }));
    expect(open).toHaveBeenCalledWith('https://www.who.int/publications/i/item/9789240015128');
  });
});
