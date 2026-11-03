(() => {
  window.__tp?.destroy?.();

  const MAXC = 60;
  const MINROWS = 3;
  const BAD = 'script,style,noscript,svg,template';

  let smart = true;
  let studioApi = null;
  let studioRows = [];

  const toolsBase =
    window.__CH_BASE__ ||
    (document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/[^/]*$/, '')
      : new URL('tools/', location.href).href);

  const txt = (e) =>
    (e.innerText || '').trim().replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ');
  const sig = (e) =>
    e.tagName +
    '.' +
    [...e.classList]
      .filter((c) => !/^(is-|active|selected|current|checked)/.test(c))
      .sort()
      .join('.');
  const leaves = (r) =>
    [...r.querySelectorAll('*')].filter(
      (e) => !e.children.length && txt(e) && !e.closest(BAD),
    );
  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const med = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)] || 0;
  };
  const pad = (rows) => {
    const w = Math.max(0, ...rows.map((r) => r.length));
    return rows.map((r) => {
      const c = [...r];
      while (c.length < w) c.push('');
      return c;
    });
  };
  const fromTable = (t) =>
    pad(
      [...t.rows]
        .map((r) => [...r.cells].map(txt))
        .filter((r) => r.length),
    );
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 20 && r.height > 10;
  };
  const color = (i) => `hsl(${(i * 137.5) % 360} 85% 42%)`;

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
    if (/\s{2,}/.test(t) && t.length > 40) return false;
    if (parseRuNumber(t) !== null) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t))
      return true;
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
  const normalizeRows = (input, opts = {}) => {
    const mergeIdRows = opts.mergeIdRows !== false;
    const splitMultilineName = opts.splitMultilineName !== false;
    let merged = 0;
    let splitName = 0;
    let rows = input.map((r) => [...r]);
    if (splitMultilineName) {
      rows = rows.map((row) => {
        const first = row[0] || '';
        const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return row;
        const next = [...row];
        next[0] = parts[0];
        next.splice(1, 0, parts.slice(1).join(' '));
        splitName++;
        return next;
      });
    }
    if (mergeIdRows) {
      const out = [];
      for (const row of rows) {
        const cells = row.map((c) => String(c || '').trim());
        const first = cells[0] || '';
        const idToken =
          (looksLikeId(first) && first) ||
          (cells.slice(1).find((c) => looksLikeId(c)) || '');
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
          const alreadyHasId = !!(rest[0] && looksLikeId(rest[0]));
          if (alreadyHasId) prev[0] = (name + '\n' + idToken).trim();
          else {
            prev.length = 0;
            prev.push(name, idToken, ...rest);
          }
          for (let i = 0; i < row.length; i++) {
            const v = String(row[i] || '').trim();
            if (!v || v === idToken) continue;
            const target = i === 0 ? 2 : i + 1;
            while (prev.length <= target) prev.push('');
            prev[target] = (prev[target] ? prev[target] + ' ' : '') + v;
          }
          merged++;
        } else out.push([...row]);
      }
      rows = out;
    }
    rows = pad(rows.filter((r) => r.some((c) => String(c).trim())));
    return { rows, meta: { merged, splitName, inputRows: input.length, outputRows: rows.length } };
  };

  const scan = () => {
    const res = [];
    document.querySelectorAll('table').forEach((t) => {
      if (t.closest('[data-tp]') || !visible(t)) return;
      const rows = [...t.rows];
      if (rows.length < 2) return;
      const cols = Math.max(0, ...rows.map((r) => r.cells.length));
      if (cols < 2) return;
      res.push({
        el: t,
        rows: rows.length,
        cols,
        score: rows.length * cols * 1.5,
        get: () => fromTable(t),
      });
    });
    document.querySelectorAll('body *').forEach((p) => {
      if (p.closest('table') || p.closest(BAD) || p.closest('[data-tp]') || p.children.length < MINROWS)
        return;
      const g = {};
      [...p.children].forEach((c) => (g[sig(c)] ||= []).push(c));
      Object.values(g).forEach((list) => {
        if (list.length < MINROWS || list[0].querySelector('table')) return;
        const counts = list.slice(0, 30).map((r) => leaves(r).length);
        const m = med(counts);
        if (m < 2 || m > MAXC) return;
        const cons = counts.filter((c) => Math.abs(c - m) <= 1).length / counts.length;
        if (cons < 0.6) return;
        if (!visible(p)) return;
        res.push({
          el: p,
          rows: list.length,
          cols: m,
          score: Math.round(list.length * m * cons),
          get: () => pad(list.map((r) => leaves(r).map(txt)).filter((r) => r.length)),
        });
      });
    });
    res.sort((a, b) => b.score - a.score);
    const out = [];
    res.forEach((c) => {
      if (!out.some((o) => o.el === c.el || o.el.contains(c.el) || c.el.contains(o.el))) out.push(c);
    });
    return out.slice(0, 12);
  };

  const el = (tag, css, text, on) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (on) e.onclick = on;
    return e;
  };
  const B =
    'pointer-events:auto;cursor:pointer;border:0;border-radius:6px;padding:8px 12px;color:#fff;background:#333;font:600 13px sans-serif;margin:0 3px';

  const ensureStudio = async () => {
    if (window.__CH_Studio?.mount) return window.__CH_Studio;
    const bundled = window.__CH_BUNDLE__?.sources?.['table-studio.js'];
    if (bundled) {
      (0, eval)(bundled);
    } else {
      const url = new URL('table-studio.js', toolsBase).href + '?' + Date.now();
      const code = await (await fetch(url)).text();
      (0, eval)(code);
    }
    if (!window.__CH_Studio?.mount) throw new Error('Table Studio не загрузился');
    return window.__CH_Studio;
  };

  const currentRows = () => (studioApi ? studioApi.getRows() : studioRows);

  const downloadExcel = async (rows, name) => {
    if (window.__CH_Studio?.downloadXlsx) {
      const ok = await window.__CH_Studio.downloadXlsx(rows, toolsBase);
      if (ok) return;
    }
    const html = (window.__CH_Studio?.toExcelHtml || ((r) =>
      '<html><head><meta charset="utf-8"></head><body><table border="1">' +
      r.map((row) => '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') +
      '</table></body></html>'))(rows);
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.href = url;
    a.download = (name || 'export') + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const downloadCsv = () => {
    const rows = currentRows();
    const text = (window.__CH_Studio?.toCsv || ((r) =>
      r.map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n')))(rows);
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
    a.href = url;
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const copyTSV = async () => {
    const rows = currentRows();
    const s = (window.__CH_Studio?.toTsv || ((r) => r.map((row) => row.join('\t')).join('\n')))(rows);
    try {
      await navigator.clipboard.writeText(s);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.setAttribute('data-tp', '1');
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    status.textContent = status.textContent.replace(/ · скопировано$/, '') + ' · скопировано';
  };

  const root = document.createElement('div');
  root.id = '__tp_ui';
  root.setAttribute('data-tp', '1');
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:600 13px sans-serif';
  document.body.appendChild(root);

  let items = [];
  let hidden = false;

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;padding:10px;box-shadow:0 4px 24px rgba(0,0,0,.45);display:flex;align-items:center;flex-wrap:wrap;gap:4px',
  );
  const info = el('span', 'color:#e8eaed;margin-right:6px');
  panel.append(
    info,
    el('button', B + ';background:#1a7f37', '⬇ Все в Excel', () => {
      if (!items.length) return;
      let html = '<html><head><meta charset="utf-8"></head><body>';
      items.forEach((it, i) => {
        const raw = it.get();
        const rows = smart ? normalizeRows(raw).rows : raw;
        html +=
          `<p><b>Таблица ${i + 1}</b></p><table border="1">` +
          rows
            .map(
              (r) =>
                '<tr>' +
                r.map((c) => `<td style="mso-number-format:'\\@'">${esc(c)}</td>`).join('') +
                '</tr>',
            )
            .join('') +
          '</table><br>';
      });
      html += '</body></html>';
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
      a.href = url;
      a.download = 'export_all_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xls';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }),
    el('button', B, '👁', () => {
      hidden = !hidden;
      apply();
    }),
    el('button', B, '↻', () => render()),
    el('button', B + ';background:#a00', '✕', () => window.__tp.destroy()),
  );
  panel.setAttribute('data-tp', '1');
  root.appendChild(panel);

  const modal = el(
    'div',
    'display:none;position:fixed;left:5%;top:5%;width:90%;height:80%;background:#171a1f;color:#e8eaed;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.6);pointer-events:auto;flex-direction:column;padding:12px;box-sizing:border-box;border:1px solid #2a3038',
  );
  const bar = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px');
  const status = el('span', 'font-weight:600;margin-right:8px');
  const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');
  const smartBtn = el('button', B + ';background:#3d8bff', '', () => {
    smart = !smart;
    smartBtn.textContent = smart ? 'Умная таблица: ВКЛ' : 'Как есть';
    void openStudio(studioRaw, studioTitle);
  });
  smartBtn.textContent = 'Умная таблица: ВКЛ';
  smartBtn.title = 'Схлопывает название + код (ID) в одну строку';

  let studioRaw = [];
  let studioTitle = 'Таблица';

  const openStudio = async (raw, title) => {
    studioRaw = raw.map((r) => [...r]);
    studioTitle = title || 'Таблица';
    studioRows = smart ? normalizeRows(studioRaw).rows : pad(studioRaw);
    status.textContent = `${studioTitle}: строк ${studioRows.length}${smart ? ' · умная' : ' · как есть'}`;
    modal.style.display = 'flex';
    try {
      const Studio = await ensureStudio();
      studioApi?.destroy?.();
      studioApi = Studio.mount(view, {
        rows: studioRows,
        onChange: (next) => {
          studioRows = next;
          status.textContent = `${studioTitle}: строк ${studioRows.length} · правки вручную`;
        },
      });
    } catch (err) {
      view.replaceChildren(el('div', 'color:#f07178;padding:8px', err.message || String(err)));
    }
  };

  bar.append(
    status,
    smartBtn,
    el('button', B + ';background:#1a7f37', 'Excel', () => void downloadExcel(currentRows())),
    el('button', B + ';background:#0b5cad', 'CSV', downloadCsv),
    el('button', B + ';background:#0b5cad', 'Копировать TSV', copyTSV),
    el('button', B, 'Закрыть', () => {
      modal.style.display = 'none';
      studioApi?.destroy?.();
      studioApi = null;
    }),
  );
  modal.append(bar, view);
  root.appendChild(modal);

  const apply = () =>
    items.forEach((i) => {
      i.el.style.setProperty('outline', hidden ? i.prevOutline : `3px solid ${i.color}`, hidden ? '' : 'important');
      i.el.style.setProperty('outline-offset', hidden ? i.prevOffset : '2px', hidden ? '' : 'important');
      i.badge.style.display = hidden ? 'none' : 'block';
    });

  const clear = () => {
    items.forEach((i) => {
      i.el.style.removeProperty('outline');
      i.el.style.removeProperty('outline-offset');
      if (i.prevOutline) i.el.style.outline = i.prevOutline;
      if (i.prevOffset) i.el.style.outlineOffset = i.prevOffset;
      i.badge.remove();
    });
    items = [];
  };

  const place = () =>
    items.forEach((i) => {
      const r = i.el.getBoundingClientRect();
      const off = r.bottom < 0 || r.top > innerHeight;
      i.badge.style.visibility = off ? 'hidden' : 'visible';
      i.badge.style.left = Math.max(0, r.left) + 'px';
      i.badge.style.top = Math.max(0, r.top - 26) + 'px';
    });

  const render = () => {
    clear();
    items = scan().map((c, k) => {
      c.color = color(k);
      c.prevOutline = c.el.style.outline;
      c.prevOffset = c.el.style.outlineOffset;
      c.badge = el(
        'div',
        `position:fixed;pointer-events:auto;cursor:pointer;background:${c.color};color:#fff;padding:4px 8px;border-radius:5px;box-shadow:0 1px 6px rgba(0,0,0,.4)`,
        `#${k + 1} · ${c.rows}×${c.cols} ✎`,
        (e) => {
          e.stopPropagation();
          void openStudio(c.get(), 'Таблица ' + (k + 1));
        },
      );
      c.badge.title = 'Открыть в редакторе';
      root.appendChild(c.badge);
      return c;
    });
    info.textContent = 'Таблиц: ' + items.length;
    apply();
    place();
  };

  let raf = 0;
  const onMove = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(place);
  };
  addEventListener('scroll', onMove, true);
  addEventListener('resize', onMove);
  const timer = setInterval(place, 700);

  window.__tp = {
    destroy() {
      clear();
      studioApi?.destroy?.();
      root.remove();
      clearInterval(timer);
      removeEventListener('scroll', onMove, true);
      removeEventListener('resize', onMove);
      delete window.__tp;
    },
    _test: { normalizeRows, looksLikeId, looksLikeTitle },
  };
  render();
})();
