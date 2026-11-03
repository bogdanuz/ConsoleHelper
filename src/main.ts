import './styles.css';
import { CATALOG_TOOLS, filterTools, type ToolMeta } from './ui/catalog';
import {
  ONBOARDING_STEPS,
  clampStep,
  nextStepIndex,
  stepProgressLabel,
} from './ui/onboarding';
import { LAUNCHER_HOTKEY, buildBookmarkletReadable } from './ui/bookmarklet';

const app = document.querySelector('#app');
if (!app) throw new Error('#app missing');

const base = new URL('.', location.href).href;

app.innerHTML = `
  <main class="wrap">
    <header class="hero">
      <p class="eyebrow">Закладка вместо программы</p>
      <h1 class="brand">ConsoleHelper</h1>
      <p class="lead">
        Забирай таблицы со страницы в Excel: нажал закладку → выбрал инструмент → поправил → скачал.
        Редактор открывается на той же странице, где таблица.
      </p>
    </header>

    <section class="onboard" id="onboard" aria-label="Как начать">
      <div class="onboard-head">
        <span class="onboard-progress" data-onboard-progress></span>
        <div class="onboard-dots" data-onboard-dots aria-hidden="true"></div>
      </div>
      <h2 class="onboard-title" data-onboard-title></h2>
      <p class="onboard-lead" data-onboard-lead></p>
      <ol class="onboard-how" data-onboard-how></ol>
      <p class="onboard-copied" data-onboard-copied hidden>Скопировано. Теперь нажми «Продолжить».</p>
      <div class="onboard-actions">
        <button type="button" class="primary" data-onboard-primary hidden></button>
        <button type="button" class="primary" data-onboard-continue hidden>Продолжить</button>
        <button type="button" data-onboard-back hidden>Назад</button>
      </div>
      <p class="onboard-tip">Пока страницу не обновил, меню можно снова открыть клавишами <kbd>${LAUNCHER_HOTKEY}</kbd>.</p>
    </section>

    <section class="catalog" id="catalog" aria-label="Что умеет меню">
      <h2 class="section-title">Что умеет меню</h2>
      <p class="catalog-note">
        После закладки эти пункты открываются на странице с таблицей. Отдельный редактор на этом сайте не нужен.
      </p>
      <input class="search" type="search" placeholder="Найти…" aria-label="Поиск" />
      <div class="catalog-grid" id="list"></div>
    </section>
  </main>
`;

const listEl = app.querySelector('#list') as HTMLElement;
const searchEl = app.querySelector('.search') as HTMLInputElement;
const onboardEl = app.querySelector('#onboard') as HTMLElement;
const primaryBtn = onboardEl.querySelector('[data-onboard-primary]') as HTMLButtonElement;
const continueBtn = onboardEl.querySelector('[data-onboard-continue]') as HTMLButtonElement;
const backBtn = onboardEl.querySelector('[data-onboard-back]') as HTMLButtonElement;
const copiedEl = onboardEl.querySelector('[data-onboard-copied]') as HTMLElement;

let stepIndex = 0;
let copiedOnThisStep = false;

function renderCatalog() {
  const filtered = filterTools(CATALOG_TOOLS, searchEl.value);
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty">Ничего не найдено</div>`;
    return;
  }
  listEl.replaceChildren(
    ...filtered.map((t: ToolMeta) => {
      const item = document.createElement('article');
      item.className = 'card';
      item.innerHTML = `
        <div class="card-tag">${t.tag}</div>
        <h3 class="card-title">${t.name}</h3>
        <div class="card-block">
          <div class="card-label">Что делает</div>
          <p class="card-text">${t.what}</p>
        </div>
        <div class="card-block">
          <div class="card-label">Когда брать</div>
          <p class="card-text">${t.when}</p>
        </div>
      `;
      return item;
    }),
  );
}

function renderDots() {
  const dots = onboardEl.querySelector('[data-onboard-dots]') as HTMLElement;
  dots.replaceChildren(
    ...ONBOARDING_STEPS.map((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot' + (i === stepIndex ? ' is-active' : i < stepIndex ? ' is-done' : '');
      return d;
    }),
  );
}

function renderOnboard() {
  stepIndex = clampStep(stepIndex);
  const step = ONBOARDING_STEPS[stepIndex]!;
  const progress = onboardEl.querySelector('[data-onboard-progress]') as HTMLElement;
  const title = onboardEl.querySelector('[data-onboard-title]') as HTMLElement;
  const lead = onboardEl.querySelector('[data-onboard-lead]') as HTMLElement;
  const how = onboardEl.querySelector('[data-onboard-how]') as HTMLOListElement;

  progress.textContent = stepProgressLabel(stepIndex);
  title.textContent = step.title;
  lead.textContent = step.lead;
  how.replaceChildren(
    ...step.how.map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }),
  );
  renderDots();

  backBtn.hidden = stepIndex === 0;
  copiedEl.hidden = !(step.cta === 'copy' && copiedOnThisStep);

  if (step.cta === 'copy') {
    primaryBtn.hidden = false;
    primaryBtn.textContent = step.ctaLabel;
    primaryBtn.classList.toggle('ok', copiedOnThisStep);
    if (copiedOnThisStep) primaryBtn.textContent = 'Скопировано';
    continueBtn.hidden = !copiedOnThisStep;
    continueBtn.textContent = 'Продолжить';
  } else {
    primaryBtn.hidden = false;
    primaryBtn.textContent = step.ctaLabel;
    primaryBtn.classList.remove('ok');
    continueBtn.hidden = true;
    copiedOnThisStep = false;
    copiedEl.hidden = true;
  }
}

async function copyCommand() {
  await navigator.clipboard.writeText(buildBookmarkletReadable(base));
  copiedOnThisStep = true;
  renderOnboard();
}

function goNext() {
  if (stepIndex >= ONBOARDING_STEPS.length - 1) {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  copiedOnThisStep = false;
  stepIndex = nextStepIndex(stepIndex);
  renderOnboard();
}

primaryBtn.addEventListener('click', async () => {
  const step = ONBOARDING_STEPS[stepIndex]!;
  if (step.cta === 'copy') {
    await copyCommand();
    return;
  }
  if (step.cta === 'finish') {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  goNext();
});

continueBtn.addEventListener('click', () => goNext());

backBtn.addEventListener('click', () => {
  copiedOnThisStep = false;
  stepIndex = clampStep(stepIndex - 1);
  renderOnboard();
});

searchEl.addEventListener('input', renderCatalog);
renderOnboard();
renderCatalog();
