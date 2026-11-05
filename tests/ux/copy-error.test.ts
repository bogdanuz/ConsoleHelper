/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('bookmark copy failure', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.resetModules();
  });

  it('shows the command and Continue when the clipboard refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await import('../../src/main');

    const primary = () => document.querySelector('[data-onboard-primary]') as HTMLButtonElement;
    expect((document.querySelector('[data-onboard-hotkey]') as HTMLElement).hidden).toBe(true);
    primary().click();
    primary().click();

    await vi.waitFor(() => {
      expect((document.querySelector('[data-onboard-error]') as HTMLElement).hidden).toBe(false);
    });
    const fallback = document.querySelector('[data-onboard-fallback]') as HTMLTextAreaElement;
    expect(fallback.hidden).toBe(false);
    expect(fallback.value).toMatch(/^javascript:/);
    expect((document.querySelector('[data-onboard-continue]') as HTMLButtonElement).hidden).toBe(false);
    const errorText = (document.querySelector('[data-onboard-error]') as HTMLElement).textContent || '';
    expect(errorText).toContain('Не удалось скопировать');
    expect(errorText).not.toMatch(/writeText|Failed to execute/i);
  });
});
