# Design — Remove.bg Background Removal

**Change**: `remove-bg-background-removal`

---

## Architecture

### Data Flow

```
CreateGarmentInput { file }
    │
    ▼
CreateGarmentUseCase.execute()
    │
    ├──► file → base64
    │       │
    │       ▼
    │   RemoveBackgroundUseCase.execute()
    │       │
    │       ├──► POST https://api.remove.bg/v1.0/removebg
    │       │       Content-Type: multipart/form-data
    │       │       Headers: X-Api-Key
    │       │       Body: image_file_b64=<base64>
    │       │       │
    │       │       ▼
    │       │   On 200 → return cleaned base64 PNG
    │       │   On !200 → log warning, return original
    │       │
    │       ├──► On network error → log warning, return original
    │       └──► On missing API key → log warning, return original
    │
    ├──► if output ≠ input → MIME = 'image/png'
    │
    └──► uploadFile(bucket, filename, buffer, mimeType)
              │
              ▼
         Storage Service (Supabase)
```

### Entry Point

The background removal is triggered from inside `CreateGarmentUseCase.execute()` when a file is provided (not when `imageUrl` is already given from AI analysis). This places it in the existing garment creation flow at the application layer — no controllers, guards, or pipes were touched.

### Entry Points vs Worker

This is a synchronous inline call, **not** a queue worker. The remove.bg API typically responds in 2–8 seconds, which is acceptable for the garment creation UX since the user already waits for upload + DB write. A worker model would add infrastructure complexity (queues, retries, status tracking) that is not justified for the current volume.

### Module Dependencies

```
ConfigModule (global)
    └── removeBgConfig ← reads REMOVE_BG_API_KEY

AiModule
    providers: [AnalyzeGarmentUseCase, RemoveBackgroundUseCase]
    exports: [RemoveBackgroundUseCase]

GarmentsModule
    imports: [AuthModule, AiModule]
    providers: [..., CreateGarmentUseCase ← injects RemoveBackgroundUseCase]
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **API client** | `fetch` + `form-data` | No external SDK needed; NestJS has `fetch` globally; `form-data` is already a transitive dependency |
| **Error handling** | Log + return original | Never block garment creation; background removal is a nice-to-have |
| **MIME change** | Only when output differs | Preserves original format (e.g., JPEG) if remove.bg wasn't actually called (no key) or failed |
| **Output format** | PNG | remove.bg always returns PNG; the MIME update reflects this |
| **Synchronous** | Inline in use case | Removes queue infrastructure complexity; acceptable latency for create flow |

### Files Changed

| File | Change |
|------|--------|
| `src/config/remove-bg.config.ts` | **NEW** — Config registration for `removeBg` namespace |
| `src/config/interfaces/config.interface.ts` | **MODIFIED** — Added `RemoveBgConfig` interface |
| `src/config/config.module.ts` | **MODIFIED** — Import and load `removeBgConfig` |
| `src/application/use-cases/ai/remove-background.use-case.ts` | **REWRITTEN** — From no-op to real API call |
| `src/application/use-cases/garments/create-garment.use-case.ts` | **MODIFIED** — Inject and call `RemoveBackgroundUseCase` |
| `src/infrastructure/modules/ai/ai.module.ts` | **MODIFIED** — Export `RemoveBackgroundUseCase` |
| `src/infrastructure/modules/garments/garments.module.ts` | **MODIFIED** — Import `AiModule` |
