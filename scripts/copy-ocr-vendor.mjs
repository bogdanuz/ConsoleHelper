/**
 * Copy the in-browser recognizer into public/vendor/tesseract.
 * Language files are saved once, so a page never calls a third-party service.
 */
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const dest = join(root, 'public/vendor/tesseract');
const coreDir = join(dest, 'core');
const langDir = join(dest, 'lang');
mkdirSync(coreDir, { recursive: true });
mkdirSync(langDir, { recursive: true });

const tesseractDir = dirname(require.resolve('tesseract.js/package.json'));
const corePkg = dirname(require.resolve('tesseract.js-core/package.json'));

copyFileSync(join(tesseractDir, 'dist/tesseract.min.js'), join(dest, 'tesseract.min.js'));
copyFileSync(join(tesseractDir, 'dist/worker.min.js'), join(dest, 'worker.min.js'));
for (const name of ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']) {
  copyFileSync(join(corePkg, name), join(coreDir, name));
  console.log('copied', name);
}

const langs = [
  ['eng', 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz'],
  ['rus', 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/rus@1.0.0/4.0.0_best_int/rus.traineddata.gz'],
];

for (const [code, url] of langs) {
  const file = join(langDir, `${code}.traineddata.gz`);
  if (existsSync(file) && statSync(file).size > 100_000) {
    console.log('keep', file);
    continue;
  }
  console.log('download', code);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OCR lang ${code}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100_000) throw new Error(`OCR lang ${code} looks too small`);
  writeFileSync(file, buf);
  console.log('saved', code, Math.round(buf.length / 1024) + ' KB');
}
