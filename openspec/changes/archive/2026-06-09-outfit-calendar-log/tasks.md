# Tasks: Outfit Calendar Log

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,540 (BE ~495, FE ~1,045) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: BE module → PR 2: FE foundation → PR 3: FE calendar screen → PR 4: FE integrations |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Lines | Notes |
|------|------|-----------|-------|-------|
| 1 | BE migration + calendar module | PR 1 | ~495 | Base: main. New module, no breaking changes. |
| 2 | FE deps + types + i18n + service + store + hook | PR 2 | ~285 | Base: main. Requires BE deployed. |
| 3 | FE calendar screen + log-today picker | PR 3 | ~650 | Base: main. Main UI work. |
| 4 | FE home quick action + outfit detail log button | PR 4 | ~110 | Base: main. Depends on PR 3. |

## Phase 1: BE — Database Migration

- [x] **1.1** Create migration `...create_outfit_calendar_log.sql` — UUID PK, user_id FK, outfit_id FK, date, created_at, UNIQUE(user_id, date), index. (~30 lines)
  - AC: Table matches REQ-CAL-BE-1; rollback drops it.

## Phase 2: BE — Calendar Module

- [x] **2.1** Create `domain/entities/calendar-log.entity.ts` — class with id, userId, outfitId, date, createdAt. (~15 lines)
  - AC: Entity matches spec columns.
- [x] **2.2** Create `domain/repositories/calendar-log.repository.interface.ts` — interface + symbol with findByUserAndDateRange, findByUserAndDate, create, delete. (~20 lines)
  - AC: Interface matches design.
- [x] **2.3** Create `infrastructure/repositories/calendar-log.repository.ts` — Supabase impl with month-range query + outfit/garment join for GET. (~100 lines)
  - AC: All 4 methods work; join populates outfit + garments.
- [x] **2.4** Create `infrastructure/modules/calendar/dto/log-outfit.dto.ts` — @IsUUID() outfitId, @IsDateString() date. (~15 lines)
  - AC: DTO rejects invalid UUID and non-date strings.
- [x] **2.5** Create `application/use-cases/calendar/log-outfit.use-case.ts` — verify ownership, create, catch 23505 → 409. (~60 lines)
  - AC: 201 on success, 409 on duplicate (REQ-CAL-BE-2).
- [x] **2.6** Create `application/use-cases/calendar/get-calendar-month.use-case.ts` — calc month range, query + populate outfit+garments. (~80 lines)
  - AC: Returns entries with nested outfit.garments for month (REQ-CAL-BE-3).
- [x] **2.7** Create `application/use-cases/calendar/delete-calendar-log.use-case.ts` — find, verify ownership, delete. (~40 lines)
  - AC: Owner 204, non-owner 403, missing 404 (REQ-CAL-BE-4).
- [x] **2.8** Create `infrastructure/modules/calendar/calendar.controller.ts` — POST log, GET, DELETE :id with SupabaseAuthGuard. (~100 lines)
  - AC: Routes match design contracts.
- [x] **2.9** Create `infrastructure/modules/calendar/calendar.module.ts` — register controller + use cases + repository. (~35 lines)
  - AC: Module compiles; DI resolves all deps.

## Phase 3: FE — Foundation (Deps, Types, i18n, Service, Store, Hook)

- [ ] **3.1** Run `npx expo install react-native-calendars`. (~1 line)
  - AC: Package in dependencies; app builds (REQ-CAL-FE-1).
- [ ] **3.2** Add `CalendarLogEntry`, `LogOutfitDTO`, `GetCalendarQuery` to `types/index.ts`. (~25 lines)
  - AC: Types match design spec.
- [ ] **3.3** Add `calendar.*` i18n keys (en/es) to `lib/i18n.ts` — all 12 keys from REQ-CAL-FE-8. (~50 lines)
  - AC: Both locales render all keys.
- [ ] **3.4** Create `services/calendarService.ts` — logOutfit, getCalendar, deleteLog via apiClient. (~50 lines)
  - AC: Service follows plannerService pattern.
- [ ] **3.5** Create `store/calendarStore.ts` — Zustand store: entries, isLoading, isSaving, error, selectedMonth/Year, loadMonth, logOutfit, deleteLog, nav methods. (~120 lines)
  - AC: Store matches design interface (REQ-CAL-FE-7).
- [ ] **3.6** Create `hooks/useCalendar.ts` — hook wrapping calendarStore. (~40 lines)
  - AC: Hook follows existing hook pattern.

## Phase 4: FE — Calendar Screen + Log-Today Picker

- [x] **4.1** Create `app/calendar/index.tsx` — CalendarList with markedDates, month arrows, bottom sheet (OutfitShareCard + Remove), loading/error/empty states, pull-to-refresh, swipe navigation. (~614 lines)
  - AC: All REQ-CAL-FE-2, FE-3, FE-4 scenarios pass.
- [x] **4.2** Create `app/calendar/log-today.tsx` — outfit picker that calls store.logOutfit then navigates to /calendar. (~503 lines)
  - AC: User picks outfit → logged → navigated to calendar.

## Phase 5: FE — Integrations (Home + Outfit Detail)

- [x] **5.1** Modify `app/(tabs)/home.tsx` — add "What I wore today" card; navigates to log-today or /calendar based on today's status. (~30 lines)
  - AC: Card renders; tap navigates correctly (REQ-CAL-FE-6).
- [x] **5.2** Modify `app/outfits/[id].tsx` — add "Log" button in actions section + date picker modal + log handler + success toast. (~80 lines)
  - AC: Button renders; log flow works end-to-end (REQ-CAL-FE-5).
