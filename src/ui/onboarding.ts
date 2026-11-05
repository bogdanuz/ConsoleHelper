export { LAUNCHER_HOTKEY } from './bookmarklet';

export type OnboardingStep = {
  id: string;
  title: string;
  /** Short lead under the title */
  lead: string;
  /** Numbered “click here / do this” lines */
  how: string[];
  /** Primary action on this screen */
  cta: 'continue' | 'copy' | 'finish';
  ctaLabel: string;
};

/**
 * One screen = one job. No “why browser can’t…”.
 * Copy appears only on the copy step; after copy the UI shows Continue.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Что это',
    lead: 'ConsoleHelper — меню прямо на странице с таблицей. Один раз делаешь закладку, потом нажимаешь её — справа открывается список инструментов.',
    how: [
      'Зачем: быстро забрать таблицу в Excel и при необходимости поправить перед скачиванием.',
      'Дальше три коротких шага: скопировать → сделать закладку → нажать её на нужном сайте.',
    ],
    cta: 'continue',
    ctaLabel: 'Начать',
  },
  {
    id: 'copy',
    title: 'Скопируй команду',
    lead: 'Сейчас только копируем. Закладку сделаешь на следующем шаге.',
    how: [
      'Нажми синюю кнопку «Скопировать».',
      'После копирования появится «Продолжить».',
    ],
    cta: 'copy',
    ctaLabel: 'Скопировать',
  },
  {
    id: 'bookmark',
    title: 'Сделай закладку',
    lead: 'Закладка хранит команду. Ею пользуются на сайте с таблицей — не открывают как обычную страницу.',
    how: [
      'Покажи панель закладок: Ctrl+Shift+B (если её не видно).',
      'Правый клик по панели → «Добавить страницу».',
      'Имя: ConsoleHelper.',
      'В поле адреса сотри всё → вставь скопированное (Ctrl+V) → Сохранить.',
    ],
    cta: 'continue',
    ctaLabel: 'Продолжить',
  },
  {
    id: 'open',
    title: 'Открой меню на сайте',
    lead: 'Сначала открой страницу с таблицей. Не открывай закладку пустой вкладкой — от этого меню не появится.',
    how: [
      'Зайди на нужный сайт обычной вкладкой.',
      'Нажми закладку ConsoleHelper на панели.',
      'Справа появится тёмное меню.',
      'Пока страницу не обновил, меню можно снова открыть Alt+Shift+H.',
    ],
    cta: 'continue',
    ctaLabel: 'Продолжить',
  },
  {
    id: 'use',
    title: 'Что выбрать в меню',
    lead: 'Нажми нужную строку. Ниже на этой странице — краткое описание каждого пункта.',
    how: [
      '«Текст → таблица» — обвести область или взять всю страницу, затем править и скачать.',
      '«Найти таблицы» — подсветить таблицы на странице и открыть редактор там же.',
      '«Карточки → таблица» — если данные плитками, а не сеткой.',
      '«PDF → текст» — выбрать файл, открыть страницу и забрать текст или кусок.',
      '«Скриншот» — сохранить картинку экрана.',
    ],
    cta: 'finish',
    ctaLabel: 'К описанию инструментов',
  },
];

export function clampStep(index: number, total = ONBOARDING_STEPS.length): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
}

export function nextStepIndex(current: number, total = ONBOARDING_STEPS.length): number {
  return clampStep(current + 1, total);
}

export function stepProgressLabel(index: number, total = ONBOARDING_STEPS.length): string {
  return `Шаг ${index + 1} из ${total}`;
}
