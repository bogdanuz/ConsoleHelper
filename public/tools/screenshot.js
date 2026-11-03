(async () => {
  window.__ch_shot?.destroy?.();

  const base =
    window.__CH_BASE__ ||
    (document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/[^/]*$/, '')
      : new URL('tools/', location.href).href);

  const vendorCandidates = [
    new URL('../vendor/html2canvas.min.js', base).href,
    new URL('vendor/html2canvas.min.js', base).href,
    new URL('../vendor/html2canvas.min.js', location.href).href,
  ];

  const root = document.createElement('div');
  root.setAttribute('data-ch-shot', '1');
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:14px/1.4 system-ui,sans-serif';
  document.documentElement.appendChild(root);

  const el = (tag, css, text, on) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (on) e.onclick = on;
    return e;
  };

  const panel = el(
    'div',
    'position:fixed;right:16px;bottom:16px;pointer-events:auto;background:#171a1f;color:#e8eaed;' +
      'border:1px solid #2a3038;border-radius:10px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.5);' +
      'display:flex;flex-direction:column;gap:8px;min-width:280px;max-width:340px',
  );
  const title = el('div', 'font-weight:600', 'Скриншот');
  const status = el('div', 'font-size:13px;color:#9aa0a6;min-height:1.2em', 'Выбери режим');
  const btnCss =
    'pointer-events:auto;cursor:pointer;border:0;border-radius:8px;padding:10px 12px;color:#fff;' +
    'background:#3d8bff;font:600 13px system-ui,sans-serif;text-align:left';
  const btnSecondary =
    'pointer-events:auto;cursor:pointer;border:1px solid #2a3038;border-radius:8px;padding:10px 12px;' +
    'color:#e8eaed;background:#1e232b;font:600 13px system-ui,sans-serif;text-align:left';

  const setStatus = (msg, kind) => {
    status.textContent = msg;
    status.style.color = kind === 'err' ? '#f07178' : kind === 'ok' ? '#3dd68c' : '#9aa0a6';
  };

  let scrolling = false;
  const isEscKey = (e) => e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape';
  const onToolEsc = (e) => {
    if (!isEscKey(e)) return;
    if (root.querySelector('[style*="crosshair"]')) return;
    e.preventDefault();
    e.stopPropagation();
    if (scrolling) {
      scrollStop = true;
      setStatus('Останавливаю прокрутку…');
      return;
    }
    scrollStop = true;
    destroy();
  };
  addEventListener('keydown', onToolEsc, true);

  const destroy = () => {
    removeEventListener('keydown', onToolEsc, true);
    removeEventListener('keydown', onScrollEsc, true);
    root.remove();
    delete window.__ch_shot;
  };

  const isOurUi = (node) => {
    if (!node || !node.closest) return false;
    return !!(
      node.closest('[data-ch-shot]') ||
      node.closest('[data-ch]') ||
      node.closest('[data-tx]') ||
      node.closest('[data-tp]') ||
      node.closest('[data-cards]') ||
      node.closest('[data-pt]')
    );
  };

  const loadHtml2Canvas = async () => {
    if (typeof window.html2canvas === 'function') return window.html2canvas;
    let lastErr = null;
    for (const src of vendorCandidates) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = () => reject(new Error('load failed: ' + src));
          document.head.appendChild(s);
        });
        if (typeof window.html2canvas === 'function') return window.html2canvas;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Не удалось загрузить библиотеку скриншота');
  };

  const pickScale = (w, h) => {
    const maxPixels = 12_000_000;
    const area = Math.max(1, w * h);
    const byMem = Math.sqrt(maxPixels / area);
    const dpr = window.devicePixelRatio || 1;
    return Math.max(1, Math.min(2.5, dpr, byMem));
  };

  const downloadCanvas = (canvas, name) =>
    new Promise((resolve, reject) => {
      if (!canvas || canvas.width < 2 || canvas.height < 2) {
        reject(new Error('Пустой снимок — попробуй ещё раз'));
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob || blob.size < 80) {
          reject(new Error('Снимок пустой (белый). Обнови страницу и попробуй снова'));
          return;
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        resolve();
      }, 'image/png');
    });

  const withUiHidden = async (fn) => {
    const prev = panel.style.display;
    panel.style.display = 'none';
    // let browser paint without our panel
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      return await fn();
    } finally {
      panel.style.display = prev || 'flex';
    }
  };

  const captureOptions = (extra) => {
    const w = extra.width;
    const h = extra.height;
    return {
      scale: pickScale(w, h),
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 20000,
      removeContainer: true,
      foreignObjectRendering: false,
      ignoreElements: (node) => isOurUi(node),
      onclone: (doc) => {
        try {
          doc.documentElement.style.setProperty('color-scheme', 'light');
          doc.body.style.setProperty('color-scheme', 'light');
          doc.querySelectorAll('[data-ch-shot],[data-ch],[data-tx],[data-tp],[data-pt]').forEach((n) => {
            n.style.setProperty('display', 'none', 'important');
          });
        } catch (_) {}
      },
      ...extra,
    };
  };

  const runCapture = async (target, opts) => {
    const h2c = await loadHtml2Canvas();
    let canvas;
    try {
      canvas = await h2c(target, opts);
    } catch (e1) {
      // fallback: body without exotic opts
      canvas = await h2c(document.body, {
        ...opts,
        x: undefined,
        y: undefined,
        scrollX: 0,
        scrollY: 0,
      });
    }
    return canvas;
  };

  const captureFullPage = async () => {
    setStatus('Снимаю всю страницу…');
    await withUiHidden(async () => {
      const w = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
        document.documentElement.clientWidth,
      );
      const h = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.clientHeight,
      );
      const canvas = await runCapture(document.documentElement, captureOptions({
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      }));
      await downloadCanvas(canvas, 'screenshot-full-' + Date.now() + '.png');
    });
    setStatus('Скачано: вся страница', 'ok');
  };

  const captureRegion = async (region) => {
    setStatus('Снимаю область…');
    await withUiHidden(async () => {
      const canvas = await runCapture(document.documentElement, captureOptions({
        width: region.w,
        height: region.h,
        windowWidth: Math.max(document.documentElement.scrollWidth, region.x + region.w),
        windowHeight: Math.max(document.documentElement.scrollHeight, region.y + region.h),
        x: region.x,
        y: region.y,
        scrollX: 0,
        scrollY: 0,
      }));
      await downloadCanvas(canvas, 'screenshot-area-' + Date.now() + '.png');
    });
    setStatus('Скачано: выделенная область', 'ok');
  };

  const pickRegion = () => {
    setStatus('Выдели область мышью. Esc — отмена');
    panel.style.display = 'none';
    const ov = el(
      'div',
      'position:fixed;inset:0;pointer-events:auto;cursor:crosshair;background:rgba(0,0,0,.18);z-index:2147483647',
    );
    ov.setAttribute('data-ch-shot', '1');
    const box = el(
      'div',
      'position:fixed;border:2px dashed #3d8bff;background:rgba(61,139,255,.15);display:none',
    );
    ov.appendChild(box);
    root.appendChild(ov);
    let start = null;

    const cleanup = () => {
      ov.remove();
      removeEventListener('keydown', onKey);
      panel.style.display = 'flex';
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        setStatus('Отменено');
      }
    };
    addEventListener('keydown', onKey);

    ov.onmousedown = (e) => {
      start = { x: e.clientX, y: e.clientY };
      box.style.display = 'block';
      box.style.left = start.x + 'px';
      box.style.top = start.y + 'px';
      box.style.width = '0px';
      box.style.height = '0px';
    };
    ov.onmousemove = (e) => {
      if (!start) return;
      const x1 = Math.min(start.x, e.clientX);
      const y1 = Math.min(start.y, e.clientY);
      box.style.left = x1 + 'px';
      box.style.top = y1 + 'px';
      box.style.width = Math.abs(e.clientX - start.x) + 'px';
      box.style.height = Math.abs(e.clientY - start.y) + 'px';
    };
    ov.onmouseup = async (e) => {
      if (!start) return;
      const x1 = Math.min(start.x, e.clientX);
      const y1 = Math.min(start.y, e.clientY);
      const w = Math.abs(e.clientX - start.x);
      const h = Math.abs(e.clientY - start.y);
      cleanup();
      if (w < 4 || h < 4) {
        setStatus('Область слишком маленькая', 'err');
        return;
      }
      try {
        await captureRegion({
          x: x1 + window.scrollX,
          y: y1 + window.scrollY,
          w,
          h,
        });
      } catch (err) {
        setStatus(err.message || String(err), 'err');
      }
    };
  };

  const runSafe = async (fn) => {
    try {
      await fn();
    } catch (err) {
      setStatus(err.message || String(err), 'err');
    }
  };

  let scrollStop = false;
  const onScrollEsc = (e) => {
    if (e.key === 'Escape') {
      scrollStop = true;
      setStatus('Останавливаю прокрутку…');
    }
  };
  const autoScrollThenCapture = async () => {
    scrolling = true;
    scrollStop = false;
    const startY = window.scrollY;
    const maxSteps = 40;
    setStatus('Прокрутка 0/' + maxSteps + '… Esc — стоп, «Закрыть» — выход');
    addEventListener('keydown', onScrollEsc, true);
    let lastH = 0;
    let stable = 0;
    try {
      for (let i = 0; i < maxSteps; i++) {
        if (scrollStop) break;
        window.scrollTo(0, document.documentElement.scrollHeight);
        setStatus('Прокрутка ' + (i + 1) + '/' + maxSteps + '… Esc — стоп');
        await new Promise((r) => setTimeout(r, 450));
        const h = document.documentElement.scrollHeight;
        if (h <= lastH + 2) {
          stable++;
          if (stable >= 3) break;
        } else stable = 0;
        lastH = h;
      }
      if (!scrollStop) await captureFullPage();
      else setStatus('Прокрутка остановлена', 'ok');
    } finally {
      scrolling = false;
      removeEventListener('keydown', onScrollEsc, true);
      window.scrollTo(0, startY);
    }
  };

  const tip = (text) => el('div', 'font-size:11px;color:#9aa0a6;line-height:1.35;margin:-2px 0 4px', text);

  panel.append(
    title,
    status,
    el('button', btnCss, 'Страница уже вся загружена', () => runSafe(captureFullPage)),
    tip('Если прокрутка вниз не добавляет новых строк — этот режим.'),
    el('button', btnCss, 'Список подгружается при прокрутке', () => runSafe(autoScrollThenCapture)),
    tip('Если при ручной прокрутке появляются новые строки — этот режим.'),
    el('div', 'font-size:11px;color:#9aa0a6;margin:4px 0', 'Не уверен? Прокрути вниз вручную и посмотри, растёт ли список.'),
    el('button', btnCss, 'Выделить область', () => pickRegion()),
    el('button', btnSecondary, 'Закрыть', () => {
      scrollStop = true;
      destroy();
    }),
  );
  root.appendChild(panel);

  window.__ch_shot = { destroy };
})();
