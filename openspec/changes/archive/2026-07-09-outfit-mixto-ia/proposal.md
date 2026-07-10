# Proposal: Outfit Mixto IA

## Intent

El usuario tiene prendas que le gustan y quiere que la IA complete el outfit alrededor de ellas. Actualmente solo existe "Generar Outfit Aleatorio" (algoritmo local) y "Regenerar con pines" (en la pantalla de sugerencias). No hay forma de iniciar desde el Create Outfit screen con prendas base propias y recibir sugerencias completas del backend (Gemini).

## Scope

### In Scope
- Nueva sección "Outfit Mixto IA" debajo del grid de prendas en `create.tsx`
- Modo de selección dedicado: usuario elige 1-2 prendas como "base" para enviar a la IA
- Botón "Completar con IA" que llama a `GET /outfits/suggestions?preferredGarmentIds=...`
- Mostrar resultado en `OutfitPreview` con prendas "base" vs "sugeridas" diferenciadas visualmente
- Acciones post-sugerencia: Aceptar (pre-llena el formulario), Regenerar (nueva llamada), Limpiar
- Loading state, error handling, validación de max 2 prendas base
- Integración con el store existente (`suggestionsStore`)

### Out of Scope
- Modificar el flujo de "Generar Outfit Aleatorio" existente
- Modificar el flujo de pin/regenerate de la pantalla de sugerencias
- Persistir preferencia de prendas base entre sesiones
- Selección de occasion/style como parte del mixto IA (usar las que ya están en el form)

## Capabilities

### New Capabilities
- `outfit-mixto-ia`: Selección de prendas base + completar outfit con IA desde el Create Outfit screen

### Modified Capabilities
- None — no se modifican specs existentes

## Approach

1. **Store**: Agregar acción `mixOutfit(baseGarmentIds: string[])` en `suggestionsStore` que llama al endpoint existente con `preferredGarmentIds`
2. **UI**: Sección con toggle de selección de prendas base (reutiliza `toggleGarment` existente con flag `isMixMode`), botón "Completar con IA", indicador visual "base" vs "sugerida"
3. **Post-sugerencia**: Aceptar → `setSelectedGarments()` con el Suggestion result; Regenerar → rellamar `mixOutfit()`; Limpiar → resetear estado mix

## Affected Areas

| Area | Impact |
|------|--------|
| `app/outfits/create.tsx` | Sección "Outfit Mixto IA", estado `isMixMode`, `baseGarments`, `mixSuggestions` |
| `store/suggestionsStore.ts` | Acción `mixOutfit` (o extender `regenerateWithPinned` con contexto separado) |
| `components/OutfitPreview.tsx` | Soporte para badge "base" vs "sugerida" por garment |
| `lib/i18n/**` | Keys `mixto.*` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Conflicto de estado con "Generar Aleatorio" | Med | Estado separado (`isMixMode`), sección visualmente independiente |
| Gemini no completa outfit (pocas prendas en closet) | Baja | Mensaje de error friendly + opción de regenerar |

## Rollback

- Quitar sección "Outfit Mixto IA" del JSX
- Quitar acción `mixOutfit` del store
- No afecta ningún flujo existente (aleatorio, pin, regenerate)

## Dependencies

- Endpoint `GET /outfits/suggestions?preferredGarmentIds=...` ya funciona (no hay dependencia BE nueva)
- Tipos `Suggestion`, `SuggestionsResponse` ya existen

## Success Criteria

- [ ] Usuario puede seleccionar 1-2 prendas base y recibir sugerencia completa de IA
- [ ] Prendas "base" visualmente diferenciadas de las "sugeridas"
- [ ] Aceptar pre-llena el formulario con las prendas de la sugerencia
- [ ] Regenerar produce nueva sugerencia diferente
- [ ] Flujo "Generar Outfit Aleatorio" no se ve afectado
- [ ] Build pasa: `npx tsc --noEmit`
