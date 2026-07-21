# Spec: Collections Cache & Marketplace Multi-Image

## Overview

Two independent frontend-only improvements: collections loading performance (cache + parallel fetches) and marketplace multi-image display (carousel). Both are already implemented and verified — this spec documents the expected behavior for traceability.

## Capabilities

### `collections-performance`

**Description**: Speed up collections loading via read-through cache (AsyncStorage, 5min TTL), parallelized outfit fetches, and direct single-collection API calls. Cache is invalidated on every mutation.

**Scenarios**:

1. **Collections load from cache**
   > Given the user has loaded collections at least once in the last 5 minutes
   > When they navigate to the Collections tab
   > Then `getCollections` returns data from cache without making any API calls
   > And the response time is <50ms (AsyncStorage read)

2. **Collections load from API (cache miss)**
   > Given the user has NOT loaded collections in the last 5 minutes (or cache is empty)
   > When they navigate to the Collections tab
   > Then `getCollections` calls `GET /collections?userId={id}`
   > And fetches all outfit images in parallel via `Promise.all`
   > And writes the result to cache with 5min TTL
   > And no 50ms artificial delay is applied between fetches

3. **Single collection loaded by ID**
   > Given the user opens a specific collection
   > When `getCollectionById(id)` is called
   > Then it calls `GET /collections/{id}` (NOT filtering all collections)
   > And fetches outfits for that collection only

4. **Cache is invalidated on mutation**
   > Given the user performs ANY of these actions: add outfit to collection, remove outfit from collection, create collection, delete collection, update collection
   > When the mutation is dispatched from the store
   > Then `clearCache(CACHE_KEYS.COLLECTIONS)` is called before the API request
   > And the next collection load fetches fresh data

5. **Cache error does not block the user**
   > Given AsyncStorage is unavailable or throws an error
   > When `getCollections` or `getCollectionById` is called
   > Then the error is caught silently
   > And the data is fetched fresh from the API
   > And the user sees the collections with no interruption

### `marketplace-multi-image`

**Description**: Show multiple garment images (front + back) in the marketplace feed and detail screens using a horizontal carousel with dot indicators.

**Scenarios**:

1. **Single image displays normally**
   > Given a garment has exactly one image (no `imageUrls` array, only `image_url`)
   > When it appears in the marketplace feed or detail screen
   > Then it displays as a single image with no carousel dots

2. **Multiple images show as swipeable carousel**
   > Given a garment has 2+ images in `imageUrls`
   > When it appears in the marketplace feed or detail screen
   > Then the images are displayed in a horizontal FlatList with pagingEnabled
   > And dot indicators show the current position
   > And the user can swipe left/right to view images

3. **imageUrls normalization**
   > Given an API response with `image_urls` array (camelCase or snake_case)
   > When `marketplaceService` normalizes the garment data
   > Then `imageUrls` is populated correctly as a string array
   > And fallback to `[image_url]` when no array is present

4. **No images does not crash**
   > Given a garment has no images at all (`image_url` is null/undefined and `imageUrls` is empty)
   > When it appears in the marketplace feed or detail screen
   > Then no carousel is rendered
   > And the UI does not crash

## Non-Goals (Explicitly Out of Scope)

- Backend changes (pre-populated outfits endpoint, image upload changes)
- Fullscreen image modal for marketplace
- Pagination for collections list
- Animated transitions between carousel images
- Pinch-to-zoom on marketplace images

## Quality Attributes

| Attribute | Target | Verification Method |
|-----------|--------|-------------------|
| Collections load time (cold) | <2s for 5 collections × 3 outfits | Manual (console.time or Network tab) |
| Collections load time (cached) | <50ms | Manual |
| Cache invalidation correctness | Mutation → stale cache cleared | Manual (check network after mutation) |
| TypeScript | Zero new errors | `npx tsc --noEmit` |
