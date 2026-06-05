# Proposal: Remove.bg Background Removal for Garment Photos

**Change**: `remove-bg-background-removal`
**Date**: 2026-06-04
**Status**: Implemented and archived

---

## Intent

Add server-side background removal for garment photos using the remove.bg API, so uploaded garment images have clean, consistent backgrounds without requiring manual editing.

## Motivation

Garment photos taken by users often have cluttered or inconsistent backgrounds (bedrooms, floors, hangers). Clean backgrounds improve:
- Visual consistency across the closet
- AI analysis accuracy (fewer background artifacts)
- Professional appearance for potential future features (sharing, marketplace)

## Scope

### In Scope
- New `removeBg` configuration namespace reading `REMOVE_BG_API_KEY` from environment
- Rewrite `RemoveBackgroundUseCase` from no-op stub to real remove.bg API integration
- Integrate background removal into `CreateGarmentUseCase` before storage upload
- Module wiring: `AiModule` exports `RemoveBackgroundUseCase`, `GarmentsModule` imports `AiModule`
- Graceful degradation on all failure modes (no API key, network error, API error)

### Out of Scope
- Batch background removal for existing garments
- UI toggle to enable/disable background removal
- Background removal for profile photos or other image types
- Local/on-device background removal (server-side only)

## Approach

1. **Config**: `registerAs('removeBg', ...)` in `remove-bg.config.ts`, loaded by `ConfigModule.forRoot()`
2. **Use Case**: `RemoveBackgroundUseCase.execute()` sends base64 image to `https://api.remove.bg/v1.0/removebg` via `form-data` + `fetch`, returns base64 of cleaned image. On any failure → logs warning, returns original image (never throws).
3. **Integration**: `CreateGarmentUseCase.execute()` calls `removeBackgroundUseCase.execute()` before storage upload. If output differs from input (background was actually removed), updates MIME type to `image/png` since remove.bg always returns PNG.
4. **Wiring**: `AiModule` exports `RemoveBackgroundUseCase` so `GarmentsModule` (which imports `AiModule`) can inject it into `CreateGarmentUseCase`.

## Rollback Plan

- Remove `removeBgConfig` from `ConfigModule.forRoot()` load array
- Remove `RemoveBackgroundUseCase` from `AiModule` providers and exports
- Remove `AiModule` import and `RemoveBackgroundUseCase` injection from `GarmentsModule`/`CreateGarmentUseCase`
- Restore `CreateGarmentUseCase` to original upload-only flow
