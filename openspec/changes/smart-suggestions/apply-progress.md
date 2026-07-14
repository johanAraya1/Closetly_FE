# Apply Progress: Smart Suggestions — PR 1 (Foundation) + PR 2 (Hook & UI + KB Invalidation)

**Change**: smart-suggestions
**Mode**: Standard (no TDD)
**Date**: 2026-07-14
**PR Slice**: PR 1 (Foundation) + PR 2 (Hook & UI + KB Invalidation) — complete

## Completed Tasks

### PR 1 — Foundation
- [x] 1.1 Add `source: 'ai' | 'user'` and `lastUsed?: string` to `Suggestion` interface in `types/index.ts`
- [x] 1.2 Create `lib/knowledgeBase.ts` — `computePatterns(entries, outfits)`: group CalendarLogEntry[] by day-of-week, recency-weighted scoring (1.0 ≤30d, 0.5 older), return KnowledgePatterns
- [x] 1.3 In `lib/knowledgeBase.ts` — `getKnowledgeBase()`: AsyncStorage cache key `@closetly/kb_patterns`, 24h TTL, wraps computePatterns, loads entries for current + 2 previous months
- [x] 1.4 In `lib/knowledgeBase.ts` — `clearKBCache()`: removes AsyncStorage key; export for calendarStore invalidation
- [x] 1.5 In `lib/knowledgeBase.ts` — Cold start: <5 total entries returns `{ hasEnoughData: false, patterns: null }`
- [x] 1.6 Create `lib/userSuggestionPicker.ts` — `pickUserSuggestions(outfits, calendarEntries, count)`: sort by lastUsed ascending, never-worn fallback, return Suggestion[] with `source: 'user'`
- [x] 1.7 In `lib/userSuggestionPicker.ts` — Attach `lastUsed` from most recent calendar entry per outfit; `undefined` if never logged
- [x] 1.8 Modify `store/suggestionsStore.ts` — Change dedupeSuggestions limit from `.slice(0, 3)` to `.slice(0, 4)`
- [x] 1.9 In `store/suggestionsStore.ts` — Add state: `userSuggestions`, `mergedSuggestions`, actions `setUserSuggestions`, `setMergedSuggestions`
- [x] 1.10 In `store/suggestionsStore.ts` — Extend pinnedGarmentIds comment to 0-3; regenerateWithPinned checks `source === 'user'` and early-returns
- [x] 1.11 In `store/suggestionsStore.ts` — On regeneration merge: preserve user-sourced suggestions at their positions via `mergeWithUserPreserved`

### PR 2 — Hook & UI + KB Invalidation
- [x] 2.1 Create `hooks/useSmartSuggestions.ts` — Compute ratio from outfit count (≤5→3AI/1U, 6-15→2/2, ≥16→1/3)
- [x] 2.2 In hook — Load calendar entries (3 months via direct API), call getKnowledgeBase, pickUserSuggestions, fetch AI with optional occasion hint (70% KB pattern pass), merge
- [x] 2.3 In hook — Handle edge cases: 0 outfits→empty, API failure→error set, fewer outfits than user slots→fill remainder with AI
- [x] 2.4 In hook — Write mergedSuggestions to store; expose suggestions, isLoading, error
- [x] 2.5 In `app/(tabs)/home.tsx` — Source badge ("AI"/"Your outfit") using suggestion.source with purple/green styling
- [x] 2.6 In `app/(tabs)/home.tsx` — Last-used line for user suggestions: "Last used: {date}" or "Never worn"
- [x] 2.7 In `app/(tabs)/home.tsx` — Replaced direct suggestions with useSmartSuggestions hook; hook updates store garments to include user suggestion garments
- [x] 2.8 Add i18n keys: smartSuggestions.sourceAI, sourceUser, neverWorn, lastUsed (EN + ES)
- [x] 2.9 Type check verification — no new errors introduced (all errors pre-existing)
- [x] 3.1 In `store/calendarStore.ts` — After logOutfit() success, call clearKBCache()
- [x] 3.2 Verified no circular dependency (calendarStore→knowledgeBase uses apiClient, not calendarStore)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `types/index.ts` | Modified (PR1) | Added `source: 'ai' \| 'user'` and `lastUsed?: string` to Suggestion |
| `lib/knowledgeBase.ts` | Created (PR1) | computePatterns (pure), getKnowledgeBase (cached), clearKBCache, DayPattern/KnowledgePatterns types |
| `lib/userSuggestionPicker.ts` | Created (PR1) | pickUserSuggestions with most-ancient sort, never-worn fallback, Suggestion generation |
| `store/suggestionsStore.ts` | Modified (PR1) | Extended state (userSuggestions, mergedSuggestions), actions, dedupe 3→4, pin guard 0-3, regenerateWithPinned user-source skip, mergeWithUserPreserved |
| `hooks/useSmartSuggestions.ts` | Created (PR2) | Orchestrator hook: ratio computation, KB loading, user picker, AI fetch with occasion hint, merge+dedupe, store writes |
| `app/(tabs)/home.tsx` | Modified (PR2) | Replaced suggestions source with useSmartSuggestions hook, added source badge (AI/user), added last-used line, added sourceBadge/lastUsed styles |
| `lib/i18n.ts` | Modified (PR2) | Added smartSuggestions namespace (sourceAI, sourceUser, neverWorn, lastUsed) in EN + ES |
| `store/calendarStore.ts` | Modified (PR2) | Added clearKBCache() call after logOutfit success for KB invalidation |
| `openspec/changes/smart-suggestions/tasks.md` | Modified | Marked tasks 1.1-1.11, 2.1-2.9, 3.1-3.2 as complete |

## Deviations from Design

- **`mergeSuggestions` action**: Named `setMergedSuggestions` in store to match action naming pattern (simple setter). The actual merge logic lives in `mergeWithUserPreserved` helper + orchestrated by the hook.
- **`getKnowledgeBase` loads entries directly via `apiClient`**: Design mentioned `calendarStore.loadMonth()` but that mutates Zustand state as a side effect. Instead, `getKnowledgeBase` calls the calendar API directly.
- **Hook makes its own AI API call**: Instead of delegating to `suggestionsStore.fetchSuggestions` (which doesn't support `preferredOccasion`), the hook builds its own endpoint with the occasion hint when KB patterns are available. This avoids duplicating the location logic while keeping the 70/30 KB pattern pass working.
- **Garment lookup for user suggestions**: Instead of changing the home screen's find logic, the hook updates `suggestionsStore.garments` to include garments from user-sourced suggestions, so existing `suggestionGarments.find(...)` calls work for all sources.
- **No separate SuggestionCard component**: Design listed `components/SuggestionCard.tsx` as a new file. Instead, the source badge and last-used line were added inline in `home.tsx` since the suggestion card rendering is already inline there and extracting a component would be a larger refactor beyond scope.

## Issues Found

None — all changes compile cleanly. Pre-existing type errors in other files are unrelated.

## Status

All tasks complete. Ready for verify.
