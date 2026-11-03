import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createPasteSession } from '../../src/ui/pastePanel';

const dir = dirname(fileURLToPath(import.meta.url));
const fx = (name: string) => readFileSync(join(dir, '../fixtures', name), 'utf8');

describe('pastePanel session', () => {
  it('ingests TSV and exports', () => {
    const s = createPasteSession();
    const r = s.ingestText(fx('sample-clipboard-tsv.txt'), true);
    expect(r.ok).toBe(true);
    expect(s.getRows()).toHaveLength(3);
    expect(s.copyTsv()).toContain('ID-1001-A');
    expect(s.downloadCsv().size).toBeGreaterThan(10);
  });

  it('rejects empty noise', () => {
    const s = createPasteSession();
    expect(s.ingestText('   ').ok).toBe(false);
  });
});
