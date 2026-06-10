## Exploration: Multiple Garment Images with Carousel

### Current State

**FE (Frontend)**

Today a Garment has a single `imageUrl: string` throughout all layers:

| Layer | File | How it works today |
|-------|------|--------------------|
| Types | `types/index.ts` | `Garment.imageUrl: string`, `CreateGarmentDTO.imageUrl: string` — single string field |
| Create screen | `app/garments/create.tsx` | User picks ONE image → auto AI analyzes → form fills → creates. `useImagePicker` hook exposes single `imageUri`. No second photo option. |
| Detail screen | `app/garments/[id].tsx` | Shows a single image. Tap opens fullscreen modal. No carousel. |
| Closet list | `app/(tabs)/closet.tsx` → `components/GarmentCard.tsx` | Renders `garment.image_url` (first/only image) |
| Store | `store/garmentsStore.ts` | Optimistic `createGarment` creates temp Garment with single `imageUrl`. No multi-image handling. |
| Service | `services/garmentService.ts` | `createGarment` sends 1 image (base64 on web, FormData on mobile). `updateGarment` does NOT send image_url. `getGarments` maps `imageUrl \|\| image_url \|\| image` to single field. |
| Image picker hook | `hooks/useImagePicker.ts` | Returns single `imageUri: string \| null` |
| AI Analysis hook | `hooks/useAIAnalysis.ts` | Analyzes a single `imageUri` at a time |

**BE (Backend)**

| Layer | File | How it works today |
|-------|------|--------------------|
| Entity | `domain/entities/garment.entity.ts` | `imageUrl: string` — single field |
| Repository | `infrastructure/repositories/garment.repository.ts` | `create()` inserts `image_url`, `update()` can set `image_url`, `mapToEntity()` maps DB → entity. Single column. |
| Create Use Case | `application/use-cases/garments/create-garment.use-case.ts` | Uploads 1 file → bg removal → storage → stores single URL |
| Update Use Case | `application/use-cases/garments/update-garment.use-case.ts` | Does NOT accept imageUrl at all. No image update. |
| Delete Use Case | `application/use-cases/garments/delete-garment.use-case.ts` | Extracts single image path from URL, deletes from storage |
| DTOs | `dto/create-garment.dto.ts`, `dto/update-garment.dto.ts` | `imageUrl?: string`, `imageBase64?: string` — single image |
| Controller | `garments.controller.ts` | Handles single file from multipart or single imageUrl/imageBase64 from JSON |

**DB (Supabase)**

| Layer | How it works today |
|-------|--------------------|
| Table column | `garments.image_url TEXT` — single text column |
| Storage | Supabase bucket `garments/{userId}/{uuid}.{ext}` — one file per garment |
| Migration history | All existing migrations are additive single-column changes. No multi-image migration yet. |
| RLS | Based on `user_id` and `is_public` — unaffected by column changes |

### Affected Areas

**Frontend (FE)**

| File | Why affected |
|------|-------------|
| `types/index.ts` | `Garment.imageUrl` → `Garment.imageUrls` (or both). `CreateGarmentDTO` needs `imageUrls` field. |
| `app/garments/create.tsx` | Add a second image picker (back/dorso) after AI analysis completes. Manage multiple URIs. |
| `app/garments/[id].tsx` | Replace single `<Image>` with a carousel component that supports swipe through multiple images |
| `app/(tabs)/closet.tsx` | No change needed — still shows `imageUrls[0]` |
| `components/GarmentCard.tsx` | Change `garment.image_url` → `garment.imageUrls?.[0] \|\| garment.image_url` (backward compat) |
| `store/garmentsStore.ts` | Optimistic create maps `imageUrls` array. Update may need to handle adding/removing images. |
| `services/garmentService.ts` | `createGarment` may need to upload multiple images. Response mapping normalizes `imageUrls` array. |
| `hooks/useImagePicker.ts` | May need multi-pick variant or be called multiple times for multiple slots |

**Backend (BE)**

| File | Why affected |
|------|-------------|
| `domain/entities/garment.entity.ts` | `imageUrl: string` → `imageUrls: string[]` |
| `domain/repositories/garment.repository.interface.ts` | Interface change for return types |
| `infrastructure/repositories/garment.repository.ts` | DB mapping: `image_url` → `image_urls` (JSONB or array). `create()`/`update()` handle array. |
| `application/use-cases/garments/create-garment.use-case.ts` | Accept multiple files (or call existing upload in a loop). First image → AI analysis. Second image → additional upload. |
| `application/use-cases/garments/update-garment.use-case.ts` | Accept `imageUrls` array for adding/removing images |
| `application/use-cases/garments/delete-garment.use-case.ts` | Delete ALL images from storage, not just one |
| `infrastructure/modules/garments/dto/create-garment.dto.ts` | Accept multiple images |
| `infrastructure/modules/garments/dto/update-garment.dto.ts` | Accept `imageUrls` for update |
| `infrastructure/modules/garments/garments.controller.ts` | Handle multiple file uploads |
| All use case spec files | Update test mocks and expectations |

**DB/Supabase**

| File | Why affected |
|------|-------------|
| `supabase-setup.sql` | New `image_urls` column or new table |
| New migration file | Add column, migrate data, update storage |
| Storage | Multiple files per garment in storage bucket |

**Tests**

| File | Why affected |
|------|-------------|
| `create-garment.use-case.spec.ts` | Update mocks, multi-image scenarios |
| `update-garment.use-case.spec.ts` | Update mocks |
| `get-garments.use-case.spec.ts` | Update test garment factory |
| `garment.repository.spec.ts` | Update mapping tests |

### Approaches

#### BE — Database & Storage

1. **JSONB array column — `image_urls JSONB[]`**
   - Pros: Single column change, no join needed, Supabase natively supports JSONB, existing `image_url` can be deprecated
   - Cons: JSONB queries are slightly less ergonomic than normalized tables, cannot easily index individual URLs
   - Effort: Low (add column, migrate data, update repository mapper)

2. **Separate `garment_images` table**
   - `garment_images(id, garment_id, url, position, created_at)`
   - Pros: Proper normalization, can add metadata per image (label: "front"/"back", width, height), independently indexable
   - Cons: Requires JOIN on reads, more complex CRUD, new repository + entity + migration
   - Effort: Medium-High

#### BE — Create/Update flow

1. **Sequential uploads in same `POST /garments`**
   - Accept multiple files in multipart array, upload all in sequence, store array
   - Pros: Single request, atomic. User can add 2nd photo before submit.
   - Cons: Increases request size/time, may hit serverless timeout limits
   - Effort: Medium

2. **Separate endpoint for additional images (`POST /garments/:id/images`)**
   - Create sends first image as today. Then `POST /garments/:id/images` adds more.
   - Pros: Decoupled, easier to handle individually, better UX for "add later"
   - Cons: Requires two API calls, need to handle partial state (garment created but images not yet uploaded)
   - Effort: Medium

#### FE — Create screen (second photo)

1. **Inline second picker after AI analysis**
   - After AI fills form, show a second image slot with "Add back view" button. User sees both image previews.
   - Pros: Clear UX, user can see both images before submit
   - Cons: More complex state management on create screen
   - Effort: Medium

2. **Post-creation edit to add second image**
   - Create works as today with one image. After success, user can edit garment to add second image via `updateGarment`.
   - Pros: Minimal change to create screen, reuses existing edit flow
   - Cons: Worse UX (extra step), user must know to go edit
   - Effort: Low

#### FE — Detail screen (carousel)

1. **FlatList horizontal carousel**
   - Use React Native `FlatList` with `horizontal`, `pagingEnabled`, and `onViewableItemsChanged` for dot indicators
   - Pros: Zero dependencies, native performance, already in RN core
   - Cons: Extra code for page dots & animations
   - Effort: Low-Medium

2. **Third-party carousel library (e.g., `nested-carousel`, `react-native-swiper`)**
   - Pros: Drop-in solution with dots, gestures, zoom built-in
   - Cons: Extra dependency, potential maintenance risk
   - Effort: Low

#### DB Migration

1. **In-place column migration**
   - `ALTER TABLE garments ADD COLUMN image_urls JSONB DEFAULT '[]'`; then backfill `image_urls = jsonb_build_array(image_url)` for existing rows
   - Pros: Simple, no data move or storage changes needed for old records
   - Cons: Old `image_url` column becomes redundant but safe to keep
   - Effort: Low

2. **Soft migration with backward compat**
   - Keep `image_url` populated as the first image for backward compat. Add `image_urls` as the source of truth. Write both on create.
   - Pros: No breaking changes, old clients still work
   - Cons: Data duplication, need to keep in sync
   - Effort: Low

### Recommendation

Go with the **JSONB array column** approach for DB (approach 1), **sequential uploads in same POST** for BE (approach 1), **inline second picker** for FE create (approach 1), **FlatList carousel** for FE detail (approach 1), and **in-place migration with backward compat** (approach 1 for migration, keeping `image_url` populated from `image_urls[0]` for backward compat).

Rationale:
- JSONB is the least invasive DB change — single column, no joins, Supabase native support
- Sequential uploads keep the creation atomic while letting backend handle multi-file processing
- Inline second picker gives the cleanest UX (user sees both images before submitting)
- FlatList carousel avoids dependency bloat and is already available
- Keeping `image_url` populated from `image_urls[0]` means closet cards (**which only show the first image anyway**) require zero logic changes

### Risks

- **Storage cost**: Multiple images per garment means 2x storage per garment. Existing single-image garments stay unchanged.
- **Background removal**: Currently runs on the single uploaded image. For multi-image, should it run on all images or only the first (front) one? This needs explicit product decision.
- **Delete logic**: `DeleteGarmentUseCase` currently extracts one path from one URL. Must be updated to iterate all URLs and delete all storage files.
- **API backward compatibility**: Existing mobile app versions send `imageUrl` as single string. The BE must handle both `imageUrl` (old) and `imageUrls` (new) during a transition period.
- **Migration zero downtime**: Adding a JSONB column with a default is safe in PostgreSQL but backfilling 10k+ records could cause lock contention.
- **Supabase Storage path uniqueness**: Current path pattern `{userId}/{uuid}.{ext}` already has unique UUIDs per file, so multiple files per garment will work with unique UUIDs.

### Ready for Proposal

Yes — the exploration is complete. The feature is well-understood across all layers. Recommend the orchestrator moves to proposal phase with the JSONB + inline second picker + FlatList approach.
