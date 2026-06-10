# Exploration: Random Outfit with Occasion Selector

## Current State

The outfit creation screen (`app/outfits/create.tsx`) is fully manual:
- User enters name, description, occasion (free text), season
- User browses all garments in a scrollable grid, tapping to select
- No validation for duplicate garment types (e.g., selecting 2 tops)
- No AI/generate/random functionality
- After manual creation, POST to `/outfits` via `outfitService.createOutfit`

The BE already has AI endpoints:
- `POST /ai/analyze-garment` — image recognition (OpenAI Vision)
- `GET /outfits/suggestions?lat=...&lon=...&locale=...` — Gemini-generated suggestions based on weather + user's garments
- `POST /outfits/packing-suggestions` — Gemini-generated packing lists

Garments have rich metadata useful for AI selection:
```typescript
interface Garment {
  category: 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories' | 'bags' | 'other';
  season?: GarmentSeason | GarmentSeason[];
  style?: GarmentStyle[];  // 'formal' | 'casual' | 'deportivo' | 'elegante' | 'bohemio' | 'urbano'
  // ...
}
```

**No existing "generate random outfit" flow exists.**

## Affected Files

| File | Why |
|------|-----|
| `app/outfits/create.tsx` | Main UI — add "Generate Random Outfit" button + occasion selector |
| `store/outfitsStore.ts` | May need new action for AI-generated outfit creation |
| `services/outfitService.ts` | May need new API call for AI outfit generation |
| `types/index.ts` | May need new DTO for AI generation request |
| `lib/constants.ts` | Has `GARMENT_CATEGORIES` and `GARMENT_STYLES` for occasion mapping |

## Approaches

### 3A. Extend BE `/outfits/suggestions` endpoint

Add a new FE-side action that calls the existing `/outfits/suggestions` endpoint with an `occasion` parameter (and optionally `season`, `style`). The BE already has Gemini integration. The response would pre-fill the create form with selected garments, name, and occasion.

**Flow:**
1. User taps "Generate Random Outfit" on the create screen
2. Occasion selector modal appears (formal, work, sport, casual + season picker)
3. FE calls `GET /outfits/suggestions?lat=...&lon=...&occasion=formal&locale=...`
4. BE returns 1 suggestion (or use first of 3) with `garmentIds`
5. FE pre-fills: selects those garments in the grid, sets name, occasion, season
6. User reviews and taps "Create Outfit"

**Pros:**
- Reuses existing BE AI infrastructure (Gemini, weather awareness)
- Already validates garment composition on the BE
- Rich responses with reasoning
- Weather/climate already factored in

**Cons:**
- Requires BE changes to accept/support `occasion` parameter (or the FE can map occasion to the existing suggestions)
- Current `/outfits/suggestions` may not support an explicit `occasion` filter
- Network call required — won't work offline
- Slower than FE-only approach

**Effort:** Medium (FE changes + potential BE changes)

### 3B. Pure FE-side random outfit generator

Build a client-side algorithm that selects garments from the user's local closet:

1. Pick a target composition: e.g., `[tops, bottoms, shoes]` or `[dresses, outerwear, shoes]`
2. Filter garments by occasion/style (map occasion to `GarmentStyle`) and season
3. Randomly select 1 garment per category slot
4. Validate: no duplicate categories, no conflicting seasons
5. Pre-fill the create form

**Composition rules (hardcoded):**
- Must have exactly one garment from each of these base categories: `tops` or `dresses` (not both), `bottoms` or skip if dress, `shoes`
- Optionally add: `outerwear`, `accessories`
- Never: 2 `tops`, 2 `bottoms`, etc.

**Occasion → Style mapping:**
```
formal → ['formal', 'elegante']
work → ['formal', 'casual']
sport → ['deportivo', 'casual']
casual → ['casual', 'urbano']
```

**Pros:**
- No BE changes needed
- Instant, works offline
- Full FE control over composition rules

**Cons:**
- No AI reasoning, less intelligent
- No weather awareness (though could add OpenWeatherMap client-side)
- Random selection may produce incoherent color combinations
- More validation logic to write and maintain

**Effort:** Medium (pure FE work, ~100-150 lines)

## Recommendation

**Approach 3A — Extend BE `/outfits/suggestions`.** Given the app already depends on Gemini for suggestions and packing, adding an occasion-aware random outfit endpoint is the natural evolution. The FE gets AI-quality selections (coherent colors, weather-aware, sensible combinations) and the BE stays the source of truth for outfit logic.

However, if BE changes are blocked (separate repo), **Approach 3B** is a viable fallback that delivers immediate value with FE-only work.

For a practical MVP: start with 3B (FE-only, simple random selection with category validation) and layer 3A (AI-powered) as a phase 2 enhancement.

## Risks

- **Approach 3A:** BE changes require coordination. The suggestions endpoint currently returns *multiple* suggestions; may need a new dedicated endpoint or a query param.
- **Approach 3B:** Random selection may create visually unappealing combos. User must be able to regenerate or manually adjust. Also, the user may not have garments in all required categories.
- Both approaches: The "Random Outfit" button should be a recommendation — user always reviews before saving.
- If the user has very few garments (e.g., only 2), the algorithm needs to gracefully fall back (show what's available, skip validation).
