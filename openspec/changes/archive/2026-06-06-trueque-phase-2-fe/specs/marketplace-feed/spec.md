# Marketplace Feed — Frontend Specification

## Purpose

Provide an unauthenticated browse experience for all public garments, showing listing type badges and offering pull-to-refresh.

## Requirements

### REQ-MKT-FE-1: Marketplace tab in bottom nav

A `Tabs.Screen` named `marketplace` MUST appear between `collections` and `profile` in the bottom tab navigator. The icon MUST be `storefront-outline` from Ionicons.

#### Scenario: Tab renders between Collections and Profile

- GIVEN the app is authenticated
- WHEN the bottom tab bar is rendered
- THEN a "Marketplace" tab with a storefront icon appears between Collections and Profile

#### Scenario: Tab navigates to marketplace

- GIVEN the user is on any tab
- WHEN they tap the Marketplace tab
- THEN the screen navigates to `app/(tabs)/marketplace.tsx`

### REQ-MKT-FE-2: Fetch public garments

The marketplace screen MUST call `GET /garments/public` using `apiClient.get` with `requiresAuth: false`. The response follows `PaginatedApiResponse<Garment>`.

#### Scenario: Loading public garments

- GIVEN the marketplace screen mounts
- WHEN it fetches `/garments/public`
- THEN the request has no `Authorization` header
- AND the response contains `{ data, total, hasMore }`

#### Scenario: Network error

- GIVEN the API is unreachable
- WHEN the fetch fails
- THEN an error message is displayed
- AND the user can pull-to-refresh to retry

### REQ-MKT-FE-3: Garment card with listing badge

Each item in the feed MUST display the garment image, name, and a listing type badge (colored pill with the localized listing type label). The badge MUST use distinct colors per type: sell (green), trade (purple), giveaway (orange).

#### Scenario: Listing badge displayed

- GIVEN a public garment with `listingType: 'trade'`
- WHEN rendered in the feed
- THEN a purple "Trade" badge is visible on the card

#### Scenario: Private garments excluded

- GIVEN the BE returns only `is_public = true` garments
- WHEN rendered in the feed
- THEN no private garments appear

### REQ-MKT-FE-4: FlatList with pull-to-refresh

The feed MUST use a React Native `FlatList` with `onRefresh` and `refreshing` props for pull-to-refresh. Pagination SHOULD use `onEndReached` for infinite scroll.

#### Scenario: Pull-to-refresh

- GIVEN garments are displayed in the feed
- WHEN the user pulls down
- THEN the list refreshes from the API
- AND stale data is replaced

#### Scenario: Infinite scroll

- GIVEN `hasMore` is `true`
- WHEN the user scrolls to the bottom
- THEN the next page is fetched
- AND new items are appended

### REQ-MKT-FE-5: Empty state

When no public garments exist, the screen MUST show the `EmptyState` component with title "Publica tu primera prenda" and a message encouraging users to make a garment public.

#### Scenario: No public garments

- GIVEN no garments have `is_public = true`
- WHEN the marketplace screen loads
- THEN the `EmptyState` component is displayed
- AND the title reads "Publica tu primera prenda"

#### Scenario: After first public garment

- GIVEN the `EmptyState` was shown
- WHEN the first public garment is created and the feed refreshes
- THEN the feed shows the garment card instead of the empty state

### REQ-MKT-FE-6: i18n keys added

The `i18n.ts` translations MUST include a `marketplace` block with keys for the tab title, screen title, empty state title/message, and listing type labels. Both `en` and `es` locales MUST be supported.

#### Scenario: English marketplace keys

- GIVEN locale is `en`
- WHEN the marketplace screen title is accessed
- THEN it returns "Marketplace"

#### Scenario: Spanish marketplace keys

- GIVEN locale is `es`
- WHEN the listing type `sell` label is accessed
- THEN it returns "Vender"
