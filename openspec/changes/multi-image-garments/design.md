# Design: Multiple Garment Images with Carousel

## Technical Approach

Add `imageUrls: string[]` to Garment model. DB adds JSONB column, FE normalizes backward-compat on read, BE accepts 2 files in create — AI + bg removal on first only. Detail screen swaps single `<Image>` for a horizontal FlatList carousel with paging dots.

## Architecture Decisions

### Decision: DB — JSONB in-place vs separate images table

| Option | Tradeoff |
|--------|----------|
| JSONB column `image_urls` | Single read, no joins, trivial backfill from `image_url`. Harder to query individually. |
| Separate `garment_images` table | Normalized, queryable per-image metadata. Requires join on every garment read. 3x more code. |

**Choice**: JSONB in-place. **Rationale**: Garments have max 2 images, no per-image metadata (no ordering, no labels). A join per garment load is unnecessary overhead. Backfill is a one-liner.

### Decision: FE carousel — FlatList vs ScrollView vs library

| Option | Tradeoff |
|--------|----------|
| FlatList `horizontal pagingEnabled` | Built-in RN, lazy rendering, `onMomentumScrollEnd` for dots. Slight overhead for 2 items. |
| ScrollView `pagingEnabled` | Simple, eager renders all children. Fine for 2 images but unbounded with future multi-image. |
| `react-native-gallery` / `rn-vertical-swiper` | Extra dependency, version churn. Overkill for 2 images. |

**Choice**: FlatList. **Rationale**: Already in the RN bundle, `pagingEnabled` works out of the box, lazy by default. ScrollView would render 2 items eagerly anyway, but FlatList is the right pattern going forward.

### Decision: Second photo UI insertion point

| Option | Tradeoff |
|--------|----------|
| After AI analysis, below first preview | Natural flow: pick → AI → form fills → "add back". Second image is decorative, not input for AI. |
| Side-by-side pickers at start | Confusing UX — user doesn't know which gets AI. Two pickers simultaneously is noisy. |
| Separate step on another screen | Adds route complexity. Unnecessary indirection for one optional field. |

**Choice**: After AI analysis, render a second picker below the first image preview. **Rationale**: Mimics the spec — "add back view" button appears once the form is populated from AI. The second image is purely visual, no analysis needed. The existing `isFormEnabled` guard in create.tsx naturally gates this.

### Decision: Fullscreen modal integration

| Option | Tradeoff |
|--------|----------|
| Single-modal with carousel state | Reuse existing `isFullscreen` + `fullscreenIndex`. Same backdrop, same close button. |
| Separate fullscreen route | New screen, back-button handling, redundant with existing modal pattern. |

**Choice**: Extend existing fullscreen modal to accept `fullscreenIndex`. **Rationale**: The current `[id].tsx` already has `<Modal visible={isFullscreen}>` with a close button and fullscreen image. We add `activeIndex` state and render the image at that index inside the same modal — zero new screens.

## Data Flow

```
Create:  pickImage(1) → AI analysis → form fills → [show second picker]
         → pickImage(2) optional → submit(2 files) → BE: upload1 + AI/bg + upload2
         → returns { imageUrls: [url1, url2] } → store: garment.imageUrls

Detail:  garment.imageUrls → FlatList carousel → tap → fullscreen(imageUrls[idx])
         → swipe changes idx → dot indicator below

Closet:  garment.image_url (backward compat alias = imageUrls[0]) → GarmentCard
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `types/index.ts` | Modify | `Garment.imageUrl` → `imageUrls: string[]`, backward-compat getter on `CreateGarmentDTO` |
| `app/garments/create.tsx` | Modify | Add second `imageUri2` state + picker after AI analysis completes |
| `app/garments/[id].tsx` | Modify | Replace `<Image>` with `FlatList` carousel, `fullscreenIndex` in modal, paging dots |
| `components/GarmentCard.tsx` | Modify | Use `image_url() ?? imageUrls[0]` — zero visual change |
| `services/garmentService.ts` | Modify | `createGarment` sends 2 files (web: 2 base64 keys, mobile: 2 FormData appends) |
| `store/garmentsStore.ts` | Modify | Optimistic garment: `imageUrls: [data.imageUrl]`, normalize from API |
| `hooks/useImagePicker.ts` | Modify | Support multiple imageUris (optional second) |
| `hooks/useGarments.ts` | No change | Pass-through, no logic change |

## Interfaces / Contracts

```typescript
// Backward-compat Garment
interface Garment {
  // ... existing fields
  imageUrl: string;    // ✅ kept — populated as imageUrls[0] by BE
  imageUrls: string[]; // 🆕 new field
}

// FE normalizer (garmentService.ts response interceptor)
function normalizeGarment(g: any): Garment {
  g.imageUrls = g.imageUrls ?? (g.imageUrl ? [g.imageUrl] : []);
  g.imageUrl = g.imageUrls[0] ?? '';
  return g;
}

// CreateGarmentDTO — BE accepts up to 2 files
// Web: { ..., imageBase64: string, image2Base64?: string }
// Mobile: FormData with 'image' and 'image2' fields
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `imageUrls ?? [imageUrl]` normalization | Pure function, test single/empty/missing |
| Unit | Store optimistic garment with `imageUrls` | Verify temp garment has correct array shape |
| Integration | Create with 1 vs 2 images | Mock service, verify FlatList renders 1 or 2 pages |
| Integration | Delete cascade | Mock BE, verify all URLs tracked |
| E2E | Full flow: pick 2 → submit → detail carousel | Detox / Maestro: capture screenshots at each step |
| E2E | Legacy garment: no `imageUrls` → shows single image | Verify old data renders without crash |

## Migration / Rollout

**Requires BE deploy first** (BE adds `image_urls` support in create/delete). FE can ship independently: old BE returns no `imageUrls` → FE normalizer uses `[imageUrl]`. No feature flag needed.

DB migration is additive only (`ADD COLUMN` + backfill) — zero-downtime, reversible via `ALTER DROP COLUMN`.

## Open Questions

None.
