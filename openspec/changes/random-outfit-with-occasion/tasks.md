# Tasks: Random Outfit with Occasion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200–280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + algorithm + UI | Single PR | All changes depend on each other — no viable split under 400 lines |

## Phase 1: Foundation — Constants & Exports

- [x] 1.1 Add `OCCASION_STYLE_MAP: Record<string, GarmentStyle[]>` and `OCCASIONS` array to `lib/constants.ts` (6 occasions, style mapping per design)
- [x] 1.2 Add `export * from './randomOutfit'` to `utils/index.ts`

## Phase 2: Core Algorithm — `utils/randomOutfit.ts`

- [x] 2.1 Create `utils/randomOutfit.ts` with `RandomOutfitResult` interface, `Occasion` type, and `generateRandomOutfit(garments, occasion, weather?)` signature
- [x] 2.2 Implement occasion filtering: map `Occasion` → `GarmentStyle[]` via `OCCASION_STYLE_MAP`, exclude garments with no matching style
- [x] 2.3 Implement weather filtering: derive season from `WeatherData.temp` ranges, exclude garments with incompatible season (skip if weather is null; `all_season` always passes)
- [x] 2.4 Implement category-validated random pick: group by category, try dress-first (replaces top+bottom), pick 1 per required slot, attempt optional slots, enforce no duplicate categories
- [x] 2.5 Implement error returns for: missing required categories (top, bottom, shoes), no garments match occasion, no garments pass filters

## Phase 3: UI Integration — `app/outfits/create.tsx`

- [x] 3.1 Import `useSuggestionsStore` and `generateRandomOutfit`; add local `selectedOccasion: string` state replacing the free-text `occasion` Input
- [x] 3.2 Replace free-text `<Input label="Ocasión">` with occasion chip picker using `OCCASIONS` array (same chip style as season picker)
- [x] 3.3 Add "Generate Random Outfit" button above the category filter bar, wired to call `generateRandomOutfit(garments, selectedOccasion, weather)` and `setSelectedGarments(result.outfit)` on success
- [x] 3.4 Add `generationError: string | null` state; show error banner below the generate button when the algorithm returns an error
- [x] 3.5 After successful generation, show a "Try another" button (replaces or sits next to the generate button) that re-runs with same filters
- [x] 3.6 Ensure generated garments in `selectedGarments` appear with the existing checkmark UI and can be toggled on/off normally

## Phase 4: Manual Verification

- [ ] 4.1 Build check: `npx expo export --platform web` succeeds with no TypeScript errors
- [ ] 4.2 Manual scenario: complete outfit with all categories generates top + bottom + shoes + optional layers, no duplicate categories
- [ ] 4.3 Manual scenario: dress replaces top and bottom
- [ ] 4.4 Manual scenario: missing required category shows error, blocks generation
- [ ] 4.5 Manual scenario: occasion filter narrows pool correctly
- [ ] 4.6 Manual scenario: "Try another" preserves occasion/weather filters
- [ ] 4.7 Manual scenario: pre-filled garments are togglable before save
