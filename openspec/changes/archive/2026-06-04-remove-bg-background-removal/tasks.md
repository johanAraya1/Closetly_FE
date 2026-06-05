# Tasks — Remove.bg Background Removal

**Change**: `remove-bg-background-removal`
**Total tasks**: 6 | **Completed**: 6/6
**Verification**: PASS WITH WARNINGS (12/14 compliant, 2 partial — MIME fix applied post-verify)

---

## Task 1: Create remove-bg config ✅

**File**: `src/config/remove-bg.config.ts` (NEW)
**Dependencies**: None

- Create `removeBgConfig` using `registerAs('removeBg', ...)`
- Read `REMOVE_BG_API_KEY` from `process.env`
- Export the config factory

## Task 2: Add RemoveBgConfig interface ✅

**File**: `src/config/interfaces/config.interface.ts` (MODIFIED)
**Dependencies**: Task 1

- Add `RemoveBgConfig` interface with `apiKey: string` field

## Task 3: Register config in ConfigModule ✅

**File**: `src/config/config.module.ts` (MODIFIED)
**Dependencies**: Task 1

- Import `removeBgConfig` from `./remove-bg.config`
- Add to `load` array in `NestConfigModule.forRoot()`

## Task 4: Rewrite RemoveBackgroundUseCase ✅

**File**: `src/application/use-cases/ai/remove-background.use-case.ts` (REWRITTEN)
**Dependencies**: Task 3

- Inject `ConfigService`
- Implement `execute()` with:
  - API key check → graceful return if missing
  - `FormData` construction with `image_file_b64` field
  - `fetch` POST to `https://api.remove.bg/v1.0/removebg`
  - `Buffer` conversion of response `arrayBuffer` to base64
  - Catch-all error handling → log warning, return original
- Define `RemoveBackgroundInput` and `RemoveBackgroundOutput` interfaces

## Task 5: Wire into CreateGarmentUseCase ✅

**File**: `src/application/use-cases/garments/create-garment.use-case.ts` (MODIFIED)
**Dependencies**: Task 4

- Inject `RemoveBackgroundUseCase`
- Before storage upload:
  - Convert file buffer to base64
  - Call `removeBackgroundUseCase.execute()`
  - If output differs from input → update file buffer and set MIME to `image/png`
- Wrap in try/catch for unexpected errors

## Task 6: Module wiring ✅

**Files**:
- `src/infrastructure/modules/ai/ai.module.ts` (MODIFIED)
- `src/infrastructure/modules/garments/garments.module.ts` (MODIFIED)
**Dependencies**: Task 4, Task 5

- `AiModule`: Add `RemoveBackgroundUseCase` to `providers` and `exports`
- `GarmentsModule`: Import `AiModule`

---

## Verification Summary

| Aspect | Result |
|--------|--------|
| Scenario compliance | 12/14 full, 2 partial (MIME fix applied post-verify) |
| Build | ✅ Pass |
| Type-check | ✅ Pass |
| Coverage tests | ⚠️ None (consistent with project maturity — suggestion) |
