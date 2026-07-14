# Smart Suggestions — Specification

## Purpose

Replace pure-AI suggestions with a hybrid engine: AI-generated outfits + user's least-used outfits. Source-aware UI differentiates card types.

## Requirements

### REQ-SS-1: Hybrid ratio by outfit count

| Outfits | AI | User | Total |
|---|---|---|---|
| ≤ 5 | 3 | 1 | 4 |
| 6–15 | 2 | 2 | 4 |
| ≥ 16 | 1 | 3 | 4 |

If fewer outfits exist than user slots, remaining slots SHALL fill with AI suggestions.

| GIVEN | WHEN | THEN |
|---|---|---|
| 3 outfits | Suggestions requested | 3 AI + 1 user |
| 10 outfits | Suggestions requested | 2 AI + 2 user |
| 20 outfits | Suggestions requested | 1 AI + 3 user |
| 1 outfit | Suggestions requested | 1 user (only one exists) + 3 AI |

### REQ-SS-2: "Most ancient" outfit selection

User slots SHALL select by least-recently-worn date from calendar logs. Never-logged outfits → random among unworn.

| GIVEN | WHEN | THEN |
|---|---|---|
| A: last 45d ago, B: 10d, C: 5d | 1 user slot needed | A selected |
| X, Y, Z never logged | 1 user slot from unworn | Random pick; `lastUsed` undefined |
| A: 30d ago, X/Y: never worn | 1 user slot | A selected (has oldest date) |
| Multiple tied at same date | Tie-breaking | Arbitrary selection |

### REQ-SS-3: Suggestion type extensions

Every `Suggestion` SHALL include `source: 'ai' | 'user'`. User-sourced suggestions SHALL include `lastUsed?: string` (ISO date or undefined).

| GIVEN | WHEN | THEN |
|---|---|---|
| AI suggestion stored | Type created | `source: 'ai'`, no `lastUsed` |
| User suggestion, outfit logged 2026-05-01 | Type created | `source: 'user'`, `lastUsed: '2026-05-01'` |
| User suggestion, never logged | Type created | `source: 'user'`, `lastUsed: undefined` |

### REQ-SS-4: Dedupe across sources

After merging, suggestions SHALL deduplicate by sorted `garmentIds` key. Max 4 unique results.

| GIVEN | WHEN | THEN |
|---|---|---|
| AI + user share same garmentIds | Merge | One instance kept; ≤ 4 total |

### REQ-SS-5: SuggestionCard source badge

Cards SHALL render a source badge and, for user-sourced, a last-used line.

| GIVEN | source | WHEN card renders | THEN |
|---|---|---|---|
| AI suggestion | `'ai'` | Visible | Badge "IA" displayed |
| User + date | `'user'`, `lastUsed: '2026-05-01'` | Visible | Badge "Tu outfit" + "Último uso: 1 mayo 2026" |
| User no date | `'user'`, `lastUsed: undefined` | Visible | Badge "Tu outfit" + "Nunca usado" |

### REQ-SS-6: useSmartSuggestions hook

The hook SHALL orchestrate: read outfit count → load knowledge base → compute ratio → fetch AI → compute user suggestions → merge + dedupe ≤ 4.

| GIVEN | WHEN | THEN |
|---|---|---|
| 10 outfits + calendar data | Hook mounts | Returns 4 suggestions (2 AI + 2 user); `isLoading` transitions false→true→false |
| 0 outfits | Hook mounts | Empty array; no user suggestion API call |
| API failure | Hook mounts | `error` set; `suggestions` empty |

### REQ-SS-7: i18n keys

| Key | EN | ES |
|---|---|---|
| `smartSuggestions.sourceAI` | "AI" | "IA" |
| `smartSuggestions.sourceUser` | "Your outfit" | "Tu outfit" |
| `smartSuggestions.neverWorn` | "Never worn" | "Nunca usado" |
| `smartSuggestions.lastUsed` | "Last used: {{date}}" | "Último uso: {{date}}" |
