import { loaderSnippet } from './catalog';

/** Same hotkey as launcher */
export const LAUNCHER_HOTKEY = 'Alt+Shift+H';

/**
 * Bookmarklet = ordinary bookmark with a short command (not an extension).
 * Universal for Yandex Browser, Chrome, Edge, Chromium.
 */
export function buildBookmarkletReadable(baseUrl: string, file = 'tools/launcher.js'): string {
  return `javascript:${loaderSnippet(baseUrl, file)}`;
}
