# Tasks: Multiple Garment Images with Carousel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220 (FE), ~170 (BE) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | BE PR (Closetly_BE) → FE PR (Closetly_FE) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | BE: migration, entity, DTO, use-cases, controller | BE PR | Closetly_BE repo |
| 2 | FE: types, services, store, UI, verify | FE PR | Closetly_FE repo |

## Phase 1: BE — DB Migration + API (separate repo)

- [ ] 1.1 Run migration: `ALTER TABLE garments ADD COLUMN image_urls JSONB DEFAULT '[]'`, backfill data from `image_url`
- [ ] 1.2 Garment entity: add `imageUrls: string[]`, keep `imageUrl` as getter = `imageUrls[0]`
- [ ] 1.3 CreateGarmentDTO: accept up to 2 files; process first (AI + bg removal), upload second (no AI)
- [ ] 1.4 DeleteGarmentUseCase: iterate and delete ALL stored URLs before record removal
- [ ] 1.5 Controller: accept files array, respond with `imageUrls` + backward-compat `imageUrl`

## Phase 2: FE — Types, Services, Store

- [ ] 2.1 `types/index.ts`: add `imageUrls: string[]` to Garment, keep `imageUrl` backward-compat
- [ ] 2.2 `services/garmentService.ts`: add `normalizeGarment()` (`imageUrls ?? [imageUrl]`), `createGarment` sends up to 2 files
- [ ] 2.3 `store/garmentsStore.ts`: handle `imageUrls` array in optimistic garment + API normalization

## Phase 3: FE — UI Components

- [ ] 3.1 `hooks/useImagePicker.ts`: support optional second image URI (state + picker trigger)
- [ ] 3.2 `app/garments/create.tsx`: add second image picker after AI analysis, gated by `isFormEnabled`
- [ ] 3.3 `app/garments/[id].tsx`: replace `<Image>` with FlatList `horizontal pagingEnabled` + dot indicator
- [ ] 3.4 `app/garments/[id].tsx`: extend fullscreen modal with `fullscreenIndex` — shows current carousel page
- [ ] 3.5 `components/GarmentCard.tsx`: use `imageUrls?.[0] ?? imageUrl` — zero visual change

## Phase 4: Verification

- [ ] 4.1 `tsc --noEmit`: TypeScript compiles clean
- [ ] 4.2 Manual: create with 2 images → carousel shows 2 pages + dots
- [ ] 4.3 Manual: create with 1 image → single page, no swipe
- [ ] 4.4 Manual: legacy garment (no `imageUrls`) → renders single image
- [ ] 4.5 Manual: closet cards show first image only — no regression
- [ ] 4.6 Manual: fullscreen opens showing correct carousel page
