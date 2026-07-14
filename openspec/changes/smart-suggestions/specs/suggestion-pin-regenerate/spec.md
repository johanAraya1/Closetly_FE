# Suggestion Pin & Regenerate — Delta Spec

## ADDED Requirements

### REQ-PIN-FE-6: Dedupe limit increased to 4

The merged suggestion list (AI + user) SHALL be deduplicated by sorted `garmentIds` key and limited to 4 unique suggestions. Previously the limit was 3.

| Key | Old | New |
|---|---|---|
| Dedupe `.slice()` | `.slice(0, 3)` | `.slice(0, 4)` |

#### Scenario: Four unique suggestions retained

- GIVEN 5 unique suggestions from merged AI + user sources
- WHEN `dedupeSuggestions()` runs
- THEN 4 suggestions are returned (previously 3)

#### Scenario: Three unique suggestions pass through

- GIVEN 3 unique suggestions after deduplication
- WHEN limit is applied
- THEN all 3 are retained (limit is 4, not a forced pad)

### REQ-PIN-FE-7: Regeneration skips user-sourced slots

When regenerating a suggestion at a given index, if that suggestion has `source: 'user'`, the system SHALL NOT call the backend for that slot. The user-sourced suggestion SHALL remain unchanged.

#### Scenario: Regenerate on AI suggestion

- GIVEN suggestion at index 2 has `source: 'ai'` and pinned garments
- WHEN `regenerateWithPinned(2)` is called
- THEN the backend is called and only unpinned slots are regenerated

#### Scenario: Regenerate on user suggestion

- GIVEN suggestion at index 0 has `source: 'user'` with pinned garments
- WHEN `regenerateWithPinned(0)` is called
- THEN no backend call is made for that suggestion
- AND the user-sourced suggestion is preserved as-is
- AND a toast/message indicates "Tu outfit no se regenera"

## MODIFIED Requirements

### REQ-PIN-FE-1: Pin state in store

`suggestionsStore` MUST add `pinnedGarmentIds: Record<number, string[]>` (keyed 0-3) with actions `togglePin`, `clearPins`, `regenerateWithPinned`. Store SHALL validate same-category pins per suggestion.
(Previously: keyed 0-2 only)

#### Scenario: Suggestion 0 has 3 garments

- GIVEN suggestion 0 has 3 garments
- WHEN `togglePin(0, "g1")` is called
- THEN `pinnedGarmentIds[0]` has "g1"

#### Scenario: "g1" pinned in suggestion 0

- GIVEN "g1" is already pinned
- WHEN `togglePin(0, "g1")` is called again
- THEN "g1" is removed from pins

#### Scenario: Pins exist for index 3

- GIVEN suggestions has 4 items (index 0-3)
- WHEN `togglePin(3, "g5")` is called
- THEN `pinnedGarmentIds[3]` has "g5"
- AND the operation succeeds (previously would be out-of-range)

#### Scenario: Regenerate with pinned items

- GIVEN pins exist in suggestion 0
- WHEN `regenerateWithPinned()` is called
- THEN the store sends `GET ...?preferredGarmentIds=g1,g2` and merges keeping pinned items

### REQ-PIN-FE-4: Merge pinned with regenerated response

On success, FE MUST replace only unpinned slots. Pinned items MUST keep original positions, indices, IDs. User-sourced suggestions that are pinned MUST NOT be replaced by AI response.
(Previously: did not distinguish source type during merge)

#### Scenario: AI suggestion with pins

- GIVEN suggestion 0: [top: pinned, bottom: pinned, shoes: free]
- WHEN regenerated response returns [top: newA, bottom: newB, shoes: newC]
- THEN displayed: [top: pinned, bottom: pinned, shoes: newC]

#### Scenario: User suggestion preserved during merge

- GIVEN suggestion 1 has `source: 'user'` with pinned garment
- WHEN other suggestions are regenerated
- THEN suggestion 1 remains unchanged with its source and metadata intact
