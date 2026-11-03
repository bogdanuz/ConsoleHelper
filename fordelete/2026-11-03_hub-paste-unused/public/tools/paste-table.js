(() => {
  window.__pt?.destroy?.();

  let smart = true;
  let studioApi = null;
  let grid = [];
  let pasting = false;

  const toolsBase =
    window.__CH_BASE__ ||
    (document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/[^/]*$/, '')
      : new URL('tools/', location.href).href);

  const el = (tag, css, text, on) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (on) e.onclick = on;
    return e;
  };
  const B =
    'pointer-events:auto;cursor:pointer;border:0;border-radius:6px;padding:8px 12px;color:#fff;background:#333;font:600 13px sans-serif;margin:0 3px';

  const parseRuNumber = (raw) => {
    const s = String(raw || '').trim();
    if (!s || s === '—' || s === '-' || s === '–') return null;
    const cleaned = s.replace(/\s/g, '').replace(/₽/g, '').replace(/%/g, '').replace(/,/g, '.');
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };
  const looksLikeId = (text) => {
    const t = String(text || '').trim();
    if (!t || t.length > 64) return false;
    if (parseRuNumber(t) !== null) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true;
    return (
      /^[A-ZА-Я]{1,6}[-_]\d[\w.-]*$/i.test(t) ||
      /^[A-Z]{2,}[-_]\d[\w.-]*$/i.test(t) ||
      /^PJ[-_][\w.-]+$/i.test(t) ||
      /^[A-ZА-Я]{2,8}\d{2,8}([.-][\w.-]+)?$/i.test(t) ||
      (/^\d{2,}([-_]\d+){1,4}$/.test(t) && t.length <= 32)
    );
  };
  const looksLikeTitle = (text) => {
    const t = String(text || '').trim();
    if (!t || looksLikeId(t)) return false;
    if (parseRuNumber(t) !== null) return false;
    return t.length >= 3 && /[A-Za-zА-Яа-я]/.test(t);
  };
  const normalizeRows = (input) => {
    const out = [];
    for (const row of input) {
      const cells = row.map((c) => String(c || '').trim());
      const first = cells[0] || '';
      const idToken =
        (looksLikeId(first) && first) || (cells.slice(1).find((c) => looksLikeId(c)) || '');
      const prev = out[out.length - 1];
      const nonEmpty = cells.filter(Boolean).length;
      const continuation =
        prev &&
        looksLikeTitle(prev[0] || '') &&
        nonEmpty <= 2 &&
        !!idToken &&
        !(prev[1] && looksLikeId(prev[1]));
      if (continuation && prev) {
        const name = prev[0] || '';
        const rest = prev.slice(1);
        prev.length = 0;
        prev.push(name, idToken, ...rest);
      } else out.push([...row]);
    }
    const w = Math.max(0, ...out.map((r) => r.length));
    return {
      rows: out.map((r) => {
        const c = [...r];
        while (c.length < w) c.push('');
        return c;
      }),
    };
  };

  const ensureStudio = async () => {
    if (window.__CH_Studio?.mount) return window.__CH_Studio;
    const url = new URL('table-studio.js', toolsBase).href + '?' + Date.now();
    const code = await (await fetch(url)).text();
    (0, eval)(code);
    if (!window.__CH_Studio?.mount) throw new Error('Table Studio не загрузился');
    return window.__CH_Studio;
  };

  const root = document.createElement('div');
  root.setAttribute('data-pt', '1');
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:13px system-ui,sans-serif';
  document.body.appendChild(root);

  const modal = el(
    'div',
    'display:flex;position:fixed;left:5%;top:5%;width:90%;height:80%;background:#171a1f;color:#e8eaed;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.6);pointer-events:auto;flex-direction:column;padding:12px;box-sizing:border-box;border:1px solid #2a3038',
  );
  const bar = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px');
  const status = el('span', 'font-weight:600;margin-right:8px', 'Вставь таблицу из буфера');
  const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');
  const fallback = el(
    'textarea',
    'width:100%;min-height:72px;margin:0 0 8px;box-sizing:border-box;background:#0e0f12;color:#e8eaed;border:1px solid #2a3038;border-radius:8px;padding:8px;font:12px/1.4 ui-monospace,monospace;resize:vertical',
  );
  fallback.placeholder =
    'Если браузер не дал буфер — вставь сюда TSV / CSV / HTML таблицы и нажми «Из текста»';

  const currentRows = () => (studioApi ? studioApi.getRows() : grid);

  const downloadExcel = () => {
    const rows = currentRows();
    const html = window.__CH_Studio.toExcelHtml(rows);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const downloadCsv = () => {
    const text = window.__CH_Studio.toCsv(currentRows());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const copyTSV = async () => {
    const s = window.__CH_Studio.toTsv(currentRows());
    try {
      await navigator.clipboard.writeText(s);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    status.textContent = status.textContent.replace(/ · скопировано$/, '') + ' · скопировано';
  };

  const applySmart = (rows) => (smart ? normalizeRows(rows).rows : rows);

  const mountStudio = async (rows) => {
    grid = rows;
    const Studio = await ensureStudio();
    studioApi?.destroy?.();
    studioApi = Studio.mount(view, {
      rows: grid,
      enablePaste: true,
      onChange: (next) => {
        grid = next;
        if (!pasting) status.textContent = `Строк: ${grid.length} · правки вручную`;
      },
      onPasteInfo: (info) => {
        if (!info?.ok) {
          status.textContent = info?.message || 'Пустой буфер';
          return;
        }
        pasting = true;
        const next = applySmart(studioApi.getRows());
        studioApi.setRows(next);
        pasting = false;
        status.textContent = `${info.message}${smart ? ' · умная' : ''}`;
      },
    });
  };

  const smartBtn = el('button', B + ';background:#3d8bff', 'Умная таблица: ВКЛ', () => {
    smart = !smart;
    smartBtn.textContent = smart ? 'Умная таблица: ВКЛ' : 'Как есть';
  });

  bar.append(
    status,
    smartBtn,
    el('button', B + ';background:#3d8bff', 'Вставить из буфера', async () => {
      if (!studioApi) await mountStudio([[]]);
      const ok = await studioApi.pasteFromClipboard();
      if (!ok) status.textContent = 'Не удалось прочитать буфер — вставь в поле ниже';
    }),
    el('button', B, 'Из текста', async () => {
      const Studio = await ensureStudio();
      const parsed = Studio.parseClipboard({ text: fallback.value, html: fallback.value });
      if (!parsed.rows.length) {
        status.textContent = 'В тексте нет таблицы';
        return;
      }
      const rows = applySmart(parsed.rows);
      await mountStudio(rows);
      status.textContent = `Из текста: ${rows.length} стр. (${parsed.format})`;
    }),
    el('button', B + ';background:#1a7f37', 'Excel', downloadExcel),
    el('button', B + ';background:#0b5cad', 'CSV', downloadCsv),
    el('button', B + ';background:#0b5cad', 'Копировать TSV', copyTSV),
    el('button', B + ';background:#a00', 'Закрыть', () => window.__pt.destroy()),
  );

  modal.append(bar, fallback, view);
  root.appendChild(modal);

  window.__pt = {
    destroy() {
      studioApi?.destroy?.();
      root.remove();
      delete window.__pt;
    },
  };

  void mountStudio([['Вставь таблицу (кнопка или Ctrl+V)', '', '']]);
})();
