# Suggestion Pin & Regenerate — Specification

## Purpose

Let users pin garments from AI suggestions, then regenerate only unfilled slots while keeping pinned items fixed. Color harmony and style consistency MUST apply against pinned items during regeneration.

## BE Requirements

### REQ-PIN-BE-1: `preferredGarmentIds` param

`GET /outfits/suggestions` MUST accept optional `preferredGarmentIds` (comma-separated UUIDs). When present, treat as fixed slots and generate only remaining categories. When absent, unchanged.

| GIVEN | WHEN | THEN |
|-------|------|------|
| Pins [g1, g2] | `GET ...?preferredGarmentIds=g1,g2` | Keeps g1, g2; generates only remaining categories |
| No pins | `GET /outfits/suggestions` bare | All 3 suggestions independent — unchanged |

### REQ-PIN-BE-2: Gemini prompt with pinned constraints

When `preferredGarmentIds` present, BE SHALL inject filled categories (with pinned details), open categories, and rule that pinned items MUST stay while new items MUST NOT conflict in category, color, or style.

| GIVEN | WHEN | THEN |
|-------|------|------|
| Pinned: top + bottom | Gemini called | Prompt states filled cats; requests outerwear, shoes, accessories; enforces harmony vs pinned |
| All slots pinned | Regenerate called | BE returns 400 — no slots to regenerate |

## FE Requirements

### REQ-PIN-FE-1: Pin state in store

`suggestionsStore` MUST add `pinnedGarmentIds: Record<number, string[]>` (keyed 0-2) with actions `togglePin`, `clearPins`, `regenerateWithPinned`. Store SHALL validate same-category pins per suggestion.

| GIVEN | WHEN | THEN |
|-------|------|------|
| Suggestion 0 has 3 garments | `togglePin(0, "g1")` | `pinnedGarmentIds[0]` has "g1" |
| "g1" pinned in suggestion 0 | `togglePin(0, "g1")` again | "g1" removed |
| Pins exist | `regenerateWithPinned()` called | Store sends `GET ...?preferredGarmentIds=g1,g2` and merges keeping pinned items |

### REQ-PIN-FE-2: Pin toggle UI

Each garment in `SuggestionDetailModal` and home cards MUST render a pin icon. Icon SHALL toggle filled/outline. FE MUST reject same-category second pin within a suggestion.

| GIVEN | WHEN | THEN |
|-------|------|------|
| Modal open | Tap pin on "Blue Jacket" | Icon fills; store updates |
| Home card for suggestion 1 | Tap pin on "White Sneakers" | Icon fills; store updates |
| "T-Shirt" (top) pinned in suggestion 0 | Tap pin on "Blouse" (also top) | Pin rejected; toast "Solo podés fijar una {{category}}" |

### REQ-PIN-FE-3: "Regenerar con seleccionadas" button

Button visible when 1+ pinned. Disabled when 0 pinned OR all slots pinned.

| GIVEN | WHEN | THEN |
|-------|------|------|
| 1+ pinned | Home / suggestions rendered | Button visible and enabled |
| 0 pinned | Suggestions rendered | Button disabled (grayed) |
| All slots pinned | Suggestions rendered | Button disabled; helper "Ya fijaste todas" |

### REQ-PIN-FE-4: Merge pinned with regenerated response

On success, FE MUST replace only unpinned slots. Pinned items MUST keep original positions, indices, IDs.

| GIVEN | WHEN | THEN |
|-------|------|------|
| Suggestion 0: [top: pinned, bottom: pinned, shoes: free] | Returns [top: newA, bottom: newB, shoes: newC] | Displayed: [top: pinned, bottom: pinned, shoes: newC] |

### REQ-PIN-FE-5: i18n keys

Translations MUST include `suggestionPin` block.

| Key | EN | ES |
|-----|----|----|
| `pin.pinLabel` | "Keep this item" | "Mantener esta prenda" |
| `pin.unpinLabel` | "Remove pin" | "Quitar pin" |
| `pin.regenerateWithPinned` | "Regenerate with selected" | "Regenerar con seleccionadas" |
| `pin.sameCategoryError` | "Can only pin one {{category}} per suggestion" | "Solo podés fijar una {{category}} por sugerencia" |
| `pin.allPinned` | "All items already pinned" | "Ya fijaste todas las prendas" |
| `pin.noSlots` | "No slots to regenerate" | "No hay espacios para regenerar" |
