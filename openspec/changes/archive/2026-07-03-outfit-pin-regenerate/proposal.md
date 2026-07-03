# Proposal: Outfit Pin & Regenerate

## Intent

Users currently regenerate all 3 AI suggestions if they dislike any — losing garments they liked. They need the ability to pin specific garments, then regenerate only the remaining slots while keeping pinned items fixed.

## Scope

### In Scope
- BE: Extend `GET /outfits/suggestions` with optional `preferredGarmentIds` query param
- BE: Modify Gemini prompt to treat pinned garments as fixed, regenerate only unfilled categories while enforcing color harmony & style consistency
- FE: Pin/lock toggle on each garment in suggestion preview (SuggestionDetailModal, suggestion cards)
- FE: "Regenerar con seleccionadas" button when 1+ garment pinned (not all)
- FE: Merge pinned items with new API response
- FE: Disable button when all garments pinned or none selected

### Out of Scope
- Persisting pinned preference across sessions (no saved "favorites")
- Multi-outfit pinning (pin across all 3 suggestions at once)
- Undo/history for regeneration rounds

## Capabilities

> No existing top-level spec in `openspec/specs/` covers suggestion pinning or partial regeneration. New capability needed.

### New Capabilities
- `suggestion-pin-regenerate`: Pin garments from AI suggestions, regenerate only remaining slots with harmony rules against pinned items

### Modified Capabilities
- None

## Approach

1. **BE**: Add `preferredGarmentIds`. Inject pinned garments into Gemini prompt stating filled categories, request only missing ones, enforce harmony
2. **FE Store**: Extend `suggestionsStore` with `pinnedGarmentIds`, `togglePin`, `regenerateWithPinned`
3. **FE UI**: Pin toggle per garment. Button when 1+ pinned. Response swaps only unpinned slots

## Affected Areas

| Area | Impact |
|------|--------|
| `store/suggestionsStore.ts` | Add pin state & actions |
| `components/SuggestionDetailModal.tsx` | Pin toggles + regen button |
| `app/(tabs)/home.tsx` | Pin toggles on cards |
| `types/suggestion.ts` | Add pin state |
| `lib/i18n/**` | Translation keys |
| BE: `suggest-outfits.use-case.ts` | Accept `preferredGarmentIds` |
| BE: `outfits.controller.ts` | New query param |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gemini can't complete with pinned items | Med | Graceful error message |
| Category conflict (2 tops pinned) | Low | FE prevents same-category pin |
| Pin state across 3 suggestions | Med | Store per suggestion index |

## Rollback

- **BE**: Remove query param — old behavior restored
- **FE**: Remove pin state — UI reverts

## Dependencies

- BE endpoint must ship first or simultaneously

## Success Criteria

- [ ] Pin individual garments across all 3 suggestions
- [ ] "Regenerar con seleccionadas" visible when 1+ pinned, not all
- [ ] Regenerated response keeps pinned items, replaces only unpinned
- [ ] Error surfaces when Gemini can't complete with pinned items
- [ ] Button disabled when all slots pinned
