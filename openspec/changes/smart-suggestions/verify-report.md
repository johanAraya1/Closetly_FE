## Verification Report

**Change**: smart-suggestions
**Version**: N/A
**Mode**: Standard (no TDD)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 23 |
| Tasks complete | 23 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ⚠️ Passed with pre-existing errors (0 new)
```text
npx tsc --noEmit
Total errors: ~50 (all pre-existing in unrelated files)
New errors from smart-suggestions changes: 0
Pre-existing errors in: register.tsx, closet.tsx, Button.tsx, Card.tsx, Input.tsx,
  planner/index.tsx, authService.ts, authStore.ts, outfitService.ts, etc.
No errors in: knowledgeBase.ts, userSuggestionPicker.ts, useSmartSuggestions.ts,
  suggestionsStore.ts (modified), calendarStore.ts (modified), types/index.ts
```

**Tests**: ➖ Not available (no test infrastructure in project)
**Coverage**: ➖ Not available

### Spec Compliance Matrix

| Requirement | Scenario | Result |
|-------------|----------|--------|
| REQ-SS-1 | ≤5 outfits → 3AI+1U | ✅ COMPLIANT |
| REQ-SS-1 | 6-15 outfits → 2AI+2U | ✅ COMPLIANT |
| REQ-SS-1 | ≥16 outfits → 1AI+3U | ✅ COMPLIANT |
| REQ-SS-1 | Fewer outfits than user slots → fill with AI | ✅ COMPLIANT |
| REQ-SS-2 | Picks by least-recently-worn date | ✅ COMPLIANT |
| REQ-SS-2 | Never-logged → random among unworn | ✅ COMPLIANT |
| REQ-SS-2 | lastUsed undefined for never-worn | ✅ COMPLIANT |
| REQ-SS-3 | Suggestion.source: 'ai' \| 'user' | ✅ COMPLIANT |
| REQ-SS-3 | Suggestion.lastUsed?: string | ✅ COMPLIANT |
| REQ-SS-4 | Dedupes by sorted garmentIds key | ✅ COMPLIANT |
| REQ-SS-4 | Max 4 unique results | ✅ COMPLIANT |
| REQ-SS-5 | source='ai' → badge "IA" (ES) / "AI" (EN) | ✅ COMPLIANT |
| REQ-SS-5 | source='user' → badge "Tu outfit" / "Your outfit" | ✅ COMPLIANT |
| REQ-SS-5 | lastUsed set → "Último uso: {date}" | ✅ COMPLIANT |
| REQ-SS-5 | lastUsed undefined → "Nunca usado" | ✅ COMPLIANT |
| REQ-SS-6 | Returns suggestions, isLoading, error | ✅ COMPLIANT |
| REQ-SS-6 | 0 outfits → empty array | ✅ COMPLIANT |
| REQ-SS-6 | API failure → error set, suggestions empty | ⚠️ PARTIAL |
| REQ-SS-7 | smartSuggestions.sourceAI EN/ES | ✅ COMPLIANT |
| REQ-SS-7 | smartSuggestions.sourceUser EN/ES | ✅ COMPLIANT |
| REQ-SS-7 | smartSuggestions.neverWorn EN/ES | ✅ COMPLIANT |
| REQ-SS-7 | smartSuggestions.lastUsed EN/ES | ✅ COMPLIANT |
| REQ-KB-1 | Groups by day-of-week (0=Mon…6=Sun) | ✅ COMPLIANT |
| REQ-KB-1 | Computes topOccasion per day | ✅ COMPLIANT |
| REQ-KB-1 | Computes topStyles per day | ✅ COMPLIANT |
| REQ-KB-2 | Last 30d weight=1.0, older=0.5 | ✅ COMPLIANT |
| REQ-KB-3 | Cache key + 24h TTL | ⚠️ PARTIAL |
| REQ-KB-4 | <5 entries → hasEnoughData: false | ✅ COMPLIANT |
| REQ-KB-5 | Only last 3 months analyzed | ✅ COMPLIANT |
| REQ-KB-6 | computePatterns + getKnowledgeBase API | ✅ COMPLIANT |
| REQ-PIN-FE-6 | dedupeSuggestions limits to 4 | ✅ COMPLIANT |
| REQ-PIN-FE-7 | Pin toggle accepts indices 0-3 | ✅ COMPLIANT |
| REQ-PIN-FE-7 | regenerateWithPinned skips user source | ✅ COMPLIANT |
| Calendar | clearKBCache after logOutfit | ✅ COMPLIANT |
| Calendar | No circular dependency | ✅ COMPLIANT |

**Compliance summary**: 29/31 scenarios fully compliant, 2 partial

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| REQ-SS-1 | ✅ Implemented | `computeRatio()` in hooks/useSmartSuggestions.ts:24-28; fallback via `Math.min(userCount, outfits.length)` at line 208 |
| REQ-SS-2 | ✅ Implemented | `pickUserSuggestions()` sorts worn by oldest lastUsed (line 46), shuffles unworn (line 49), picks worn-first then unworn |
| REQ-SS-3 | ✅ Implemented | `Suggestion` interface at types/index.ts:304-312 includes `source: 'ai' \| 'user'` and `lastUsed?: string` |
| REQ-SS-4 | ✅ Implemented | `dedupeSuggestions()` in suggestionsStore.ts:43-53 — Set-based dedupe by sorted garmentIds, `.slice(0, 4)` |
| REQ-SS-5 | ✅ Implemented | home.tsx:575-614 — source badge via i18n keys, last-used row with conditional date/never-worn |
| REQ-SS-6 | ⚠️ Partial | Hook returns {suggestions, isLoading, error} ✅; 0 outfits → empty ✅; API failure sets error but user suggestions still appear (see Issues) |
| REQ-SS-7 | ✅ Implemented | i18n.ts:641-646 (EN) and 1276-1281 (ES) — all 4 keys present with correct values |
| REQ-KB-1 | ✅ Implemented | computePatterns() groups by `(date.getDay() + 6) % 7` for ISO weekday, computes topOccasion and topStyles per day |
| REQ-KB-2 | ✅ Implemented | Line 91: `weight = entryDate >= thirtyDaysAgo ? 1.0 : 0.5` |
| REQ-KB-3 | ⚠️ Partial | TTL correct (24h) ✅; cache key is `@closetly/kb_patterns` (spec says `knowledge_base_patterns`) — functional, cosmetic mismatch |
| REQ-KB-4 | ✅ Implemented | Line 58: `recentEntries.length < 5` returns `{ hasEnoughData: false, patterns: null }` |
| REQ-KB-5 | ✅ Implemented | Filter at lines 53-56 uses `THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000` |
| REQ-PIN-FE-6 | ✅ Implemented | `.slice(0, 4)` at line 52 |
| REQ-PIN-FE-7 | ✅ Implemented | Guard at line 231: `if (suggestionIndex > 3) return false`; user-source skip at lines 277-281 |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| No Zustand state mutation from KB loading | ✅ Yes | getKnowledgeBase loads via direct apiClient calls, not calendarStore.loadMonth |
| Hook orchestrates full pipeline | ✅ Yes | useSmartSuggestions.ts handles ratio, KB, user picker, AI fetch, merge, dedupe |
| mergeWithUserPreserved in store | ✅ Yes | Two-pass: place user suggestions first, then fill with AI |
| Garment lookup compatibility | ✅ Yes | Hook updates suggestionsStore.garments to include user-sourced garments |
| No separate SuggestionCard component | ✅ Yes | Inline in home.tsx as noted in deviations |

### Issues Found

**CRITICAL**: None

**WARNING**:

1. **REQ-SS-6: API failure doesn't empty suggestions** — When the AI API fails, the hook sets `error` but still returns user-sourced suggestions (hook lines 246-251 → 287-292). The spec says `suggestions empty` on API failure. The current behavior is arguably better UX (showing user suggestions when AI is unavailable) but deviates from spec. If the spec is authoritative, this needs fixing.

2. **Refresh button mismatch** — The refresh button in the suggestions section (home.tsx:417) calls `fetchSuggestions()` from `suggestionsStore`, which does the old pure-AI fetch. The UI displays `suggestions` from `useSmartSuggestions()` hook (local state). Clicking refresh updates the store but NOT the hook's local state, so the refresh button has no visible effect on hybrid suggestions. The hook only re-runs when `outfits.length` changes.

3. **REQ-PIN-FE-7: No toast on user-source regenerate** — The spec requires "a toast/message indicates 'Tu outfit no se regenera'" when regenerateWithPinned is called on a user-sourced suggestion. The store silently returns (suggestionsStore.ts:278-280) without any toast. The UI doesn't show any feedback.

**SUGGESTION**:

1. **Cache key mismatch** — Spec says `knowledge_base_patterns`, implementation uses `@closetly/kb_patterns`. Functionally equivalent but inconsistent with spec wording. Consider aligning if other consumers depend on the key.

2. **Hardcoded Spanish in userSuggestionPicker** — The `formatDate()` helper (userSuggestionPicker.ts:119-127) always formats dates in Spanish ("enero", "febrero"...). This only affects the `description` field of user-sourced suggestions, which is not directly rendered in the card UI (the i18n-aware `lastUsed` line is used instead). However, if the `description` field is ever exposed elsewhere, it would be Spanish-only.

3. **Duplicate `dedupeSuggestions` function** — Both `suggestionsStore.ts` and `hooks/useSmartSuggestions.ts` define their own `dedupeSuggestions` with identical logic. Consider extracting to a shared utility to avoid drift.

### Verdict

**PASS WITH WARNINGS**

All core requirements are implemented and type-check clean (0 new errors). Three warnings identified: (1) API failure behavior deviation, (2) refresh button broken for hybrid suggestions, (3) missing toast on user-source regenerate. None are critical blockers but should be addressed before release.
