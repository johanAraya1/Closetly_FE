# Tasks: Collections Cache & Marketplace Multi-Image

## Review Workload Forecast
- Estimated changed lines: 250–350
- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Collections Cache & Performance

- [x] 1.1 Import cacheService + add cache read in `getCollections`
- [x] 1.2 Replace sequential loop + 50ms delay with `Promise.all`, write to cache
- [x] 1.3 Rewrite `getCollectionById` to `GET /collections/${id}` + per-collection cache
- [x] 1.4 Cache invalidation (`clearCache`) in all 5 store mutations

## Phase 2: Marketplace Multi-Image

- [x] 2.1 `imageUrls` normalization in marketplaceService (both paginated + fallback paths)
- [x] 2.2 `ImageCarousel` component + horizontal FlatList with dots in marketplace feed
- [x] 2.3 Image carousel with dots in marketplace detail screen

## Phase 3: Verification

- [x] 3.1 `tsc --noEmit` passes (zero new errors)
- [ ] 3.2 Manual verification checklist
