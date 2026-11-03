/** Hotkey that opens the menu on any page after userscript install */
export const LAUNCHER_HOTKEY = 'Alt+Shift+H';

/**
 * Builds a Tampermonkey/Violentmonkey userscript that stays alive on every tab.
 * After install: no DevTools, no re-run on refresh — only Alt+Shift+H.
 */
export function buildUserScript(toolsBaseUrl: string): string {
  const base = toolsBaseUrl.endsWith('/') ? toolsBaseUrl : `${toolsBaseUrl}/`;
  return `// ==UserScript==
// @name         ConsoleHelper Menu
// @namespace    consolehelper
// @version      0.2.2
// @description  Alt+Shift+H opens ConsoleHelper menu on any page (no DevTools)
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  if (window.__ch_userscript_bound) return;
  window.__ch_userscript_bound = true;
  var BASE = ${JSON.stringify(base)};
  window.__CH_BASE__ = BASE;

  window.addEventListener('keydown', function (e) {
    if (!(e.altKey && e.shiftKey && e.code === 'KeyH')) return;
    e.preventDefault();
    e.stopPropagation();
    window.__CH_MODE__ = 'open';
    fetch(BASE + 'launcher.js?' + Date.now())
      .then(function (r) { return r.text(); })
      .then(function (code) { (0, eval)(code); })
      .catch(function (err) { alert('ConsoleHelper: ' + (err && err.message ? err.message : err)); });
  }, true);
})();
`;
}

export function userscriptFileName(): string {
  return 'consolehelper.user.js';
}
