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
  const compactText = (text) => String(text || '').replace(/\s+/g, '').toLowerCase();
  const sameText = (a, b) => {
    const left = compactText(a);
    const right = compactText(b);
    if (!left || !right) return false;
    if (left === right) return true;
    const short = left.length <= right.length ? left : right;
    const long = left.length <= right.length ? right : left;
    if (short.length < 2) return false;
    return long.includes(short) && short.length / long.length >= 0.75;
  };
  const near = (word, item) => {
    const dy = Math.abs(word.y + word.h / 2 - (item.y + item.h / 2));
    const dx = Math.abs(word.x + word.w / 2 - (item.x + item.w / 2));
    return dy <= Math.max(word.h, item.h, 8) * 0.8 && dx <= Math.max(word.w, item.w, 8);
  };
  const overlapRatio = (word, other) => {
    const width = Math.min(word.x + word.w, other.x + other.w) - Math.max(word.x, other.x);
    const height = Math.min(word.y + word.h, other.y + other.h) - Math.max(word.y, other.y);
    if (width <= 0 || height <= 0) return 0;
    return (width * height) / Math.max(word.w * Math.max(word.h, 1), 1);
  };
  const reconcileGlyphs = (fileGlyphs, imageGlyphs) => {
    const file = fileGlyphs.filter((item) => String(item.text || '').trim()).map((item) => ({ ...item }));
    const image = imageGlyphs.filter((item) => String(item.text || '').trim());
    const dropFile = new Set();
    const extra = [];
    image.forEach((word) => {
      const hits = file
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => overlapRatio(word, item) >= 0.15 || near(word, item));
      if (!hits.length) {
        extra.push(word);
        return;
      }
      const fileText = hits.map((hit) => compactText(hit.item.text)).join('');
      const imageText = compactText(word.text);
      const covered = Math.max(...hits.map((hit) => overlapRatio(word, hit.item)));
      if (imageText === fileText || (fileText.includes(imageText) && imageText.length / Math.max(fileText.length, 1) >= 0.75)) return;
      if (fileText && imageText.includes(fileText) && imageText.length > fileText.length) {
        hits.forEach((hit) => dropFile.add(hit.index));
        extra.push(word);
        return;
      }
      const fileMuchWider = hits.some((hit) => hit.item.w > word.w * 1.8);
      if (sameText(word.text, fileText) || (covered >= 0.55 && !fileMuchWider)) return;
      if (fileMuchWider) {
        hits.forEach((hit) => {
          if (word.x > hit.item.x) hit.item.w = Math.max(4, word.x - hit.item.x - 24);
        });
      }
      extra.push(word);
    });
    return file.filter((_, index) => !dropFile.has(index)).concat(extra);
  };
  const alignLines = (fileGlyphs, imageGlyphs) => {
    const tagged = [
      ...fileGlyphs.filter((item) => String(item.text || '').trim()).map((item) => ({ ...item, source: 'file' })),
      ...imageGlyphs.filter((item) => String(item.text || '').trim()).map((item) => ({ ...item, source: 'image' })),
    ];
    if (!tagged.length) return [];
    const heights = tagged.map((item) => item.h || 8).sort((a, b) => a - b);
    const tolerance = Math.max(2, heights[Math.floor(heights.length / 2)] * 0.6);
    const sorted = [...tagged].sort((a, b) => b.y - a.y || a.x - b.x);
    const bands = [];
    sorted.forEach((item) => {
      const last = bands[bands.length - 1];
      if (last && Math.abs(last.y - item.y) <= tolerance) last.items.push(item);
      else bands.push({ y: item.y, items: [item] });
    });
    return bands
      .map((band) => ({
        file: glyphsToPlainText(band.items.filter((item) => item.source === 'file')),
        image: glyphsToPlainText(band.items.filter((item) => item.source === 'image')),
      }))
      .filter((line) => line.file || line.image);
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
  let glyphsPage = 0;
  let region = null;
  let rubberBox = null;
  let studioApi = null;

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;padding:10px;box-shadow:0 8px 28px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:6px;max-width:280px',
  );
  const status = el('div', 'font-size:12px;color:#9aa0a6;min-height:1.2em', 'Выбери PDF-файл. Он останется в браузере.');
  status.setAttribute('data-pdf-status', '1');
  const setStatus = (text) => {
    status.textContent = text;
  };

  const modal = el(
    'div',
    'display:none;position:fixed;left:3%;top:3%;width:94%;height:90%;background:#121418;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.55);pointer-events:auto;flex-direction:column;padding:10px;box-sizing:border-box',
  );
  const bar = el('div', 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;cursor:move');
  const hint = el(
    'div',
    'font-size:12px;color:#c4c7cc;min-height:2.6em;margin:0 0 8px;line-height:1.35',
    'Наведи на кнопку — здесь написано, что она сделает.',
  );
  const stage = el('div', 'position:relative;flex:1 1 320px;overflow:auto;background:#0e0f12;border-radius:8px;min-width:240px;min-height:180px');
  const sheet = el('div', 'position:relative;width:max-content;margin:0 auto');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block';
  const overlay = el('div', 'position:absolute;left:0;top:0;cursor:crosshair;user-select:none');
  const rubber = el('div', 'position:absolute;border:2px dashed #3d8bff;background:rgba(61,139,255,.15);display:none');
  overlay.appendChild(rubber);
  sheet.append(canvas, overlay);
  stage.append(sheet);
  const body = el('div', 'display:flex;gap:10px;flex:1;min-height:0;flex-wrap:wrap');
  const side = el('div', 'flex:1 1 280px;min-width:240px;display:flex;flex-direction:column;gap:6px;min-height:180px');
  const draft = document.createElement('textarea');
  draft.setAttribute('aria-label', 'Текст из PDF');
  draft.placeholder = 'Здесь появится общий текст: буквы из файла и то, что нашлось на картинке. Поле можно править.';
  draft.style.cssText =
    'flex:1;min-height:120px;resize:none;background:#0e0f12;color:#e8eaed;border:1px solid #2a3038;border-radius:8px;padding:10px;font:13px/1.45 ui-monospace,Consolas,monospace;box-sizing:border-box';
  const progressWrap = el('div', 'display:none');
  const progressLabel = el('div', 'font-size:12px;color:#e8eaed;margin-bottom:4px', '');
  const progressTrack = el('div', 'height:8px;background:#2a3038;border-radius:99px;overflow:hidden');
  const progressBar = el('div', 'height:100%;width:0%;background:#3d8bff;border-radius:99px;transition:width .15s linear');
  progressTrack.appendChild(progressBar);
  progressWrap.append(progressLabel, progressTrack);
  const compare = el(
    'div',
    'display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:150px;overflow:auto;font:12px/1.35 ui-monospace,Consolas,monospace',
  );
  const setProgress = (visible, percent, label) => {
    progressWrap.style.display = visible ? 'block' : 'none';
    const value = Math.max(0, Math.min(100, Math.round(percent || 0)));
    progressBar.style.width = value + '%';
    progressLabel.textContent = label ? label + ' · ' + value + '%' : value + '%';
  };
  side.append(
    el('div', 'font-weight:600', 'Общий текст'),
    el(
      'div',
      'font-size:11px;color:#9aa0a6;line-height:1.35',
      'Сначала буквы из файла. Рядом дописывается то, чего в файле не было, но видно на картинке. Поле можно править.',
    ),
    progressWrap,
    draft,
    el('div', 'font-size:11px;color:#9aa0a6', 'Рядом: слева из файла, справа с картинки.'),
    compare,
  );
  body.append(stage, side);
  modal.append(bar, hint, body);
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

  let userEdited = false;
  let writing = false;
  let token = 0;
  let tableBox = null;
  let workerPromise = null;
  const ocrByPage = new Map();
  draft.addEventListener('input', () => {
    if (!writing) userEdited = true;
  });
  const setDraft = (text, force) => {
    if (!force && userEdited) return;
    writing = true;
    draft.value = text;
    writing = false;
    if (force) userEdited = false;
  };
  const renderCompare = (fileGlyphs, imageGlyphs) => {
    const line = (text, color) => el('div', 'white-space:pre-wrap;color:' + color + ';min-height:1.2em', text || '—');
    const rows = alignLines(fileGlyphs, imageGlyphs);
    compare.replaceChildren(
      el('div', 'color:#9aa0a6', 'Из файла'),
      el('div', 'color:#9ecbff', 'С картинки'),
    );
    if (!rows.length) {
      compare.append(line('пусто', '#9aa0a6'), line('пусто', '#9aa0a6'));
      return;
    }
    rows.forEach((row) => compare.append(line(row.file, '#e8eaed'), line(row.image, '#9ecbff')));
  };

  let pageRender = null;
  const showPage = async (num) => {
    if (!pdfDoc) return;
    const mine = ++token;
    try { pageRender?.cancel(); } catch { /* an older page may already be finished */ }
    pageNum = num;
    region = null;
    rubberBox = null;
    rubber.style.display = 'none';
    const page = await pdfDoc.getPage(num);
    if (mine !== token) return;
    viewport = page.getViewport({ scale: 1.25 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    overlay.style.width = viewport.width + 'px';
    overlay.style.height = viewport.height + 'px';
    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    pageRender = task;
    try {
      await task.promise;
    } catch (err) {
      if (mine !== token) return;
      throw err;
    }
    if (mine !== token) return;
    // #region agent log
    fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'118115'},body:JSON.stringify({sessionId:'118115',runId:'review5',hypothesisId:'H4',location:'pdf-to-text.js:showPage',message:'apply page',data:{num,token},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    pageGlyphs = await glyphsFromPage(page);
    if (mine !== token) return;
    glyphsPage = num;
    userEdited = false;
    setDraft(glyphsToPlainText(pageGlyphs), true);
    renderCompare(pageGlyphs, []);
    setStatus(
      pageGlyphs.length
        ? `Страница ${num} из ${pageCount}. Буквы из файла уже в поле. Смотрю картинку.`
        : `Страница ${num} из ${pageCount}. В файле букв нет. Смотрю картинку.`,
    );
    modal.style.display = 'flex';
    panel.style.display = 'none';
    void finishView('page', mine, false);
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

  const statusRu = (status) => {
    if (status === 'loading tesseract core') return 'Скачиваю распознаватель';
    if (status === 'initializing tesseract') return 'Запускаю распознаватель';
    if (status === 'loading language traineddata') return 'Загружаю русский и английский';
    if (status === 'initializing api') return 'Готовлю распознавание';
    if (status === 'recognizing text') return 'Распознаю картинку';
    return 'Распознаю';
  };
  const simdOk = async () => {
    try {
      return WebAssembly.validate(
        Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11),
      );
    } catch {
      return false;
    }
  };
  const idbStore = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('keyval-store', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('keyval')) req.result.createObjectStore('keyval');
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
  const idbHas = async (key) => {
    try {
      const db = await idbStore();
      return await new Promise((resolve) => {
        const tx = db.transaction('keyval', 'readonly');
        const get = tx.objectStore('keyval').get(key);
        get.onsuccess = () => resolve(typeof get.result !== 'undefined');
        get.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  };
  const idbPut = async (key, value) => {
    const db = await idbStore();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };
  const fetchBytes = async (url, onPct) => {
    let cache = null;
    try {
      cache = window.caches ? await caches.open('ch-ocr-v1') : null;
    } catch {
      cache = null;
    }
    if (cache) {
      const hit = await cache.match(url);
      if (hit) {
        onPct(1);
        return new Uint8Array(await hit.arrayBuffer());
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось скачать распознаватель');
    const len = Number(res.headers.get('content-length') || 0);
    if (!res.body || !res.body.getReader) {
      onPct(1);
      return new Uint8Array(await res.arrayBuffer());
    }
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      chunks.push(step.value);
      loaded += step.value.byteLength;
      onPct(len ? Math.min(1, loaded / len) : 0);
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    chunks.forEach((chunk) => {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    });
    if (cache) {
      try {
        await cache.put(url, new Response(bytes.slice()));
      } catch {
        /* the browser may still keep the file */
      }
    }
    return bytes;
  };
  const loadScript = async (urls) => {
    if (window.Tesseract?.createWorker) return;
    let last = null;
    for (const src of urls) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Распознаватель'));
          document.head.appendChild(script);
        });
        if (window.Tesseract?.createWorker) return;
      } catch (err) {
        last = err;
      }
    }
    throw last || new Error('Распознаватель не запустился');
  };
  const ensureWorker = () => {
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      const coreName = (await simdOk())
        ? 'core/tesseract-core-simd-lstm.wasm.js'
        : 'core/tesseract-core-lstm.wasm.js';
      const files = [
        ['worker.min.js', null],
        [coreName, null],
        ['lang/eng.traineddata.gz', './eng.traineddata'],
        ['lang/rus.traineddata.gz', './rus.traineddata'],
      ];
      let saved = false;
      try {
        saved = localStorage.getItem('ch-ocr-v1') === '1';
      } catch {
        saved = false;
      }
      const urls = {};
      for (let index = 0; index < files.length; index++) {
        const name = files[index][0];
        const idbKey = files[index][1];
        const label = saved ? 'Распознаватель уже в браузере' : 'Скачиваю распознаватель';
        if (idbKey && (await idbHas(idbKey))) {
          setProgress(true, ((index + 1) / files.length) * 100, label);
          continue;
        }
        let bytes = null;
        let used = '';
        let error = null;
        for (const url of vendorUrl('tesseract/' + name)) {
          try {
            bytes = await fetchBytes(url, (pct) => {
              setProgress(true, ((index + pct) / files.length) * 100, label);
            });
            used = url;
            error = null;
            break;
          } catch (err) {
            error = err;
          }
        }
        if (!bytes) throw error || new Error('Не удалось скачать распознаватель');
        urls[name] = used;
        if (idbKey) {
          try {
            await idbPut(idbKey, bytes);
          } catch {
            /* the file address is still a fallback */
          }
        }
      }
      const workerUrl = urls['worker.min.js'] || vendorUrl('tesseract/worker.min.js')[0];
      const coreUrl = urls[coreName] || vendorUrl('tesseract/' + coreName)[0];
      const langUrl = urls['lang/rus.traineddata.gz'] || vendorUrl('tesseract/lang/rus.traineddata.gz')[0];
      await loadScript(vendorUrl('tesseract/tesseract.min.js'));
      if (!window.Tesseract?.createWorker) throw new Error('Распознаватель не запустился');
      const worker = await window.Tesseract.createWorker('rus+eng', 1, {
        workerPath: workerUrl,
        corePath: coreUrl.replace(/[^/]+$/, ''),
        langPath: langUrl.replace(/[^/]+$/, ''),
        gzip: true,
        workerBlobURL: true,
        cacheMethod: 'write',
        logger: (message) => {
          setProgress(true, Math.round((message.progress || 0) * 100), statusRu(message.status));
        },
      });
      try {
        localStorage.setItem('ch-ocr-v1', '1');
      } catch {
        /* private mode */
      }
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
    return workerPromise;
  };
  const wordsToGlyphs = (words, vp) => (words || [])
    .filter((word) => word && String(word.text || '').trim() && (word.confidence == null || word.confidence >= 35))
    .map((word) => {
      const box = word.bbox || {};
      const a = vp.convertToPdfPoint(box.x0 || 0, box.y0 || 0);
      const b = vp.convertToPdfPoint(box.x1 || 0, box.y1 || 0);
      return {
        text: String(word.text).trim(),
        x: Math.min(a[0], b[0]),
        y: Math.min(a[1], b[1]),
        w: Math.abs(b[0] - a[0]) || 4,
        h: Math.abs(b[1] - a[1]) || 8,
      };
    });
  const recognizePage = async (index, myToken, onPart) => {
    const cacheHit = ocrByPage.has(index);
    // #region agent log
    fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'118115'},body:JSON.stringify({sessionId:'118115',runId:'pre-fix',hypothesisId:'H3',location:'pdf-to-text.js:recognizePage',message:'picture cache',data:{index,cacheHit,cacheSize:ocrByPage.size,token:myToken},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (cacheHit) return ocrByPage.get(index);
    const page = await pdfDoc.getPage(index);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.75, 1800 / Math.max(base.width, 1));
    const vp = page.getViewport({ scale });
    const shot = document.createElement('canvas');
    shot.width = Math.max(1, Math.floor(vp.width));
    shot.height = Math.max(1, Math.floor(vp.height));
    await page.render({ canvasContext: shot.getContext('2d'), viewport: vp }).promise;
    if (myToken !== token) return null;
    const worker = await ensureWorker((pct, label) => onPart(pct, label));
    if (myToken !== token) return null;
    onPart(0, 'Распознаю картинку');
    const result = await worker.recognize(shot);
    if (myToken !== token) return null;
    const glyphs = wordsToGlyphs(result && result.data && result.data.words, vp);
    // #region agent log
    fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'118115'},body:JSON.stringify({sessionId:'118115',runId:'review6',hypothesisId:'H7',location:'pdf-to-text.js:recognizePage',message:'cache write',data:{index,myToken,token,stale:myToken!==token},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    ocrByPage.set(index, glyphs);
    return glyphs;
  };
  const gather = async (which, myToken) => {
    const indexes = which === 'file' ? Array.from({ length: pageCount }, (_, i) => i + 1) : [pageNum];
    const fileAll = [];
    const imageAll = [];
    for (let n = 0; n < indexes.length; n++) {
      if (myToken !== token) return null;
      const index = indexes[n];
      const dy = which === 'file' ? (index - 1) * 100000 : 0;
      let fileGlyphs = index === glyphsPage ? pageGlyphs : null;
      // #region agent log
      fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'118115'},body:JSON.stringify({sessionId:'118115',runId:'review6',hypothesisId:'H8',location:'pdf-to-text.js:gather',message:'file glyphs source',data:{index,pageNum,reused:index===pageNum,glyphCount:(pageGlyphs||[]).length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!fileGlyphs) fileGlyphs = await glyphsFromPage(await pdfDoc.getPage(index));
      fileAll.push(...fileGlyphs.map((item) => ({ ...item, y: item.y - dy })));
      const imageGlyphs = await recognizePage(index, myToken, (pct, label) => {
        const overall = ((n + pct / 100) / indexes.length) * 100;
        const prefix = indexes.length > 1 ? `Страница ${index} из ${pageCount}. ` : '';
        setProgress(true, overall, prefix + label);
      });
      if (imageGlyphs == null || myToken !== token) return null;
      imageAll.push(...imageGlyphs.map((item) => ({ ...item, y: item.y - dy })));
    }
    return {
      file: which === 'region' ? filterGlyphs(fileAll, region) : fileAll,
      image: which === 'region' ? filterGlyphs(imageAll, region) : imageAll,
    };
  };
  const finishView = async (which, myToken, force) => {
    try {
      setProgress(true, 1, 'Смотрю картинку');
      const found = await gather(which, myToken);
      if (!found || myToken !== token) return;
      const merged = reconcileGlyphs(found.file, found.image);
      renderCompare(found.file, found.image);
      setProgress(false, 100, '');
      const label = which === 'file' ? 'весь файл' : which === 'region' ? 'обведённый кусок' : 'эта страница';
      if (!merged.length) {
        setDraft('', force);
        setStatus('Ни в файле, ни на картинке букв не нашлось.');
        return;
      }
      const before = userEdited;
      setDraft(glyphsToPlainText(merged), force);
      if (!force && before) setStatus('Картинка готова. Поле не менял: ты уже правил текст.');
      else setStatus(`В поле — ${label}. Слева буквы из файла, справа с картинки. Можно править.`);
    } catch (err) {
      if (myToken !== token) return;
      setProgress(false, 0, '');
      setStatus((err && err.message) || 'Картинку распознать не удалось. В поле остались буквы из файла.');
    }
  };
  const fillField = async (which) => {
    if (!ready(which)) return;
    const mine = ++token;
    const fileNow = which === 'page' ? pageGlyphs : which === 'region' ? filterGlyphs(pageGlyphs, region) : null;
    if (fileNow && glyphsPage === pageNum) {
      setDraft(glyphsToPlainText(fileNow), true);
      renderCompare(fileNow, []);
    }
    setStatus('Смотрю картинку и складываю с буквами из файла.');
    await finishView(which, mine, true);
  };

  const copyDraft = async () => {
    const text = draft.value;
    if (!text.trim()) {
      setStatus('В поле пока пусто.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Скопировано то, что сейчас в поле.');
    } catch {
      draft.focus();
      draft.select();
      setStatus('Само не скопировалось. Текст в поле уже выделен — нажми Ctrl+C.');
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

  const closeTable = () => {
    document.removeEventListener('keydown', onTableKey, true);
    studioApi?.destroy?.();
    studioApi = null;
    tableBox?.remove();
    tableBox = null;
  };
  const onTableKey = (event) => {
    const esc = event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape';
    if (!esc || !tableBox) return;
    event.preventDefault();
    event.stopPropagation();
    closeTable();
  };
  const openTableRows = async (rows) => {
    closeTable();
    const view = el('div', 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0');
    const box = el(
      'div',
      'position:fixed;left:8%;top:8%;width:84%;height:80%;background:#171a1f;color:#e8eaed;border:1px solid #2a3038;border-radius:10px;z-index:2147483647;display:flex;flex-direction:column;padding:10px;box-sizing:border-box;pointer-events:auto',
    );
    box.setAttribute('data-pdf-table', '1');
    const close = el('button', B + ';flex:0 0 auto;position:relative;z-index:2', 'Закрыть таблицу', () => closeTable());
    box.append(close, view);
    root.appendChild(box);
    tableBox = box;
    document.addEventListener('keydown', onTableKey, true);
    const Studio = await ensureStudio();
    studioApi?.destroy?.();
    studioApi = Studio.mount(view, { rows, toolsBase });
  };
  const openTable = async (which) => {
    if (!ready(which)) return;
    const mine = ++token;
    setStatus('Собираю таблицу из файла и картинки.');
    const found = await gather(which, mine);
    if (!found || mine !== token) return;
    const merged = reconcileGlyphs(found.file, found.image);
    setProgress(false, 100, '');
    renderCompare(found.file, found.image);
    if (!merged.length) {
      setStatus('Ни в файле, ни на картинке букв не нашлось.');
      return;
    }
    setDraft(glyphsToPlainText(merged), true);
    await openTableRows(glyphsToGrid(merged));
    setStatus('Таблица открыта. Закрывается кнопкой «Закрыть таблицу» или клавишей Esc.');
  };

  fileInput.onchange = async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    setStatus('Читаю PDF…');
    // #region agent log
    fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'118115'},body:JSON.stringify({sessionId:'118115',runId:'pre-fix',hypothesisId:'H3',location:'pdf-to-text.js:onchange',message:'new file opened',data:{cacheSize:ocrByPage.size,pageCountBefore:pageCount},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    ocrByPage.clear();
    token += 1;
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
      setStatus('Область отмечена. Складываю буквы из файла и с картинки.');
      void fillField('region');
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const go = (delta) => {
    if (!pdfDoc) return;
    const next = Math.min(pageCount, Math.max(1, pageNum + delta));
    void showPage(next);
  };

  const tip = (label, css, title, on) => {
    const button = el('button', css, label, on);
    button.title = title;
    button.onmouseenter = () => {
      hint.textContent = title;
    };
    return button;
  };

  bar.append(
    tip('←', B, 'Предыдущая страница.', () => go(-1)),
    tip('→', B, 'Следующая страница.', () => go(1)),
    tip(
      'Страница → поле',
      B + ';background:#0b5cad',
      'Сложить в поле эту страницу: буквы из файла и то, что распознано на картинке. Справа видно оба варианта.',
      () => void fillField('page'),
    ),
    tip(
      'Область → поле',
      B + ';background:#0b5cad',
      'Сложить в поле только обведённый кусок: файл и картинка. Сначала протяни рамку.',
      () => void fillField('region'),
    ),
    tip(
      'Весь файл → поле',
      B + ';background:#0b5cad',
      'Собрать все страницы: на каждой буквы из файла плюс распознанная картинка.',
      () => void fillField('file'),
    ),
    tip('Страница → таблица', B + ';background:#1a7f37', 'Открыть эту страницу таблицей: слова и числа стоят рядом, как на листе.', () => void openTable('page')),
    tip('Область → таблица', B + ';background:#1a7f37', 'Открыть обведённый кусок таблицей.', () => void openTable('region')),
    tip('Весь файл → таблица', B + ';background:#1a7f37', 'Открыть все страницы одной таблицей.', () => void openTable('file')),
    el('button', B, 'Закрыть', () => {
      closeTable();
      modal.style.display = 'none';
      panel.style.display = 'flex';
    }),
  );
  side.insertBefore(
    tip('Скопировать', B + ';background:#0b5cad', 'Скопировать то, что сейчас в поле, включая твои правки.', () => void copyDraft()),
    draft,
  );

  panel.append(
    el('div', 'font-weight:600', 'PDF → текст'),
    status,
    el('button', B + ';background:#0b5cad', 'Выбрать PDF', () => fileInput.click()),
    el(
      'div',
      'font-size:11px;color:#9aa0a6;line-height:1.35',
      'Файл остаётся в браузере. Буквы из файла и с картинки складываются в одно поле. Первый раз распознаватель сохраняется в браузере, проценты показывают, что это не зависло.',
    ),
    el('button', B + ';background:#a00', '✕', () => window.__pdf.destroy()),
  );
  root.appendChild(panel);

  window.__pdf = {
    destroy() {
      token += 1;
      closeTable();
      const pending = workerPromise;
      workerPromise = null;
      pending?.then((worker) => worker.terminate?.()).catch(() => {});
      studioApi?.destroy?.();
      root.remove();
      delete window.__pdf;
    },
    _test: { filterGlyphs, glyphsToPlainText, glyphsToGrid, reconcileGlyphs, alignLines, openTableRows },
  };
})();
