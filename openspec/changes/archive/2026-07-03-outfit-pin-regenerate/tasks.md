# Tasks: Outfit Pin & Regenerate

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180–260 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: BE — Input & Prompt

- [x] 1.1 Add `preferredGarmentIds?: string[]` to `SuggestOutfitsInput` in `suggest-outfits.use-case.ts`
- [x] 1.2 Add `preferredGarmentIds` query param to `OutfitsController.suggestions()`
- [x] 1.3 Modify systemPrompt: when pinned items exist, inject filled categories + ask Gemini to generate only remaining categories
- [x] 1.4 Include pinned items hash in cache key to prevent stale cache

## Phase 2: FE — Store & Types

- [x] 2.1 Add `pinnedGarmentIds: Record<number, string[]>`, `isRegenerating: boolean` to `suggestionsStore`
- [x] 2.2 Add `togglePin(suggestionIndex, garmentId, category)`, `clearPins`, `regenerateWithPinned(suggestionIndex)` actions
- [x] 2.3 Implement `regenerateWithPinned`: call API with `preferredGarmentIds`, merge pinned items into response, update store

## Phase 3: FE — UI (SuggestionDetailModal)

- [x] 3.1 Add pin icon toggle per garment in modal grid
- [x] 3.2 Add "Regenerar con seleccionadas" button below garment grid
- [x] 3.3 Wire pin tap to `store.togglePin`, regen button to `store.regenerateWithPinned`

## Phase 4: FE — UI (Home Cards)

- [x] 4.1 Add pin toggle per garment in suggestion cards on home screen
- [x] 4.2 Add "Regenerar con seleccionadas" button below card
- [x] 4.3 Handle button disabled states: 0 pins, all pins, isRegenerating loading

## Phase 5: FE — i18n

- [x] 5.1 Add `pin` block keys in `lib/i18n.ts` for ES and EN (pinLabel, unpinLabel, regenerateWithPinned, sameCategoryError, allPinned, noSlots)

## Phase 6: Verification

- [x] 6.1 Run `tsc --noEmit` on both FE + BE to verify types
- [x] 6.2 Manual test: toggle pin, regenerate, merge, same-category rejection, all-pinned disabled
