# План разработки (после аналитики)

Основание: [ANALYTICS.md](ANALYTICS.md) · решение **D12**.  
Статус: **Sprint 5 закрыт (0.6.0)** · дальше — бэклог волн B–D.

## Цель продукта на ближайшие спринты

Надёжный скриншот + одно окно **Table Studio**, где таблицу можно поправить и выгрузить в нужном формате — всё ещё **без расширений**.

## Спринты

### Sprint 2 — Screenshot fix ✅

**Сделано в 0.3.0:** vendored html2canvas, видимая область + рамка, статус в UI, тесты без CDN.

Файл спринта: [sprints/sprint-2.md](sprints/sprint-2.md)

---

### Sprint 3 — Table Studio MVP ✅

**Сделано в 0.4.0:** `table-studio.js` + `tableStudioOps`; text-to-table → editable grid; Excel/CSV/TSV; тёмный UI; тесты.

Файл спринта: [sprints/sprint-3.md](sprints/sprint-3.md)

---

### Sprint 4 — DOM → Studio + smarter normalize ✅

**Сделано в 0.5.0:** клик по бейджу → Studio; умная склейка UUID/CODE; фикстуры; каталог.

Файл спринта: [sprints/sprint-4.md](sprints/sprint-4.md)

---

### Sprint 5 — Paste from clipboard ✅

**Сделано в 0.6.0:** `parseClipboard`; Studio «Вставить»/Ctrl+V; tool `paste-table`; блок на хабе; фикстуры.

Файл спринта: [sprints/sprint-5.md](sprints/sprint-5.md)

---

### Позже (бэклог, не в ближайших спринтах) ← следующий выбор

Волны B–D из ANALYTICS: автопрокрутка, карточки→таблица, JSON, фильтры, суммы, сравнение выгрузок, память настроек, xlsx.

## Порядок работ

1. Открыть текущий sprint-файл, обновить STATUS.  
2. `npm run verify` после каждого смыслового куска.  
3. CHANGELOG + версия при закрытии спринта.

## Вне скоупа пока

- Расширения / Tampermonkey как основной путь.  
- Drag-and-drop колонок.  
- OCR на хабе (отдельное решение).
