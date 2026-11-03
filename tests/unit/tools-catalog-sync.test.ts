import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG_TOOLS } from '../../src/ui/catalog';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('tools.json ↔ hub catalog', () => {
  it('every catalog tool exists in tools.json with same id/file and a hint', () => {
    const tools = JSON.parse(readFileSync(join(root, 'public/tools.json'), 'utf8')) as {
      id: string;
      file: string;
      hint?: string;
    }[];
    const byId = new Map(tools.map((t) => [t.id, t]));
    for (const c of CATALOG_TOOLS) {
      const row = byId.get(c.id);
      expect(row, `missing in tools.json: ${c.id}`).toBeTruthy();
      expect(row!.file.replace(/^tools\//, '')).toBe(c.file.replace(/^tools\//, ''));
      expect(String(row!.hint || '').length, `hint missing: ${c.id}`).toBeGreaterThan(5);
      expect(c.when.length).toBeGreaterThan(5);
      expect(c.what.length).toBeGreaterThan(5);
    }
  });
});
