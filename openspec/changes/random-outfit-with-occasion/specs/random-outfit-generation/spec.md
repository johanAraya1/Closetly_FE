# Random Outfit Generation Specification

## Purpose

Produce a coherent outfit from the user's garment collection using occasion and weather filters, then pre-fill the creation form for review and adjustment.

## Requirements

### Requirement: Outfit Composition

The generated outfit MUST include exactly 1 top and 1 bottom (or 1 dress replacing both) and exactly 1 pair of shoes. It MAY include up to 1 accessory and up to 1 outerwear layer. The system MUST NOT include garments from duplicate categories.

#### Scenario: Complete outfit with optional layers

- GIVEN the user has garments in all categories
- WHEN the system generates an outfit
- THEN it MUST contain a top, bottom, and shoes
- AND it MAY contain an accessory and/or outerwear
- AND no category SHALL appear more than once

#### Scenario: Dress replaces top and bottom

- GIVEN the user has at least one dress
- WHEN the dress is selected
- THEN the system MUST NOT also select a separate top or bottom

#### Scenario: Missing required categories

- GIVEN the user has no garments in at least one of: top, bottom, shoes
- WHEN generation is requested
- THEN the system MUST NOT generate an outfit
- AND MUST show a fallback message listing missing categories

### Requirement: Occasion Filtering

The system MUST provide these occasion options: Casual (default), Formal, Work, Sport, Date Night, Travel. Each occasion MUST map to a set of `GarmentStyle` values. When an occasion is selected, the system MUST only consider garments whose style matches at least one value in the mapping.

#### Scenario: Occasion narrows garment pool

- GIVEN the user selects "Formal"
- WHEN generating an outfit
- THEN only garments with styles in `['formal', 'elegante']` SHALL be eligible

#### Scenario: No garments match occasion

- GIVEN no garments match the selected occasion's style mapping
- WHEN generation is requested
- THEN the system MUST NOT generate an outfit
- AND MUST display "No garments match this occasion"

### Requirement: Weather-Aware Filtering

The system MUST read current weather conditions from `suggestionsStore`. When weather data is present, the system MUST exclude garments whose season is incompatible. When weather data is absent, the system MUST skip weather filtering and proceed with occasion filtering only.

#### Scenario: Weather excludes out-of-season garments

- GIVEN weather data indicates winter conditions
- WHEN generating an outfit
- THEN summer-only garments SHALL be excluded from the pool

#### Scenario: Weather data unavailable

- GIVEN `suggestionsStore` has no weather data
- WHEN generating an outfit
- THEN weather filtering SHALL be skipped
- AND the outfit SHALL use occasion filters alone

### Requirement: Regenerate

The system MUST provide a "Try another" action that re-randomizes the outfit while preserving the current occasion and weather filters.

#### Scenario: Re-randomize keeps filters

- GIVEN the user has a generated outfit with "Work" occasion
- WHEN the user taps "Try another"
- THEN a new outfit SHALL be generated
- AND the occasion SHALL remain "Work"

### Requirement: Review Before Save

The generated outfit MUST pre-fill the creation form's `selectedGarments` state. The user MUST be able to toggle any garment on or off before saving.

#### Scenario: Generated outfit pre-fills form

- GIVEN the system has generated an outfit
- WHEN the creation form renders
- THEN the selected garments SHALL appear as pre-filled in the garment grid
- AND the user MAY deselect any pre-filled garment
- AND the user MAY add other garments not in the generated set
