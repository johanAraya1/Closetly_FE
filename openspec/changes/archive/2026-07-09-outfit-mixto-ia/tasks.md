# Tasks: Outfit Mixto IA

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220-270 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Fase 1: Store e i18n

- [x] P1.1 Crear `store/mixOutfitStore.ts` — Zustand store con estado `{suggestion, garments, isLoading, error}`, acción `mixOutfit(baseGarmentIds: string[])` y `resetMix()`. Reusa `apiClient.get` desde `@/utils/apiClient` con endpoint `/outfits/suggestions?preferredGarmentIds=&locale=`. Verificación: importar store, llamar `mixOutfit(['id1','id2'])`, asertar loading→success con `SuggestionsResponse`.
- [x] P1.2 Agregar keys i18n en `lib/i18n.ts` para en/es: `create.mixMode`, `create.mixSelectHint`, `create.mixComplete`, `create.mixMaxBase`, `create.mixError`, `create.mixAccept`, `create.mixRegenerate`, `create.mixClear`. Verificación: `npx tsc --noEmit` y ver keys visibles en `t()`.

## Fase 2: UI en create.tsx

- [x] P2.1 Agregar estado local en `app/outfits/create.tsx`: `isMixMode`, `baseGarments`, `mixSuggestion`, `mixGarments`, `mixLoading`, `mixError`. Renderizar toggle "Outfit Mixto IA" como sección entre preview y grid. Verificación: toggle visible, al activarlo ocultar "Generar Outfit Aleatorio".
- [x] P2.2 Implementar selección de prendas base: cuando `isMixMode=true`, el tap en el grid llama toggle base (max 2, validar, borde ámbar). No afecta `selectedGarments`. Verificación: seleccionar 2 prendas muestra borde ámbar, 3ra intentada bloquea con feedback.
- [x] P2.3 Implementar botón "Completar con IA": deshabilitado si 0 base garments, loading con spinner, error con banner reusable (`mixError`). Verificación: 0 base → botón disabled; 1-2 base → llama store; API error → muestra error + reintentar.
- [x] P2.4 Implementar post-sugerencia: preview del resultado mix (base + sugeridas), botones "Aceptar" (merge a `selectedGarments`, resetea mix mode), "Regenerar" (re-llama mixOutfit), "Limpiar" (resetea estado mix). Verificación: aceptar pre-llena form, regenerar nueva llamada, limpiar vuelve a estado inicial.

## Fase 3: Preview con badges

- [x] P3.1 Agregar prop opcional `baseGarmentIds?: Set<string>` en `components/OutfitPreview.tsx`. Renderizar badge "BASE" (fondo ámbar #F59E0B) para prendas en el set. Sin badge para las sugeridas. Verificación: pasar `baseGarmentIds={new Set(['id1'])}`, la prenda id1 muestra badge ámbar.

## Fase 4: Verificación

- [x] P4.1 Verificar que el flujo aleatorio existente en `create.tsx` no se vea afectado: generar outfit aleatorio, dismiss, pin, regenerar, cambiar estilo — todo funciona igual. Verificación: `npx tsc --noEmit` + test manual de cada escenario del spec (E1-E7).
