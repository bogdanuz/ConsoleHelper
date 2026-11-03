(async () => {
  const CH_VERSION = window.__CH_VERSION__ || '0.12.1';
  const HOTKEY_CODE = 'KeyH';
  const mode = window.__CH_MODE__ || 'open';
  window.__CH_MODE__ = undefined;

  const base =
    window.__CH_BASE__ ||
    (document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/[^/]*$/, '')
      : new URL('tools/', location.href).href);

  window.__CH_BASE__ = base;

  const toolsUrlCandidates = [
    new URL('../tools.json', base).href,
    new URL('tools.json', base).href,
    new URL('tools.json', location.href).href,
  ];

  async function loadTools() {
    if (window.__CH_BUNDLE__?.tools?.length) return window.__CH_BUNDLE__.tools;
    for (const u of toolsUrlCandidates) {
      try {
        const res = await fetch(u + (u.includes('?') ? '&' : '?') + Date.now());
        if (res.ok) return await res.json();
      } catch (_) {}
    }
    return [];
  }

  function runEmbedded(file) {
    const name = String(file).replace(/^tools\//, '');
    const code = window.__CH_BUNDLE__?.sources?.[name];
    if (!code) return false;
    (0, eval)(code);
    return true;
  }

  function toast(msg) {
    window.__ch_toast?.remove();
    const t = document.createElement('div');
    t.setAttribute('data-ch', 'toast');
    t.textContent = msg;
    t.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;' +
      'background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:8px;padding:10px 14px;' +
      'font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:90vw';
    window.__ch_toast = t;
    document.documentElement.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  async function openMenu() {
    window.__ch_menu_cleanup?.();
    window.__ch_menu?.remove();

    const tools = await loadTools();
    if (!tools.length) {
      alert('ConsoleHelper: не удалось загрузить список инструментов');
      return;
    }

    const box = document.createElement('div');
    box.setAttribute('data-ch', '1');
    box.style.cssText =
      'position:fixed;right:16px;top:16px;width:340px;max-height:80vh;overflow:hidden;z-index:2147483647;' +
      'background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.55);font:14px/1.4 system-ui,sans-serif;padding:10px;' +
      'pointer-events:auto;display:flex;flex-direction:column';
    window.__ch_menu = box;

    const tip = document.createElement('div');
    tip.style.cssText = 'font-size:12px;color:#9aa0a6;margin-bottom:8px';
    tip.textContent = window.__CH_BUNDLE__
      ? 'Полная закладка · Alt+Shift+H · Esc — закрыть · без обновлений с сайта'
      : 'Alt+Shift+H · Esc — закрыть';

    const q = document.createElement('input');
    q.placeholder = 'Поиск…';
    q.style.cssText =
      'width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:8px;border:1px solid #2a3038;' +
      'border-radius:6px;background:#0e0f12;color:#e8eaed;outline:none';
    const list = document.createElement('div');
    list.style.cssText = 'overflow:auto;flex:1;min-height:0';

    const toolUrl = (file) => {
      const name = String(file).replace(/^tools\//, '');
      return new URL(name, base).href;
    };

    const closeMenu = () => {
      box.remove();
      document.removeEventListener('keydown', onDocKey, true);
      if (window.__ch_menu === box) window.__ch_menu = undefined;
      window.__ch_menu_cleanup = undefined;
    };
    const onDocKey = (e) => {
      const esc = e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape';
      if (!esc) return;
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    };
    document.addEventListener('keydown', onDocKey, true);
    window.__ch_menu_cleanup = () => {
      document.removeEventListener('keydown', onDocKey, true);
      window.__ch_menu_cleanup = undefined;
    };

    const run = async (t) => {
      closeMenu();
      try {
        if (runEmbedded(t.file)) return;
        const res = await fetch(toolUrl(t.file) + '?' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const code = await res.text();
        (0, eval)(code);
      } catch (e) {
        alert('Ошибка: ' + e.message);
      }
    };

    const render = () => {
      const s = q.value.toLowerCase();
      list.replaceChildren(
        ...tools
          .filter((t) => t.id !== 'launcher')
          .filter((t) =>
            (t.name + ' ' + (t.tag || '') + ' ' + (t.desc || '') + ' ' + (t.hint || ''))
              .toLowerCase()
              .includes(s),
          )
          .map((t) => {
            const b = document.createElement('button');
            b.type = 'button';
            const hint = t.hint || t.desc || '';
            const titleEl = document.createElement('div');
            titleEl.textContent = t.name;
            b.appendChild(titleEl);
            if (hint) {
              const hintEl = document.createElement('div');
              hintEl.style.cssText =
                'font-size:11px;color:#9aa0a6;font-weight:400;margin-top:2px';
              hintEl.textContent = hint;
              b.appendChild(hintEl);
            }
            b.style.cssText =
              'display:block;width:100%;text-align:left;padding:8px 10px;margin:3px 0;border:0;' +
              'border-radius:6px;background:#1e232b;color:#e8eaed;cursor:pointer;font:inherit';
            b.title = hint;
            b.onmouseenter = () => (b.style.background = '#262c36');
            b.onmouseleave = () => (b.style.background = '#1e232b');
            const fatShot = !!(window.__CH_BUNDLE__ && t.id === 'screenshot');
            if (fatShot) {
              b.disabled = true;
              b.style.opacity = '0.45';
              b.style.cursor = 'default';
              const note = document.createElement('div');
              note.style.cssText = 'font-size:11px;color:#e6c07b;font-weight:400;margin-top:2px';
              note.textContent = 'только обычная закладка';
              b.appendChild(note);
            }
            b.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (fatShot) return;
              void run(t);
            };
            return b;
          }),
      );
    };

    q.oninput = render;
    q.onkeydown = (e) => {
      if (e.key === 'Enter') list.querySelector('button')?.click();
    };

    const credit = document.createElement('a');
    credit.href = 'https://github.com/bogdanuz';
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    credit.textContent = 'github.com/bogdanuz · ' + CH_VERSION;
    credit.style.cssText =
      'display:block;margin-top:8px;padding-top:8px;border-top:1px solid #2a3038;' +
      'font-size:11px;color:#8b919a;text-align:center;text-decoration:none;flex-shrink:0';
    credit.onmouseenter = () => {
      credit.style.color = '#e8eaed';
    };
    credit.onmouseleave = () => {
      credit.style.color = '#8b919a';
    };

    box.append(tip, q, list, credit);
    document.documentElement.appendChild(box);
    render();
    q.focus();
  }

  window.__ch_openMenu = openMenu;

  if (!window.__ch_hotkeyBound && !window.__ch_userscript_bound) {
    window.__ch_hotkeyBound = true;
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.altKey && e.shiftKey && e.code === HOTKEY_CODE) {
          e.preventDefault();
          e.stopPropagation();
          openMenu();
        }
      },
      true,
    );
    if (mode === 'open') {
      toast('Меню готово. Пока страница не обновлена: Alt+Shift+H. После F5 — снова закладка или сниппет.');
    }
  }

  if (mode === 'open') await openMenu();
})();
