/**
 * Minimal UTF-8 TextDecoder for engines without one (three's GLTFLoader decodes the .glb
 * JSON chunk with it). Installed only when the global is missing.
 */
class Utf8TextDecoder {
  readonly encoding = 'utf-8';

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    if (!input) return '';
    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    let out = '';
    let i = 0;
    while (i < bytes.length) {
      const b0 = bytes[i++]!;
      let code: number;
      if (b0 < 0x80) code = b0;
      else if (b0 < 0xe0) code = ((b0 & 0x1f) << 6) | (bytes[i++]! & 0x3f);
      else if (b0 < 0xf0) {
        code = ((b0 & 0x0f) << 12) | ((bytes[i++]! & 0x3f) << 6) | (bytes[i++]! & 0x3f);
      } else {
        code =
          ((b0 & 0x07) << 18) |
          ((bytes[i++]! & 0x3f) << 12) |
          ((bytes[i++]! & 0x3f) << 6) |
          (bytes[i++]! & 0x3f);
      }
      out += String.fromCodePoint(code);
    }
    return out;
  }
}

export function installTextDecoder(): void {
  const scope = globalThis as { TextDecoder?: unknown };
  if (typeof scope.TextDecoder === 'undefined') scope.TextDecoder = Utf8TextDecoder;
}

export { Utf8TextDecoder };
