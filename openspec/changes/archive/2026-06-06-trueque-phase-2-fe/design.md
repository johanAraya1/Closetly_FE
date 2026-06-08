# Diseño Técnico: Trueque Phase 2 — Marketplace FE

## Enfoque Técnico

Extensión aditiva al patrón existente **Screen → Hook → Store → Service → API**. Se agregan dos flujos: (1) visibilidad pública + listing type en creación/edición de prendas, y (2) feed público no autenticado en un nuevo tab. Sin cambios a componentes existentes del closet — `GarmentCard` queda intacto (spec REQ-VIS-FE-9).

## Decisiones de Arquitectura

| Decisión | Opciones | Elección | Razón |
|----------|----------|----------|-------|
| Tooltip de visibilidad | Modal / texto inline / Alert | `Alert.alert` al tocar icono `information-circle` | No hay componente Tooltip en el codebase; Alert es el patrón usado para mensajes informativos (create.tsx usa `Alert.alert` para AI detection). |
| Dropdown listing type | Picker lib / chips / Modal con opciones | Modal custom con opciones y descripciones | No hay dependencia de picker; el patrón Modal ya existe y se usa extensivamente. |
| Badge en marketplace | Prop opcional en `GarmentCard` / componente separado | Componente `ListingTypeBadge` autónomo + render en marketplace | `GarmentCard` no debe conocer marketplace (REQ-VIS-FE-9). Badge se renderiza como overlay separado en el `FlatList` item. |
| Store del marketplace | Extender `garmentsStore` / store nueva | `marketplaceStore.ts` nueva | `garmentsStore` requiere auth y maneja prendas del usuario; marketplace es público y un concern distinto. |
| Llamada API pública | `fetchWithTimeout` directo / `apiClient` | `apiClient.get('/garments/public', { requiresAuth: false })` | `apiClient` ya soporta `requiresAuth: false`; centraliza retry, timeout y error handling. |

## Flujo de Datos

### Creación/Edición con Visibilidad

```
create.tsx
  │  useState: isPublic, listingType
  │  GarmentVisibilityForm (Switch + Modal picker condicional)
  │
  ▼
useGarments.createGarment / updateGarment
  │
  ▼
garmentsStore.createGarment(data: CreateGarmentDTO)
  │  isPublic → is_public (snake_case en FormData/JSON)
  │  listingType → listing_type (omitido si isPublic=false)
  ▼
garmentService.createGarment (FormData) / updateGarment (JSON)
  │
  ▼
POST /garments (auth) / PUT /garments/:id (auth)
```

**Payload create (FormData)**: `name`, `category`, `season`, `color`, `brand`, `size`, `notes`, `image`, `is_public`, `listing_type` (solo si `is_public=true`).

**Payload update (JSON)**: `{ name?, category?, ..., is_public?, listing_type? }` — mismo condicional.

### Marketplace Feed

```
marketplace.tsx (FlatList)
  │  onRefresh → loadPublicGarments()
  │  onEndReached → loadMore()
  ▼
marketplaceStore
  │  getPublicGarments(page, limit)
  ▼
marketplaceService
  │  apiClient.get('/garments/public?limit=X&offset=Y', { requiresAuth: false })
  ▼
GET /garments/public (sin auth)
  │  Retorna PaginatedApiResponse<Garment> = { data: Garment[], total, hasMore }
  ▼
marketplaceStore actualiza state: garments[], isLoading, hasMore, page
```

## Cambios por Archivo

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `types/index.ts` | Modificar | Agregar `ListingType`, extender `Garment`, `CreateGarmentDTO`, `UpdateGarmentDTO` |
| `lib/constants.ts` | Modificar | Agregar `LISTING_TYPES` array con `{ value, labelKey, descriptionKey, color }` |
| `lib/i18n.ts` | Modificar | Agregar `marketplace.*`, `garments.listingType.*`, `garments.visibility.*` en EN y ES |
| `components/GarmentVisibilityForm.tsx` | **Nuevo** | Switch + icono tooltip + Modal picker condicional con descripciones |
| `components/ListingTypeBadge.tsx` | **Nuevo** | Pill de color con label localizado para listing type |
| `components/index.ts` | Modificar | Exportar `GarmentVisibilityForm`, `ListingTypeBadge` |
| `store/marketplaceStore.ts` | **Nuevo** | Store Zustand para feed público: `garments[]`, `isLoading`, `hasMore`, `page`, `error` + acciones |
| `services/marketplaceService.ts` | **Nuevo** | `getPublicGarments(limit, offset)` → `apiClient.get('/garments/public')` |
| `services/garmentService.ts` | Modificar | Appendar `is_public`/`listing_type` a FormData (create) y JSON body (update) |
| `store/garmentsStore.ts` | Modificar | Forward `isPublic` y `listingType` en `createGarment`/`updateGarment` payloads |
| `hooks/useGarments.ts` | Sin cambios | Ya expone `createGarment`/`updateGarment` de la store |
| `app/garments/create.tsx` | Modificar | Importar `GarmentVisibilityForm`, agregar estados `isPublic`/`listingType`, precargar en edit mode, pasar al payload |
| `app/(tabs)/_layout.tsx` | Modificar | Agregar `Tabs.Screen` para marketplace entre collections y profile |
| `app/(tabs)/marketplace.tsx` | **Nuevo** | FlatList con ListingTypeBadge overlay, pull-to-refresh, infinite scroll, empty state |
| `utils/format.ts` | Modificar | Agregar `getListingTypeColor(type)` que retorna color según tipo |

## Interfaces / Contratos

```typescript
// types/index.ts — nuevos y extendidos
export type ListingType = 'sell' | 'trade' | 'giveaway';

export interface Garment {
  // ... existing fields
  isPublic?: boolean;
  listingType?: ListingType;
}

export interface CreateGarmentDTO {
  // ... existing fields
  isPublic?: boolean;
  listingType?: ListingType;
}

export interface UpdateGarmentDTO {
  // ... existing fields
  isPublic?: boolean;
  listingType?: ListingType;
}

// lib/constants.ts
export const LISTING_TYPES: { value: ListingType; labelKey: string; descriptionKey: string; color: string }[] = [
  { value: 'sell', labelKey: 'garments.listingType.sell', descriptionKey: 'garments.listingType.sellDescription', color: '#10B981' },
  { value: 'trade', labelKey: 'garments.listingType.trade', descriptionKey: 'garments.listingType.tradeDescription', color: '#8B5CF6' },
  { value: 'giveaway', labelKey: 'garments.listingType.giveaway', descriptionKey: 'garments.listingType.giveawayDescription', color: '#F97316' },
];

// services/marketplaceService.ts
export const getPublicGarments = async (
  limit?: number,
  offset?: number
): Promise<ApiResponse<Garment[]> & { total?: number; hasMore?: boolean }>;
```

## Estrategia de Pruebas

No hay infraestructura de testing (config.yaml: `testing.strict_tdd: false`, `testing.runner: none`). La verificación se hará mediante type check (`tsc --noEmit`) y build de export web (`npx expo export --platform web`).

## Migración / Rollout

No requiere migración de datos — Phase 1 BE ya agregó columnas `is_public` y `listing_type`. Rollout es un solo PR; rollback revierte el commit.

## Preguntas Abiertas

Ninguna — todas las decisiones están cubiertas por los specs y el análisis del codebase.
