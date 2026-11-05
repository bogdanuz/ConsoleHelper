(() => {
  window.__tx?.destroy?.();
  window.__tp?.destroy?.();
  window.__cards?.destroy?.();
  window.__ch_shot?.destroy?.();
  window.__pdf?.destroy?.();

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
    'pointer-events:auto;cursor:pointer;border:0;border-radius:6px;padding:8px 10px;color:#fff;background:#333;font:600 13px sans-serif';

  const filterGlyphs = (items, region) => {
    const list = items.filter((item) => String(item.text || '').trim());
    if (!region) return list;
    const x1 = Math.min(region.x1, region.x2);
    const x2 = Math.max(region.x1, region.x2);
    const y1 = Math.min(region.y1, region.y2);
    const y2 = Math.max(region.y1, region.y2);
    return list.filter((item) => {
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
    });
  };
  const lineTol = (items) => {
    const heights = items.map((item) => item.h || 8).sort((a, b) => a - b);
    return Math.max(2, heights[Math.floor(heights.length / 2)] * 0.6);
  };
  const wordGap = (parts) => {
    const heights = parts.map((item) => item.h || 8).sort((a, b) => a - b);
    const height = heights[Math.floor(heights.length / 2)] || 8;
    return Math.max(1.2, height * 0.22);
  };
  const linesOf = (items) => {
    const tol = lineTol(items);
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    sorted.forEach((item) => {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - item.y) <= tol) last.parts.push(item);
      else lines.push({ y: item.y, parts: [item] });
    });
    return lines.map((line) => line.parts.sort((a, b) => a.x - b.x));
  };
  const joinParts = (parts, spaceGap) => {
    let out = '';
    let lastRight = -1;
    parts.forEach((part) => {
      const gap = lastRight < 0 ? 0 : part.x - lastRight;
      if (out && gap > spaceGap) out += ' ';
      out += part.text;
      lastRight = part.x + Math.max(part.w, 0);
    });
    return out.replace(/[ \t]+/g, ' ').trim();
  };
  const glyphsToPlainText = (items) => {
    const list = items.filter((item) => String(item.text || '').trim());
    if (!list.length) return '';
    return linesOf(list)
      .map((parts) => joinParts(parts, wordGap(parts)))
      .filter(Boolean)
      .join('\n');
  };
  const glyphsToGrid = (items) => {
    const list = items.filter((item) => String(item.text || '').trim());
    if (!list.length) return [];
    const rows = linesOf(list).map((parts) => {
      const cells = [];
      let bucket = [];
      let lastRight = -1;
      const cellGap = Math.max(12, lineTol(parts) * 3);
      const flush = () => {
        const text = joinParts(bucket, wordGap(bucket.length ? bucket : parts));
        if (text) cells.push(text);
        bucket = [];
      };
      parts.forEach((part) => {
        if (lastRight >= 0 && part.x - lastRight > cellGap) flush();
        bucket.push(part);
        lastRight = part.x + Math.max(part.w, 0);
      });
      flush();
      return cells;
    });
    const width = Math.max(0, ...rows.map((row) => row.length));
    return rows.map((row) => {
      const next = [...row];
      while (next.length < width) next.push('');
      return next;
    });
  };

  const root = document.createElement('div');
  root.setAttribute('data-pdf', '1');
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;font:13px system-ui,sans-serif';
  document.documentElement.appendChild(root);

  let pdfDoc = null;
  let pageNum = 1;
  let pageCount = 0;
  let viewport = null;
  let pageGlyphs = [];
  let region = null;
  let rubberBox = null;
  let studioApi = null;

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;padding:10px;box-shadow:0 8px 28px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:6px;max-width:280px',
  );
  const status = el('div', 'font-size:12px;color:#9aa0a6;min-height:1.2em', 'Выбери PDF-файл. Он останется в браузере.');
  const setStatus = (text) => {
    status.textContent = text;
  };

  const modal = el(
    'div',
    'display:none;position:fixed;left:4%;top:4%;width:70%;height:86%;background:#121418;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.55);pointer-events:auto;flex-direction:column;padding:10px;box-sizing:border-box',
  );
  const bar = el('div', 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;cursor:move');
  const stage = el('div', 'position:relative;flex:1;overflow:auto;background:#0e0f12;border-radius:8px');
  const sheet = el('div', 'position:relative;width:max-content;margin:0 auto');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block';
  const overlay = el('div', 'position:absolute;left:0;top:0;cursor:crosshair;user-select:none');
  const rubber = el('div', 'position:absolute;border:2px dashed #3d8bff;background:rgba(61,139,255,.15);display:none');
  overlay.appendChild(rubber);
  sheet.append(canvas, overlay);
  stage.append(sheet);
  modal.append(bar, stage);
  root.appendChild(modal);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf,.pdf';
  fileInput.style.display = 'none';
  root.appendChild(fileInput);

  const vendorUrl = (name) => {
    const candidates = [
      new URL('../vendor/' + name, toolsBase).href,
      new URL('vendor/' + name, toolsBase).href,
    ];
    return candidates;
  };

  const loadPdfJs = async () => {
    if (window.pdfjsLib?.getDocument) return window.pdfjsLib;
    const urls = vendorUrl('pdf.min.js');
    let last = null;
    for (const src of urls) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = () => reject(new Error('pdf.js'));
          document.head.appendChild(s);
        });
        if (window.pdfjsLib?.getDocument) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.replace(/pdf\.min\.js(\?.*)?$/, 'pdf.worker.min.js');
          return window.pdfjsLib;
        }
      } catch (err) {
        last = err;
      }
    }
    throw last || new Error('Не удалось загрузить чтение PDF');
  };

  const glyphsFromPage = async (page) => {
    const content = await page.getTextContent();
    return (content.items || [])
      .filter((item) => item.str && item.transform && String(item.str).trim())
      .map((item) => ({
        text: String(item.str),
        x: item.transform[4],
        y: item.transform[5],
        w: item.width || 0,
        h: item.height || Math.abs(item.transform[3]) || 10,
      }));
  };

  const showPage = async (num) => {
    if (!pdfDoc) return;
    pageNum = num;
    region = null;
    rubberBox = null;
    rubber.style.display = 'none';
    const page = await pdfDoc.getPage(num);
    viewport = page.getViewport({ scale: 1.25 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    overlay.style.width = viewport.width + 'px';
    overlay.style.height = viewport.height + 'px';
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pageGlyphs = await glyphsFromPage(page);
    setStatus(
      pageGlyphs.length
        ? `Страница ${num} из ${pageCount}. Текст есть.`
        : `Страница ${num} из ${pageCount}. Текста нет, это картинка.`,
    );
    modal.style.display = 'flex';
  };

  const collectPages = async (which) => {
    if (!pdfDoc) return [];
    if (which === 'file') {
      const all = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDoc.getPage(i);
        const glyphs = await glyphsFromPage(page);
        all.push(...glyphs.map((item) => ({ ...item, y: item.y - (i - 1) * 100000 })));
      }
      return all;
    }
    if (which === 'region' && !region) return null;
    return filterGlyphs(pageGlyphs, which === 'region' ? region : null);
  };

  const needText = (items) => {
    if (items == null) {
      setStatus('Сначала обведи область на странице.');
      return false;
    }
    if (items.length) return true;
    setStatus('В выбранном месте текста нет. Если страница — картинка, буквы так не достать.');
    return false;
  };

  const ready = (which) => {
    if (which === 'region' && !region) {
      setStatus('Сначала обведи область на странице.');
      return false;
    }
    if (!pdfDoc) {
      setStatus('Сначала выбери PDF.');
      return false;
    }
    return true;
  };

  const copyText = async (which) => {
    if (!ready(which)) return;
    const items = await collectPages(which);
    if (!needText(items)) return;
    const text = glyphsToPlainText(items);
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Текст скопирован.');
    } catch {
      setStatus('Не удалось скопировать. Открой как таблицу и скопируй оттуда.');
    }
  };

  const ensureStudio = async () => {
    if (window.__CH_Studio?.mount) return window.__CH_Studio;
    const bundled = window.__CH_BUNDLE__?.sources?.['table-studio.js'];
    if (bundled) (0, eval)(bundled);
    else {
      const url = new URL('table-studio.js', toolsBase).href + '?' + Date.now();
      (0, eval)(await (await fetch(url)).text());
    }
    if (!window.__CH_Studio?.mount) throw new Error('Редактор не загрузился');
    return window.__CH_Studio;
  };

  const openTable = async (which) => {
    if (!ready(which)) return;
    const items = await collectPages(which);
    if (!needText(items)) return;
    const rows = glyphsToGrid(items);
    const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');
    const box = el(
      'div',
      'position:fixed;left:8%;top:8%;width:84%;height:80%;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;z-index:2147483647;display:flex;flex-direction:column;padding:10px;box-sizing:border-box',
    );
    const close = el('button', B, 'Закрыть таблицу', () => {
      studioApi?.destroy?.();
      box.remove();
    });
    box.append(close, view);
    document.body.appendChild(box);
    const Studio = await ensureStudio();
    studioApi?.destroy?.();
    studioApi = Studio.mount(view, { rows, toolsBase });
    setStatus('Таблица открыта. Если это сплошной текст, удобнее «Копировать текст».');
  };

  fileInput.onchange = async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    setStatus('Читаю PDF…');
    try {
      const pdfjs = await loadPdfJs();
      const data = await file.arrayBuffer();
      pdfDoc = await pdfjs.getDocument({ data }).promise;
      pageCount = pdfDoc.numPages;
      await showPage(1);
    } catch (err) {
      setStatus(err.message || 'Не удалось прочитать PDF');
    }
    fileInput.value = '';
  };

  let start = null;
  const pointOnCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const paintRubber = (box) => {
    rubber.style.display = 'block';
    rubber.style.left = box.left + 'px';
    rubber.style.top = box.top + 'px';
    rubber.style.width = box.width + 'px';
    rubber.style.height = box.height + 'px';
  };
  overlay.onmousedown = (e) => {
    if (!viewport) return;
    e.preventDefault();
    start = pointOnCanvas(e);
    paintRubber({ left: start.x, top: start.y, width: 0, height: 0 });
    const move = (ev) => {
      if (!start) return;
      const p = pointOnCanvas(ev);
      paintRubber({
        left: Math.min(start.x, p.x),
        top: Math.min(start.y, p.y),
        width: Math.abs(p.x - start.x),
        height: Math.abs(p.y - start.y),
      });
    };
    const up = (ev) => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (!start || !viewport) return;
      const p = pointOnCanvas(ev);
      const box = {
        left: Math.min(start.x, p.x),
        top: Math.min(start.y, p.y),
        width: Math.abs(p.x - start.x),
        height: Math.abs(p.y - start.y),
      };
      start = null;
      if (box.width < 4 && box.height < 4) {
        if (rubberBox) paintRubber(rubberBox);
        else rubber.style.display = 'none';
        return;
      }
      const a = viewport.convertToPdfPoint(box.left, box.top);
      const b = viewport.convertToPdfPoint(box.left + box.width, box.top + box.height);
      region = { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
      rubberBox = box;
      paintRubber(box);
      setStatus('Область отмечена. Можно копировать текст или открыть таблицу.');
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const go = (delta) => {
    if (!pdfDoc) return;
    const next = Math.min(pageCount, Math.max(1, pageNum + delta));
    void showPage(next);
  };

  bar.append(
    el('button', B, '←', () => go(-1)),
    el('button', B, '→', () => go(1)),
    el('button', B + ';background:#0b5cad', 'Текст страницы', () => void copyText('page')),
    el('button', B + ';background:#0b5cad', 'Текст области', () => void copyText('region')),
    el('button', B + ';background:#0b5cad', 'Текст файла', () => void copyText('file')),
    el('button', B + ';background:#1a7f37', 'Таблица страницы', () => void openTable('page')),
    el('button', B + ';background:#1a7f37', 'Таблица области', () => void openTable('region')),
    el('button', B + ';background:#1a7f37', 'Таблица файла', () => void openTable('file')),
    el('button', B, 'Закрыть', () => {
      modal.style.display = 'none';
    }),
  );

  panel.append(
    el('div', 'font-weight:600', 'PDF → текст'),
    status,
    el('button', B + ';background:#0b5cad', 'Выбрать PDF', () => fileInput.click()),
    el('div', 'font-size:11px;color:#9aa0a6;line-height:1.35', 'Дальше листай страницы, обведи кусок или возьми весь файл.'),
    el('button', B + ';background:#a00', '✕', () => window.__pdf.destroy()),
  );
  root.appendChild(panel);

  window.__pdf = {
    destroy() {
      studioApi?.destroy?.();
      root.remove();
      delete window.__pdf;
    },
    _test: { filterGlyphs, glyphsToPlainText, glyphsToGrid },
  };
})();
