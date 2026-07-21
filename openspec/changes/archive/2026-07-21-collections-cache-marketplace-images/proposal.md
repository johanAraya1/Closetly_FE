# Proposal: Collections Cache & Marketplace Multi-Image

## Intent

Two independent UX improvements bundled in one PR (under 400 lines):

1. **Collections loading is painfully slow** — `getCollections()` runs N sequential outfit fetches with a 50ms artificial delay each. `getCollectionById()` fetches ALL collections just to find one. The existing `cacheService.ts` has `CACHE_KEYS.COLLECTIONS` defined but is never used. For 5 collections × 3 outfits each, this means ~6–22 sequential API calls.

2. **Marketplace ignores multi-image data** — Backend already returns `image_urls` (JSONB, up to 2 images: front + back). `marketplaceService.ts` only normalizes `image_url`, discarding `imageUrls`. The marketplace feed and detail screens show a single image. Meanwhile, `app/garments/[id].tsx` already has a working FlatList carousel with dot indicators.

## Scope

### In Scope
- Remove 50ms artificial delay between outfit fetches
- Parallelize outfit fetches in `getCollections` using `Promise.all`
- Add cache read/write (5min TTL) via existing `cacheService` in `getCollections` and `getCollectionById`
- Fix `getCollectionById` to call `GET /collections/:id` instead of fetching all collections then `.find()`
- Invalidate cache on mutations (add/remove outfit, create, delete) in `collectionsStore.ts`
- Normalize `imageUrls` array in `marketplaceService.ts` from API response
- Add horizontal FlatList carousel with dot indicators in marketplace feed and detail screens

### Out of Scope
- Backend changes (pre-populated outfits endpoint) — deferred
- Pagination for collections list — deferred
- Fullscreen image modal for marketplace — deferred

## Capabilities

### New Capabilities
- `collections-performance`: Cache layer (AsyncStorage, 5min TTL), parallelized outfit fetches, single-collection endpoint, cache invalidation on mutations
- `marketplace-multi-image`: Normalize `imageUrls` from backend response, horizontal image carousel with dot indicators in feed and detail screens

### Modified Capabilities
None — these are additive behaviors with no existing spec-level requirements changed.

## Approach

- **Collections**: Read-through cache pattern — check cache first, fetch from API on miss, write back. `Promise.all` replaces sequential loop. `getCollectionById` switches to `GET /collections/:id` (backend already supports it). Cache invalidated via `clearCache(CACHE_KEYS.COLLECTIONS)` in store mutations.
- **Marketplace**: Extract `imageUrls` (or `image_urls`) array in service normalization. Port carousel pattern from `app/garments/[id].tsx` (FlatList horizontal + pagingEnabled + dot indicators) into feed card and detail screen.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/collectionService.ts` | Modified | Remove delay, parallelize, add cache read/write, fix getCollectionById |
| `store/collectionsStore.ts` | Modified | Invalidate collections cache on mutations |
| `services/marketplaceService.ts` | Modified | Normalize `imageUrls` array from response |
| `app/(tabs)/marketplace.tsx` | Modified | Add image carousel with dots in feed cards |
| `app/marketplace/[id].tsx` | Modified | Add image carousel with dots in detail view |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cache serves stale data after add/remove outfit | Low | Invalidate `CACHE_KEYS.COLLECTIONS` on every mutation |
| `GET /collections/:id` endpoint behaves differently than expected | Low | Already used in `addOutfitToCollection` flow — backend supports it |
| Carousel FlatList performance in feed (many items) | Low | Only renders 1–2 images per card; pattern proven in garments detail |

## Success Criteria

- [ ] `getCollections` for 5 collections × 3 outfits completes in <2s (vs 6–22 sequential calls)
- [ ] Cache hit on second load returns data without API calls
- [ ] `getCollectionById` makes 1 API call (not N+1)
- [ ] Marketplace feed shows front+back images with swipeable dot indicators
- [ ] Marketplace detail screen shows front+back images with dots
- [ ] `tsc --noEmit` passes with zero errors
