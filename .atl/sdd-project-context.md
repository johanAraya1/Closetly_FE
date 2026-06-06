# SDD Project Context — Closetly

**Status**: Initialized
**Date**: 2026-06-06
**Mode**: openspec (file-based at `openspec/`)
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
| Styling | NativeWind (Tailwind CSS) + StyleSheet |
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
├── app/                    # expo-router pages (19 screens)
│   ├── _layout.tsx         # Root layout (auth guard)
│   ├── index.tsx           # Entry point
│   ├── (auth)/             # Auth group (onboarding, login, register)
│   ├── (tabs)/             # Main tabs (home, closet, outfits, collections, profile)
│   ├── garments/
│   │   └── create.tsx      # Create/edit garment screen
│   ├── collections/
│   │   ├── create.tsx
│   │   └── [id].tsx
│   ├── outfits/
│   │   ├── index.tsx
│   │   └── create.tsx
│   ├── admin/
│   │   └── dashboard.tsx
│   └── settings.tsx
├── components/             # Reusable UI (16 files, barrel export via index.ts)
├── hooks/                  # Custom hooks (10 files)
├── store/                  # Zustand stores (4 files: auth, garments, outfits, collections)
├── services/               # API service layer (9 files)
├── utils/                  # Utilities (9 files incl. apiClient, fetchUtils, format, etc.)
├── lib/                    # Constants, i18n config
├── types/                  # TypeScript types/entities
├── contexts/               # React contexts (ThemeContext)
├── assets/                 # Static assets
├── openspec/               # SDD configuration (init phase)
│   ├── config.yaml
│   ├── specs/
│   └── changes/
│       └── archive/
└── .atl/                   # Local agent artifacts
    ├── sdd-project-context.md
    ├── sdd-testing-capabilities.md
    └── skill-registry.md
```

## Architecture Pattern (FE)

```
Screen -> Hook -> Zustand Store -> Service -> fetch() -> Backend API
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
- `@/` -> project root
- `@components/`, `@hooks/`, `@services/`, `@store/`, `@lib/`, `@utils/`, `@types/`

### Route Groups
- `(auth)/` — unauthenticated screens
- `(tabs)/` — main authenticated tabs

---

## Known Risks & Observations

1. **No tests on FE** — zero test dependencies, zero spec files. TDD not possible without setup.
2. **camelCase/snake_case inconsistency** — FE types use camelCase (`imageUrl`, `userId`), but services/fetch layer sometimes maps snake_case (`image_url`).
3. **No ESLint config** — `package.json` has `"lint": "eslint ."` but no `.eslintrc*` file.
4. **No .env files** — No `.env.example` or `.env`; env vars use `EXPO_PUBLIC_` prefix.
5. **`all-season` vs `all_season`** — Converted at both FE service and BE controller. Risk of mismatch.
6. **Empty Tailwind config** — `tailwind.config.js` has empty `content: []` and no theme extensions.
7. **Analytics at module level** — `analytics.init()` called as side effect in `_layout.tsx`.

---

## Existing SDD Artifacts

| Artifact | Status |
|---|---|
| `.atl/` directory | ✅ Existing (updated this session) |
| `openspec/` directory | ✅ Existing (updated this session) |
| `openspec/config.yaml` | ✅ Created this session |
| `openspec/specs/` | ✅ Created this session |
| `sdd-*` folders | ❌ None |
