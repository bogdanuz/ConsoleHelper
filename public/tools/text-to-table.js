(() => {
  window.__tp?.destroy?.();
  window.__cards?.destroy?.();
  window.__ch_shot?.destroy?.();
  window.__tx?.destroy?.();
  const BAD = 'script,style,noscript,svg,template,head,[data-tx]';
  let merge = 6, gap = 14, frags = [], grid = [], rawGrid = [], labelValues = false, codeColumn = false, dirty = false, userPickedModes = false;
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
    let pending = rows.map(() => '');
    if (splitMultilineName) {
      rows = rows.map((row, i) => {
        const first = row[0] || '';
        const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return row;
        const idPart = parts.slice(1).join(' ');
        if (!looksLikeId(idPart)) return row;
        const next = [...row];
        next[0] = parts[0];
        pending[i] = idPart;
        return next;
      });
    }
    if (mergeIdRows) {
      const out = [];
      const outPending = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
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
          !(prev[1] && looksLikeId(prev[1])) &&
          !outPending[out.length - 1];
        if (continuation && prev) {
          outPending[out.length - 1] = idToken;
          for (let c = 0; c < row.length; c++) {
            const v = String(row[c] || '').trim();
            if (!v || v === idToken) continue;
            while (prev.length <= c) prev.push('');
            if (!String(prev[c] || '').trim()) prev[c] = v;
          }
          merged++;
        } else {
          out.push([...row]);
          outPending.push(pending[i] || '');
        }
      }
      rows = out;
      pending = outPending;
    }
    if (pending.some((id) => id)) {
      rows = rows.map((row, i) => {
        const next = [...row];
        next.splice(1, 0, pending[i] || '');
        return next;
      });
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

  const isNumTok = (t) => {
    const s = String(t || '').trim();
    if (!s) return false;
    if (parseRuNumber(s) !== null) return true;
    return /%$/.test(s);
  };
  const pairLabelValues = (frags, mergePx) => {
    const empty = { rows: [], use: false, paired: 0 };
    if (!frags || frags.length < 4) return empty;
    const hs = frags.map((f) => f.h).sort((a, b) => a - b);
    const tol = Math.max(4, hs[Math.floor(hs.length / 2)] * 0.65);
    const sorted = [...frags].sort((a, b) => a.y - b.y || a.x1 - b.x1);
    const lines = [];
    sorted.forEach((f) => {
      const last = lines[lines.length - 1];
      if (last && Math.abs(f.y - last.y) <= tol) {
        last.items.push(f);
        last.y = (last.y * (last.items.length - 1) + f.y) / last.items.length;
      } else lines.push({ y: f.y, items: [f] });
    });
    const phrases = [];
    lines.forEach((line) => {
      const items = [...line.items].sort((a, b) => a.x1 - b.x1);
      const row = [];
      items.forEach((it) => {
        const prev = row[row.length - 1];
        const gap = prev ? it.x1 - prev.x2 : 999;
        const join =
          prev &&
          gap <= (mergePx || 10) &&
          gap >= -2 &&
          ((isNumTok(prev.t) && isNumTok(it.t)) || (!isNumTok(prev.t) && !isNumTok(it.t)));
        if (prev && join) {
          prev.t += (gap > 1 ? ' ' : '') + it.t;
          prev.x2 = Math.max(prev.x2, it.x2);
        } else row.push({ t: it.t, x1: it.x1, x2: it.x2, y: it.y, h: it.h });
      });
      row.forEach((p) => {
        p.num = isNumTok(p.t);
        phrases.push(p);
      });
    });
    let mixed = 0;
    lines.forEach((line) => {
      const ps = phrases.filter((p) => Math.abs(p.y - line.y) <= tol);
      const hasText = ps.some((p) => !p.num && /[A-Za-zА-Яа-я]/.test(p.t));
      const hasNum = ps.some((p) => p.num);
      if (hasText && hasNum && ps.length >= 3) mixed++;
    });
    if (mixed >= 2 && mixed >= lines.length * 0.35) return empty;
    const numbers = phrases.filter((p) => p.num).sort((a, b) => a.y - b.y || a.x1 - b.x1);
    if (numbers.length < 3) return empty;
    const labels = phrases.filter((p) => !p.num && /[A-Za-zА-Яа-я]/.test(p.t));
    const ov = (a, b) => {
      const inter = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      if (inter <= 0) return 0;
      const minW = Math.min(a.x2 - a.x1, b.x2 - b.x1);
      return minW <= 1 ? 0 : inter / minW;
    };
    const rows = [];
    let paired = 0;
    numbers.forEach((num) => {
      let best = null;
      let bestScore = -1e9;
      labels.forEach((lab) => {
        if (lab.y >= num.y - 1) return;
        const dy = num.y - lab.y;
        if (dy > 72) return;
        const ratio = ov(lab, num);
        if (ratio < 0.4) return;
        const score = ratio * 120 - dy;
        if (score > bestScore) {
          bestScore = score;
          best = lab;
        }
      });
      if (!best) return;
      paired++;
      rows.push([best.t, num.t]);
    });
    const use = paired >= 3 && paired / numbers.length >= 0.55;
    return { rows: use ? rows : [], use, paired };
  };

  const applyCaptureModes = (rows, fragments, labels, code, mergePx) => {
    let note = '';
    let out = rows.map((r) => [...r]);
    if (labels) {
      if (fragments && fragments.length) {
        const paired = pairLabelValues(fragments, mergePx || 10);
        if (paired.use) out = paired.rows;
        else note = 'не похоже на подписи над числами';
      } else note = 'не похоже на подписи над числами';
    }
    if (code) out = normalizeRows(out).rows;
    return { rows: out, note };
  };

  const pinnedDelta = (el, scrollY) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const pos = getComputedStyle(n).position;
      if (pos === 'fixed') return null;
      if (pos === 'sticky') {
        let y = 0;
        let cur = n;
        let guard = 0;
        while (cur && guard++ < 25) {
          y += cur.offsetTop || 0;
          const next = cur.offsetParent;
          if (!next || next === cur) break;
          cur = next;
        }
        return n.getBoundingClientRect().top + scrollY - y;
      }
      n = n.parentElement;
    }
    return 0;
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
      const shift = pinnedDelta(p, sy);
      if (shift == null) continue;
      range.selectNodeContents(n);
      const bb = range.getBoundingClientRect();
      if (!bb.width || !bb.height) continue;
      const top = bb.top + sy - shift;
      const bottom = bb.bottom + sy - shift;
      if (
        region &&
        (bb.right + sx < region.x1 ||
          bb.left + sx > region.x2 ||
          bottom < region.y1 ||
          top > region.y2)
      )
        continue;
      const s = n.nodeValue, re = /\S+/g;
      let m;
      while ((m = re.exec(s))) {
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cx = (r.left + r.right) / 2 + sx;
        const cy = (r.top + r.bottom) / 2 + sy - shift;
        if (hit(cx, cy))
          out.push({ t: m[0], x1: r.left + sx, x2: r.right + sx, y: cy, h: r.height });
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
        const shift = pinnedDelta(i, sy);
        if (shift == null) return;
        const cx = (b.left + b.right) / 2 + sx;
        const cy = (b.top + b.bottom) / 2 + sy - shift;
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

  const currentRows = () =>
    studioApi?.getExportRows?.() || (studioApi ? studioApi.getRows() : grid);

  const downloadExcel = async () => {
    const rows = currentRows();
    if (window.__CH_Studio?.downloadXlsx) {
      const ok = await window.__CH_Studio.downloadXlsx(rows, toolsBase);
      if (ok) {
        status.textContent = status.textContent.replace(/ · Excel.*$/, '') + ' · Excel .xlsx';
        return;
      }
    }
    const html = (window.__CH_Studio?.toExcelHtml || ((r) => {
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<html><head><meta charset="utf-8"></head><body><table border="1">' +
        r.map((row) => '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') +
        '</table></body></html>';
    }))(rows);
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.href = url;
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    status.textContent = status.textContent.replace(/ · Excel.*$/, '') + ' · запасной .xls';
  };

  const downloadCsv = () => {
    const rows = currentRows();
    const text = (window.__CH_Studio?.toCsv || ((r) => r.map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n')))(rows);
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
    askRebuild(() => {
      merge = v;
    });
  });
  const gIn = num(gap, (v) => {
    askRebuild(() => {
      gap = v;
    });
  });
  const tune = el('div', 'display:none;gap:6px;align-items:center;flex-wrap:wrap', '');
  tune.append(el('span', '', 'Склейка, px:'), mIn, el('span', '', 'Зазор, px:'), gIn);
  const modeBtn = (label, on) => {
    const b = el('button', B + ';background:#333', label, on);
    return b;
  };
  const paintModes = () => {
    const raw = !labelValues && !codeColumn;
    asIsBtn.style.background = raw ? '#0b5cad' : '#333';
    codeBtn.style.background = codeColumn ? '#0b5cad' : '#333';
    labelBtn.style.background = labelValues ? '#0b5cad' : '#333';
  };
  const askRebuild = (fn) => {
    if (dirty && !confirm('Собрать заново? Правки пропадут.')) return;
    userPickedModes = true;
    dirty = false;
    fn();
    void rebuild();
  };
  const asIsBtn = modeBtn('Как на странице', () =>
    askRebuild(() => {
      labelValues = false;
      codeColumn = false;
    }),
  );
  const codeBtn = modeBtn('Умная вёрстка', () =>
    askRebuild(() => {
      codeColumn = !codeColumn;
    }),
  );
  const labelBtn = modeBtn('Название над суммой', () =>
    askRebuild(() => {
      labelValues = !labelValues;
    }),
  );
  asIsBtn.title = 'Оставить таблицу как на странице, без перестройки';
  codeBtn.title =
    'Выравнивает кривую сетку и, если рядом с названием есть код, ставит его в новый столбец. Остальные столбцы сдвигаются вместе.';
  labelBtn.title =
    'Для блоков, где название стоит над числом. Получается две колонки: название и сумма.';
  const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');

  const rebuild = async () => {
    const base = build(frags, merge, gap);
    if (!userPickedModes) {
      const paired = pairLabelValues(frags, Math.max(merge, 8));
      labelValues = !!paired.use;
      const shaped = paired.use ? paired.rows : base;
      codeColumn = JSON.stringify(normalizeRows(shaped).rows) !== JSON.stringify(shaped);
    }
    paintModes();
    const applied = applyCaptureModes(base, frags, labelValues, codeColumn, Math.max(merge, 8));
    rawGrid = base;
    grid = applied.rows;
    status.textContent = `Слов: ${frags.length}, строк: ${grid.length}, столбцов: ${colsN(grid)}${applied.note ? ' · ' + applied.note : ''}`;
    try {
      const Studio = await ensureStudio();
      studioApi?.destroy?.();
      studioApi = Studio.mount(view, {
        rows: grid,
        onChange: () => {
          dirty = true;
          status.textContent = `Строк: ${studioApi?.getRows?.().length || grid.length} · правки вручную`;
        },
      });
    } catch (err) {
      view.replaceChildren(el('div', 'color:#f07178;padding:8px', err.message || String(err)));
    }
  };

  bar.append(status, asIsBtn, codeBtn, labelBtn, tune,
    el('button', B + ';background:#1a7f37', 'Excel', downloadExcel),
    el('button', B + ';background:#0b5cad', 'CSV', downloadCsv),
    el('button', B + ';background:#0b5cad', 'Копировать в Excel (TSV)', copyTSV),
    (() => {
      const wrapTune = el('div', 'position:relative', '');
      const tuneBtn = el('button', B, 'Сетка', () => {
        tune.style.display = tune.style.display === 'flex' ? 'none' : 'flex';
      });
      tuneBtn.title =
        'Если столбцы съехали: склейка — насколько близкие слова считать одной ячейкой, зазор — где проводить границу столбца.';
      tune.style.cssText =
        'display:none;position:absolute;top:100%;left:0;z-index:2;margin-top:4px;padding:8px;background:#171a1f;border:1px solid #2a3038;border-radius:8px;flex-direction:column;gap:6px;min-width:180px';
      wrapTune.append(tuneBtn, tune);
      return wrapTune;
    })(),
    el('button', B, 'Закрыть', () => {
      modal.style.display = 'none';
      studioApi?.destroy?.();
      studioApi = null;
    }),
  );
  modal.append(bar, view);
  const dragFrom = (handle, win) => {
    let on = false;
    let sx = 0;
    let sy = 0;
    let ox = 0;
    let oy = 0;
    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button,input,a')) return;
      on = true;
      const r = win.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      ox = r.left;
      oy = r.top;
      win.style.left = ox + 'px';
      win.style.top = oy + 'px';
    });
    addEventListener('mousemove', (e) => {
      if (!on) return;
      win.style.left = ox + e.clientX - sx + 'px';
      win.style.top = oy + e.clientY - sy + 'px';
    });
    addEventListener('mouseup', () => {
      on = false;
    });
  };
  dragFrom(bar, modal);
  root.appendChild(modal);

  let scrolling = false;
  const isEscKey = (e) => e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape';
  const onToolEsc = (e) => {
    if (!isEscKey(e)) return;
    if (root.querySelector('[style*="crosshair"]')) return; // region pick has own Esc
    e.preventDefault();
    e.stopPropagation();
    if (scrolling) {
      scrollStop = true;
      return;
    }
    if (modal.style.display === 'flex') {
      modal.style.display = 'none';
      studioApi?.destroy?.();
      studioApi = null;
      return;
    }
    scrollStop = true;
    window.__tx?.destroy?.();
  };
  addEventListener('keydown', onToolEsc, true);

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

  let scrollPace = 'normal';
  let scrollStop = false;
  const scrollNote = el('div', 'font-size:11px;color:#9aa0a6;min-height:1.2em', '');
  const setScrollNote = (t) => {
    scrollNote.textContent = t || '';
  };
  const onScrollEsc = (e) => {
    if (e.key === 'Escape') scrollStop = true;
  };
  const autoScrollThenRun = async () => {
    scrolling = true;
    scrollStop = false;
    const startY = window.scrollY;
    const pace = scrollPace === 'short' ? { steps: 12, wait: 280 } : scrollPace === 'long' ? { steps: 120, wait: 350 } : { steps: 40, wait: 450 };
    const maxSteps = pace.steps;
    if (panel._chHold) panel._chHold(true);
    let lastH = 0;
    let stable = 0;
    addEventListener('keydown', onScrollEsc, true);
    try {
      for (let i = 0; i < maxSteps; i++) {
        if (scrollStop) break;
        setScrollNote('Прокрутка ' + (i + 1) + '/' + maxSteps + '… Esc — стоп');
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, pace.wait));
        const h = document.documentElement.scrollHeight;
        if (h <= lastH + 2) {
          stable++;
          if (stable >= 3) break;
        } else stable = 0;
        lastH = h;
      }
      // Collect while still at bottom — restoring scroll first can unload lazy lists.
      setScrollNote(scrollStop ? 'Остановлено' : 'Снимаю…');
      if (!scrollStop) run(null);
    } finally {
      scrolling = false;
      if (panel._chHold) panel._chHold(false);
      removeEventListener('keydown', onScrollEsc, true);
      window.scrollTo(0, startY);
    }
  };

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;padding:10px;box-shadow:0 2px 12px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:6px;max-width:300px',
  );
  const tip = (t) => el('div', 'font-size:11px;color:#9aa0a6;line-height:1.35', t);
  const paceMenu = el(
    'div',
    'display:none;flex-direction:column;gap:4px;padding:4px 0',
    '',
  );
  const paceBtn = (label, title, pace) => {
    const b = el('button', B, label, () => {
      scrollPace = pace;
      paceMenu.style.display = 'none';
      void autoScrollThenRun();
    });
    b.title = title;
    return b;
  };
  paceMenu.append(
    paceBtn('Короткий список', 'Несколько экранов вниз. Если строк немного.', 'short'),
    paceBtn('Обычная лента', 'Средняя прокрутка. Подходит чаще всего.', 'normal'),
    paceBtn('Длинная лента', 'Крутит почти до конца. Если строки появляются долго.', 'long'),
  );
  panel.append(
    el('button', B + ';background:#1a7f37', 'Область', pickRegion),
    el('button', B + ';background:#0b5cad', 'Страница уже вся загружена', () => run(null)),
    tip('Нет новых строк при прокрутке вниз.'),
    el('button', B + ';background:#0b5cad', 'Список подгружается при прокрутке', () => {
      paceMenu.style.display = paceMenu.style.display === 'flex' ? 'none' : 'flex';
    }),
    paceMenu,
    tip('Список растёт, когда крутишь вниз.'),
    tip('Не уверен? Прокрути вниз вручную — если появились новые строки, бери прокрутку; если ничего нового — «уже вся загружена».'),
    tip('Esc — закрыть редактор, ещё раз Esc — закрыть инструмент.'),
    scrollNote,
    el('button', B + ';background:#a00', '✕', () => {
      scrollStop = true;
      window.__tx.destroy();
    }),
  );
  root.appendChild(panel);
  panel.style.transition = 'transform .2s ease';
  panel.style.transform = 'translateX(0)';
  let dockTimer = 0;
  const dockShow = () => {
    clearTimeout(dockTimer);
    panel.style.transform = 'translateX(0)';
  };
  panel.addEventListener('mouseenter', dockShow);
  panel.addEventListener('mouseleave', () => {
    clearTimeout(dockTimer);
    dockTimer = setTimeout(() => {
      if (panel.dataset.chHold === '1' || modal.style.display === 'flex') return;
      panel.style.transform = 'translateX(calc(100% - 36px))';
    }, 2000);
  });
  panel._chHold = (on) => {
    panel.dataset.chHold = on ? '1' : '';
    if (on) dockShow();
  };

  window.__tx = {
    destroy() {
      removeEventListener('keydown', onToolEsc, true);
      removeEventListener('keydown', onScrollEsc, true);
      studioApi?.destroy?.();
      root.remove();
      delete window.__tx;
    },
    _test: { normalizeRows, looksLikeId, pairLabelValues, pinnedDelta, applyCaptureModes },
  };
})();
