(() => {
  window.__tx?.destroy?.();
  const BAD = 'script,style,noscript,svg,template,head,[data-tx]';
  let merge = 6, gap = 14, frags = [], grid = [], rawGrid = [], smart = true;
  let studioApi = null;

  const toolsBase =
    window.__CH_BASE__ ||
    (document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/[^/]*$/, '')
      : new URL('tools/', location.href).href);

  const root = document.createElement('div');
  root.setAttribute('data-tx', '1');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:13px sans-serif';
  document.body.appendChild(root);
  const el = (tag, css, text, on) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (on) e.onclick = on;
    return e;
  };
  const B = 'pointer-events:auto;cursor:pointer;border:0;border-radius:6px;padding:8px 12px;color:#fff;background:#333;font:600 13px sans-serif;margin:0 3px';

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
  const normalizeRows = (input, opts = {}) => {
    const mergeIdRows = opts.mergeIdRows !== false;
    const splitMultilineName = opts.splitMultilineName !== false;
    let merged = 0;
    let rows = input.map((r) => [...r]);
    if (splitMultilineName) {
      rows = rows.map((row) => {
        const first = row[0] || '';
        const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return row;
        const next = [...row];
        next[0] = parts[0];
        next.splice(1, 0, parts.slice(1).join(' '));
        return next;
      });
    }
    if (mergeIdRows) {
      const out = [];
      for (const row of rows) {
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
    const w = Math.max(0, ...rows.map((r) => r.length));
    rows = rows
      .filter((r) => r.some((c) => String(c).trim()))
      .map((r) => {
        const c = [...r];
        while (c.length < w) c.push('');
        return c;
      });
    return { rows, meta: { merged } };
  };

  const collect = (region) => {
    const out = [], sx = scrollX, sy = scrollY, range = document.createRange();
    const hit = (cx, cy) => !region || (cx >= region.x1 && cx <= region.x2 && cy >= region.y1 && cy <= region.y2);
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.nodeValue.trim() && n.parentElement && !n.parentElement.closest(BAD) ? 1 : 2,
    });
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (p.checkVisibility && !p.checkVisibility({ checkVisibilityCSS: true })) continue;
      range.selectNodeContents(n);
      const bb = range.getBoundingClientRect();
      if (!bb.width || !bb.height) continue;
      if (
        region &&
        (bb.right + sx < region.x1 ||
          bb.left + sx > region.x2 ||
          bb.bottom + sy < region.y1 ||
          bb.top + sy > region.y2)
      )
        continue;
      const s = n.nodeValue, re = /\S+/g;
      let m;
      while ((m = re.exec(s))) {
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cx = (r.left + r.right) / 2 + sx, cy = (r.top + r.bottom) / 2 + sy;
        if (hit(cx, cy)) out.push({ t: m[0], x1: r.left + sx, x2: r.right + sx, y: cy, h: r.height });
      }
    }
    document
      .querySelectorAll(
        'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea,select',
      )
      .forEach((i) => {
        if (i.closest('[data-tx]')) return;
        const v = i.tagName === 'SELECT' ? i.selectedOptions[0]?.text || '' : i.value;
        const b = i.getBoundingClientRect();
        if (!v || !b.width || !b.height) return;
        const cx = (b.left + b.right) / 2 + sx, cy = (b.top + b.bottom) / 2 + sy;
        if (hit(cx, cy))
          out.push({ t: v.trim(), x1: b.left + sx, x2: b.right + sx, y: cy, h: Math.min(b.height, 20) });
      });
    return out;
  };

  const build = (fr, mergePx, gapPx) => {
    if (!fr.length) return [];
    const hs = fr.map((f) => f.h).sort((a, b) => a - b);
    const tol = hs[Math.floor(hs.length / 2)] * 0.6;
    const sorted = [...fr].sort((a, b) => a.y - b.y);
    const rows = [];
    sorted.forEach((f) => {
      const l = rows[rows.length - 1];
      if (l && Math.abs(f.y - l.y) <= tol) {
        l.items.push(f);
        l.y = (l.y * (l.items.length - 1) + f.y) / l.items.length;
      } else rows.push({ y: f.y, items: [f] });
    });
    rows.forEach((r) => {
      r.items.sort((a, b) => a.x1 - b.x1);
      const m = [];
      r.items.forEach((it) => {
        const l = m[m.length - 1];
        if (l && it.x1 - l.x2 <= mergePx) {
          l.t += ' ' + it.t;
          l.x2 = Math.max(l.x2, it.x2);
        } else m.push({ ...it });
      });
      r.items = m;
    });
    const all = rows.flatMap((r) => r.items);
    const minX = Math.floor(Math.min(...all.map((i) => i.x1)));
    const maxX = Math.ceil(Math.max(...all.map((i) => i.x2)));
    const W = Math.max(1, maxX - minX);
    const diff = new Int32Array(W + 3);
    all
      .filter((i) => i.x2 - i.x1 <= 0.6 * W)
      .forEach((i) => {
        diff[Math.max(0, Math.floor(i.x1 - minX))]++;
        diff[Math.min(W + 1, Math.ceil(i.x2 - minX) + 1)]--;
      });
    const thr = Math.floor(rows.length * 0.05), cuts = [];
    let c = 0, runStart = -1;
    for (let x = 0; x <= W; x++) {
      c += diff[x];
      if (c <= thr) {
        if (runStart < 0) runStart = x;
      } else if (runStart >= 0) {
        if (runStart > 0 && x - runStart >= gapPx) cuts.push(minX + (runStart + x) / 2);
        runStart = -1;
      }
    }
    const colOf = (it) => {
      const x = it.x2 - it.x1 > 0.6 * W ? it.x1 : (it.x1 + it.x2) / 2;
      let k = 0;
      while (k < cuts.length && cuts[k] < x) k++;
      return k;
    };
    const N = cuts.length + 1;
    return rows
      .map((r) => {
        const cells = Array(N).fill('');
        r.items.forEach((it) => {
          const k = colOf(it);
          cells[k] = cells[k] ? cells[k] + ' ' + it.t : it.t;
        });
        return cells;
      })
      .filter((r) => r.some((cell) => cell));
  };

  const colsN = (g) => (g.length ? Math.max(...g.map((r) => r.length)) : 0);

  const ensureStudio = async () => {
    if (window.__CH_Studio?.mount) return window.__CH_Studio;
    const url = new URL('table-studio.js', toolsBase).href + '?' + Date.now();
    const code = await (await fetch(url)).text();
    (0, eval)(code);
    if (!window.__CH_Studio?.mount) throw new Error('Table Studio не загрузился');
    return window.__CH_Studio;
  };

  const currentRows = () => (studioApi ? studioApi.getRows() : grid);

  const downloadExcel = () => {
    const rows = currentRows();
    const html = (window.__CH_Studio?.toExcelHtml || ((r) => {
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<html><head><meta charset="utf-8"></head><body><table border="1">' +
        r.map((row) => '<tr>' + row.map((c) => `<td style="mso-number-format:'\\@'">${esc(c)}</td>`).join('') + '</tr>').join('') +
        '</table></body></html>';
    }))(rows);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadCsv = () => {
    const rows = currentRows();
    const text = (window.__CH_Studio?.toCsv || ((r) => r.map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n')))(rows);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copyTSV = async () => {
    const rows = currentRows();
    const s = (window.__CH_Studio?.toTsv || ((r) => r.map((row) => row.join('\t')).join('\n')))(rows);
    try {
      await navigator.clipboard.writeText(s);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.setAttribute('data-tx', '1');
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    status.textContent = status.textContent.replace(/ · скопировано$/, '') + ' · скопировано';
  };

  const modal = el(
    'div',
    'display:none;position:fixed;left:5%;top:5%;width:90%;height:80%;background:#171a1f;color:#e8eaed;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.6);pointer-events:auto;flex-direction:column;padding:12px;box-sizing:border-box;border:1px solid #2a3038',
  );
  const bar = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px');
  const status = el('span', 'font-weight:600;margin-right:8px');
  const num = (v, cb) => {
    const i = el('input', 'width:60px;padding:4px;background:#0e0f12;color:#e8eaed;border:1px solid #2a3038;border-radius:4px');
    i.type = 'number';
    i.value = v;
    i.onchange = () => cb(+i.value || 0);
    return i;
  };
  const mIn = num(merge, (v) => {
    merge = v;
    rebuild();
  });
  const gIn = num(gap, (v) => {
    gap = v;
    rebuild();
  });
  const smartBtn = el('button', B + ';background:#3d8bff', '', () => {
    smart = !smart;
    smartBtn.textContent = smart ? 'Умная таблица: ВКЛ' : 'Как есть';
    rebuild();
  });
  smartBtn.textContent = 'Умная таблица: ВКЛ';
  smartBtn.title = 'Схлопывает название + код (ID) в одну строку';
  const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');

  const rebuild = async () => {
    rawGrid = build(frags, merge, gap);
    grid = smart ? normalizeRows(rawGrid).rows : rawGrid;
    status.textContent = `Слов: ${frags.length}, строк: ${grid.length}, столбцов: ${colsN(grid)}${smart ? ' · умная' : ' · как есть'}`;
    try {
      const Studio = await ensureStudio();
      studioApi = Studio.mount(view, {
        rows: grid,
        onChange: (next) => {
          grid = next;
          status.textContent = `Строк: ${grid.length}, столбцов: ${colsN(grid)} · правки вручную`;
        },
      });
    } catch (err) {
      view.replaceChildren(el('div', 'color:#f07178;padding:8px', err.message || String(err)));
    }
  };

  bar.append(
    status,
    el('span', '', 'Склейка, px:'),
    mIn,
    el('span', '', 'Зазор, px:'),
    gIn,
    smartBtn,
    el('button', B + ';background:#1a7f37', 'Excel', downloadExcel),
    el('button', B + ';background:#0b5cad', 'CSV', downloadCsv),
    el('button', B + ';background:#0b5cad', 'Копировать TSV', copyTSV),
    el('button', B, 'Закрыть', () => {
      modal.style.display = 'none';
    }),
  );
  modal.append(bar, view);
  root.appendChild(modal);

  const run = (region) => {
    frags = collect(region);
    if (!frags.length) {
      alert('Текст в этой области не найден');
      return;
    }
    for (const [m, g] of [
      [merge, gap],
      [6, 10],
      [5, 8],
      [4, 6],
      [3, 5],
    ]) {
      if (colsN(build(frags, m, g)) >= 2) {
        merge = m;
        gap = g;
        break;
      }
    }
    mIn.value = merge;
    gIn.value = gap;
    modal.style.display = 'flex';
    void rebuild();
  };

  const pickRegion = () => {
    modal.style.display = 'none';
    const ov = el('div', 'position:fixed;inset:0;pointer-events:auto;cursor:crosshair;background:rgba(0,0,0,.08)');
    const box = el('div', 'position:fixed;border:2px dashed #e00;background:rgba(255,0,0,.1);display:none');
    ov.appendChild(box);
    root.appendChild(ov);
    let s = null;
    const done = () => {
      ov.remove();
      removeEventListener('keydown', esc2);
    };
    const esc2 = (e) => {
      if (e.key === 'Escape') done();
    };
    addEventListener('keydown', esc2);
    ov.onmousedown = (e) => {
      s = { x: e.clientX + scrollX, y: e.clientY + scrollY };
      box.style.display = 'block';
    };
    ov.onmousemove = (e) => {
      if (!s) return;
      const x1 = Math.min(s.x - scrollX, e.clientX), y1 = Math.min(s.y - scrollY, e.clientY);
      box.style.left = x1 + 'px';
      box.style.top = y1 + 'px';
      box.style.width = Math.abs(e.clientX - (s.x - scrollX)) + 'px';
      box.style.height = Math.abs(e.clientY - (s.y - scrollY)) + 'px';
    };
    ov.onmouseup = (e) => {
      if (!s) return;
      const ex = e.clientX + scrollX, ey = e.clientY + scrollY;
      const r = {
        x1: Math.min(s.x, ex),
        x2: Math.max(s.x, ex),
        y1: Math.min(s.y, ey),
        y2: Math.max(s.y, ey),
      };
      done();
      run(r);
    };
  };

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;padding:8px;box-shadow:0 2px 12px rgba(0,0,0,.45);display:flex;align-items:center',
  );
  panel.append(
    el('button', B + ';background:#1a7f37', 'Область', pickRegion),
    el('button', B + ';background:#0b5cad', 'Вся страница', () => run(null)),
    el('button', B + ';background:#a00', '✕', () => window.__tx.destroy()),
  );
  root.appendChild(panel);

  window.__tx = {
    destroy() {
      studioApi?.destroy?.();
      root.remove();
      delete window.__tx;
    },
    _test: { normalizeRows, looksLikeId },
  };
})();
