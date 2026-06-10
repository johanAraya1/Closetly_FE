# Outfit Calendar Log — Specification

## Purpose

Allow users to log what outfit they wore each day and browse past outfits on a monthly calendar grid. The calendar acts as a visual style diary — one outfit per day, with a dot on days that have a log entry.

## BE Requirements

### REQ-CAL-BE-1: Database table

A table `outfit_calendar_log` MUST exist with columns: `id` (UUID PK), `user_id` (UUID FK, NOT NULL), `outfit_id` (UUID FK, NOT NULL), `date` (DATE, NOT NULL), `created_at` (TIMESTAMPTZ, default NOW()). A UNIQUE constraint on `(user_id, date)` MUST enforce one outfit per day per user.

#### Scenario: Table creation

- GIVEN the migration runs
- WHEN the table `outfit_calendar_log` is created
- THEN it has columns id, user_id, outfit_id, date, created_at
- AND a UNIQUE constraint exists on (user_id, date)

### REQ-CAL-BE-2: POST /calendar/log

The system MUST expose `POST /api/calendar/log` accepting `{ outfitId: string, date: string (YYYY-MM-DD) }`. It MUST insert a row in `outfit_calendar_log` for the authenticated user. It MUST return 409 if the user already has a log for that date.

#### Scenario: Successful log

- GIVEN an authenticated user with an outfit
- WHEN they POST `/api/calendar/log` with `{ outfitId, date }`
- THEN a new log entry is created
- AND the response status is 201 with the created entry

#### Scenario: Duplicate date

- GIVEN the user already logged an outfit on 2026-06-09
- WHEN they POST `/api/calendar/log` with `date: "2026-06-09"`
- THEN the response status is 409
- AND the response body contains an error message "Already logged for this date"

#### Scenario: Unauthenticated request

- GIVEN no valid auth token
- WHEN they POST `/api/calendar/log`
- THEN the response status is 401

### REQ-CAL-BE-3: GET /calendar?month=&year=

The system MUST expose `GET /api/calendar?month=<number>&year=<number>` returning an array of `{ id, date, outfit }` entries for that month, scoped to the authenticated user. The `outfit` field MUST include `id`, `name`, and `garments[].imageUrl` for rendering.

#### Scenario: Month with entries

- GIVEN the user has 3 log entries in June 2026
- WHEN they GET `/api/calendar?month=6&year=2026`
- THEN the response status is 200
- AND the body is an array of length 3
- AND each entry has `id`, `date`, and `outfit` with nested garments

#### Scenario: Month with no entries

- GIVEN the user has no log entries in May 2026
- WHEN they GET `/api/calendar?month=5&year=2026`
- THEN the response status is 200
- AND the body is an empty array

#### Scenario: Missing query params

- GIVEN no `month` or `year` param
- WHEN they GET `/api/calendar`
- THEN the response status is 400

### REQ-CAL-BE-4: DELETE /calendar/:id

The system MUST expose `DELETE /api/calendar/:id` to remove a log entry. Only the owner of the log entry MAY delete it.

#### Scenario: Owner deletes entry

- GIVEN a log entry belonging to the authenticated user
- WHEN they DELETE `/api/calendar/:id`
- THEN the response status is 204
- AND the row is removed from the table

#### Scenario: Non-owner tries to delete

- GIVEN a log entry belonging to a different user
- WHEN another user tries to DELETE `/api/calendar/:id`
- THEN the response status is 403

#### Scenario: Non-existent id

- GIVEN no log entry with that id
- WHEN they DELETE `/api/calendar/:id`
- THEN the response status is 404

## FE Requirements

### REQ-CAL-FE-1: Install react-native-calendars

The project MUST install `react-native-calendars` as a dependency. The calendar library version SHOULD be compatible with Expo SDK 50.

#### Scenario: Dependency added

- GIVEN the project is a React Native Expo app
- WHEN `react-native-calendars` is installed
- THEN the package appears in `package.json` dependencies
- AND the app builds without native module linking issues

### REQ-CAL-FE-2: Calendar screen at /calendar

A new screen at `app/calendar/index.tsx` MUST render a monthly calendar grid using `CalendarList` (or `Calendar`) from `react-native-calendars`. Dots on days MUST indicate presence of a logged outfit. The screen MUST be accessible via a tab OR by deep-linking — the proposal says it's a standalone screen, NOT a new tab; accessible via router push from home quick action and from outfit detail.

#### Scenario: Empty calendar renders

- GIVEN the user has no log entries
- WHEN they navigate to `/calendar`
- THEN the monthly grid renders with no dots
- AND an empty state message is shown

#### Scenario: Days with outfits show dots

- GIVEN the user has log entries on June 9 and June 22, 2026
- WHEN the calendar loads June 2026
- THEN dots appear on days 9 and 22

#### Scenario: Loading state

- GIVEN the calendar screen mounts
- WHEN the GET request is in flight
- THEN a loading indicator is shown

#### Scenario: Network error

- GIVEN the API is unreachable
- WHEN the GET request fails
- THEN an error message with retry button is displayed

### REQ-CAL-FE-3: Month navigation

The calendar grid MUST support swiping between months (built into `CalendarList`) and MUST update the data for the displayed month. Changing months triggers a new GET with the updated month/year.

#### Scenario: Swipe to next month

- GIVEN the calendar shows June 2026
- WHEN the user swipes left to July 2026
- THEN a GET is made for `month=7&year=2026`
- AND July's dots are rendered

### REQ-CAL-FE-4: Tap day shows bottom sheet with outfit preview

When the user taps a day that HAS a logged outfit, a bottom sheet (or modal overlay) MUST appear showing the `OutfitShareCard` component with the outfit data, the outfit name, the date, and a "Remove from calendar" action. Tapping a day WITHOUT a log entry SHOULD show a prompt to log an outfit.

#### Scenario: Tap day with outfit

- GIVEN June 9, 2026 has a logged outfit
- WHEN the user taps day 9 on the calendar
- THEN a bottom sheet appears
- AND it displays `OutfitShareCard` with the outfit data
- AND it shows the date "June 9, 2026"
- AND a "Remove from calendar" button is visible

#### Scenario: Tap day without outfit

- GIVEN June 15, 2026 has no log entry
- WHEN the user taps day 15
- THEN a prompt to log an outfit appears (or navigates to outfit selection)
- AND the selected date is pre-filled as June 15, 2026

#### Scenario: Remove entry from bottom sheet

- GIVEN the bottom sheet is open for a logged day
- WHEN the user taps "Remove from calendar"
- THEN a confirmation alert is shown
- AND on confirm, DELETE /calendar/:id is called
- AND the dot is removed from that day
- AND the bottom sheet closes

### REQ-CAL-FE-5: "Log to calendar" button on outfit detail

The outfit detail screen at `app/outfits/[id].tsx` MUST add a new action button "📅 Log" in the actions row, next to the existing Favorite and Share buttons. Tapping it MUST show a date picker modal with today's date pre-selected and a "Log outfit" button.

#### Scenario: Log button renders

- GIVEN the user is on the outfit detail screen
- WHEN the actions section is rendered
- THEN a "Log" button with a calendar icon appears next to Favorite and Share

#### Scenario: Log with today's date

- GIVEN the user opens the log modal from outfit detail
- WHEN the date picker appears
- THEN the default selected date is today
- AND tapping "Log outfit" calls POST /calendar/log with the outfit id and selected date

#### Scenario: Log with custom date

- GIVEN the log modal is open
- WHEN the user changes the date to 2026-06-15
- AND taps "Log outfit"
- THEN the entry is created for 2026-06-15

#### Scenario: Success feedback

- GIVEN the POST succeeds
- WHEN the log is created
- THEN a success toast/alert is shown
- AND the modal closes

#### Scenario: Duplicate date error

- GIVEN the user already logged an outfit for that date
- WHEN they try to log again
- THEN an error message "Already logged for this date" is shown

### REQ-CAL-FE-6: "What I wore today" quick action on home

The home screen `app/(tabs)/home.tsx` MUST add a "What I wore today" quick action card in the quick actions section, using a calendar-outline icon. If the user already logged today, tapping SHOULD navigate to the calendar screen showing today. If not logged yet, tapping SHOULD navigate to outfit selection to log what they wore today.

#### Scenario: Quick action visible

- GIVEN the home screen is rendered
- WHEN the quick actions section is shown
- THEN a "What I wore today" card is visible in the actions grid

#### Scenario: Tap when not logged today

- GIVEN the user has no log entry for today
- WHEN they tap "What I wore today"
- THEN they are navigated to outfit selection to pick and log today's outfit
- OR they are navigated to outfits list to pick one

#### Scenario: Tap when already logged today

- GIVEN the user already logged an outfit today
- WHEN they tap "What I wore today"
- THEN they are navigated to `/calendar` showing today's entry

### REQ-CAL-FE-7: Calendar service and store

The FE MUST create a `calendarService.ts` in `services/` following the existing pattern (`apiClient.get/post/delete`). A Zustand store `calendarStore.ts` in `store/` MUST manage the state: entries for the current month, selected date, loading/error states. A hook `useCalendar.ts` in `hooks/` MUST follow the existing hook pattern (`Hook -> Store -> Service`).

#### Scenario: Store initial state

- GIVEN the calendar store is created
- WHEN it initializes
- THEN state has `entries: []`, `currentMonth: null`, `currentYear: null`, `isLoading: false`, `error: null`

#### Scenario: Fetch month data

- GIVEN month and year are set
- WHEN `loadMonth(month, year)` is called
- THEN the store sets `isLoading: true`
- AND calls `calendarService.getMonth(month, year)`
- AND on success sets `entries` and `isLoading: false`

### REQ-CAL-FE-8: i18n keys

The `i18n.ts` translations MUST include a `calendar` block with the following keys in both `en` and `es` locales.

#### English keys required

```
calendar.title: "Style Calendar"
calendar.logButton: "Log to Calendar"
calendar.removeButton: "Remove from calendar"
calendar.removeConfirm: "Remove this outfit from {{date}}?"
calendar.loggedFor: "Logged for {{date}}"
calendar.whatIWoreToday: "What I wore today"
calendar.today: "Today"
calendar.logOutfit: "Log Outfit"
calendar.selectDate: "Select a date"
calendar.noEntries: "No outfits logged for this month"
calendar.alreadyLogged: "Already logged for this date"
calendar.logSuccess: "Outfit logged successfully!"
calendar.removeSuccess: "Outfit removed from calendar"
```

#### Spanish keys required

```
calendar.title: "Calendario de Estilo"
calendar.logButton: "Registrar en Calendario"
calendar.removeButton: "Quitar del calendario"
calendar.removeConfirm: "¿Quitar este outfit del {{date}}?"
calendar.loggedFor: "Registrado el {{date}}"
calendar.whatIWoreToday: "Lo que usé hoy"
calendar.today: "Hoy"
calendar.logOutfit: "Registrar Outfit"
calendar.selectDate: "Seleccioná una fecha"
calendar.noEntries: "No hay outfits registrados este mes"
calendar.alreadyLogged: "Ya registraste un outfit para esta fecha"
calendar.logSuccess: "¡Outfit registrado correctamente!"
calendar.removeSuccess: "Outfit quitado del calendario"
```
