import { Utf8TextDecoder } from '../polyfills/text-decoder';

it('decodes UTF-8 like the native TextDecoder', () => {
  const text = '{"zone":"Joelho — direção ✓ 🏃"}';
  const bytes = new TextEncoder().encode(text);
  expect(new Utf8TextDecoder().decode(bytes)).toBe(text);
  expect(new Utf8TextDecoder().decode(bytes.buffer)).toBe(text);
});
