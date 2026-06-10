# Outfit Calendar Log — Proposal

## Intent

Create a daily outfit history so users can log what they wore each day and browse past outfits on a calendar. Think "what I wore today" meets a visual style diary.

## Scope

- New table `outfit_calendar_log` (BE: `user_id, outfit_id, date` — UNIQUE per date)
- Endpoints: `POST /calendar/log`, `GET /calendar?month=&year=`, `DELETE /calendar/:id`
- New FE screen: `app/calendar/index.tsx` with monthly grid
- Tap a day → bottom sheet with full outfit preview (reuse `OutfitShareCard`)
- "Log to calendar" button on outfit detail screen (`app/outfits/[id].tsx`)
- "What I wore today" quick action on home screen
- Install `react-native-calendars` for the month grid

## Out of scope (for this change)

- Multiple outfits per day (deferred — single outfit per day, UNIQUE constraint)
- Edit/replace logged outfit (deferred — DELETE + re-log instead)
- Stats integration (e.g., "most worn category") — pure calendar history

## Key tradeoffs

| Decision | Choice | Why |
|----------|--------|-----|
| Library | `react-native-calendars` | Battle-tested, has month grid + markers, swipe, built-in theming |
| Outfit preview | Reuse `OutfitShareCard` | Already exists, has the exact layout we need |
| Storage | New table (not reusing planner) | Planner is weekly schedules, this is historical log — different concern |
| Single outfit/day | UNIQUE(user_id, date) | Simpler UX, cleaner grid dots, easy to reason about |

## Design sketch

### Calendar screen (`/calendar`)
```
┌─────────────────────────┐
│  < Junio 2026 >    [+]  │  ← [+] quick log today
│  L  M  M  J  V  S  D   │
│        1  2  3  4  5  6 │
│  7  8  9  ● 11 12 13   │  ← ● = logged outfit
│ 14 15 16 17 18 19 20   │
│ 21 22 ● 24 25 26 27    │
│ 28 29 30               │
└─────────────────────────┘
       ↓ tap day 9 ↓
┌─────────────────────────┐
│  [OutfitShareCard]      │
│                         │
│  "Casual Friday"        │
│  9 Junio 2026           │
│                         │
│  [Quitar del calendario]│
└─────────────────────────┘
```

### Outfit detail — new action
```
┌─────────────────────────┐
│  ♥  Share  📅 Log       │  ← new button in actions row
└─────────────────────────┘
       ↓ tap ↓
┌─────────────────────────┐
│  Log this outfit        │
│  Date: [2026-06-09]     │
│  [Log outfit]           │
└─────────────────────────┘
```
