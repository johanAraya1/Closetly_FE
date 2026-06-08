# Proposal: Trueque Phase 2 — Marketplace FE

## Intent

Enable users to list garments publicly for sell/trade/giveaway and browse the public marketplace feed. Phase 1 (BE) already ships `is_public` and `listing_type` columns + unauthenticated public endpoints — this phase wires the FE to use them.

## Scope

### In Scope
- Extend `Garment` / `CreateGarmentDTO` / `UpdateGarmentDTO` with `is_public` and `listing_type` fields
- Reusable `GarmentVisibilityForm` component (Switch + conditional listing type dropdown)
- Wire new fields through create flow (create.tsx handles both create and edit via `isEditMode`)
- Pass fields through Zustand store and garment service (FormData for create, JSON for update)
- New Marketplace tab between Collections and Profile in bottom nav
- Basic marketplace screen consuming `GET /garments/public` (unauthenticated, flat list)
- i18n keys for listing types, tooltip, and marketplace screen
- `LISTING_TYPES` constant

### Out of Scope
- Advanced filtering/search on marketplace
- Garment detail page in marketplace context
- Chat/messaging integration
- User public profiles
- Image optimization for public feed

## Capabilities

### New Capabilities
- `marketplace-feed`: Public browse of listed garments with listing type badges

### Modified Capabilities
None — no existing spec changes, this is additive only.

## Approach

1. **Types**: Add `ListingType = 'sell' | 'trade' | 'giveaway'` and optional fields to all garment DTOs
2. **Constants**: Add `LISTING_TYPES` array following `GARMENT_CATEGORIES` pattern
3. **Component**: `GarmentVisibilityForm.tsx` — Switch for `is_public` (copy profile.tsx toggle pattern), tooltip explaining visibility, conditional dropdown for listing type with descriptive hints per option
4. **Create/Edit**: Import component into `create.tsx`, thread state into `handleCreate`/`handleUpdate`
5. **Store**: Forward `is_public` and `listing_type` in `createGarment`/`updateGarment` payloads
6. **Service**: Append new fields to FormData (create) and JSON body (update)
7. **Marketplace tab**: Add `Tabs.Screen` in `_layout.tsx` with storefront icon, route to new screen
8. **Marketplace screen**: `FlatList` calling `apiClient.get('/garments/public', { requiresAuth: false })`, display image + name + listing type badge
9. **i18n**: Add `marketplace.*` block and `garments.listingType.*` keys in both locales

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `types/index.ts` | Modified | Add `ListingType`, extend 3 DTOs |
| `lib/constants.ts` | Modified | Add `LISTING_TYPES` |
| `components/GarmentVisibilityForm.tsx` | New | Reusable toggle + dropdown |
| `app/garments/create.tsx` | Modified | Import component, pass new fields |
| `store/garmentsStore.ts` | Modified | Forward `is_public`, `listing_type` |
| `services/garmentService.ts` | Modified | Append fields to FormData/JSON |
| `app/(tabs)/_layout.tsx` | Modified | Add marketplace tab |
| `app/(tabs)/marketplace.tsx` | New | Public feed screen |
| `lib/i18n.ts` | Modified | Add translation keys |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| BE naming mismatch (`is_public` vs snake_case) | Low | Verify field names against Phase 1 schema before coding |
| Public endpoint returns auth error | Low | Use `requiresAuth: false` — confirmed `apiClient` supports it |
| No edit screen exists (create.tsx handles both) | None | Add fields to same component — no `[id]/edit.tsx` file to modify |

## Rollback Plan

- Revert all file changes via git
- No DB migration needed (Phase 1 already ships columns)
- Marketplace tab removal: delete screen, remove `Tabs.Screen` from layout
- Feature-flag: marketplace tab can be commented out without breaking other screens

## Dependencies

- Phase 1 BE deployed and public endpoints active
- `GET /garments/public` and `GET /garments/public/:userId` returning data

## Success Criteria

- [ ] Garment create form shows `is_public` toggle with tooltip
- [ ] Listing type dropdown appears only when toggle is ON
- [ ] Created garments persist `is_public` and `listing_type` to BE
- [ ] Marketplace tab renders in bottom nav
- [ ] Marketplace screen loads public garments without auth
- [ ] TypeScript compiles with `tsc --noEmit` (no new errors)
