(() => {
  /**
   * Shared in-page table editor.
   * window.__CH_Studio.mount(container, { rows, onChange, enablePaste })
   */
  const el = (tag, css, text, on) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (on) e.onclick = on;
    return e;
  };

  const clone = (rows) => rows.map((r) => [...r]);
  const pad = (rows) => {
    const w = Math.max(0, ...rows.map((r) => r.length));
    return rows.map((r) => {
      const c = [...r];
      while (c.length < w) c.push('');
      return c;
    });
  };

  const decodeEntities = (raw) =>
    String(raw || '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' ')
      .trim();

  const parseHtmlTable = (html) => {
    const tableMatch = String(html || '').match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
    const body = tableMatch ? tableMatch[1] : html;
    const rows = [];
    const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(body || ''))) {
      const cells = [];
      const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cell;
      while ((cell = cellRe.exec(tr[1] || ''))) cells.push(decodeEntities(cell[1]));
      if (cells.length) rows.push(cells);
    }
    return pad(rows);
  };

  const splitDelimitedLine = (line, sep) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === sep) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };

  const parseDelimited = (text, sep) => {
    const lines = String(text || '')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((l) => l.length);
    return pad(lines.map((l) => splitDelimitedLine(l, sep)));
  };

  const guessCsvSep = (text) => {
    const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
    const semis = (sample.match(/;/g) || []).length;
    const commas = (sample.match(/,/g) || []).length;
    return semis >= commas ? ';' : ',';
  };

  const looksLikeHtml = (s) => /<table\b/i.test(s) || /<tr\b/i.test(s);

  const parseRuNumber = (raw) => {
    const s = String(raw || '').trim();
    if (!s || s === '—' || s === '-' || s === '–') return null;
    const cleaned = s.replace(/\s/g, '').replace(/₽/g, '').replace(/%/g, '').replace(/,/g, '.');
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const compactNumericCell = (raw) => {
    const n = parseRuNumber(raw);
    if (n === null) return raw;
    if (Number.isInteger(n)) return String(n);
    const s = String(n);
    if (!/[eE]/.test(s)) return s;
    return n.toFixed(10).replace(/\.?0+$/, '');
  };

  const compactNumericGrid = (input) => {
    let changed = 0;
    const rows = input.map((row) =>
      row.map((cell) => {
        const c = compactNumericCell(cell);
        if (c !== cell) changed++;
        return c;
      }),
    );
    return { rows, changed };
  };

  const parseClipboard = (input) => {
    const html = String(input?.html || '').trim();
    const text = String(input?.text || '')
      .replace(/^\uFEFF/, '')
      .trim();
    if (html && looksLikeHtml(html)) {
      const rows = parseHtmlTable(html);
      if (rows.length) return { rows, format: 'html' };
    }
    if (text && looksLikeHtml(text)) {
      const rows = parseHtmlTable(text);
      if (rows.length) return { rows, format: 'html' };
    }
    if (!text) return { rows: [], format: 'empty' };
    if (text.includes('\t')) return { rows: parseDelimited(text, '\t'), format: 'tsv' };
    if (/[;,]/.test(text) && text.includes('\n')) {
      return { rows: parseDelimited(text, guessCsvSep(text)), format: 'csv' };
    }
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    return {
      rows: pad(lines.map((l) => [l.trim()])),
      format: text.includes('\n') ? 'tsv' : 'empty',
    };
  };

  const readClipboard = async () => {
    const out = { text: '', html: '' };
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            out.html = await (await item.getType('text/html')).text();
          }
          if (item.types.includes('text/plain')) {
            out.text = await (await item.getType('text/plain')).text();
          }
        }
        return out;
      }
    } catch (_) {}
    if (navigator.clipboard?.readText) out.text = await navigator.clipboard.readText();
    return out;
  };

  const loadXlsx = async (toolsBase) => {
    if (window.XLSX?.utils) return window.XLSX;
    const base =
      toolsBase ||
      window.__CH_BASE__ ||
      new URL('tools/', location.href).href;
    const candidates = [
      new URL('../vendor/xlsx.full.min.js', base).href,
      new URL('vendor/xlsx.full.min.js', base).href,
    ];
    for (const src of candidates) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = () => reject(new Error('xlsx load fail'));
          document.head.appendChild(s);
        });
        if (window.XLSX?.utils) return window.XLSX;
      } catch (_) {}
    }
    return null;
  };

  const downloadXlsx = async (rows, toolsBase) => {
    const XLSX = await loadXlsx(toolsBase);
    if (!XLSX) return false;
    const aoa = rows.map((row) =>
      row.map((cell) => {
        const n = parseRuNumber(String(cell));
        return n === null ? String(cell) : n;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'export_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  };

  function mount(container, opts) {
    let allRows = pad(clone(opts.rows || []));
    let filterQuery = '';
    let hideEmpty = false;
    const selected = new Set();
    const onChange = opts.onChange || (() => {});
    const maxRows = opts.maxRows || 500;
    const enablePaste = opts.enablePaste !== false;
    const onPasteInfo = opts.onPasteInfo || (() => {});
    const toolsBase = opts.toolsBase || window.__CH_BASE__;

    const wrap = el(
      'div',
      'display:flex;flex-direction:column;gap:8px;height:100%;min-height:0',
    );
    const hint = el(
      'div',
      'font-size:12px;color:#9aa0a6',
      'Клик — выделить для суммы. Двойной клик — править. «✕» — удалить строку.',
    );
    const tools = el('div', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center');
    const filterRow = el('div', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center');
    const sumLine = el('div', 'font-size:12px;color:#3dd68c;min-height:1.2em', '');
    const scroller = el(
      'div',
      'flex:1;overflow:auto;border:1px solid #2a3038;background:#0e0f12;border-radius:8px;min-height:120px',
    );

    const getView = () => {
      let list = allRows.map((row, allIndex) => ({ row, allIndex }));
      if (hideEmpty) list = list.filter((x) => x.row.some((c) => String(c).trim()));
      if (filterQuery.trim()) {
        const q = filterQuery.trim().toLowerCase();
        list = list.filter((x) => x.row.some((c) => String(c).toLowerCase().includes(q)));
      }
      return list;
    };

    const emit = () => onChange(clone(allRows));

    const updateSumLine = () => {
      let count = 0;
      let sum = 0;
      let numericCount = 0;
      for (const key of selected) {
        count++;
        const [rs, cs] = key.split(':');
        const n = parseRuNumber(String(allRows[Number(rs)]?.[Number(cs)] ?? ''));
        if (n === null) continue;
        sum += n;
        numericCount++;
      }
      const viewLen = getView().length;
      const trunc =
        viewLen > maxRows ? ` · на экране ${maxRows} из ${viewLen} (фильтр/правки по всем)` : '';
      if (!count) {
        sumLine.textContent = trunc ? trunc.replace(/^ · /, '') : '';
        return;
      }
      const sumText = numericCount
        ? sum.toLocaleString('ru-RU', { maximumFractionDigits: 6 })
        : '—';
      sumLine.textContent = `Выбрано: ${count} · Сумма: ${sumText}${trunc}`;
    };

    const applyAll = (next, info) => {
      allRows = pad(clone(next || []));
      selected.clear();
      emit();
      if (info) onPasteInfo(info);
      render();
    };

    const ingestClipboard = async (evt) => {
      let payload = { text: '', html: '' };
      if (evt?.clipboardData) {
        payload.html = evt.clipboardData.getData('text/html') || '';
        payload.text = evt.clipboardData.getData('text/plain') || '';
      } else payload = await readClipboard();
      const parsed = parseClipboard(payload);
      if (!parsed.rows.length) {
        onPasteInfo({ ok: false, message: 'В буфере нет таблицы' });
        return false;
      }
      applyAll(parsed.rows, {
        ok: true,
        format: parsed.format,
        message: `Вставлено: ${parsed.rows.length} стр.`,
      });
      return true;
    };

    const toolBtn = (label, title, bg, onClick) => {
      const b = el(
        'button',
        `border:0;border-radius:6px;padding:6px 10px;color:#fff;background:${bg};cursor:pointer;font:600 12px system-ui`,
        label,
        (e) => {
          e.preventDefault();
          onClick();
        },
      );
      b.title = title;
      return b;
    };

    const filterInput = el(
      'input',
      'flex:1;min-width:140px;padding:6px 8px;border-radius:6px;border:1px solid #2a3038;background:#0e0f12;color:#e8eaed;font:12px system-ui',
    );
    filterInput.placeholder = 'Фильтр…';
    filterInput.oninput = () => {
      filterQuery = filterInput.value;
      render();
    };

    const emptyBtn = toolBtn('Только непустые', 'Скрыть пустые строки', '#333', () => {
      hideEmpty = !hideEmpty;
      emptyBtn.textContent = hideEmpty ? 'Непустые: ВКЛ' : 'Только непустые';
      emptyBtn.style.background = hideEmpty ? '#0b5cad' : '#333';
      render();
    });
    filterRow.append(
      filterInput,
      emptyBtn,
      toolBtn('Сбросить фильтр', 'Показать все строки', '#333', () => {
        filterQuery = '';
        hideEmpty = false;
        filterInput.value = '';
        emptyBtn.textContent = 'Только непустые';
        emptyBtn.style.background = '#333';
        render();
      }),
      toolBtn('Снять выделение', 'Очистить выбор ячеек', '#333', () => {
        selected.clear();
        updateSumLine();
        render();
      }),
    );

    tools.append(
      toolBtn('Числа без пробелов', '«10 000» → «10000»', '#0b5cad', () => {
        const { rows: next, changed } = compactNumericGrid(allRows);
        applyAll(next, {
          ok: true,
          message: changed ? `Убраны пробелы в ${changed} ячейках` : 'Нечего менять',
        });
      }),
    );
    if (enablePaste) {
      tools.append(
        toolBtn('Вставить', 'Из буфера', '#3d8bff', () => void ingestClipboard()),
      );
    }

    const render = () => {
      allRows = pad(allRows);
      const view = getView();
      const table = el(
        'table',
        'border-collapse:collapse;font:12px/1.35 system-ui,sans-serif;color:#e8eaed;width:100%',
      );
      const head = el('tr');
      head.appendChild(
        el('th', 'border:1px solid #2a3038;padding:4px 6px;background:#1e232b;width:36px', ''),
      );
      const cols = allRows[0] ? allRows[0].length : 0;
      for (let c = 0; c < cols; c++) {
        head.appendChild(
          el(
            'th',
            'border:1px solid #2a3038;padding:4px 6px;background:#1e232b;color:#9aa0a6;font-weight:600',
            String(c + 1),
          ),
        );
      }
      table.appendChild(head);

      view.slice(0, maxRows).forEach(({ row, allIndex }) => {
        const tr = el('tr');
        const del = el(
          'button',
          'border:0;background:transparent;color:#f07178;cursor:pointer;font:600 12px system-ui;padding:2px 6px',
          '✕',
          (e) => {
            e.stopPropagation();
            const beforeSel = [...selected];
            allRows = allRows.filter((_, i) => i !== allIndex);
            const remapped = [];
            for (const k of beforeSel) {
              const parts = k.split(':');
              const r = Number(parts[0]);
              const c = Number(parts[1]);
              if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
              if (r === allIndex) continue;
              remapped.push(r > allIndex ? r - 1 + ':' + c : k);
            }
            selected.clear();
            remapped.forEach((k) => selected.add(k));
            emit();
            render();
          },
        );
        const tdDel = el('td', 'border:1px solid #2a3038;text-align:center;vertical-align:middle');
        tdDel.appendChild(del);
        tr.appendChild(tdDel);

        row.forEach((cell, ci) => {
          const key = allIndex + ':' + ci;
          const isSel = selected.has(key);
          const td = el(
            'td',
            'border:1px solid #2a3038;padding:4px 6px;vertical-align:top;min-width:72px;outline:none;cursor:pointer;' +
              (isSel ? 'background:#1a3a5c;' : ''),
          );
          td.spellcheck = false;
          td.textContent = cell;
          const isEditing = () => td.getAttribute('contenteditable') === 'true';
          td.addEventListener('click', (ev) => {
            if (isEditing()) return;
            ev.preventDefault();
            if (selected.has(key)) {
              selected.delete(key);
              td.style.background = '';
            } else {
              selected.add(key);
              td.style.background = '#1a3a5c';
            }
            updateSumLine();
          });
          td.addEventListener('dblclick', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            td.setAttribute('contenteditable', 'true');
            td.focus();
          });
          td.addEventListener('blur', () => {
            if (!isEditing()) return;
            td.removeAttribute('contenteditable');
            const v = td.textContent || '';
            if (allRows[allIndex][ci] === v) return;
            allRows[allIndex][ci] = v;
            emit();
          });
          td.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              td.blur();
            }
          });
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      scroller.replaceChildren(table);
      updateSumLine();
    };

    const onPaste = (ev) => {
      if (!enablePaste || !wrap.contains(ev.target)) return;
      const cd = ev.clipboardData;
      if (!cd) return;
      const html = cd.getData('text/html') || '';
      const text = cd.getData('text/plain') || '';
      const looksTable =
        /<table\b/i.test(html) ||
        (text.includes('\t') && text.includes('\n')) ||
        (/[;,]/.test(text) && text.split(/\r?\n/).length > 1);
      if (!looksTable) return;
      ev.preventDefault();
      void ingestClipboard(ev);
    };
    document.addEventListener('paste', onPaste, true);

    wrap.replaceChildren(hint, filterRow, tools, sumLine, scroller);
    container.replaceChildren(wrap);
    render();

    return {
      getRows: () => clone(allRows),
      setRows: (next) => applyAll(next),
      pasteFromClipboard: () => ingestClipboard(),
      downloadXlsx: () => downloadXlsx(allRows, toolsBase),
      destroy: () => {
        document.removeEventListener('paste', onPaste, true);
        container.replaceChildren();
      },
    };
  }

  window.__CH_Studio = {
    mount,
    parseClipboard,
    parseHtmlTable,
    loadXlsx,
    downloadXlsx,
    toTsv: (rows) => rows.map((r) => r.join('\t')).join('\n'),
    toCsv: (rows, sep) => {
      const s = sep || ';';
      return rows
        .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(s))
        .join('\n');
    },
    compactNumericGrid,
    toExcelHtml: (rows) => {
      const esc = (s) =>
        String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const body = rows
        .map(
          (r) =>
            '<tr>' +
            r
              .map((c) => {
                const n = parseRuNumber(c);
                if (n !== null) return `<td>${n}</td>`;
                return `<td style="mso-number-format:'\\@'">${esc(c)}</td>`;
              })
              .join('') +
            '</tr>',
        )
        .join('');
      return `<html><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
    },
  };
})();
