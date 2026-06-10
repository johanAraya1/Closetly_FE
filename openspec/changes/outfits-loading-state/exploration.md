# Exploration: Loading State on Outfits First Load

## Current State

**The bug:** When first navigating to the outfits screen, the `<EmptyState>` ("no outfits") flashes briefly before the loading skeleton appears.

**Root cause:** The `outfitsStore` initial state has `isLoading: false`:

```typescript
const initialState = {
  outfits: [],
  isLoading: false,   // <-- this
  isLoadingMore: false,
  // ...
};
```

**Render sequence:**
1. First render (before `useEffect` fires): `isLoading=false`, `outfits=[]`
   - Line 166: `if (isLoading && outfits.length === 0)` → **false** (skips skeleton)
   - Falls through to main return
   - Line 313: `if (filteredAndSortedOutfits.length === 0)` → **true** (shows `<EmptyState>`)

2. `useOutfits` hook's `useEffect` fires → calls `loadOutfits(userId)`
   - Store sets `isLoading: true`
   - Re-render: skeleton appears

3. API resolves → store sets `isLoading: false`, populates `outfits`
   - Re-render: outfit grid or actual empty state

So there's a flash of the empty state between steps 1 and 2.

**Important:** The screen ALREADY has a well-designed skeleton UI (lines 166-205 in `app/outfits/index.tsx`) — `SkeletonCard` placeholders for images, text, filters. The skeleton just never shows because `isLoading` starts as `false`.

## Affected Files

| File | Why |
|------|-----|
| `store/outfitsStore.ts` | Initial `isLoading: false` is the root cause |
| `app/outfits/index.tsx` | Loading check at line 166; could add separate `initialLoading` check |
| `store/garmentsStore.ts` | Same pattern, same bug (for consistency) |

## Approaches

### 2A. Change initial state to `isLoading: true`

```typescript
const initialState = {
  outfits: [],
  isLoading: true,   // changed from false
  // ...
};
```

**Pros:**
- 1-character change in `outfitsStore.ts`
- First render shows skeleton immediately
- No other code changes needed

**Cons:**
- Any consumer that reads `isLoading` before the first load will see `true`. Currently only `app/outfits/index.tsx` and `app/(tabs)/home.tsx` use it. Both check `isLoading && outfits.length === 0` so it's safe.
- If the store is reset (e.g., logout), `isLoading` goes back to `true` briefly. Acceptable.

**Effort:** Low — 1 line change

### 2B. Add explicit `initialLoading` / `hasLoaded` flag

Add a separate `hasLoaded: boolean` to the store. Start at `false`, set to `true` after first successful load. Screen checks `!hasLoaded && isLoading && outfits.length === 0` for skeleton.

**Pros:**
- More explicit semantics
- No risk of affecting other consumers

**Cons:**
- More boilerplate — new state, new action, updates in `loadOutfits`, `loadOutfitsById`, `resetStore`
- The current behavior is identical in practice for all existing consumers

**Effort:** Medium

## Recommendation

**Approach 2A — 1-line change to `isLoading: true` in `outfitsStore.ts`.**

It fixes the bug, it's the simplest change, and every current consumer already guards with `isLoading && outfits.length === 0` so there's no regression risk. Also apply the same fix to `garmentsStore.ts` for consistency.

## Risks

- If a future consumer reads `isLoading` in isolation (without `&& outfits.length === 0`), they'd see `true` on first render. Mitigation: the pattern `isLoading && data.length === 0` is used everywhere.
- The `loadOutfits` method sets `isLoading: true` at the start. If initial state already has `true`, loading spinners during re-fetch still work correctly — `loadOutfits` will set `true` again (redundant but harmless).
