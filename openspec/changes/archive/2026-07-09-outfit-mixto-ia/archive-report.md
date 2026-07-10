# Informe de Archivo: Outfit Mixto IA

**Fecha de archive**: 2026-07-09
**Veredicto de verificación**: PASS WITH WARNINGS
**Tasks completados**: 6/6

---

## 1. Resumen del cambio

Se implementó un nuevo flujo en la pantalla **Create Outfit (`create.tsx`)** que permite al usuario seleccionar 1-2 prendas como "base" y delegar a la IA (Gemini vía `GET /outfits/suggestions?preferredGarmentIds=...`) la generación del outfit completo alrededor de esas prendas.

El feature agrega:
- **Store independiente** `mixOutfitStore.ts` con estado y acción `mixOutfit()`
- **Sección "Outfit Mixto IA"** en `create.tsx` con toggle de modo, selección de base garments (máx 2), botón "Completar con IA"
- **Badge visual** en `OutfitPreview.tsx` para diferenciar prendas base (ámbar) de sugeridas por IA
- **Acciones post-sugerencia**: Aceptar (pre-llena formulario), Regenerar, Limpiar
- **Keys i18n** para español/inglés

## 2. Archivos modificados

### Nuevos

| Archivo | Descripción |
|---------|-------------|
| `store/mixOutfitStore.ts` | Store Zustand con estado `{mixSuggestion, mixGarments, mixLoading, mixError}` y acciones `mixOutfit(baseGarmentIds)` y `clearMix()`. Reusa `apiClient.get<SuggestionsResponse>` con endpoint `/outfits/suggestions`. |

### Modificados

| Archivo | Descripción |
|---------|-------------|
| `app/outfits/create.tsx` | +~120 líneas: estado local `isMixMode`, `baseGarments[]`, toggle de modo mix, selección de base con validación (max 2), botón "Completar con IA", preview mixto con base + sugeridas, acciones Aceptar/Regenerar/Limpiar. La sección "Generar Outfit Aleatorio" se oculta cuando `isMixMode` está activo. |
| `components/OutfitPreview.tsx` | +prop opcional `baseGarmentIds?: Set<string>`, badge "BASE" con fondo ámbar `#F59E0B` para prendas en el set. |
| `lib/i18n.ts` | +7 keys i18n para en/es: `mixSectionTitle`, `mixSelectHint`, `mixButton`, `mixMaxReached`, `mixAccept`, `mixRegenerate`, `mixClear`. |

## 3. Decisiones clave de arquitectura

| Decisión | Opción | Elegida | Razón |
|----------|--------|---------|-------|
| Store | Extender `suggestionsStore` vs nuevo store | **Nuevo `mixOutfitStore.ts`** | El store existente maneja sugerencias por clima con caché diario, 3 suggestions, pinning — lógica distinta. Store nuevo (~60 líneas) evita acoplamiento y violación de SRP. |
| Estado UI | Store vs estado local | **Local state** | `isMixMode`, `baseGarments[]` son locales al Create screen. Store solo para la acción `mixOutfit` y el resultado. |
| Preview diff | Componente separado vs prop | **Prop `baseGarmentIds`** | Mínimo impacto: `OutfitPreview` filtra por `Set` y muestra badge. Sin romper contrato existente. |
| Separación flujos | — | **Flag `isMixMode`** | Cuando activo, oculta "Generar Outfit Aleatorio" y el grid opera en modo "base" en lugar de toggle normal. El estado `selectedGarments` no se toca hasta "Aceptar". |

## 4. Limitaciones conocidas

- **Sin tests unitarios ni de integración**: No existen tests automatizados para `mixOutfitStore`, `OutfitPreview` con `baseGarmentIds`, ni el flujo mix en `create.tsx`. La verificación fue exclusivamente estática.
- **Store depende de i18n**: `mixOutfitStore.ts` importa `i18n` solo para obtener `i18n.locale`. Sería más limpio pasar `locale` como parámetro.
- **Empty suggestions no manejado**: Si la API responde con `data.suggestions` vacío, `mixSuggestion` queda en `null` sin error ni feedback para el usuario.
- **Drops silenciosos en accept**: `handleAcceptMix` mapea `garmentIds` a `mixGarments` con filtro `as Garment[]`. Si un ID no existe en `mixGarments`, se pierde silenciosamente.
- **Desviación de naming**: El store implementado usa prefijo `mix` en todas las props (`mixSuggestion`, `mixGarments`, etc.) mientras el diseño especificaba `suggestion`, `garments`. Las keys i18n implementadas también difieren de las especificadas en tasks. No afecta funcionalidad.

## 5. Delta spec — Lo que el próximo developer necesita saber

### Nuevas capacidades agregadas

- **`GET /outfits/suggestions?preferredGarmentIds={ids}&locale={locale}`**: El endpoint existente ahora se usa desde `create.tsx` vía `mixOutfitStore.mixOutfit()`. Espera 1-2 IDs de prendas base. Devuelve `SuggestionsResponse` estándar.

### Store API

```typescript
// store/mixOutfitStore.ts
interface MixOutfitState {
  mixSuggestion: Suggestion | null;
  mixGarments: Garment[];
  mixLoading: boolean;
  mixError: string | null;
  mixOutfit: (baseGarmentIds: string[]) => Promise<void>;
  clearMix: () => void;
}
```

### UI contratos

- **`OutfitPreview`** ahora acepta prop opcional `baseGarmentIds?: Set<string>`. Cuando se pasa, las prendas en el set muestran badge "BASE" ámbar.
- **Flag `isMixMode`** en `create.tsx`: cuando `true`, el tap en grid opera como selección de base (max 2) en lugar de toggle normal.
- **`mixSuggestion !== null`**: renderiza preview MIX en lugar del preview normal de `selectedGarments`.

### Flujo típico

1. Usuario activa toggle "Outfit Mixto IA"
2. Grid cambia a modo selección base (borde ámbar)
3. Usuario selecciona 1-2 prendas (tercera bloqueada con alerta)
4. Presiona "Completar con IA" → loading → API → preview con badges
5. Opciones: **Aceptar** (merge a `selectedGarments`, resetea mix), **Regenerar** (nueva llamada), **Limpiar** (resetea)

### Cómo interactúa con flujos existentes

- **No afecta** "Generar Outfit Aleatorio" — se oculta cuando `isMixMode` está activo
- **No afecta** pin/regenerate de la pantalla de sugerencias — store separado
- **selectedGarments** no se modifica hasta que usuario presiona "Aceptar"

## 6. Próximos pasos

| Prioridad | Mejora | Detalle |
|-----------|--------|---------|
| Alta | Agregar tests unitarios | Testear `mixOutfitStore`: mock `apiClient.get`, assert loading/success/error states |
| Alta | Agregar tests de integración | Renderizar `create.tsx` con store mockeado, validar flujo E1-E7 |
| Media | Separar dependencia de i18n en store | Pasar `locale` como parámetro en lugar de importar `i18n` global |
| Media | Manejar empty suggestions | Si API responde con `suggestions` vacío, mostrar mensaje amigable |
| Media | Validar drops en accept | Agregar logging o validación si un `garmentId` de la sugerencia no existe en `mixGarments` |
| Baja | Alinear naming store con diseño | Renombrar props en `mixOutfitStore` para coincidir con el contrato documentado |
| Baja | Agregar key i18n separada para "Regenerar" | Actualmente reusa `common.retry`, podría tener key dedicada |

---

*Archivado desde `openspec/changes/outfit-mixto-ia/` → `openspec/changes/archive/2026-07-09-outfit-mixto-ia/`*
