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
    } catch (_) {
      /* fall through */
    }
    if (navigator.clipboard?.readText) {
      out.text = await navigator.clipboard.readText();
    }
    return out;
  };

  function mount(container, opts) {
    let rows = pad(clone(opts.rows || []));
    const onChange = opts.onChange || (() => {});
    const maxRows = opts.maxRows || 500;
    const enablePaste = opts.enablePaste !== false;
    const onPasteInfo = opts.onPasteInfo || (() => {});

    const wrap = el(
      'div',
      'display:flex;flex-direction:column;gap:8px;height:100%;min-height:0',
    );
    const hint = el(
      'div',
      'font-size:12px;color:#9aa0a6',
      enablePaste
        ? 'Кликни ячейку — править. «✕» — удалить строку. «Вставить» или Ctrl+V — таблица из буфера.'
        : 'Кликни ячейку — править. «✕» у строки — удалить. Потом копируй или скачай.',
    );
    const tools = el('div', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center');
    const scroller = el(
      'div',
      'flex:1;overflow:auto;border:1px solid #2a3038;background:#0e0f12;border-radius:8px;min-height:120px',
    );

    const applyRows = (next, info) => {
      rows = pad(clone(next || []));
      onChange(clone(rows));
      if (info) onPasteInfo(info);
      render();
    };

    const ingestClipboard = async (evt) => {
      let payload = { text: '', html: '' };
      if (evt?.clipboardData) {
        payload.html = evt.clipboardData.getData('text/html') || '';
        payload.text = evt.clipboardData.getData('text/plain') || '';
      } else {
        payload = await readClipboard();
      }
      const parsed = parseClipboard(payload);
      if (!parsed.rows.length) {
        onPasteInfo({ ok: false, message: 'В буфере нет таблицы (HTML / TSV / CSV)' });
        return false;
      }
      applyRows(parsed.rows, {
        ok: true,
        format: parsed.format,
        message: `Вставлено: ${parsed.rows.length} стр. (${parsed.format})`,
      });
      return true;
    };

    if (enablePaste) {
      const pasteBtn = el(
        'button',
        'border:0;border-radius:6px;padding:6px 10px;color:#fff;background:#3d8bff;cursor:pointer;font:600 12px system-ui',
        'Вставить',
        (e) => {
          e.preventDefault();
          void ingestClipboard();
        },
      );
      pasteBtn.title = 'Вставить таблицу из буфера (HTML / TSV / CSV)';
      tools.appendChild(pasteBtn);
      tools.appendChild(
        el('span', 'font-size:11px;color:#9aa0a6', 'или Ctrl+V в этом окне'),
      );
    }

    const render = () => {
      rows = pad(rows);
      const table = el(
        'table',
        'border-collapse:collapse;font:12px/1.35 system-ui,sans-serif;color:#e8eaed;width:100%',
      );
      const head = el('tr');
      head.appendChild(
        el('th', 'border:1px solid #2a3038;padding:4px 6px;background:#1e232b;width:36px', ''),
      );
      const cols = rows[0] ? rows[0].length : 0;
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

      rows.slice(0, maxRows).forEach((row, ri) => {
        const tr = el('tr');
        const del = el(
          'button',
          'border:0;background:transparent;color:#f07178;cursor:pointer;font:600 12px system-ui;padding:2px 6px',
          '✕',
          (e) => {
            e.stopPropagation();
            rows = rows.filter((_, i) => i !== ri);
            onChange(clone(rows));
            render();
          },
        );
        del.title = 'Удалить строку';
        const tdDel = el('td', 'border:1px solid #2a3038;text-align:center;vertical-align:middle');
        tdDel.appendChild(del);
        tr.appendChild(tdDel);

        row.forEach((cell, ci) => {
          const td = el(
            'td',
            'border:1px solid #2a3038;padding:4px 6px;vertical-align:top;min-width:72px;outline:none',
          );
          td.setAttribute('contenteditable', 'true');
          td.spellcheck = false;
          td.textContent = cell;
          td.addEventListener('blur', () => {
            const v = td.textContent || '';
            if (rows[ri][ci] === v) return;
            rows[ri][ci] = v;
            onChange(clone(rows));
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
    };

    const onPaste = (ev) => {
      if (!enablePaste) return;
      if (!wrap.contains(ev.target)) return;
      // If editing a single cell with small text paste, let browser handle it
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

    wrap.replaceChildren(hint, tools, scroller);
    container.replaceChildren(wrap);
    render();

    return {
      getRows: () => clone(rows),
      setRows: (next) => applyRows(next),
      pasteFromClipboard: () => ingestClipboard(),
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
    toTsv: (rows) => rows.map((r) => r.join('\t')).join('\n'),
    toCsv: (rows, sep) => {
      const s = sep || ';';
      return rows
        .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(s))
        .join('\n');
    },
    toExcelHtml: (rows) => {
      const esc = (s) =>
        String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const body = rows
        .map(
          (r) =>
            '<tr>' +
            r.map((c) => `<td style="mso-number-format:'\\@'">${esc(c)}</td>`).join('') +
            '</tr>',
        )
        .join('');
      return `<html><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
    },
  };
})();
