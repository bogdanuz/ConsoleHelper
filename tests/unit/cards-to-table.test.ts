/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('cards-to-table', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { __cards?: unknown }).__cards;
  });

  it('extracts repeated demo cards into rows', () => {
    document.body.innerHTML = `
      <div class="grid">
        <article class="card"><h3>Item One</h3><span>100</span><p>ok</p></article>
        <article class="card"><h3>Item Two</h3><span>200</span><p>ok</p></article>
        <article class="card"><h3>Item Three</h3><span>300</span><p>ok</p></article>
      </div>`;
    for (const node of document.querySelectorAll('*')) {
      (node as HTMLElement).getBoundingClientRect = () =>
        ({
          width: 120,
          height: 80,
          top: 10,
          left: 10,
          bottom: 90,
          right: 130,
          x: 10,
          y: 10,
          toJSON() {
            return {};
          },
        }) as DOMRect;
    }
    const code = readFileSync(join(root, 'public/tools/cards-to-table.js'), 'utf8');
    (0, eval)(code);
    const api = (
      window as unknown as {
        __cards: { _test: { findCards: (r: null) => string[][] }; destroy: () => void };
      }
    ).__cards;
    const rows = api._test.findCards(null);
    expect(rows.length).toBe(3);
    expect(rows[0]![0]).toContain('Item One');
    api.destroy();
  });
});
