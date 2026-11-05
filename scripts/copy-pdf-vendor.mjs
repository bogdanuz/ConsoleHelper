import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const destDir = join(root, 'public/vendor');
mkdirSync(destDir, { recursive: true });

for (const file of ['pdf.min.js', 'pdf.worker.min.js']) {
  const src = require.resolve(`pdfjs-dist/build/${file}`);
  const dest = join(destDir, file);
  copyFileSync(src, dest);
  console.log('copied', dest);
}
