# Design: Collections Cache & Marketplace Multi-Image

## Technical Approach

Two independent frontend-only improvements in a single PR (~300 lines):

1. **Collections Performance** — Wire existing `cacheService` (AsyncStorage, 5min TTL) into `collectionService.ts`. Remove 50ms delay, parallelize outfit fetches with `Promise.all`, fix `getCollectionById` to use `GET /collections/:id`, invalidate cache on mutations.

2. **Marketplace Multi-Image** — Normalize `imageUrls` in `marketplaceService.ts`. Port the proven carousel (FlatList horizontal + dots) from `app/garments/[id].tsx` into marketplace feed and detail screens.

## Architecture Decisions

| Choice | Alternatives | Rationale |
|--------|-------------|-----------|
| Read-through cache with TTL invalidation | ETag (needs BE changes), in-memory only | `cacheService.ts` exists with `CACHE_KEYS.COLLECTIONS` unused. AsyncStorage persists across sessions. 5min TTL matches existing `CACHE_DURATION`. |
| `Promise.all` for outfit fetches (not batches) | Batched sequential, staggered delays | Collections are small (3-8). Codebase already uses `Promise.all` in garments detail (line 125). The 50ms delay was a sequential workaround — parallel eliminates it. |
| Copy carousel pattern (no shared component) | Extract `<ImageCarousel>` | Only 2 usage sites with different contexts (feed card vs full-width detail). Extract later if a third appears. |
| Normalize `imageUrls` in service layer | Store-level or component-level | Follows existing `image_url` normalization pattern (marketplaceService line 48). `Garment` type already has `imageUrls?: string[]`. |

## Data Flow

```
── Collections Read Path ──

loadCollections(userId)
  → checkCache(CACHE_KEYS.COLLECTIONS) ──hit──→ return cached
  └── miss → GET /collections?userId=X
         → Promise.all(GET /collections/:id/outfits)  ← parallel
         → setCache(CACHE_KEYS.COLLECTIONS)
         → return data

loadCollectionById(id, userId)
  → checkCache(CACHE_KEYS.COLLECTION)  ← per-collection key
  └── miss → GET /collections/:id  ← was: fetch-all-then-find
         → Promise.all(outfit.garmentIds → GET /garments/:id)
         → setCache(CACHE_KEYS.COLLECTION)
         → return data

── Collections Write Path (cache invalidation) ──

create / delete / addOutfit / removeOutfit
  → clearCache(CACHE_KEYS.COLLECTIONS) → re-fetch (existing)

── Marketplace Multi-Image ──

getPublicGarments() normalizes:
  item.imageUrls = item.image_urls || item.imageUrls || []  ← NEW

Feed card: images.length > 1 → FlatList carousel + dots
           images.length = 1 → existing <Image> (unchanged)
Detail screen: same logic, full-width
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `services/cacheService.ts` | Modify | Add `COLLECTION: 'cache_collection'` to `CACHE_KEYS` |
| `services/collectionService.ts` | Modify | Import cacheService. Cache read/write in `getCollections`/`getCollectionById`. Remove 50ms delay. Parallelize. Fix `getCollectionById` to `GET /collections/:id`. |
| `store/collectionsStore.ts` | Modify | Import `clearCache`. Call in `createCollection`, `deleteCollection`, `addOutfitToCollection`, `removeOutfitFromCollection` after success. |
| `services/marketplaceService.ts` | Modify | Add `imageUrls` normalization in both paginated and fallback paths. |
| `app/(tabs)/marketplace.tsx` | Modify | Add FlatList carousel + dots in `renderItem`. Add `SCREEN_WIDTH`, `currentImageIndex` state, carousel ref. |
| `app/marketplace/[id].tsx` | Modify | Replace single `<Image>` with FlatList carousel + dots. Add carousel state and styles. |

**0 new files, 6 modified files.**

## Interfaces / Contracts

No new types needed. `Garment.imageUrls?: string[]` already exists (types/index.ts:84). One new cache key:

```typescript
// services/cacheService.ts — add to CACHE_KEYS
COLLECTION: 'cache_collection',  // single-collection detail cache
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type Check | `tsc --noEmit` passes | Automated |
| Manual: Cache | Hit on second load, miss on fresh start, invalidation after mutation | Network tab observation |
| Manual: Performance | Parallel fetches visible, no 50ms gaps | Network tab waterfall |
| Manual: Carousel Feed | Dots show for multi-image, swipe works, single-image unchanged | Visual inspection |
| Manual: Carousel Detail | Full-width carousel with dots | Tap multi-image garment |

No test runner in this project. Verification: manual + `tsc --noEmit`.

## Migration / Rollout

No migration. Backend already supports `GET /collections/:id` and `image_urls` JSONB. Cache is additive — clearing AsyncStorage removes stale entries gracefully.

## Open Questions

- None.
