# Tasks: Smart Suggestions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–420 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (types + KB + picker + store) → PR 2 (hook + UI + i18n) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types, knowledge base, user picker, store wiring | PR 1 | Foundation — no UI changes, reviewable standalone |
| 2 | Hook, home.tsx UI badges, i18n keys | PR 2 | Depends on PR 1; integrates everything into user flow |

---

## Phase 1: Types & Pure Logic (PR 1 — Foundation)

- [x] 1.1 Add `source: 'ai' | 'user'` and `lastUsed?: string` to `Suggestion` interface in `types/index.ts`
- [x] 1.2 Create `lib/knowledgeBase.ts` — `computePatterns(entries, outfits)`: group `CalendarLogEntry[]` by day-of-week, recency-weighted scoring (1.0 ≤30d, 0.5 older), return `KnowledgePatterns` (REQ-KB-1/2/5)
- [x] 1.3 In `lib/knowledgeBase.ts` — `getKnowledgeBase()`: AsyncStorage cache key `@closetly/kb_patterns`, 24h TTL, wraps `computePatterns`, loads entries via `calendarStore.loadMonth()` for current + 2 previous months
- [x] 1.4 In `lib/knowledgeBase.ts` — `clearKBCache()`: removes AsyncStorage key; export for calendarStore invalidation
- [x] 1.5 In `lib/knowledgeBase.ts` — Cold start: <5 total entries returns `{ hasEnoughData: false, patterns: null }` (REQ-KB-4)
- [x] 1.6 Create `lib/userSuggestionPicker.ts` — `pickUserSuggestions(outfits, calendarEntries, count)`: sort by lastUsed ascending, never-worn fallback, return `Suggestion[]` with `source: 'user'`
- [x] 1.7 In `lib/userSuggestionPicker.ts` — Attach `lastUsed` from most recent calendar entry per outfit; `undefined` if never logged (REQ-SS-3)
- [x] 1.8 Modify `store/suggestionsStore.ts` — Change `dedupeSuggestions` limit from `.slice(0, 3)` to `.slice(0, 4)` (REQ-PIN-FE-6)
- [x] 1.9 In `store/suggestionsStore.ts` — Add state: `userSuggestions: Suggestion[]`, `mergedSuggestions: Suggestion[]`, actions `setUserSuggestions`, `mergeSuggestions` (dedupe AI + user sources)
- [x] 1.10 In `store/suggestionsStore.ts` — Extend `pinnedGarmentIds` comment to 0-3; `regenerateWithPinned` must check `source === 'user'` and early-return with toast (REQ-PIN-FE-7)
- [x] 1.11 In `store/suggestionsStore.ts` — On regeneration merge: preserve user-sourced suggestions at their positions, replace only AI slots (REQ-PIN-FE-4)

## Phase 2: Hook & UI Integration (PR 2 — Features)

- [x] 2.1 Create `hooks/useSmartSuggestions.ts` — Compute ratio from outfit count (≤5→3AI/1U, 6-15→2/2, ≥16→1/3) (REQ-SS-1)
- [x] 2.2 In `hooks/useSmartSuggestions.ts` — On mount: load calendar entries (3 months via `calendarStore.loadMonth`), call `getKnowledgeBase()`, call `pickUserSuggestions()`, fetch AI suggestions, merge via store
- [x] 2.3 In `hooks/useSmartSuggestions.ts` — Handle edge cases: 0 outfits → empty; API failure → `error` set; fewer outfits than user slots → fill remainder with AI (REQ-SS-6)
- [x] 2.4 In `hooks/useSmartSuggestions.ts` — Write `mergedSuggestions` to `suggestionsStore` after merge; expose `suggestions`, `isLoading`, `error` return values
- [x] 2.5 In `app/(tabs)/home.tsx` (~line 491) — Inside `suggestions.map`: render source badge ("IA" / "Tu outfit") using `suggestion.source` (REQ-SS-5)
- [x] 2.6 In `app/(tabs)/home.tsx` — Below badge: render last-used line for `source === 'user'` — "Último uso: {date}" or "Nunca usado" (REQ-SS-5)
- [x] 2.7 In `app/(tabs)/home.tsx` — Replace direct `suggestions` from store with `mergedSuggestions`; adjust `suggestionGarments` lookup for user-sourced items
- [x] 2.8 Add i18n keys to `lib/i18n.ts`: `smartSuggestions.sourceAI`, `smartSuggestions.sourceUser`, `smartSuggestions.neverWorn`, `smartSuggestions.lastUsed` (EN + ES) (REQ-SS-7)
- [x] 2.9 Run `npx tsc --noEmit` to verify no type errors across all changes

## Phase 3: KB Invalidation Wiring

- [x] 3.1 In `store/calendarStore.ts` — After `logOutfit()` success, call `clearKBCache()` from `lib/knowledgeBase.ts`
- [x] 3.2 Verify `clearKBCache` import doesn't create circular dependency (calendarStore → knowledgeBase → calendarStore)
