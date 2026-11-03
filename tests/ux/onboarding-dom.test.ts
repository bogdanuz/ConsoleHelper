/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBookmarkletReadable } from '../../src/ui/bookmarklet';

describe('onboarding copy-then-continue', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="onboard">
        <button type="button" data-onboard-primary>Скопировать</button>
        <button type="button" data-onboard-continue hidden>Продолжить</button>
        <p data-onboard-copied hidden>Скопировано. Теперь нажми «Продолжить».</p>
      </section>
    `;
  });

  it('shows continue only after successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const primary = document.querySelector('[data-onboard-primary]') as HTMLButtonElement;
    const cont = document.querySelector('[data-onboard-continue]') as HTMLButtonElement;
    const note = document.querySelector('[data-onboard-copied]') as HTMLElement;

    primary.addEventListener('click', async () => {
      await navigator.clipboard.writeText(
        buildBookmarkletReadable('https://example.github.io/ConsoleHelper/'),
      );
      cont.hidden = false;
      note.hidden = false;
    });

    expect(cont.hidden).toBe(true);
    primary.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(cont.hidden).toBe(false);
    expect(note.hidden).toBe(false);
    expect(writeText.mock.calls[0]![0]).toMatch(/^javascript:/);
  });
});
