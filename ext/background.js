/* global chrome */
// Replace CHANGE_ME with your GitHub username after Pages is live.
const TOOLS_BASE = 'https://CHANGE_ME.github.io/ConsoleHelper/tools/';

async function openOnTab(tabId) {
  const base = TOOLS_BASE.endsWith('/') ? TOOLS_BASE : TOOLS_BASE + '/';
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (toolsBaseUrl) => {
      window.__CH_BASE__ = toolsBaseUrl;
      window.__CH_MODE__ = 'open';
      return fetch(toolsBaseUrl + 'launcher.js?' + Date.now())
        .then((r) => r.text())
        .then((code) => {
          (0, eval)(code);
        });
    },
    args: [base],
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-menu') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) await openOnTab(tab.id);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id != null) await openOnTab(tab.id);
});
