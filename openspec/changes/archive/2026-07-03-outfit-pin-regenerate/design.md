# Design: Outfit Pin & Regenerate

## Technical Approach

Pin state in Zustand store (`pinnedGarmentIds: Record<number, string[]>`). BE accepts `preferredGarmentIds` query param and modifies Gemini prompt to include pinned items as context for regenerating only unfilled slots. FE validates category uniqueness per suggestion, calls API, and merges pinned items into response post-merge.

## Architecture Decisions

### Decision: Pin ownership
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Store | State survives navigation, shared by Home + Modal | ✅ Zustand store |
| Local state per component | Simpler but loses pin on navigation | ❌ |

### Decision: Prompt strategy
| Option | Pros | Decision |
|--------|------|----------|
| Subset prompt (only pinned + random fill) | Smaller, cheaper | ❌ Loses context |
| Full wardrobe + "must include these" | Better harmony, same quality | ✅ |

### Decision: Merge ownership
| Option | Pros | Decision |
|--------|------|----------|
| BE does merge | Single source, but BE response format changes | ❌ |
| FE post-merge | Safety net, BE returns normal suggestions | ✅ |

### Decision: Cache key
Pins change the prompt output — cache key includes `preferredGarmentIds` hash alongside user+date hash.

### Decision: Pin UI placement
Both home cards (quick pin) and modal (detail pin). Store keeps single source of truth.

## Data Flow

```
User taps pin on garment
  → store.togglePin(suggestionIndex, garmentId)
  → store validates same-category not already pinned
  → re-render with filled pin icon

User taps "Regenerar con seleccionadas"
  → store.regenerateWithPinned(suggestionIndex)
  → GET /outfits/suggestions?preferredGarmentIds=g1,g2&locale=es
  → BE: injects pinned items into systemPrompt
  → Gemini: generates completions for remaining categories
  → BE returns normal Suggestion[] (3 full outfits)
  → FE: for the pinned suggestion, keeps pinned garments, replaces rest
  → suggestionsStore updates, UI re-renders
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| BE: `suggest-outfits.use-case.ts` | Modify | Add `preferredGarmentIds` to input, conditional prompt |
| BE: `outfits.controller.ts` | Modify | Accept new query param |
| FE: `store/suggestionsStore.ts` | Modify | Add pin state + actions |
| FE: `types/index.ts` | Modify | Extend Suggestion or add pin type |
| FE: `components/SuggestionDetailModal.tsx` | Modify | Pin toggles on garments + regen button |
| FE: `app/(tabs)/home.tsx` | Modify | Pin toggles on suggestion cards + regen button |

## Interfaces

```typescript
// Add to suggestionsStore
interface SuggestionsState {
  // ... existing
  pinnedGarmentIds: Record<number, string[]>; // keyed 0-2
  isRegenerating: boolean;
}

interface SuggestionsActions {
  togglePin: (suggestionIndex: number, garmentId: string, category: string) => void;
  clearPins: () => void;
  regenerateWithPinned: (suggestionIndex: number) => Promise<void>;
}

// BE SuggestOutfitsInput
interface SuggestOutfitsInput {
  userId: string;
  weather?: WeatherData | null;
  locale?: string;
  preferredGarmentIds?: string[];
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | All new types | `tsc --noEmit` |
| Pin logic | Toggle, validation, clear | Manual (no test infra) |
| Regenerate call | Store action → API → merge | Manual |
| BE prompt | Output formatting | Manual log check |

No migration required.
