# Informe de Archivo: Smart Suggestions

**Fecha de archive**: 2026-07-14
**Veredicto de verificación**: PASS WITH 3 WARNINGS (all fixed post-verify)
**Tasks completados**: 8/8 (6 originales + 2 fixes post-verify)
**Rama**: `dev` (stacked commits)

---

## 1. Resumen del cambio

Se implementó un motor híbrido de sugerencias que combina outfits generados por IA con outfits propios del usuario (los menos usados), con una proporción dinámica según la cantidad de outfits guardados.

### Componentes principales

- **Knowledge Base** (`lib/knowledgeBase.ts`): Patrones diarios con caché AsyncStorage (24h TTL), ponderación por recencia
- **User Suggestion Picker** (`lib/userSuggestionPicker.ts`): Selecciona outfits menos usados del usuario con criterio "most-ancient" y "never-worn" fallback
- **Hook `useSmartSuggestions`** (`hooks/useSmartSuggestions.ts`): Orquestador que computa ratio, carga KB, obtiene user suggestions + IA, mergea y deduplica
- **Store extendido** (`store/suggestionsStore.ts`): Soporte para `userSuggestions`, `mergedSuggestions`, merge con preservación de user slots, dedupe 3→4, pin guard 0-3
- **UI en `home.tsx`**: Badge de fuente (IA/Tu outfit), línea de último uso, refresh wiring al hook híbrido

## 2. Commits

| Commit | Mensaje | Archivos |
|--------|---------|----------|
| `6b0ce30` | feat(suggestions): add knowledge base, user picker, and extended suggestion store | `types/index.ts`, `lib/knowledgeBase.ts`, `lib/userSuggestionPicker.ts`, `store/suggestionsStore.ts` |
| `2e13767` | feat(suggestions): integrate smart suggestions hybrid engine into home screen | `hooks/useSmartSuggestions.ts`, `app/(tabs)/home.tsx`, `store/calendarStore.ts`, `lib/i18n.ts`, `openspec/changes/smart-suggestions/` |

## 3. Decisiones clave de arquitectura

| Decisión | Opciones | Elegida | Razón |
|----------|----------|---------|-------|
| Ratio | Fijo vs dinámico | **Dinámico (70/30 KB, 5/15 thresholds)** | Evita lock-in del usuario en IA cuando tiene pocos outfits; escala a más sugerencias de usuario con el tiempo |
| KB cache TTL | 12h vs 24h vs 48h | **24h** | Balance entre frescura de datos y evitar llamadas innecesarias |
| Occasion hint | Siempre vs probabilístico | **70% con KB data** | No saturar al usuario con la misma ocasión siempre; mantener variedad |
| AI failure | Mostrar user suggestions vs vacío | **Vacío con error** (spec REQ-SS-6) | Consistente con el diseño; evita confundir sugerencias de IA con propias |
| Store | Extender vs nuevo | **Extender `suggestionsStore`** | El store existente ya maneja sugerencias; agregar `userSuggestions` y `mergedSuggestions` evita duplicación de estado |

## 4. Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `lib/knowledgeBase.ts` | Knowledge base con patrones diarios, AsyncStorage cache, recency weighting |
| `lib/userSuggestionPicker.ts` | Picker de outfits menos usados con most-ancient sort |
| `hooks/useSmartSuggestions.ts` | Hook orquestador: ratio, KB + AI fetch, merge+dedupe, refresh() |
| `openspec/changes/smart-suggestions/` | Artefactos SDD completos (proposal, specs, design, tasks, apply-progress, verify-report) |

## 5. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `types/index.ts` | +`source: 'ai' \| 'user'`, +`lastUsed?: string` en `Suggestion` |
| `store/suggestionsStore.ts` | +userSuggestions, mergedSuggestions, mergeWithUserPreserved, dedupe 3→4, pin guard 0-3, Alert on user regen |
| `app/(tabs)/home.tsx` | Integración hook híbrido, source badge, last-used line, refresh/retry al hook |
| `store/calendarStore.ts` | +`clearKBCache()` en logOutfit |
| `lib/i18n.ts` | +4 keys smartSuggestions (sourceAI, sourceUser, neverWorn, lastUsed) + noRegenUser |

## 6. Warnings post-verify (todos corregidos)

| # | Warning | Fix |
|---|---------|-----|
| 1 | Refresh button llama `fetchSuggestions()` del store en lugar del hook | Hook expone `refresh()`, botones refresh/retry la usan |
| 2 | API failure muestra user suggestions en lugar de vacío | Catch de AI fetch retorna early con suggestions vacías |
| 3 | `regenerateWithPinned` en user source retorna silenciosamente | `Alert.alert` con i18n key `suggestionPin.noRegenUser` |

## 7. Limitaciones conocidas

- **Sin tests automatizados**: No hay tests unitarios ni de integración para el hook, KB, user picker, ni los cambios en home.tsx
- **KB cold start**: Hasta que haya datos de calendario, la KB usa random-with-rules; las sugerencias de ocasión son menos precisas
- **Refresh no mantiene pins**: Al hacer refresh, los pinned garments se pierden porque el hook no persiste ese estado entre re-ejecuciones
- **Sin feedback de KB staleness**: Si la KB está desactualizada (24h+), no se muestra indicación al usuario

## 8. Contratos de API

### Hook público
```typescript
useSmartSuggestions(): {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
```

### Store (adiciones)
```typescript
interface SuggestionsState {
  userSuggestions: Suggestion[];
  mergedSuggestions: Suggestion[];
  setUserSuggestions: (suggestions: Suggestion[]) => void;
  setMergedSuggestions: (suggestions: Suggestion[]) => void;
}
```

### Knowledge Base
```typescript
getKnowledgeBase(): Promise<{ hasEnoughData: boolean; patterns?: DayPattern[] }>
```

## 9. Próximos pasos

| Prioridad | Mejora | Detalle |
|-----------|--------|---------|
| Alta | Tests automatizados | Testear hook (ratio, merge, failure), KB (cache TTL, patterns), user picker (sorting) |
| Media | Persistir pins entre refreshes | Almacenar pinnedGarmentIds en AsyncStorage o mantenerlos en el store |
| Baja | Indicar KB stale | Mostrar hint cuando KB data tiene >24h sin actualizar |
| Baja | Feedback KB cold start | Mostrar mensaje "estamos aprendiendo tus preferencias" durante KB warm-up |

---

*Archivado desde `openspec/changes/smart-suggestions/` → `openspec/changes/archive/2026-07-14-smart-suggestions/`*
