/**
 * Runs the real NativeWind runtime (react-native-css-interop test harness) on the exact
 * CSS Tailwind generates for our themed tokens, to check that both themes resolve.
 */
import { View } from 'react-native';
import {
  registerCSS,
  render,
  screen,
  setupAllComponents,
} from 'react-native-css-interop/dist/test';

import { themeVariables } from '../theme';

// Output of `tailwindcss` for these classes with our config (see tailwind.config.js).
const CSS = `
.bg-ink-800 { --tw-bg-opacity: 1; background-color: rgb(var(--ink-800) / var(--tw-bg-opacity, 1)); }
.text-ink-50 { --tw-text-opacity: 1; color: rgb(var(--ink-50) / var(--tw-text-opacity, 1)); }
.bg-ink-900\\/70 { background-color: rgb(var(--ink-900) / 0.7); }
.text-accent { --tw-text-opacity: 1; color: rgb(var(--accent) / var(--tw-text-opacity, 1)); }
.border-hairline { border-color: var(--hairline); }
`;

beforeAll(() => setupAllComponents());

function Probe({ scheme }: { scheme: 'light' | 'dark' }) {
  return (
    <View style={themeVariables[scheme]}>
      <View testID="card" className="border-hairline bg-ink-800" />
      <View testID="text" className="text-ink-50" />
      <View testID="accent" className="text-accent" />
      <View testID="overlay" className="bg-ink-900/70" />
    </View>
  );
}

function styleOf(testID: string) {
  return screen.getByTestId(testID).props.style as Record<string, unknown>;
}

describe.each([
  [
    'dark',
    {
      card: 'rgba(18, 23, 33, 1)',
      text: 'rgba(245, 247, 250, 1)',
      accent: 'rgba(250, 204, 21, 1)',
      hairline: 'rgba(255, 255, 255, 0.08)',
    },
  ],
  [
    'light',
    {
      card: 'rgba(255, 255, 255, 1)',
      text: 'rgba(11, 18, 32, 1)',
      accent: 'rgba(11, 18, 32, 1)',
      hairline: 'rgba(11, 18, 32, 0.09)',
    },
  ],
] as const)('%s theme', (scheme, expected) => {
  it('resolves surfaces, text, accent and hairline', async () => {
    registerCSS(CSS);
    await render(<Probe scheme={scheme} />);
    expect(styleOf('card')).toMatchObject({
      backgroundColor: expected.card,
      borderColor: expected.hairline,
    });
    expect(styleOf('text')).toMatchObject({ color: expected.text });
    expect(styleOf('accent')).toMatchObject({ color: expected.accent });
  });
});
