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

  const isPercentText = (raw) => /^\s*-?[\d\s]+(?:[.,]\d+)?\s*%\s*$/.test(String(raw || ''));
  const parseRuNumber = (raw) => {
    const s = String(raw || '').trim();
    if (!s || s === '—' || s === '-' || s === '–' || isPercentText(s)) return null;
    const cleaned = s.replace(/\s/g, '').replace(/₽/g, '').replace(/,/g, '.');
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
        if (isPercentText(cell)) return String(cell);
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

  const downloadXlsxBook = async (sheets, toolsBase) => {
    const XLSX = await loadXlsx(toolsBase);
    if (!XLSX) return false;
    const wb = XLSX.utils.book_new();
    (sheets || []).forEach((sheet, i) => {
      const rows = sheet.rows || [];
      const aoa = rows.map((row) =>
        row.map((cell) => {
          if (isPercentText(cell)) return String(cell);
          const n = parseRuNumber(String(cell));
          return n === null ? String(cell) : n;
        }),
      );
      const ws = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [['']]);
      const name = String(sheet.name || 'Лист ' + (i + 1)).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(
      new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    a.href = url;
    a.download = 'export_all_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  };

  function mount(container, opts) {
    const sourceRows = clone(pad(opts.rows || []));
    let allRows = sourceRows.map((row) => row.map((cell) => compactNumericCell(cell)));
    let plainNumbers = true;
    let filterQuery = '';
    let hideEmpty = false;
    const selected = new Set();
    const onChange = opts.onChange || (() => {});
    const maxRows = opts.maxRows || 500;
    const enablePaste = opts.enablePaste !== false;
    const onPasteInfo = opts.onPasteInfo || (() => {});
    const toolsBase = opts.toolsBase || window.__CH_BASE__;
    const hiddenCols = new Set();
    let fileVisibleOnly = true;
    let showLimit = maxRows;
    let headerOn = false;
    let headerRow = null;
    let dragAnchor = null;
    let dragged = false;
    const history = [];
    const snapshot = () => ({
      rows: clone(allRows),
      headerOn,
      headerRow: headerRow ? [...headerRow] : null,
      hidden: [...hiddenCols],
      selected: [...selected],
      showLimit,
      fileVisibleOnly,
    });
    const pushHist = () => {
      history.push(snapshot());
      if (history.length > 50) history.shift();
    };
    const colCount = () => Math.max(0, ...allRows.map((r) => r.length), headerRow ? headerRow.length : 0);

    const wrap = el(
      'div',
      'display:flex;flex-direction:column;gap:8px;height:100%;min-height:0',
    );
    const hint = el(
      'div',
      'font-size:12px;color:#9aa0a6',
      'Зажми левую кнопку и протяни по клеткам — выделение. Под номером столбца: скрыть или удалить. Двойной клик — правка.',
    );
    const tools = el('div', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center');
    const filterRow = el('div', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center');
    const sumLine = el(
      'div',
      'font-size:13px;color:#9aa0a6;min-height:1.4em;font-weight:600',
      'Выбрано: 0 · кликни по числам — появится сумма',
    );
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
      const visibleIdx = new Set(getView().map((x) => x.allIndex));
      for (const key of selected) {
        const [rs, cs] = key.split(':');
        const r = Number(rs);
        const c = Number(cs);
        if (!visibleIdx.has(r) || hiddenCols.has(c)) continue;
        count++;
        const n = parseRuNumber(String(allRows[r]?.[c] ?? ''));
        if (n === null) continue;
        sum += n;
        numericCount++;
      }
      const viewLen = getView().length;
      const shown = Math.min(showLimit, viewLen);
      const trunc = viewLen > shown ? ` · Показаны ${shown} из ${viewLen}` : '';
      if (!count) {
        sumLine.style.color = '#9aa0a6';
        sumLine.textContent = trunc
          ? `Выбрано: 0 · кликни по числам или по номеру столбца${trunc}`
          : 'Выбрано: 0 · кликни по числам или по номеру столбца — появится сумма';
        return;
      }
      const sumText = numericCount
        ? sum.toLocaleString('ru-RU', { maximumFractionDigits: 6 })
        : '— (среди выбранных нет чисел)';
      sumLine.style.color = '#3dd68c';
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

    const emptyBtn = toolBtn('Только непустые', 'Скрыть пустые строки', '#333', () => {
      hideEmpty = !hideEmpty;
      emptyBtn.textContent = hideEmpty ? 'Непустые: ВКЛ' : 'Только непустые';
      emptyBtn.style.background = hideEmpty ? '#0b5cad' : '#333';
      render();
    });
    filterRow.append(
      emptyBtn,
      toolBtn('Снять выделение', 'Очистить выбор ячеек', '#333', () => {
        selected.clear();
        updateSumLine();
        render();
      }),
    );

    const visibleOnlyBtn = toolBtn(
      'В файл только то, что видно',
      'Фильтр и спрятанные столбцы',
      '#0b5cad',
      () => {
        fileVisibleOnly = !fileVisibleOnly;
        visibleOnlyBtn.textContent = fileVisibleOnly
          ? 'В файл только то, что видно'
          : 'В файл вся таблица';
        visibleOnlyBtn.style.background = fileVisibleOnly ? '#0b5cad' : '#333';
      },
    );
    tools.append(
      visibleOnlyBtn,
      toolBtn('Числа без пробелов: ВКЛ', 'Убирает пробелы в суммах. Нажми ещё раз, чтобы вернуть как на странице.', '#0b5cad', () => {
        pushHist();
        plainNumbers = !plainNumbers;
        if (plainNumbers) {
          allRows = allRows.map((row) => row.map((cell) => compactNumericCell(cell)));
        } else {
          allRows = allRows.map((row, ri) =>
            row.map((cell, ci) => {
              const src = sourceRows[ri]?.[ci];
              if (src != null && compactNumericCell(src) === cell) return src;
              return cell;
            }),
          );
        }
        const btn = [...tools.querySelectorAll('button')].find((b) =>
          /пробел/i.test(b.textContent || ''),
        );
        if (btn) {
          btn.textContent = plainNumbers ? 'Числа без пробелов: ВКЛ' : 'Числа без пробелов: ВЫКЛ';
          btn.style.background = plainNumbers ? '#0b5cad' : '#333';
        }
        emit();
        render();
      }),
      toolBtn('Шаг назад', 'До 50 шагов', '#333', () => {
        const prev = history.pop();
        if (!prev) {
          sumLine.textContent = 'Шагов назад больше нет';
          return;
        }
        allRows = prev.rows;
        headerOn = prev.headerOn;
        headerRow = prev.headerRow;
        hiddenCols.clear();
        prev.hidden.forEach((c) => hiddenCols.add(c));
        selected.clear();
        prev.selected.forEach((k) => selected.add(k));
        showLimit = prev.showLimit;
        fileVisibleOnly = prev.fileVisibleOnly;
        visibleOnlyBtn.textContent = fileVisibleOnly
          ? 'В файл только то, что видно'
          : 'В файл вся таблица';
        visibleOnlyBtn.style.background = fileVisibleOnly ? '#0b5cad' : '#333';
        headerBtn.textContent = headerOn ? 'Заголовки: ВКЛ' : 'Первая строка — заголовки';
        emit();
        render();
      }),
      toolBtn('Показать ещё', 'Следующие 500 строк', '#333', () => {
        showLimit += maxRows;
        render();
      }),
    );
    const headerBtn = toolBtn('Первая строка — заголовки', 'Не включает само', '#333', () => {
      if (!headerOn) {
        if (!allRows.length) return;
        pushHist();
        headerRow = [...(allRows[0] || [])];
        allRows = allRows.slice(1);
        headerOn = true;
      } else {
        pushHist();
        allRows = [headerRow || [], ...allRows];
        headerOn = false;
        headerRow = null;
      }
      headerBtn.textContent = headerOn ? 'Заголовки: ВКЛ' : 'Первая строка — заголовки';
      headerBtn.style.background = headerOn ? '#0b5cad' : '#333';
      emit();
      render();
    });
    tools.append(headerBtn);

    const render = () => {
      allRows = pad(allRows);
      const view = getView();
      const table = el(
        'table',
        'border-collapse:collapse;font:12px/1.35 system-ui,sans-serif;color:#e8eaed;width:100%;user-select:none',
      );
      const head = el('tr');
      head.appendChild(
        el('th', 'border:1px solid #2a3038;padding:4px 6px;background:#1e232b;width:36px', ''),
      );
      const cols = colCount();
      for (let c = 0; c < cols; c++) {
        if (hiddenCols.has(c)) continue;
        const th = el(
          'th',
          'border:1px solid #2a3038;padding:4px 6px;background:#1e232b;color:#9aa0a6;font-weight:600;cursor:pointer',
          headerOn && headerRow ? headerRow[c] || String(c + 1) : String(c + 1),
        );
        th.title = 'Клик — выделить столбец';
        th.onclick = () => {
          const view = getView().slice(0, showLimit);
          const keys = view.map((x) => x.allIndex + ':' + c);
          const allOn = keys.every((k) => selected.has(k));
          keys.forEach((k) => (allOn ? selected.delete(k) : selected.add(k)));
          updateSumLine();
          render();
        };
        const actions = el('div', 'display:flex;gap:4px;margin-top:4px');
        const hideB = el(
          'button',
          'border:0;background:#3a414c;color:#fff;border-radius:4px;cursor:pointer;font:600 11px system-ui;padding:2px 6px',
          'Скрыть',
          (e) => {
            e.stopPropagation();
            pushHist();
            hiddenCols.add(c);
            render();
          },
        );
        hideB.title = 'Убрать столбец с экрана и из файла';
        const delB = el(
          'button',
          'border:0;background:#6b3030;color:#fff;border-radius:4px;cursor:pointer;font:600 11px system-ui;padding:2px 6px',
          'Удалить',
          (e) => {
            e.stopPropagation();
            pushHist();
            allRows = allRows.map((row) => row.filter((_, i) => i !== c));
            if (headerRow) headerRow = headerRow.filter((_, i) => i !== c);
            const nextHidden = new Set();
            hiddenCols.forEach((h) => {
              if (h < c) nextHidden.add(h);
              else if (h > c) nextHidden.add(h - 1);
            });
            hiddenCols.clear();
            nextHidden.forEach((h) => hiddenCols.add(h));
            const nextSel = [];
            selected.forEach((k) => {
              const [rs, cs] = k.split(':');
              const ci = Number(cs);
              if (ci === c) return;
              nextSel.push(rs + ':' + (ci > c ? ci - 1 : ci));
            });
            selected.clear();
            nextSel.forEach((k) => selected.add(k));
            emit();
            render();
          },
        );
        actions.append(hideB, delB);
        th.append(actions);
        head.appendChild(th);
      }
      table.appendChild(head);

      view.slice(0, showLimit).forEach(({ row, allIndex }) => {
        const tr = el('tr');
        const del = el(
          'button',
          'border:0;background:transparent;color:#f07178;cursor:pointer;font:600 12px system-ui;padding:2px 6px',
          '✕',
          (e) => {
            e.stopPropagation();
            pushHist();
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
          if (hiddenCols.has(ci)) return;
          const key = allIndex + ':' + ci;
          const isSel = selected.has(key);
          const td = el(
            'td',
            'border:1px solid #2a3038;padding:4px 6px;vertical-align:top;min-width:72px;outline:none;cursor:pointer;' +
              (isSel ? 'background:#1a3a5c;' : ''),
          );
          td.spellcheck = false;
          td.dataset.k = key;
          td.textContent = cell;
          const isEditing = () => td.getAttribute('contenteditable') === 'true';
          td.addEventListener('mousedown', (ev) => {
            if (ev.button !== 0 || isEditing()) return;
            dragAnchor = { r: allIndex, c: ci };
            dragged = false;
          });
          const selectTo = (r, c) => {
            if (!dragAnchor) return;
            const r1 = Math.min(dragAnchor.r, r);
            const r2 = Math.max(dragAnchor.r, r);
            const c1 = Math.min(dragAnchor.c, c);
            const c2 = Math.max(dragAnchor.c, c);
            if (r1 !== r2 || c1 !== c2) dragged = true;
            for (let rr = r1; rr <= r2; rr++) {
              for (let cc = c1; cc <= c2; cc++) {
                if (!hiddenCols.has(cc)) selected.add(rr + ':' + cc);
              }
            }
            updateSumLine();
            scroller.querySelectorAll('td[data-k]').forEach((cell) => {
              const on = selected.has(cell.dataset.k || '');
              cell.style.background = on ? '#1a3a5c' : '';
            });
          };
          td.addEventListener('mouseenter', (ev) => {
            if (!dragAnchor || (ev.buttons & 1) === 0) return;
            selectTo(allIndex, ci);
          });
          td.addEventListener('click', (ev) => {
            if (isEditing()) return;
            if (dragged) {
              dragged = false;
              ev.preventDefault();
              return;
            }
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
            pushHist();
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

    const onDragMove = (ev) => {
      if (!dragAnchor || (ev.buttons & 1) === 0) return;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const cell = hit && hit.closest ? hit.closest('td[data-k]') : null;
      if (!cell || !cell.dataset.k) return;
      const parts = cell.dataset.k.split(':');
      const r = Number(parts[0]);
      const c = Number(parts[1]);
      const r1 = Math.min(dragAnchor.r, r);
      const r2 = Math.max(dragAnchor.r, r);
      const c1 = Math.min(dragAnchor.c, c);
      const c2 = Math.max(dragAnchor.c, c);
      if (r1 !== r2 || c1 !== c2) dragged = true;
      for (let rr = r1; rr <= r2; rr++) {
        for (let cc = c1; cc <= c2; cc++) {
          if (!hiddenCols.has(cc)) selected.add(rr + ':' + cc);
        }
      }
      updateSumLine();
      scroller.querySelectorAll('td[data-k]').forEach((node) => {
        const on = selected.has(node.dataset.k || '');
        node.style.background = on ? '#1a3a5c' : '';
      });
    };
    const stopDrag = () => {
      dragAnchor = null;
    };
    document.addEventListener('mousemove', onDragMove, true);
    document.addEventListener('mouseup', stopDrag, true);

    const exportRows = () => {
      const visible = fileVisibleOnly ? new Set(getView().map((x) => x.allIndex)) : null;
      const body = allRows
        .filter((_, i) => !visible || visible.has(i))
        .map((row) => row.filter((_, c) => !hiddenCols.has(c)));
      if (headerOn && headerRow) {
        const head = headerRow.filter((_, c) => !hiddenCols.has(c));
        return [head, ...body];
      }
      return body;
    };

    wrap.replaceChildren(hint, filterRow, tools, sumLine, scroller);
    container.replaceChildren(wrap);
    render();
    if (allRows.length > 1) {
      const head = allRows[0] || [];
      const next = allRows[1] || [];
      const filled = head.filter((c) => String(c).trim()).length;
      const numbersInHead = head.filter((c) => parseRuNumber(c) !== null).length;
      const textish = head.filter((c) => String(c).trim() && parseRuNumber(c) === null).length;
      const nums = next.filter((c) => parseRuNumber(c) !== null).length;
      if (!numbersInHead && filled && textish >= Math.ceil(filled * 0.5) && nums >= 1) {
        sumLine.textContent =
          (sumLine.textContent ? sumLine.textContent + ' · ' : '') +
          'Похоже, первая строка — названия столбцов. Включи «Первая строка — заголовки», если так.';
      }
    }

    return {
      getRows: () => clone(allRows),
      getExportRows: exportRows,
      isDirty: () => history.length > 0,
      setRows: (next) => applyAll(next),
      downloadXlsx: () => downloadXlsx(exportRows(), toolsBase),
      destroy: () => {
        document.removeEventListener('mousemove', onDragMove, true);
        document.removeEventListener('mouseup', stopDrag, true);
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
    downloadXlsxBook,
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
                if (isPercentText(c)) return `<td>${esc(c)}</td>`;
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
