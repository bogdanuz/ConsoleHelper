# План разработки (после аналитики)

Основание: [ANALYTICS.md](ANALYTICS.md) · решение **D12**.  
Статус: **Волна B закрыта (0.11.0)** · дальше — память настроек / сравнение выгрузок по желанию.

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

### Спринты 6–10 — Волна B ✅ (0.11.0)

Файл: [sprints/sprint-6-10-wave-b.md](sprints/sprint-6-10-wave-b.md) · чеклист: [CHECKLIST-0.11.md](CHECKLIST-0.11.md).

### Позже (бэклог) ← следующий выбор

Из ANALYTICS: память настроек, сравнение двух выгрузок, JSON, drag колонок, OCR.

## Порядок работ

1. Открыть текущий sprint-файл, обновить STATUS.  
2. `npm run verify` после каждого смыслового куска.  
3. CHANGELOG + версия при закрытии спринта.

## Вне скоупа пока

- Расширения / Tampermonkey как основной путь.  
- Drag-and-drop колонок.  
- OCR на хабе (отдельное решение).
