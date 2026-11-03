import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('fat bookmarklet', () => {
  it('artifact exists and embeds tools without fetch of tools.json', () => {
    const path = join(root, 'public/fat-bookmarklet.txt');
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, 'utf8');
    expect(text.startsWith('javascript:void(')).toBe(true);
    expect(text.length).toBeGreaterThan(5_000);
    expect(text.length).toBeLessThan(2_000_000);
    const m = text.match(/atob\("([^"]+)"\)/);
    expect(m).toBeTruthy();
    const payload = Buffer.from(m![1]!, 'base64').toString('utf8');
    expect(payload).toContain('__CH_BUNDLE__');
    expect(payload).toContain('https://bogdanuz.github.io/ConsoleHelper/tools/');
  });

  it('launcher supports __CH_BUNDLE__', () => {
    const code = readFileSync(join(root, 'public/tools/launcher.js'), 'utf8');
    expect(code).toContain('__CH_BUNDLE__');
    expect(code).toContain('runEmbedded');
  });
});
