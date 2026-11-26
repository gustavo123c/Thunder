import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Every screen in src/app/(tabs) must be registered in the tab bar, with a title
 * and an icon. (A missing <Tabs.Screen> once hid the whole Training tab.)
 */
const TABS_DIR = join(__dirname, '..', '..', 'app', '(tabs)');

it('registers every tab screen in the tab bar', () => {
  const screens = readdirSync(TABS_DIR)
    .filter((file) => file.endsWith('.tsx') && !file.startsWith('_'))
    .map((file) => file.replace(/\.tsx$/, ''))
    .sort();
  const layout = readFileSync(join(TABS_DIR, '_layout.tsx'), 'utf8');
  const registered = [...layout.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)]
    .map((m) => m[1])
    .sort();

  expect(registered).toEqual(screens);
  expect(screens).toContain('training');
});
