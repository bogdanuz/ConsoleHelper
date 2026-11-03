import { describe, expect, it } from 'vitest';
import { CATALOG_TOOLS, filterTools, loaderSnippet } from '../../src/ui/catalog';

describe('catalog UX mechanics', () => {
  it('lists tools with what/when copy', () => {
    expect(CATALOG_TOOLS.length).toBeGreaterThanOrEqual(3);
    for (const t of CATALOG_TOOLS) {
      expect(t.what.length).toBeGreaterThan(10);
      expect(t.when.length).toBeGreaterThan(5);
    }
  });

  it('filters by tag and name', () => {
    expect(filterTools(CATALOG_TOOLS, 'скрин')).toHaveLength(1);
    expect(filterTools(CATALOG_TOOLS, 'таблиц').length).toBeGreaterThanOrEqual(1);
    expect(filterTools(CATALOG_TOOLS, '')).toHaveLength(CATALOG_TOOLS.length);
  });

  it('builds loader with base', () => {
    const s = loaderSnippet('https://user.github.io/ConsoleHelper/', 'tools/launcher.js');
    expect(s).toContain('https://user.github.io/ConsoleHelper/tools/launcher.js');
    expect(s).toContain("window.__CH_BASE__='https://user.github.io/ConsoleHelper/tools/'");
    expect(s.startsWith('void(')).toBe(true);
  });
});
