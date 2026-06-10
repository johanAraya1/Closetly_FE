# Exploration: Suggestions Dedup + Max 3 Different

## Current State

The dashboard (home screen) fetches outfit suggestions from `GET /outfits/suggestions` via `suggestionsStore.fetchSuggestions()`. The BE returns a `SuggestionsResponse` with `suggestions: Suggestion[]`. Each `Suggestion` has:

```typescript
interface Suggestion {
  name: string;
  occasion: string;
  description: string;
  garmentIds: string[];  // which garments compose this suggestion
  reasoning: string;
}
```

The home screen renders ALL suggestions in a horizontal ScrollView carousel. **There is zero dedup logic** — not in the store, not on the screen. If the BE returns the same outfit twice (same set of `garmentIds`), the user sees duplicates.

The BE uses Gemini (AI) to generate suggestions based on weather/location and the user's garments. The FE just stores and displays whatever the API returns.

**Flow:**
1. `HomeScreen` mounts → `fetchSuggestions()` called
2. `suggestionsStore` calls `apiClient.get<SuggestionsResponse>('/outfits/suggestions?lat=...&lon=...&locale=...')`
3. Response stored as `suggestions: result.data.suggestions`
4. Screen renders `suggestions.length > 0 && suggestions.map(...)` — no limit, no dedup

## Affected Files

| File | Why |
|------|-----|
| `store/suggestionsStore.ts` | Where suggestions are stored; no dedup logic after fetch |
| `app/(tabs)/home.tsx` | Renders suggestions carousel; no max-3 enforcement |
| `types/index.ts` | `Suggestion` type (no dedup key/comparator) |

## Approaches

### 1A. FE-side dedup + limit (Recommended)

Add dedup in `suggestionsStore` right after receiving `result.data.suggestions`:

```typescript
// Dedup by sorted garmentIds.join(',')
const unique = new Map<string, Suggestion>();
for (const s of suggestions) {
  const key = [...s.garmentIds].sort().join(',');
  if (!unique.has(key)) unique.set(key, s);
}
set({ suggestions: Array.from(unique.values()).slice(0, 3) });
```

**Pros:**
- No BE changes needed
- Immediate fix, works with current API
- Preserves first occurrence, drops duplicates
- Can be done in the store alone

**Cons:**
- BE still wastes compute generating duplicates
- If BE returns 10 suggestions and 3 are unique, user sees all 3; no fallback to request more

**Effort:** Low — ~10 lines in `suggestionsStore.ts`

### 1B. BE-side dedup

Fix the NestJS `/outfits/suggestions` endpoint to return unique `garmentIds` combinations and enforce max 3 on the server.

**Pros:**
- BE is the source of truth
- No wasted AI compute on duplicates
- Cleaner API contract

**Cons:**
- Requires changes in separate `Closetly_BE` repo
- Slower to deploy (FE + BE coordination)
- Can't be rolled out independently

**Effort:** Medium (BE changes + FE may still need fallback)

## Recommendation

**Approach 1A — FE-side dedup.** It's a 10-line change that solves the problem immediately. The BE dedup can be done later as an optimization. The FE should always be resilient to duplicate data regardless of BE behavior.

## Risks

- Dedup key (`garmentIds.sort().join(',')`) assumes identical garment combinations = same outfit. If BE returns suggestions with same garments but different names/reasoning, dedup drops the extras. This is actually the desired behavior based on the requirements.
- If BE returns more than 3 unique suggestions, the first 3 are shown. There's no "load more" for suggestions.
- The slice to 3 should happen AFTER dedup, not before.
