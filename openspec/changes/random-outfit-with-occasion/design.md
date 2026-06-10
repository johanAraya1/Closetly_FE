# Design: Random Outfit with Occasion

## Technical Approach

Pure FE algorithm in `utils/randomOutfit.ts` — no BE changes, no new deps. The algorithm receives the user's garments, an occasion selector, and optional weather data from `suggestionsStore`, filters by occasion→style mapping and season compatibility, then randomly picks 1 garment per composition slot. Results pre-fill `selectedGarments` in the create form. User can regenerate ("Try another") or manually toggle items before saving.

## Architecture Decisions

### Decision: Algorithm Location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Inline in `create.tsx`** | Coupled to UI, untestable in isolation | ❌ Rejected |
| **In `outfitsStore`** | Store becomes cluttered with UI-only logic | ❌ Rejected |
| **New `utils/randomOutfit.ts`** | Pure function, DI-friendly, sync, testable | ✅ **Chosen** |

Pure function: `generateRandomOutfit(garments, occasion, weather?) → { outfit: Garment[], errors?: string }`. No store coupling, no async, easy to unit test.

### Decision: Occasion→Style Mapping Location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Inside `randomOutfit.ts`** | Hard to tweak, buried in algorithm code | ❌ Rejected |
| **New config file** | Overkill for a simple constant map | ❌ Rejected |
| **`lib/constants.ts`** | Existing pattern, centralised, easy to modify | ✅ **Chosen** |

New constant `OCCASION_STYLE_MAP: Record<string, GarmentStyle[]>`:

| Occasion | Styles |
|----------|--------|
| Casual | `casual`, `urbano`, `bohemio` |
| Formal | `formal`, `elegante` |
| Work | `formal`, `elegante`, `urbano` |
| Sport | `deportivo` |
| Date Night | `elegante`, `formal`, `urbano` |
| Travel | `casual`, `urbano`, `deportivo` |

### Decision: Weather Integration

Direct store read from `useSuggestionsStore()` in the component, passed as argument to the algorithm. The algorithm converts `WeatherData.temp` to a `GarmentSeason`:

| Temp Range | Derived Season |
|------------|----------------|
| `< 10°C` | `winter` |
| `10–20°C` | `spring` or `fall` (match either) |
| `> 20°C` | `summer` |

If `weather` is `null`, skip weather filter. Garments with `season: 'all_season'` always pass.

### Decision: State Management

The create screen already uses local `selectedGarments: Garment[]`. No new store needed. Add local `selectedOccasion: string` replacing the free-text occasion input. The algorithm result directly sets `selectedGarments`. "Try another" re-runs with the same filters and replaces `selectedGarments`.

### Decision: Category Validation

| Category | Required? | Behaviour if missing |
|----------|-----------|---------------------|
| `tops` | ✅ Required | Block generation, show "Missing tops" |
| `dresses` | ❌ Optional | If selected, replaces `tops` + `bottoms` |
| `bottoms` | ✅ Required | Block generation, show "Missing bottoms" (unless dress selected) |
| `shoes` | ✅ Required | Block generation, show "Missing shoes" |
| `outerwear` | ❌ Optional | Skip if none available after filters |
| `accessories` | ❌ Optional | Skip if none available after filters |
| `bags`, `other` | ❌ Excluded | Not part of outfit composition |

Algorithm picks dress first (if available and matches filters). If dress chosen, skip tops and bottoms. Otherwise pick 1 top, 1 bottom, 1 shoe. Then attempt 1 outerwear, 1 accessory from remaining filtered pool, skipping if none.

## Data Flow

```
User taps "Generate Random Outfit"
    │
    ▼
create.tsx reads:
  ├─ useGarments()          → all garments
  ├─ useSuggestionsStore()  → weather (may be null)
  └─ selectedOccasion       → "Casual" | "Formal" | ...
    │
    ▼
generateRandomOutfit(garments, occasion, weather)
    │
    ├─ Filter by occasion → style map OR
    ├─ Filter by weather  → season map (if weather exists)
    └─ Group by category, pick 1 per slot
    │
    ▼
{ outfit: Garment[], error?: string }
    │
    ▼
setSelectedGarments(outfit)   ← pre-fills form
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `utils/randomOutfit.ts` | Create | Core algorithm: filter + random pick + validation |
| `utils/index.ts` | Modify | Add `export * from './randomOutfit'` |
| `lib/constants.ts` | Modify | Add `OCCASION_STYLE_MAP`, `OCCASIONS` array |
| `app/outfits/create.tsx` | Modify | Occasion picker (chips), generate/regenerate button, pre-fill flow, error states |

## Interfaces / Contracts

```typescript
// utils/randomOutfit.ts
interface RandomOutfitResult {
  outfit: Garment[];
  error?: string;
}

type Occasion = 'casual' | 'formal' | 'work' | 'sport' | 'date_night' | 'travel';

function generateRandomOutfit(
  garments: Garment[],
  occasion: Occasion,
  weather?: WeatherData | null,
): RandomOutfitResult;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `generateRandomOutfit` — full coverage of all scenarios in spec | Pure function, pass fixture garments, assert composition + filtering |
| Unit | Occasion→style mapping | Test each occasion excludes wrong styles |
| Unit | Weather→season derivation | Test temp ranges produce correct season filter |
| Unit | Edge cases: missing categories, no matching garments, dress replacement | Each maps to spec scenarios |
| Integration | UI flow: generation → pre-fill → toggle → create | Render test with mock stores |

## Migration / Rollout

No migration required. The free-text occasion input is replaced by the occasion picker; existing outfits with `occasion` free text are unaffected.

## Open Questions

- None.
