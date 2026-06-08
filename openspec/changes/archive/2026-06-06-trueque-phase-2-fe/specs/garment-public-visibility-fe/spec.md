# Garment Public Visibility — Frontend Specification

## Purpose

Let users mark garments as publicly visible with a listing intent (sell, trade, giveaway) during create and edit. This is the FE counterpart of the BE `garment-public-visibility` capability.

## Requirements

### REQ-VIS-FE-1: Types extended

A `ListingType = 'sell' | 'trade' | 'giveaway'` type MUST be added. The `Garment` model and both DTOs MUST include `isPublic?: boolean` and `listingType?: ListingType`.

#### Scenario: Garment with listing fields

- GIVEN a garment with `isPublic: true`, `listingType: 'trade'`
- WHEN the entity is read from the store
- THEN both fields are present

#### Scenario: Private garment has no listingType

- GIVEN a garment with `isPublic: false`
- THEN `listingType` is `undefined`

### REQ-VIS-FE-2: Create form visibility toggle

The garment create form MUST include a `is_public` toggle (Switch component) with a tooltip explaining that public garments are visible to everyone in the marketplace.

#### Scenario: Toggle visible in create form

- GIVEN the create garment screen
- WHEN the user scrolls to the visibility section
- THEN a Switch labeled "Public" is rendered

#### Scenario: Toggle tooltip displayed

- GIVEN the visibility toggle
- WHEN the user taps the info icon next to it
- THEN a tooltip explains "Visible to everyone in the marketplace"

### REQ-VIS-FE-3: Listing type dropdown

When `is_public` is enabled, a `listing_type` dropdown MUST appear with options `sell`, `trade`, `giveaway`. Each option MUST show a short description hint.

#### Scenario: Dropdown appears when public

- GIVEN `is_public` is OFF
- WHEN the user enables it
- THEN a listing type picker appears below the toggle

#### Scenario: Dropdown hidden when private

- GIVEN `is_public` is ON
- WHEN the user disables it
- THEN the listing type picker disappears

### REQ-VIS-FE-4: Edit form reflects current values

The edit form MUST pre-populate `is_public` and `listing_type` from the loaded garment.

#### Scenario: Edit shows existing listing

- GIVEN a garment with `isPublic: true`, `listingType: 'sell'`
- WHEN the edit screen loads
- THEN the toggle is ON and dropdown shows "sell"

### REQ-VIS-FE-5: Payload excludes listingType when private

When creating or updating, if `is_public` is `false`, `listing_type` MUST NOT be sent to the BE.

#### Scenario: Private garment omits listingType

- GIVEN a garment with `is_public: false`
- WHEN the user saves
- THEN the API payload contains no `listing_type` field

### REQ-VIS-FE-6: Store forwards new fields

`useGarmentsStore.createGarment` and `updateGarment` MUST forward `isPublic` and `listingType` to the service.

#### Scenario: Store passes fields through

- GIVEN a create with `isPublic: true`, `listingType: 'giveaway'`
- WHEN `createGarment` is called
- THEN the service receives both fields

### REQ-VIS-FE-7: Service includes new fields

`garmentService.createGarment` MUST append `is_public` and `listing_type` to FormData. `garmentService.updateGarment` MUST include them in the JSON body.

#### Scenario: Create sends FormData fields

- GIVEN `createGarment` is called with `isPublic: true`, `listingType: 'sell'`
- WHEN the FormData is constructed
- THEN it contains `is_public` and `listing_type`

#### Scenario: Update sends JSON fields

- GIVEN `updateGarment` is called with `isPublic: false`
- WHEN the JSON body is built
- THEN `listing_type` is omitted

### REQ-VIS-FE-8: i18n keys added

Translations MUST exist for "Public", the listing type labels, the listing type descriptions, and the visibility tooltip, in both `en` and `es` locales.

#### Scenario: English keys present

- GIVEN locale is `en`
- WHEN the translation for listing type `sell` is accessed
- THEN it returns "Sell"

#### Scenario: Spanish keys present

- GIVEN locale is `es`
- WHEN the translation for "Public" toggle is accessed
- THEN it returns "Público"

### REQ-VIS-FE-9: No listing info in closet

The existing `GarmentCard` component MUST NOT show any listing badge or visibility indicator when rendered in the closet tab.

#### Scenario: Closet card hides listing

- GIVEN a garment with `isPublic: true`, `listingType: 'sell'`
- WHEN rendered inside `(tabs)/closet`
- THEN no "Sell" badge or public icon appears
