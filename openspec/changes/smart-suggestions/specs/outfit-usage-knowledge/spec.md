# Outfit Usage Knowledge — Specification

## Purpose

Detect day-of-week usage patterns from calendar log entries to inform AI suggestion occasions. Cache in AsyncStorage with TTL.

## Requirements

### REQ-KB-1: Day-of-week pattern detection

Group `CalendarLogEntry[]` by day of week (0=Mon…6=Sun). Compute most common `outfit.occasion` and garment styles per day.

| GIVEN | WHEN | THEN |
|---|---|---|
| 8 Monday entries, 6 with occasion "trabajo" | Compute patterns | Monday top occasion: "trabajo" (0.75) |
| 4 Friday: 2 fiesta, 1 trabajo, 1 casual | Compute patterns | Friday top: "fiesta" (0.50) |
| 0 entries on Sunday | Compute patterns | Sunday: undefined/null |

### REQ-KB-2: Recency-weighted scoring

Last-30-day entries receive weight 1.0; older entries receive 0.5.

| GIVEN | WHEN | THEN |
|---|---|---|
| 2 recent "trabajo" + 3 old "casual" on Monday | Compute | "trabajo"=2.0 > "casual"=1.5 → "trabajo" wins |
| All entries within 30 days | Compute | Equal weight (1.0 each) |

### REQ-KB-3: AsyncStorage caching with TTL

Cache key: `knowledge_base_patterns`. TTL: 24h. Invalidate on new calendar entry logged.

| GIVEN | WHEN | THEN |
|---|---|---|
| Cache hit, 12h old | `getKnowledgeBase()` | Return cached; no recomputation |
| Cache expired (25h) | `getKnowledgeBase()` | Recompute from entries; write new cache |
| New entry logged | Next `getKnowledgeBase()` | Cache cleared; recomputed |

### REQ-KB-4: Graceful fallback for new users

Fewer than 5 total calendar entries → return `{ hasEnoughData: false, patterns: null }`. Suggestion engine makes no occasion bias.

| GIVEN | WHEN | THEN |
|---|---|---|
| 3 entries total | `getKnowledgeBase()` | `hasEnoughData: false` |
| 5 entries total | `getKnowledgeBase()` | `hasEnoughData: true` |

### REQ-KB-5: Data scope — last 3 months

Only entries from the last 3 months are analyzed. Older entries excluded.

| GIVEN | WHEN | THEN |
|---|---|---|
| Entries Jan–Jun 2026, called Jul 13 | Compute | Only Apr 13–Jul 13 entries analyzed |

### REQ-KB-6: Module API

| Function | Input | Output |
|---|---|---|
| `computePatterns(entries, outfits)` | `CalendarLogEntry[]`, `Outfit[]` | `KnowledgePatterns \| null` (pure, sync) |
| `getKnowledgeBase()` | none | `Promise<KnowledgePatterns \| null>` (cached) |

`KnowledgePatterns`: `{ hasEnoughData: boolean, patterns: DayPattern[] }`. `DayPattern`: `{ dayOfWeek, topOccasion, topStyles, entryCount }`.

| GIVEN | WHEN | THEN |
|---|---|---|
| 15 entries, 2 months | `computePatterns()` | `{ hasEnoughData: true, patterns: [...] }` with 7 day slots |
| 2 entries | `computePatterns()` | `{ hasEnoughData: false, patterns: null }` |
