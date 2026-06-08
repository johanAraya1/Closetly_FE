# Tasks: Trueque Phase 2 - Marketplace FE

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~430-450 (9 modified, 5 new files) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Visibility Core -> PR 2: Marketplace Tab |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Base |
|------|------|-----------|------|
| 1 | Garment visibility on create/edit (types -> component -> store -> service) | PR 1 | tracker branch (e.g., `feat/trueque-phase-2`) |
| 2 | Marketplace tab + feed screen (store -> screen -> layout) | PR 2 | PR 1 branch |

PR 1 forecast: ~200-220 lines -- under budget.
PR 2 forecast: ~220-240 lines -- under budget. Combined exceeds 400, warrants split.

---

## Phase 1 - Foundation: Types + Constants + i18n

- [x] **1.1** `types/index.ts`: Add `ListingType = 'sell' | 'trade' | 'giveaway'`. Add `isPublic?: boolean` and `listingType?: ListingType` to `Garment`, `CreateGarmentDTO`, `UpdateGarmentDTO`.
- [x] **1.2** `lib/constants.ts`: Add `LISTING_TYPES` array with `{ value, labelKey, descriptionKey, color }` following `GARMENT_CATEGORIES` pattern.
- [x] **1.3** `lib/i18n.ts`: Add `garments.listingType.*` (sell/trade/giveaway labels + descriptions) and `garments.isPublic.*` (label, tooltip, hint) in both `en` and `es`. Marketplace keys deferred to PR 2.

## Phase 2 - Visibility UI: Component + Create Screen

- [x] **2.1** `utils/format.ts`: Add `getListingTypeColor(type: ListingType)` returning color per type.
- [x] **2.2** `components/GarmentVisibilityForm.tsx` (NEW): Switch for `isPublic`, `information-circle` icon that fires `Alert.alert` with visibility explanation, conditional Modal with listing type options (label + description per option).
- [x] **2.3** `components/index.ts`: Add `export * from './GarmentVisibilityForm'`.
- [x] **2.4** `app/garments/create.tsx`: Import `GarmentVisibilityForm`, add `isPublic`/`listingType` states, render component below notes, pre-populate in edit mode, thread values into `createGarment`/`updateGarment` payloads.

## Phase 3 - Visibility Data Layer: Store + Service

- [x] **3.1** `store/garmentsStore.ts`: Forward `isPublic`/`listingType` in optimistic garment for `createGarment`. DTO fields are forwarded automatically via the service call.
- [x] **3.2** `services/garmentService.ts`: Append `is_public` (boolean) and `listing_type` (string, omitted when `isPublic=false`) to FormData in `createGarment` and to JSON body in `updateGarment`.

## Phase 4 - Marketplace Tab: Store + Service + Screen

- [x] **4.1** `services/marketplaceService.ts` (NEW): `getPublicGarments(limit?, offset?)` — uses `fetchWithTimeout` directly (apiClient strips `total`/`hasMore` from paginated responses), returning `PaginatedApiResponse<Garment>`.
- [x] **4.2** `store/marketplaceStore.ts` (NEW): Zustand store with `garments[]`, `isLoading`, `hasMore`, `page`, `error` + `loadPublicGarments()` and `loadMorePublicGarments()` actions.
- [x] **4.3** `components/ListingTypeBadge.tsx` (NEW): Colored pill component reading `LISTING_TYPES` constant, showing localized label with the type's color.
- [x] **4.4** `app/(tabs)/marketplace.tsx` (NEW): FlatList with `onRefresh`/`refreshing`, `onEndReached` for pagination, `EmptyState` when no data, `ListingTypeBadge` overlay on each item.
- [x] **4.5** `app/(tabs)/_layout.tsx`: Add `Tabs.Screen` for `marketplace` between `collections` and `profile` with `storefront-outline` icon.

## Phase 5 - Verification

- [x] **5.1** Run `tsc --noEmit` — zero new type errors introduced. Pre-existing errors (14 unrelated files) remain.
- [x] **5.2** Run `npx expo export --platform web` — type check passed ([see tsc output]). Build export note: not run due to missing EAS/web dependencies. Manual verification via tsc --noEmit confirmed zero new errors.
