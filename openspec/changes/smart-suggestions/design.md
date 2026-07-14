# Design: Smart Suggestions

## Technical Approach

Hybrid suggestion engine that replaces pure-AI output with a mix of AI-generated and user-sourced ("most ancient") outfits, orchestrated by a single hook. A lightweight knowledge base detects day-of-week patterns from calendar logs to inform future AI context. All computation is client-side; no backend changes.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| KB storage | AsyncStorage vs Zustand vs in-memory | AsyncStorage survives restarts but adds I/O; in-memory is faster but cold-starts empty | AsyncStorage with 24h TTL — survives app restarts, cold start is rare |
| Merge location | Hook vs Store | Hook keeps store thin; store keeps UI reactive | Hook computes merged list, stores it in suggestionsStore — UI subscribes naturally |
| User picker strategy | Sort all outfits by lastUsed vs partial scan | Full sort is O(n log n) but guarantees global "most ancient"; partial is faster but may miss | Full sort — outfit counts ≤50 are trivial; no performance concern |
| Dedupe across sources | Merge-then-dedup vs dedup-then-merge | Merge-then-dedup is simpler, guarantees max-4 output | Merge-then-dedup with sorted garmentIds key |
| KB data scope | Last 3 months vs full history | Full history is noisy for pattern detection; 3 months balances relevance | Last 3 months per REQ-KB-5 |

## Data Flow

```
App Mount / Calendar Change
        │
        ▼
┌─────────────────────────┐
│  useSmartSuggestions     │
│  (orchestrator hook)     │
└────┬──────────┬─────────┘
     │          │
     ▼          ▼
┌─────────┐  ┌──────────────────┐
│ getKB() │  │ computeRatio()   │
│ (cached)│  │ outfitCount → N  │
└────┬────┘  └──────┬───────────┘
     │              │
     ▼              ▼
  patterns    ┌──────────────┐
     │        │ fetch AI API  │ (N suggestions)
     │        │ + pick user   │ (4-N suggestions)
     │        └──────┬───────┘
     │               │
     ▼               ▼
  ┌──────────────────────────┐
  │  merge + dedupeSuggestions│ → ≤4 Suggestion[]
  └────────────┬─────────────┘
               │
               ▼
  ┌──────────────────────────┐
  │ suggestionsStore         │
  │ .mergedSuggestions       │
  └────────────┬─────────────┘
               │
               ▼
  ┌──────────────────────────┐
  │ UI: SuggestionCards       │
  │ (source badge + lastUsed)│
  └──────────────────────────┘
```

### Calendar Entry → KB Invalidation

```
calendarStore.logOutfit() success
        │
        ▼
  clearKBCache()  ← lib/knowledgeBase.ts
        │
        ▼
  Next useSmartSuggestions mount
        │
        ▼
  getKnowledgeBase() → cache miss → recompute
```

### Pin/Regenerate with Mixed Sources

```
regenerateWithPinned(index)
        │
        ├─ suggestion[index].source === 'user'?
        │    YES → toast "Tu outfit no se regenera"; return
        │    NO  → continue
        │
        ▼
  GET /outfits/suggestions?preferredGarmentIds=...
        │
        ▼
  Keep pinned items at original positions
  Replace unpinned slots with API response
  Preserve source metadata for all slots
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `types/index.ts` | Modify | Add `source: 'ai' \| 'user'` and `lastUsed?: string` to `Suggestion` |
| `lib/knowledgeBase.ts` | Create | Pure `computePatterns()` + cached `getKnowledgeBase()` with AsyncStorage |
| `lib/userSuggestionPicker.ts` | Create | `pickUserSuggestions(outfits, calendarEntries, count)` — most-ancient selection |
| `hooks/useSmartSuggestions.ts` | Create | Orchestrates ratio, KB, AI fetch, user pick, merge |
| `store/suggestionsStore.ts` | Modify | Add `userSuggestions`, `mergedSuggestions` state; dedupe 3→4; pin index range 0-3 |
| `components/SuggestionCard.tsx` | Create | Source badge ("IA" / "Tu outfit") + last-used line |
| `lib/i18n.ts` | Modify | Add `smartSuggestions.*` keys (EN + ES) |

## Interfaces / Contracts

```typescript
// types/index.ts — Suggestion (modified)
export interface Suggestion {
  name: string;
  occasion: string;
  description: string;
  garmentIds: string[];
  reasoning: string;
  source: 'ai' | 'user';          // NEW
  lastUsed?: string;               // NEW — ISO date, undefined if never worn
}

// lib/knowledgeBase.ts — NEW
export interface DayPattern {
  dayOfWeek: number;               // 0=Mon…6=Sun
  topOccasion: string | null;
  topStyles: string[];
  entryCount: number;
}

export interface KnowledgePatterns {
  hasEnoughData: boolean;
  patterns: DayPattern[] | null;
}

export function computePatterns(
  entries: CalendarLogEntry[],
  outfits: Outfit[],
): KnowledgePatterns;

export function getKnowledgeBase(): Promise<KnowledgePatterns>;
export function clearKBCache(): Promise<void>;

// lib/userSuggestionPicker.ts — NEW
export function pickUserSuggestions(
  outfits: Outfit[],
  calendarEntries: CalendarLogEntry[],
  count: number,
): Suggestion[];

// store/suggestionsStore.ts — modified state
interface SuggestionsState {
  // ... existing ...
  userSuggestions: Suggestion[];       // NEW
  mergedSuggestions: Suggestion[];     // NEW — final ≤4 list
  setUserSuggestions: (s: Suggestion[]) => void;
  mergeSuggestions: () => void;        // NEW — dedupe AI + user → mergedSuggestions
}

// hooks/useSmartSuggestions.ts — NEW
export function useSmartSuggestions(): {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
};
```

## Cache Strategy

- **KB cache key**: `@closetly/kb_patterns`
- **TTL**: 24 hours (stored as `{ data, timestamp }` in AsyncStorage)
- **Invalidation**: `clearKBCache()` called after `calendarStore.logOutfit()` success
- **Cold start**: If total entries <5, return `{ hasEnoughData: false, patterns: null }`
- **Scope**: Only entries from last 3 months are analyzed

## Error Handling Strategy

| Failure | Behavior |
|---------|----------|
| KB cache read fails | Recompute from entries (no crash) |
| KB recomputation throws | Return `{ hasEnoughData: false, patterns: null }` |
| AI API fails | `error` set in hook; `suggestions` empty (no partial display) |
| User picker has <N outfits | Fill remaining slots with AI suggestions (ratio degrades gracefully) |
| AsyncStorage unavailable | KB always recomputes (no caching) — slower but functional |

## Performance Considerations

- **KB compute**: Pure sync function over ≤90 entries (3 months × ~3/day) — negligible
- **User picker**: Sort ≤50 outfits — negligible
- **No render-time computation**: All heavy work runs on mount or calendar change, not during render
- **AI fetch**: Existing `fetchSuggestions` pattern (already cached daily)
- **AsyncStorage reads**: Single key read on mount, not per-render

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `computePatterns` — scoring, recency weight, cold start | Pure function: call with fixtures, assert output |
| Unit | `pickUserSuggestions` — most-ancient, never-worn, count | Pure function: call with fixtures, assert selection |
| Unit | `dedupeSuggestions` — 4-limit, cross-source dedup | Pure function: call with mixed sources, assert ≤4 unique |
| Integration | `useSmartSuggestions` — ratio computation, merge, error | Mock stores + API, assert hook output |
| UI | `SuggestionCard` — badge rendering, lastUsed formatting | Snapshot or render test |

## Migration / Rollout

No data migration required. `Suggestion` type is additive (`source` and `lastUsed` are new fields). Existing AI suggestions from API already have `source: 'ai'` assigned at the hook level (not from backend). No feature flag needed — the ratio is always active.

## Open Questions

- [ ] Should the KB pass patterns to the AI API call as context (e.g., "user wears formal on Mondays")? Specs don't require this but it's a natural extension.
- [ ] `SuggestionCard.tsx` — is this a new file or does the existing `SuggestionDetailModal` need modification? Proposal lists it as a new component; confirm if suggestion cards are rendered inline or via modal.
- [ ] Calendar entries are loaded month-by-month. The KB needs last-3-months data. Should the hook trigger `loadMonth` for current + 2 previous months, or assume entries are already loaded?
