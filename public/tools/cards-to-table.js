(() => {
  window.__cards?.destroy?.();

  const toolsBase =
    window.__CH_BASE__ ||
    (document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/[^/]*$/, '')
      : new URL('tools/', location.href).href);

  const BAD = 'script,style,noscript,svg,template,head,[data-ch],[data-tx],[data-tp],[data-cards]';

  const el = (tag, css, text, on) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (on) e.onclick = on;
    return e;
  };
  const B =
    'pointer-events:auto;cursor:pointer;border:0;border-radius:6px;padding:8px 12px;color:#fff;background:#333;font:600 13px sans-serif;margin:0 3px';

  const txt = (n) => (n.textContent || '').replace(/\s+/g, ' ').trim();
  const sig = (e) =>
    e.tagName +
    '.' +
    [...e.classList]
      .filter((c) => !/^(is-|active|selected|hover)/.test(c))
      .slice(0, 4)
      .sort()
      .join('.');

  const leafTexts = (card) => {
    const leaves = [...card.querySelectorAll('*')].filter(
      (e) => !e.children.length && txt(e) && !e.closest(BAD),
    );
    const out = [];
    for (const n of leaves) {
      const t = txt(n);
      if (t && out[out.length - 1] !== t) out.push(t);
      if (out.length >= 8) break;
    }
    return out;
  };

  const inRegion = (node, region) => {
    if (!region) return true;
    const r = node.getBoundingClientRect();
    const cx = r.left + r.width / 2 + scrollX;
    const cy = r.top + r.height / 2 + scrollY;
    return cx >= region.x1 && cx <= region.x2 && cy >= region.y1 && cy <= region.y2;
  };

  const findCards = (region) => {
    const groups = {};
    document.querySelectorAll('body *').forEach((p) => {
      if (p.closest(BAD) || p.children.length < 3) return;
      if (region && !inRegion(p, region)) return;
      const buckets = {};
      [...p.children].forEach((c) => {
        if (!txt(c)) return;
        const s = sig(c);
        (buckets[s] ||= []).push(c);
      });
      Object.values(buckets).forEach((list) => {
        if (list.length < 3) return;
        const sample = leafTexts(list[0]);
        if (sample.length < 2 || sample.length > 8) return;
        const key = sig(p) + '|' + sig(list[0]) + '|' + sample.length;
        const score = list.length * sample.length;
        if (!groups[key] || groups[key].score < score) {
          groups[key] = { list, score, cols: sample.length };
        }
      });
    });
    const best = Object.values(groups).sort((a, b) => b.score - a.score)[0];
    if (!best) return [];
    return best.list.map((card) => {
      const cells = leafTexts(card);
      while (cells.length < best.cols) cells.push('');
      return cells.slice(0, best.cols);
    });
  };

  const ensureStudio = async () => {
    if (window.__CH_Studio?.mount) return window.__CH_Studio;
    const bundled = window.__CH_BUNDLE__?.sources?.['table-studio.js'];
    if (bundled) (0, eval)(bundled);
    else {
      const url = new URL('table-studio.js', toolsBase).href + '?' + Date.now();
      (0, eval)(await (await fetch(url)).text());
    }
    if (!window.__CH_Studio?.mount) throw new Error('Table Studio не загрузился');
    return window.__CH_Studio;
  };

  const root = document.createElement('div');
  root.setAttribute('data-cards', '1');
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:13px system-ui,sans-serif';
  document.body.appendChild(root);

  let studioApi = null;
  const modal = el(
    'div',
    'display:none;position:fixed;left:5%;top:5%;width:90%;height:80%;background:#171a1f;color:#e8eaed;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.6);pointer-events:auto;flex-direction:column;padding:12px;box-sizing:border-box;border:1px solid #2a3038',
  );
  const bar = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px');
  const status = el('span', 'font-weight:600', '');
  const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');

  const openRows = async (rows) => {
    status.textContent = `Найдено карточек: ${rows.length}`;
    modal.style.display = 'flex';
    const Studio = await ensureStudio();
    studioApi?.destroy?.();
    studioApi = Studio.mount(view, {
      rows,
      toolsBase,
      onChange: () => {},
    });
  };

  const run = async (region) => {
    try {
      const rows = findCards(region);
      if (!rows.length) {
        alert('Карточки не найдены. Выдели область плотнее или открой страницу с плитками.');
        return;
      }
      await openRows(rows);
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  const pickRegion = () => {
    const ov = el(
      'div',
      'position:fixed;inset:0;pointer-events:auto;cursor:crosshair;background:rgba(0,0,0,.08)',
    );
    const box = el(
      'div',
      'position:fixed;border:2px dashed #3d8bff;background:rgba(61,139,255,.12);display:none',
    );
    ov.appendChild(box);
    root.appendChild(ov);
    let s = null;
    const done = () => {
      ov.remove();
      removeEventListener('keydown', esc);
    };
    const esc = (e) => {
      if (e.key === 'Escape') done();
    };
    addEventListener('keydown', esc);
    ov.onmousedown = (e) => {
      s = { x: e.clientX + scrollX, y: e.clientY + scrollY };
      box.style.display = 'block';
    };
    ov.onmousemove = (e) => {
      if (!s) return;
      box.style.left = Math.min(s.x - scrollX, e.clientX) + 'px';
      box.style.top = Math.min(s.y - scrollY, e.clientY) + 'px';
      box.style.width = Math.abs(e.clientX - (s.x - scrollX)) + 'px';
      box.style.height = Math.abs(e.clientY - (s.y - scrollY)) + 'px';
    };
    ov.onmouseup = (e) => {
      if (!s) return;
      const ex = e.clientX + scrollX;
      const ey = e.clientY + scrollY;
      const r = {
        x1: Math.min(s.x, ex),
        x2: Math.max(s.x, ex),
        y1: Math.min(s.y, ey),
        y2: Math.max(s.y, ey),
      };
      done();
      void run(r);
    };
  };

  const downloadExcel = async () => {
    const rows = studioApi?.getRows?.() || [];
    if (!rows.length) {
      status.textContent = 'Нет строк для Excel';
      return;
    }
    if (window.__CH_Studio?.downloadXlsx) {
      const ok = await window.__CH_Studio.downloadXlsx(rows, toolsBase);
      if (ok) {
        status.textContent = `Найдено карточек: ${rows.length} · Excel .xlsx`;
        return;
      }
    }
    const esc = (s) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html =
      (window.__CH_Studio?.toExcelHtml && window.__CH_Studio.toExcelHtml(rows)) ||
      '<html><head><meta charset="utf-8"></head><body><table border="1">' +
        rows
          .map((row) => '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>')
          .join('') +
        '</table></body></html>';
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.href = url;
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    status.textContent = `Найдено карточек: ${rows.length} · запасной .xls`;
  };

  bar.append(
    status,
    el('button', B + ';background:#1a7f37', 'Excel', () => void downloadExcel()),
    el('button', B, 'Закрыть', () => {
      modal.style.display = 'none';
      studioApi?.destroy?.();
      studioApi = null;
    }),
  );
  modal.append(bar, view);
  root.appendChild(modal);

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;padding:8px;box-shadow:0 2px 12px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:6px;max-width:280px',
  );
  panel.append(
    el('div', 'font-size:12px;color:#9aa0a6', 'Плитки/карточки → строки таблицы · Esc — закрыть'),
    el('button', B + ';background:#1a7f37', 'Выделить область', pickRegion),
    el('button', B + ';background:#0b5cad', 'Вся видимая зона', () => void run(null)),
    el('button', B + ';background:#a00', '✕', () => window.__cards.destroy()),
  );
  root.appendChild(panel);

  const isEscKey = (e) => e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape';
  const onToolEsc = (e) => {
    if (!isEscKey(e)) return;
    if (root.querySelector('[style*="crosshair"]')) return;
    e.preventDefault();
    e.stopPropagation();
    if (modal.style.display === 'flex') {
      modal.style.display = 'none';
      studioApi?.destroy?.();
      studioApi = null;
      return;
    }
    window.__cards?.destroy?.();
  };
  addEventListener('keydown', onToolEsc, true);

  window.__cards = {
    destroy() {
      removeEventListener('keydown', onToolEsc, true);
      studioApi?.destroy?.();
      root.remove();
      delete window.__cards;
    },
    _test: { findCards, leafTexts },
  };
})();
