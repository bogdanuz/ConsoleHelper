import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const src = require.resolve('xlsx/dist/xlsx.full.min.js');
const destDir = join(root, 'public/vendor');
mkdirSync(destDir, { recursive: true });
const dest = join(destDir, 'xlsx.full.min.js');
copyFileSync(src, dest);
console.log('copied', dest);
