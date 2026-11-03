import { describe, expect, it } from 'vitest';
import { buildUserScript, userscriptFileName } from '../../src/ui/userscript';

describe('userscript generator', () => {
  it('emits installable metadata and hotkey boot', () => {
    const s = buildUserScript('https://example.github.io/ConsoleHelper/tools/');
    expect(s).toContain('==UserScript==');
    expect(s).toContain('@match        *://*/*');
    expect(s).toContain('KeyH');
    expect(s).toContain('https://example.github.io/ConsoleHelper/tools/');
    expect(s).toContain('launcher.js');
    expect(userscriptFileName()).toBe('consolehelper.user.js');
  });
});
