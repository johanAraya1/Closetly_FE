# Specs — Remove.bg Background Removal

This change introduces a background removal capability integrated into the garment creation pipeline. All behavior is designed for graceful degradation — garment creation never fails due to background removal issues.

## Requirements

### R1: Configuration
- `REMOVE_BG_API_KEY` environment variable is read under the `removeBg` config namespace
- Config is registered via `registerAs('removeBg', ...)` in `src/config/remove-bg.config.ts`
- Missing or empty API key is handled gracefully (background removal skipped, original image preserved)

### R2: RemoveBackgroundUseCase
- Accepts `{ imageBase64: string }` as input
- Sends base64 image to `https://api.remove.bg/v1.0/removebg` using `form-data` + `fetch`
- Returns `{ imageBase64WithoutBackground: string }` on success
- On any failure (missing API key, network error, HTTP error status) → logs a warning and returns the original image unchanged
- Never throws an exception; all errors are caught internally
- Uses the `form-data` npm package to build multipart form data

### R3: CreateGarmentUseCase Integration
- Calls `RemoveBackgroundUseCase.execute()` before uploading the image to Supabase Storage
- If the output base64 differs from the input (background was actually removed), updates MIME type to `image/png` since remove.bg always returns PNG
- Wraps the call in a try/catch so any unexpected error from the use case does not block garment creation (uses original file)
- Uses the original image on any failure of the background removal step

### R4: Module Wiring
- `AiModule` provides `RemoveBackgroundUseCase` in its `providers` array and exports it via `exports`
- `GarmentsModule` imports `AiModule` and injects `RemoveBackgroundUseCase` into `CreateGarmentUseCase`
- `ConfigModule` loads `removeBgConfig` in the `forRoot()` config load array

## Scenarios

### Happy Path: Background Removal Succeeds
1. User uploads a garment photo
2. `CreateGarmentUseCase.execute()` is called with `file` buffer
3. `RemoveBackgroundUseCase.execute()` sends image to remove.bg API
4. API returns cleaned PNG image
5. `CreateGarmentUseCase` detects output differs from input, updates MIME type to `image/png`
6. Cleaned PNG is uploaded to Supabase Storage
7. Garment record is created with the cleaned image URL

### Degraded Path: No API Key Configured
1. `REMOVE_BG_API_KEY` is empty or not set
2. `RemoveBackgroundUseCase.execute()` logs warning and returns original image
3. `CreateGarmentUseCase` uploads original image unchanged
4. Garment creation completes successfully

### Degraded Path: API Returns Error Status
1. remove.bg API returns non-200 status (rate limit, auth failure, etc.)
2. `RemoveBackgroundUseCase.execute()` logs warning with status code
3. Original image is returned and used for upload
4. Garment creation completes successfully

### Degraded Path: Network Failure
1. Network request to remove.bg API fails (timeout, DNS resolution error)
2. `RemoveBackgroundUseCase.execute()` catches the error, logs warning
3. Original image is returned and used for upload
4. Garment creation completes successfully

### Error Path: Unexpected Exception in RemoveBackgroundUseCase
1. `RemoveBackgroundUseCase.execute()` throws an unexpected exception
2. `CreateGarmentUseCase` catches it via try/catch around the call
3. Logs warning and proceeds with original file
4. Garment creation completes successfully
