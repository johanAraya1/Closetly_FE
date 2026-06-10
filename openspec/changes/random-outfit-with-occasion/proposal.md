# Proposal: Random Outfit with Occasion

## Intent

Users want quick outfit ideas without manually browsing their entire closet. Current creation is fully manual — tap through garments one by one. This feature adds a "Generate Random Outfit" flow that selects a coherent set of garments based on occasion, weather, and category rules, then pre-fills the create form for review.

## Scope

### In Scope
- FE algorithm `generateRandomOutfit()`: picks 1 garment per category (top + bottom + shoes required; accessory + outerwear optional) with duplicate-category validation
- Occasion selector (Casual, Formal, Work, Sport, Date Night, Travel) that maps to `GarmentStyle` filters
- Weather-aware filtering using current weather from `suggestionsStore`
- "Try another" regenerate button
- Generated outfit pre-fills form; user can remove/replace individual items

### Out of Scope
- AI-powered generation using Gemini (Phase 2, deferred)
- BE endpoint changes
- Color-coordination analysis
- New package dependencies

## Capabilities

### New Capabilities
- `random-outfit-with-occasion`: Client-side algorithm that selects a coherent outfit from the user's garments using occasion, weather, and category-validated random selection, then pre-fills the outfit create form.

### Modified Capabilities
None — new capability, no existing specs change behavior.

## Approach

Pure FE algorithm in `utils/randomOutfit.ts`:
1. Group garments by category (`tops`, `bottoms`, `dresses`, `shoes`, `outerwear`, `accessories`)
2. Filter by occasion → map to `GarmentStyle[]` (e.g., `formal → ['formal', 'elegante']`)
3. Filter by season from current weather (read from `suggestionsStore`)
4. Randomly pick 1 per composition slot: must have top (or dress) + bottom (skip if dress) + shoes; optionally outerwear/accessories
5. Validate: no duplicate categories, no conflicting seasons
6. Return `Garment[]` pre-filling `selectedGarments` state

UI changes in `app/outfits/create.tsx`:
- Occasion picker (modal/dropdown) above garment grid
- "Generate Random Outfit" button triggers algorithm
- "Try another" re-randomizes with same filters
- Selected garments highlight as pre-selected, user can toggle

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `utils/randomOutfit.ts` | New | Generation algorithm |
| `utils/index.ts` | Modified | Add export |
| `app/outfits/create.tsx` | Modified | Occasion picker, generate/regenerate UI, pre-fill |
| `lib/constants.ts` | Maybe | Occasion→style mapping if not present |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User lacks required categories | Medium | Block generate, show fallback message |
| Generated combo is visually incoherent | Medium | User reviews before save; "Try another" for fast re-roll |
| Occasion→style mapping is opinionated | Low | Configurable in constants, easy to tweak |

## Rollback Plan

Trivial — no BE changes or new deps:
1. Delete `utils/randomOutfit.ts`, revert `utils/index.ts`
2. Revert `app/outfits/create.tsx`
3. Revert `lib/constants.ts` if modified

## Dependencies

None. Weather data already available via `suggestionsStore`. Garment types (`Garment`, `GarmentStyle`, `GarmentSeason`) exist in `types/index.ts`.

## Success Criteria

- [ ] User generates a random outfit in 1 tap from the create screen
- [ ] Generated outfit always has ≥1 top (or dress) + bottom (skip if dress) + shoes
- [ ] Occasion filter correctly maps to `GarmentStyle` values
- [ ] Weather filter excludes out-of-season garments
- [ ] "Try another" re-randomizes without losing occasion/weather filters
- [ ] User can manually toggle any garment before saving
