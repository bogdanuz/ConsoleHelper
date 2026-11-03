/**
 * Build offline bookmarklet: launcher + table tools + studio (no html2canvas).
 * Output: public/fat-bookmarklet.txt
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const toolsDir = join(root, 'public/tools');
const outPath = join(root, 'public/fat-bookmarklet.txt');

const toolsJson = JSON.parse(readFileSync(join(root, 'public/tools.json'), 'utf8'));

const INCLUDE = new Set([
  'text-to-table.js',
  'dom-tables.js',
  'table-studio.js',
  'cards-to-table.js',
]);

const screenshotStub = `(() => {})();`;

function stripToolsPrefix(file) {
  return String(file).replace(/^tools\//, '');
}

const sources = {};
sources['table-studio.js'] = readFileSync(join(toolsDir, 'table-studio.js'), 'utf8');
sources['text-to-table.js'] = readFileSync(join(toolsDir, 'text-to-table.js'), 'utf8');
sources['dom-tables.js'] = readFileSync(join(toolsDir, 'dom-tables.js'), 'utf8');

try {
  sources['cards-to-table.js'] = readFileSync(join(toolsDir, 'cards-to-table.js'), 'utf8');
} catch {
  // Sprint 9 may add later; skip if missing at early build
}

sources['screenshot.js'] = screenshotStub;

const tools = toolsJson
  .filter((t) => t.id !== 'launcher')
  .map((t) => {
    const name = stripToolsPrefix(t.file);
    return {
      id: t.id,
      name: t.name,
      file: t.file,
      tag: t.tag || '',
      desc: t.desc || '',
      hint: t.hint || '',
    };
  })
  .filter((t) => {
    const name = stripToolsPrefix(t.file);
    return sources[name] != null;
  });

const launcher = readFileSync(join(toolsDir, 'launcher.js'), 'utf8');

/** Pages URL for vendor (xlsx) when fat bookmark runs on a foreign site. */
const PAGES_TOOLS_BASE =
  process.env.CH_TOOLS_BASE || 'https://bogdanuz.github.io/ConsoleHelper/tools/';

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const payload =
  `window.__CH_VERSION__=${JSON.stringify(pkg.version || '')};` +
  `window.__CH_BASE__=${JSON.stringify(PAGES_TOOLS_BASE)};` +
  `window.__CH_BUNDLE__=${JSON.stringify({ tools, sources })};` +
  launcher;

const b64 = Buffer.from(payload, 'utf8').toString('base64');
const bookmark =
  `javascript:void(function(){` +
  `var b=atob("${b64}");` +
  `var u=new Uint8Array(b.length);` +
  `for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);` +
  `(0,eval)(new TextDecoder().decode(u));` +
  `})();`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, bookmark, 'utf8');
console.log(
  'fat-bookmarklet.txt',
  Math.round(bookmark.length / 1024) + ' KB',
  'tools:',
  tools.map((t) => t.id).join(','),
);
