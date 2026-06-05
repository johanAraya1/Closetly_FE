# SDD Project Context — Closetly

**Status**: Initialized
**Date**: 2026-06-04
**Mode**: Local file persistence (Engram unavailable)
**Strict TDD**: ❌ Disabled (no test runner on FE)

---

## Project Overview

| Field | Value |
|---|---|
| Name | Closetly |
| FE Path | `D:\Documentos\Johan\Proyectos\Closetly_FE\Closetly_FE` |
| BE Path | `D:\Documentos\Johan\Proyectos\Closetly_BE\Closetly_BE` |
| FE Repo | Private, no remote detected |
| BE Repo | Private, no remote detected |
| Description | Virtual closet app — manage garments, outfits, collections with AI-assisted tagging |

---

## Frontend Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.73 |
| Expo SDK | ~50.0.0 |
| Language | TypeScript 5.3.3 (strict) |
| Navigation | expo-router ~3.4.0 (file-based) |
| State Management | zustand ^4.4.7 |
| Auth | Custom (JWT + SecureStore) |
| HTTP | `fetchWithTimeout` wrapper |
| i18n | i18n-js ^4.5.1 |
| Styling | Tailwind CSS (NativeWind) + StyleSheet |
| Image | expo-image-picker, expo-image-manipulator |
| Icons | @expo/vector-icons (Ionicons) |

## Backend Stack

| Layer | Choice |
|---|---|
| Framework | NestJS 10 |
| Architecture | Clean Architecture (Domain/Application/Infrastructure) |
| Language | TypeScript 5.3.3 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT (passport-jwt) |
| Storage | Supabase Storage |
| AI | Google Gemini 2.5 Flash |
| Validation | class-validator + class-transformer |
| Security | helmet, rate limiting (ThrottlerModule) |
| Deploy | Vercel |

---

## Project Structure (FE)

```
Closetly_FE/
├── app/                    # expo-router pages
│   ├── _layout.tsx         # Root layout (auth guard)
│   ├── index.tsx           # Entry point
│   ├── (auth)/             # Auth group (onboarding, login, register)
│   ├── (tabs)/             # Main tabs (home, closet, outfits, collections, profile)
│   ├── garments/
│   │   └── create.tsx      # Create/edit garment screen
│   ├── collections/
│   ├── outfits/
│   ├── admin/
│   └── settings.tsx
├── components/             # Reusable UI (16 files, barrel export via index.ts)
├── hooks/                  # Custom hooks (9 files)
├── store/                  # Zustand stores (4 files)
├── services/               # API service layer (9 files)
├── utils/                  # Utilities (9 files)
├── lib/                    # Constants, i18n config
├── types/                  # TypeScript types/entities
├── contexts/               # React contexts (ThemeContext)
├── assets/                 # Static assets
```

## Architecture Pattern (FE)

```
Screen → Hook → Zustand Store → Service → fetch() → Backend API
```

- **Screen**: Page component (ex: `app/garments/create.tsx`)
- **Hook**: Wraps store + auth (ex: `useGarments`, `useAuth`)
- **Store**: Zustand, optimistic updates with rollback (ex: `garmentsStore`)
- **Service**: HTTP calls via `apiClient` or raw `fetchWithTimeout` (ex: `garmentService`)
- **Types**: Domain models + DTOs in `types/index.ts`

---

## Conventions

### File Naming
- camelCase for files: `garmentService.ts`, `useGarments.ts`, `authStore.ts`
- PascalCase for components: `Button.tsx`, `GarmentCard.tsx`
- TypeScript extensions: `.ts` (logic), `.tsx` (JSX)

### Naming Patterns
- Services: `*Service.ts` — functions, not classes
- Stores: `*Store.ts` — `use*Store` zustand hooks
- Hooks: `use*.ts` — custom React hooks
- Types: PascalCase interfaces, type aliases
- DTOs: `Create*DTO`, `Update*DTO` suffix

### Code Style
- Spanish JSDoc comments in services/hooks/stores
- English type definitions and DTOs
- `ApiResponse<T>` pattern: `{ data?: T; error?: string }`
- Error handling: service returns `ApiResponse`, store handles state/error
- Input sanitization via `@/utils/sanitize` on user-facing fields

### Path Aliases
- `@/` → project root
- `@components/`, `@hooks/`, `@services/`, `@store/`, `@lib/`, `@utils/`, `@types/`

### Route Groups
- `(auth)/` — unauthenticated screens
- `(tabs)/` — main authenticated tabs

---

## Garment Creation Flow

### Frontend Flow
```
1. User opens /garments/create
2. Selects/takes photo (useImagePicker → pickImageFromGallery / takePhoto)
3. Image auto-analyzed by AI (useAIAnalysis → POST /api/ai/analyze-garment)
4. AI fills: name, category, color, brand, season, description (confidence-based)
5. User reviews/edits form fields
6. Submit → store.garmentsStore.createGarment() → service.garmentService.createGarment()
7. Service builds FormData with fields + image
8. POST to /api/garments (multipart/form-data)
9. Optimistic update in store: temp ID → real garment on success
10. Success/error modals shown
```

### Backend Flow
```
1. garments.controller.ts — POST /api/garments
   - Guards: SupabaseAuthGuard (JWT validation)
   - Accepts multipart (file) OR JSON (imageUrl)
   - Validates with CreateGarmentDto (class-validator)
   - Normalizes season via NormalizeSeasonPipe ('all-season' → 'all_season')

2. create-garment.use-case.ts
   - If file: uploads to Supabase Storage → gets public URL
   - If imageUrl: uses directly (from AI analysis)
   - Creates DB record via repository

3. garment.repository.ts (Supabase)
   - INSERT INTO garments (user_id, name, category, brand, color, season, style, image_url, notes)
   - Season serialized as JSON string if array
   - snake_case DB columns → camelCase domain entity mapping

4. storage.service.ts
   - uploadFile: Supabase Storage bucket → public URL
   - deleteFile: Remove from bucket
   - getPublicUrl: Generate public URL
```

### Data Model (DB → Entity → FE Type)
```
DB (snake_case):       BE Entity (camelCase):    FE Type (mixed):
─────────────────────────────────────────────────────────────
id                     id                        id
user_id                userId                    userId / user_id
name                   name                      name
category               category                  category
brand                  brand                     brand
color                  color                     color
season                 season                    season
style                  style                     style
image_url              imageUrl                  image_url / imageUrl
notes                  notes                     notes
created_at             createdAt                 createdAt / created_at
updated_at             updatedAt                 updatedAt / updated_at
```

⚠ **Notable**: `image_url` field mapping is inconsistent in FE — `Garment.type` uses `imageUrl`, but `garmentService.ts` references `image_url`.

---

## Existing SDD Artifacts

| Artifact | Status |
|---|---|
| `.atl/` directory | ✅ Created (this session) |
| `openspec/` directory | ❌ Does not exist |
| `sdd-*` folders | ❌ None |

---

## Notable Observations / Risks

1. **No tests on FE** — zero test dependencies, zero spec files. TDD not possible without setup.
2. **camelCase/snake_case inconsistency** — FE types use camelCase (`imageUrl`, `userId`), but services/fetch layer sometimes map snake_case (`image_url`). Both BE entity and FE type define the model differently.
3. **Missing ESLint config** — `package.json` has `"lint": "eslint ."` but no `.eslintrc*` file exists.
4. **No .env files** — No `.env.example` or `.env` on FE; all env vars in code are prefixed `EXPO_PUBLIC_`.
5. **`all-season` ↔ `all_season`** — Converted manually at both FE service and BE controller layer. Risk of mismatch.
6. **Tailwind config is empty** — `tailwind.config.js` has empty `content: []` and no theme extensions.
7. **Analytics initialized at module level** — `analytics.init()` called as side effect in `_layout.tsx`.
