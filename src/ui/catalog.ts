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
    what: 'Берёт текст с экрана, открывает редактор на странице, можно скачать Excel.',
    when: 'Таблица кривая или «нарисована» текстом.',
  },
  {
    id: 'dom-tables',
    name: 'Найти таблицы',
    file: 'tools/dom-tables.js',
    tag: 'таблицы',
    desc: 'Найти готовые таблицы на странице',
    what: 'Подсвечивает таблицы и открывает тот же редактор.',
    when: 'На сайте уже есть обычная таблица целиком.',
  },
  {
    id: 'cards-to-table',
    name: 'Карточки → таблица',
    file: 'tools/cards-to-table.js',
    tag: 'таблицы',
    desc: 'Плитки в строки',
    what: 'Собирает повторяющиеся карточки/плитки в строки таблицы.',
    when: 'Данные карточками (каталог, лента), а нужен Excel.',
  },
  {
    id: 'pdf-to-text',
    name: 'PDF → текст',
    file: 'tools/pdf-to-text.js',
    tag: 'файл',
    desc: 'Текст из PDF-файла',
    what: 'Открывает PDF. Буквы из файла и с картинки складываются в одно поле, рядом видно оба варианта.',
    when: 'Нужен текст или таблица из PDF, в том числе если страница выглядит как картинка.',
  },
  {
    id: 'screenshot',
    name: 'Скриншот',
    file: 'tools/screenshot.js',
    tag: 'файл',
    desc: 'Картинка экрана',
    what: 'Вся страница, прокрутка с подгрузкой или выделенная область.',
    when: 'Нужна картинка, а не файл Excel.',
  },
];
