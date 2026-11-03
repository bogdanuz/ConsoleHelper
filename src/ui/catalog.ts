export type ToolMeta = {
  id: string;
  name: string;
  file: string;
  tag: string;
  desc: string;
  /** What it does — for catalog cards */
  what: string;
  /** When to use it */
  when: string;
};

export function filterTools(tools: ToolMeta[], query: string): ToolMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((t) =>
    `${t.name} ${t.tag} ${t.desc} ${t.what} ${t.when} ${t.id}`.toLowerCase().includes(q),
  );
}

/** Body of the bookmarklet / console one-liner (without `javascript:` prefix). */
export function loaderSnippet(baseUrl: string, file: string): string {
  const url = new URL(file, baseUrl).href;
  const toolsBase = new URL('tools/', baseUrl).href;
  // void(...) — чтобы браузер не подменял вкладку результатом Promise
  return (
    `void(function(){` +
    `window.__CH_BASE__='${toolsBase}';` +
    `fetch('${url}?'+Date.now()).then(function(r){` +
    `if(!r.ok)throw new Error('HTTP '+r.status);` +
    `return r.text();` +
    `}).then(function(c){(0,eval)(c);}).catch(function(e){alert('Не загрузилось: '+e.message);});` +
    `})();`
  );
}

/** Catalog shown on the hub (launcher itself is not listed) */
export const CATALOG_TOOLS: ToolMeta[] = [
  {
    id: 'text-to-table',
    name: 'Текст → таблица',
    file: 'tools/text-to-table.js',
    tag: 'таблицы',
    desc: 'Собрать таблицу с экрана',
    what: 'Берёт текст с экрана, показывает редактор: можно поправить ячейки, удалить строки, скачать в Excel.',
    when: 'Таблица выглядит как текст или ячейки «поехали».',
  },
  {
    id: 'dom-tables',
    name: 'Найти таблицы',
    file: 'tools/dom-tables.js',
    tag: 'таблицы',
    desc: 'Найти готовые таблицы на странице',
    what: 'Подсвечивает таблицы на странице, открывает тот же редактор, можно скачать в Excel.',
    when: 'На сайте уже есть нормальная таблица и она видна целиком.',
  },
  {
    id: 'screenshot',
    name: 'Скриншот',
    file: 'tools/screenshot.js',
    tag: 'файл',
    desc: 'Картинка экрана',
    what: 'Сохраняет картинку: всё видимое окно или область, которую обведёшь мышкой.',
    when: 'Нужна картинка, а не файл Excel.',
  },
];
