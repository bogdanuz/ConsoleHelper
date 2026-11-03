(async () => {
  window.__ch_shot?.destroy?.();

  const SCALE = 2;
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
      'display:flex;flex-direction:column;gap:8px;min-width:260px;max-width:320px',
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

  const destroy = () => {
    root.remove();
    delete window.__ch_shot;
  };

  const loadHtml2Canvas = async () => {
    if (window.html2canvas) return window.html2canvas;
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
        if (window.html2canvas) return window.html2canvas;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Не удалось загрузить библиотеку скриншота');
  };

  const downloadCanvas = (canvas, name) =>
    new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Не удалось создать файл'));
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

  const captureViewport = async () => {
    setStatus('Готовлю снимок видимой области…');
    const h2c = await loadHtml2Canvas();
    const canvas = await h2c(document.documentElement, {
      scale: SCALE,
      useCORS: true,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      backgroundColor: '#ffffff',
    });
    await downloadCanvas(canvas, 'screenshot-view-' + Date.now() + '.png');
    setStatus('Скачано: видимая область', 'ok');
  };

  const captureRegion = (region) =>
    (async () => {
      setStatus('Готовлю снимок области…');
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(document.documentElement, {
        scale: SCALE,
        useCORS: true,
        x: region.x,
        y: region.y,
        width: region.w,
        height: region.h,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        backgroundColor: '#ffffff',
      });
      await downloadCanvas(canvas, 'screenshot-area-' + Date.now() + '.png');
      setStatus('Скачано: выделенная область', 'ok');
    })();

  const pickRegion = () => {
    setStatus('Выдели область мышью. Esc — отмена');
    panel.style.display = 'none';
    const ov = el(
      'div',
      'position:fixed;inset:0;pointer-events:auto;cursor:crosshair;background:rgba(0,0,0,.2);z-index:2147483647',
    );
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

  panel.append(
    title,
    status,
    el('button', btnCss, 'Видимая область', () => runSafe(captureViewport)),
    el('button', btnCss, 'Выделить область', () => pickRegion()),
    el('button', btnSecondary, 'Закрыть', () => destroy()),
  );
  root.appendChild(panel);

  window.__ch_shot = { destroy };
})();
