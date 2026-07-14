# Proposal: Smart Suggestions

## Intent

Current suggestions are 100% AI-generated from `/outfits/suggestions`. Users with 15+ outfits rarely see their own clothing surfaced. Replace with a **hybrid system** that mixes AI suggestions with the user's least-used outfits, plus a lightweight **knowledge base** that adapts suggestions to day-of-week patterns. Result: suggestions feel personal, not generic.

## Scope

### In Scope
- Hybrid suggestion engine: ratio AI vs user-sourced by outfit count (3:1 → 2:2 → 1:3)
- "Most ancient" outfit selection: least-recently-worn, never-worn fallback, last-used-date display
- Day-of-week knowledge base: recency-weighted pattern detection from calendar logs (occasion + garment styles), cached in AsyncStorage with TTL
- `Suggestion` type extension: `source: 'ai' | 'user'`, optional `lastUsed?: string`
- Dedupe limit raised from 3 to 4 (adapts to ratio)
- UI differentiation: source badge (AI/User) on suggestion cards
- `useSmartSuggestions` hook: orchestrates ratio, knowledge base, and suggestion merging
- i18n keys for new UI elements

### Out of Scope
- Backend changes (all computation client-side)
- Seasonal/weather-aware user suggestion selection (AI handles weather context)
- Social features (sharing patterns, friend comparisons)
- Backend-side knowledge base or recommendation engine

## Capabilities

### New Capabilities
- `smart-suggestions`: Hybrid suggestion engine with AI/user ratio, knowledge base pattern detection, and source-aware UI
- `outfit-usage-knowledge`: Day-of-week pattern detection from calendar logs, AsyncStorage-cached knowledge base

### Modified Capabilities
- `suggestion-pin-regenerate`: Dedupe limit changes from 3→4; `Suggestion` type gains `source` field; regeneration logic must handle user-sourced suggestions

## Approach

1. **Knowledge Base** (`lib/knowledgeBase.ts`): Pure functions to compute day-of-week patterns from `CalendarLogEntry[]` + `Outfit[]`. Recency-weighted (last 30 days). Cached in AsyncStorage with 24h TTL + rebuild on new calendar entry.
2. **User Suggestion Picker** (`lib/userSuggestionPicker.ts`): Given outfit list + calendar entries, find most-ancient outfit per slot. Never-worn → random among unworn. Returns `Suggestion[]` with `source: 'user'`.
3. **Store Integration**: Extend `suggestionsStore` with `userSuggestions: Suggestion[]`, `mergedSuggestions: Suggestion[]`. Compute merged list after both AI and user suggestions resolve.
4. **Hook**: `useSmartSuggestions` subscribes to outfit count, calls knowledge base, orchestrates ratio selection, and returns merged list.
5. **UI**: Suggestion cards render source badge. User-sourced cards show last-used date or "Nunca usado".

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `types/index.ts` | Modified | Add `source`, `lastUsed` to `Suggestion` |
| `store/suggestionsStore.ts` | Modified | Dedupe 3→4, user suggestions state, merge logic |
| `lib/knowledgeBase.ts` | New | Pattern detection + AsyncStorage cache |
| `lib/userSuggestionPicker.ts` | New | Most-ancient outfit selection logic |
| `hooks/useSmartSuggestions.ts` | New | Orchestrates hybrid suggestions |
| `components/SuggestionCard.tsx` | Modified | Source badge + last-used display |
| `lib/i18n/**` | Modified | New keys for badges and labels |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Knowledge base computation blocks render | Medium | Compute in utility (pure functions), cache results; never call during render — only on mount/new entry |
| AsyncStorage cold start (first launch) | Low | Graceful fallback: no pattern → treat as "no data", all-AI suggestions |
| Calendar entries load heavy for users with many months | Medium | Only load last 3 months for pattern detection (not full history); knowledge base refreshes on new entry |
| Dedupe limit change breaks pin/regenerate flow | Low | Existing pin logic uses index 0-2; extend to 0-3 with guard on `pinnedGarmentIds` key range |

## Rollback Plan

- Revert `Suggestion` type changes (remove `source`, `lastUsed`)
- Remove `lib/knowledgeBase.ts` and `lib/userSuggestionPicker.ts`
- Remove `useSmartSuggestions` hook, revert `suggestionsStore` dedupe to 3
- Remove source badges from `SuggestionCard`
- No backend changes to revert

## Dependencies

- Existing `CalendarLogEntry[]` from `calendarStore` (month-by-month)
- Existing `Outfit[]` from `useOutfitsStore`
- `expo-secure-store` or `@react-native-async-storage/async-storage` for knowledge base cache

## Success Criteria

- [ ] Suggestions display 4 cards (when user has 6+ outfits) with correct AI/User ratio
- [ ] User-sourced cards show "Nunca usado" or last-used date
- [ ] Knowledge base detects day-of-week patterns from 5+ calendar entries
- [ ] Pattern detection falls back gracefully for new users (<5 entries)
- [ ] No UI jank: suggestion merge completes before render
- [ ] Pin/regenerate works correctly with mixed source suggestions
- [ ] `npx tsc --noEmit` passes
