# Proposal: Multiple Garment Images with Carousel

## Intent

Users need to show both front and back garment views. Currently limited to one image — no way to display both sides. This adds a second photo slot to create and a carousel to detail.

## Scope

### In Scope
- DB: JSONB `image_urls` column + backfill
- BE: Accept 2 files in create, AI + bg removal on first only, delete all on removal
- FE: `Garment.imageUrls: string[]` + backward-compat `imageUrl` getter
- FE create: Second image slot after AI (purely visual)
- FE detail: Horizontal FlatList carousel with paging dots

### Out of Scope
- AI on second image, editing/reordering, BE `updateGarment` image changes

## Capabilities

### New Capabilities
- `garment-images`: Multi-image storage, upload, display across create + detail flows

### Modified Capabilities
None — existing specs reference `imageUrl` which stays populated as backward-compat alias.

## Approach

1. **DB**: Add `image_urls JSONB DEFAULT '[]'`, backfill, keep `image_url` written for backward compat
2. **BE**: Accept `files` array; upload first → AI + bg removal → upload second (no AI); delete iterates all URLs
3. **FE create**: First picker + AI as today; after form fills, show optional second picker slot
4. **FE detail**: Replace `<Image>` with `FlatList horizontal pagingEnabled` + dot indicator
5. **FE closet/GarmentCard**: Zero changes — reads `imageUrls[0]` via alias

## Affected Areas

| Area | Impact |
|------|--------|
| `types/index.ts` | Modified: `imageUrls: string[]` + backward-compat getter |
| `app/garments/create.tsx` | Modified: second image slot after AI analysis |
| `app/garments/[id].tsx` | Modified: carousel with dots |
| `services/garmentService.ts` | Modified: upload multiple files |
| `store/garmentsStore.ts` | Modified: optimistic `imageUrls` array |
| BE entity/DTO/repo/use-case/controller | Modified: array fields + multi-file |
| DB migration | New: `image_urls JSONB` + backfill |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Request timeout with 2 images | Low | Sequential uploads, BE timeout configured |
| Old BE returns no `imageUrls` | Low | FE normalizes `imageUrls ?? [imageUrl]` |
| Storage doubles per garment | Low | Acceptable; existing garments unchanged |

## Rollback Plan

Drop `image_urls` column (data safe in `image_url`); revert BE/FE code. No data loss.

## Dependencies

- BE deploy with `image_urls` support in create/delete endpoints

## Success Criteria

- [ ] Create flow allows second image upload after AI analysis
- [ ] Detail shows carousel with dots for 2+ images, single image for 1
- [ ] Closet cards show first image — zero regression
- [ ] Old `image_url`-only garments display correctly everywhere
- [ ] Deleting removes both storage files
- [ ] `tsc --noEmit` passes
