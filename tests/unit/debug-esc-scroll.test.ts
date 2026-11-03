/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  await fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '118115' },
    body: JSON.stringify({
      sessionId: '118115',
      runId: 'review3',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

describe('esc during autoscroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>Demo line</p>';
    window.scrollTo = () => undefined;
    delete (window as unknown as { __tx?: unknown }).__tx;
    delete (window as unknown as { __ch_shot?: unknown }).__ch_shot;
  });

  it('H1: text-to-table Esc during scroll', async () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    (0, eval)(code);
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /подгружается/i.test(b.textContent || ''),
    ) as HTMLButtonElement;
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    const alive = !!(window as unknown as { __tx?: unknown }).__tx;
    const note = document.body.textContent || '';
    await agentLog('H1', 'debug-esc-scroll:H1', 'after esc during text scroll', {
      alive,
      noteHasStop: /Остановлено|стоп/i.test(note),
    });
    expect(alive).toBe(true);
    (window as unknown as { __tx?: { destroy: () => void } }).__tx?.destroy();
  });

  it('H2: screenshot Esc during scroll', async () => {
    const code = readFileSync(join(root, 'public/tools/screenshot.js'), 'utf8');
    (0, eval)(code);
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /подгружается/i.test(b.textContent || ''),
    ) as HTMLButtonElement;
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    const alive = !!(window as unknown as { __ch_shot?: unknown }).__ch_shot;
    await agentLog('H2', 'debug-esc-scroll:H2', 'after esc during shot scroll', { alive });
    expect(alive).toBe(true);
    (window as unknown as { __ch_shot?: { destroy: () => void } }).__ch_shot?.destroy?.();
  });
});
